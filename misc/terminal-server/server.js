const http = require('http');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let PORT = 3031;
const HOST = process.env.TERMINAL_SERVER_HOST || '0.0.0.0'; // Bind to all interfaces by default
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const LOG_LEVEL = (process.env.TERMINAL_SERVER_LOG_LEVEL || 'info').toLowerCase();
const LOG_FORMAT = (process.env.TERMINAL_SERVER_LOG_FORMAT || 'text').toLowerCase();
const LOG_HTTP = (process.env.TERMINAL_SERVER_LOG_HTTP || 'true').toLowerCase() !== 'false';
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
let connectionCounter = 0;

function shouldLog(level) {
  return LOG_LEVELS[level] <= (LOG_LEVELS[LOG_LEVEL] ?? LOG_LEVELS.info);
}

function log(level, message, meta = {}) {
  if (!shouldLog(level)) return;
  const timestamp = new Date().toISOString();
  const payload = Object.keys(meta).length ? meta : undefined;

  if (LOG_FORMAT === 'json') {
    const record = {
      timestamp,
      level,
      message,
      ...payload
    };
    const line = JSON.stringify(record);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
    return;
  }

  const extra = payload ? ` ${JSON.stringify(payload)}` : '';
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${extra}`;

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function extractClientIp(req) {
  return req?.socket?.remoteAddress || 'unknown';
}

function formatDurationMs(startTimeMs) {
  return Math.round(Date.now() - startTimeMs);
}

// Try to use PORT, increment if unavailable
function startServer() {
  const server = http.createServer((req, res) => {
    const requestStart = Date.now();
    const clientIp = extractClientIp(req);

    res.on('finish', () => {
      if (!LOG_HTTP) return;
      log('info', 'HTTP request', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs: formatDurationMs(requestStart),
        clientIp
      });
    });

    // Set CORS headers
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', port: PORT }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, HOST, () => {
    log('info', 'Terminal server listening', {
      host: HOST,
      port: PORT,
      logLevel: LOG_LEVEL,
      sessionTimeoutMs: SESSION_TIMEOUT_MS
    });
    log('info', 'WebSocket ready for xterm.js connections');
    setupWebSocket(server);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log('warn', 'Port in use, trying next', { port: PORT, nextPort: PORT + 1 });
      PORT++;
      startServer();
    } else {
      log('error', 'HTTP server error', { message: err.message, stack: err.stack });
      throw err;
    }
  });
}

function setupWebSocket(server) {
  // WebSocket server for terminal connections
  const wss = new WebSocketServer({ server });

  // Allowed script directories (whitelist)
  const ALLOWED_DIRS = [
    path.resolve(__dirname, '../..')
  ];

  function isScriptAllowed(scriptPath) {
    const resolved = path.resolve(scriptPath);
    return ALLOWED_DIRS.some(dir => resolved.startsWith(dir));
  }

  wss.on('connection', (ws, req) => {
    const clientIp = extractClientIp(req);
    const connectionId = ++connectionCounter;

    log('info', 'WebSocket connected', { clientIp, connectionId });

  let ptyProcess = null;
  let session = null;
  let sessionTimeout = null;
  let cleanupDone = false;
  let activeScript = null;

    function cleanupPty(reason) {
      if (cleanupDone) return;
      cleanupDone = true;

      log('info', 'Cleaning up session', { connectionId, reason });

      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
      }

      // Note: Main.java is never deleted, only overwritten on next run

      if (session) {
        try {
          session.kill();
        } catch (err) {
          log('error', 'Failed to kill PTY process', {
            connectionId,
            message: err.message,
            stack: err.stack
          });
        }

        const fd = session.fd;
        if (typeof fd === 'number') {
          try {
            fs.closeSync(fd);
            log('debug', 'Closed PTY master FD', { fd, reason, connectionId });
          } catch (err) {
            log('error', 'Failed to close PTY master FD', {
              connectionId,
              message: err.message,
              stack: err.stack
            });
          }
        }
      }
    }

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        log('debug', 'WebSocket message received', {
          connectionId,
          type: message.type,
          bytes: data.length
        });

        if (message.type === 'start') {
          // Start a new terminal session
          const shell = resolveShell();
          const cwd = path.resolve(__dirname, '../..');

          log('info', 'Starting terminal session', {
            connectionId,
            shell,
            cwd,
            cols: message.cols || 80,
            rows: message.rows || 24
          });

          try {
            session = spawnShell(shell, message, cwd);
            ptyProcess = session.process;
          } catch (err) {
            log('error', 'Failed to spawn shell', {
              connectionId,
              shell,
              message: err.message,
              stack: err.stack
            });
            ws.send(JSON.stringify({
              type: 'error',
              message: `Failed to spawn shell (${shell}): ${err.message}`
            }));
            return;
          }

          session.onData((data) => {
            // Highlight error messages with ANSI color codes
            let outputData = String(data);
            
            // Don't filter cd commands - users should see directory changes
            // (Removed filtering to show terminal state clearly)
            
            // Highlight Java error messages (including error lines and the code lines)
            if (outputData.includes('error:') || outputData.includes('errors')) {
              const errorLines = outputData.split('\n');
              const highlightedLines = errorLines.map((line) => {
                // Highlight error lines
                if (line.includes('error:')) {
                  return `\x1b[31m${line}\x1b[0m`; // Red text
                }
                // Highlight the line containing the error marker (^)
                if (line.trim().startsWith('^')) {
                  return `\x1b[33m${line}\x1b[0m`; // Yellow text
                }
                // Highlight "errors" in summary lines
                if (line.includes('errors') && line.match(/^\d+ errors?$/)) {
                  return `\x1b[1;31m${line}\x1b[0m`; // Bold red
                }
                return line;
              });
              outputData = highlightedLines.join('\n');
            }
            
            // Highlight WARNING messages with bold yellow for better readability
            if (outputData.includes('WARNING:')) {
              const lines = outputData.split('\n');
              const highlightedLines = lines.map((line) => {
                if (line.includes('WARNING:')) {
                  return line.replace(/WARNING:/g, '\x1b[1;33mWARNING:\x1b[0m'); // Bold yellow for "WARNING:" only
                }
                return line;
              });
              outputData = highlightedLines.join('\n');
            }
            
            // Highlight Java exception lines (Exception in thread, at lines, Caused by)
            if (outputData.includes('Exception') || outputData.includes('\tat ') || outputData.includes('Caused by:')) {
              const lines = outputData.split('\n');
              const highlightedLines = lines.map((line) => {
                if (line.includes('Exception in thread') || line.includes('Exception:')) {
                  return `\x1b[1;31m${line}\x1b[0m`; // Bold red for exception headers
                }
                if (line.trim().startsWith('at ') || line.includes('Caused by:')) {
                  return `\x1b[90m${line}\x1b[0m`; // Gray for stack traces
                }
                return line;
              });
              outputData = highlightedLines.join('\n');
            }
            
            ws.send(JSON.stringify({ type: 'data', data: outputData }));

            if (activeScript) {
              const preview = String(data).replace(/\s+/g, ' ').trim().slice(0, 200);
              log('info', 'Script output', {
                connectionId,
                scriptPath: activeScript.scriptPath,
                bytes: data.length,
                preview
              });
            }
          });

          session.onExit((exitCode) => {
            log('info', 'Terminal session exited', { connectionId, exitCode });
            ws.send(JSON.stringify({ type: 'exit', exitCode }));
            cleanupPty('process-exit');
          });

          if (sessionTimeout) {
            clearTimeout(sessionTimeout);
          }
          sessionTimeout = setTimeout(() => {
            log('warn', 'Session timeout reached, closing PTY', { connectionId });
            ws.send(JSON.stringify({ type: 'error', message: 'Session timeout reached' }));
            cleanupPty('timeout');
            try {
              ws.close(1000, 'Session timeout');
            } catch (err) {
              log('error', 'Failed to close websocket after timeout', {
                connectionId,
                message: err.message,
                stack: err.stack
              });
            }
          }, SESSION_TIMEOUT_MS);

          ws.send(JSON.stringify({ type: 'started' }));

        } else if (message.type === 'data') {
          // Forward input to terminal
          if (session) {
            log('debug', 'Forwarding terminal input', {
              connectionId,
              bytes: message.data?.length || 0
            });
            session.write(message.data);
          }

        } else if (message.type === 'resize') {
          // Resize terminal
          if (session && session.resize) {
            log('debug', 'Resizing terminal', {
              connectionId,
              cols: message.cols,
              rows: message.rows
            });
            session.resize(message.cols, message.rows);
          }

        } else if (message.type === 'stop') {
          log('info', 'Stop requested by client', { connectionId });
          ws.send(JSON.stringify({ type: 'exit', exitCode: 0 }));
          cleanupPty('session-stop');

        } else if (message.type === 'execute') {
          // Execute a script
          const scriptPath = message.script;

          log('info', 'Execute script requested', { connectionId, scriptPath });

          if (!isScriptAllowed(scriptPath)) {
            log('warn', 'Blocked script execution outside allowed dirs', {
              connectionId,
              scriptPath
            });
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Script not in allowed directories'
            }));
            return;
          }

          if (session) {
            // Make script executable and run it directly
            const command = `chmod +x \"${scriptPath}\" && \"${scriptPath}\"\n`;
            log('info', 'Executing script in session', { connectionId, scriptPath });
            activeScript = { scriptPath, startedAt: Date.now() };
            session.write(command);
          }
        } else if (message.type === 'java-run') {
          // Execute Java code
          const javaContent = message.code;
          const enablePreview = message.enablePreview || false;
          const slideId = message.slideId || 'default';
          const additionalFiles = message.additionalFiles || {};
          const cwd = message.cwd || path.resolve(__dirname, '../..');

          if (!javaContent) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'No Java code provided'
            }));
            return;
          }

          // Generate slide-specific temp directory in /tmp/slides
          const slidesTmpDir = '/tmp/slides';
          const tempFile = path.join(slidesTmpDir, 'Main.java');

          log('info', 'Preparing Java execution in /tmp/slides', {
            connectionId,
            tempFile,
            slideId,
            codeSize: javaContent.length,
            additionalFiles: Object.keys(additionalFiles)
          });

          // Ensure /tmp/slides directory exists
          fs.mkdir(slidesTmpDir, { recursive: true }, (mkdirErr) => {
            if (mkdirErr) {
              log('error', 'Failed to create /tmp/slides directory', {
                connectionId,
                message: mkdirErr.message
              });
              ws.send(JSON.stringify({
                type: 'error',
                message: `Failed to create /tmp/slides directory: ${mkdirErr.message}`
              }));
              return;
            }

            // Write main Java file
            fs.writeFile(tempFile, javaContent, (writeErr) => {
              if (writeErr) {
                log('error', 'Failed to write Java file', {
                  connectionId,
                  tempFile,
                  message: writeErr.message
                });
                ws.send(JSON.stringify({
                  type: 'error',
                  message: `Failed to write Java file: ${writeErr.message}`
                }));
                return;
              }

              // Write additional files to /tmp/slides
              const additionalFilePaths = Object.entries(additionalFiles).map(([name, content]) => {
                return new Promise((resolve) => {
                  const filePath = path.join(slidesTmpDir, name);
                  fs.writeFile(filePath, content, (err) => {
                    if (err) {
                      log('warn', 'Failed to write additional file', {
                        connectionId,
                        filePath,
                        message: err.message
                      });
                    } else {
                      log('debug', 'Wrote additional file', { filePath });
                    }
                    resolve();
                  });
                });
              });

              Promise.all(additionalFilePaths).then(() => {
                if (session) {
                  // Execute java file from /tmp/slides working directory
                  let javaCmd = `java`;
                  if (enablePreview) {
                    javaCmd += ' --enable-preview';
                  }
                  javaCmd += ` Main.java`;

                  // Use subshell to cd without showing the cd command
                  // stty -echo suppresses the command line echo, stty echo re-enables it
                  const command = `(stty -echo; cd "${slidesTmpDir}" && ${javaCmd}; stty echo)\n`;
                  log('info', 'Executing Java file in session from /tmp/slides', {
                    connectionId,
                    enablePreview,
                    slideId,
                    command: command.trim()
                  });

                  activeScript = { scriptPath: tempFile, startedAt: Date.now(), tempDir: slidesTmpDir };
                  session.write(command);

                  // Main.java will be cleaned up when terminal closes (see cleanupPty function)
                }
              });
            });
          });
        } else if (message.type === 'execute-direct') {
          // Execute a bash/shell command directly
          const command = message.command;
          const language = message.language || 'bash';
          const slideId = message.slideId || 'default';
          const additionalFiles = message.additionalFiles || {};
          const cwd = message.cwd || path.resolve(__dirname, '../..');

          if (!command) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'No command provided'
            }));
            return;
          }

          // If there are additional files, write them to /tmp/slides
          if (Object.keys(additionalFiles).length > 0) {
            const slidesTmpDir = '/tmp/slides';

            log('info', 'Creating /tmp/slides for direct execution', {
              connectionId,
              additionalFiles: Object.keys(additionalFiles)
            });

            fs.mkdir(slidesTmpDir, { recursive: true }, (mkdirErr) => {
              if (mkdirErr) {
                log('error', 'Failed to create /tmp/slides directory', {
                  connectionId,
                  message: mkdirErr.message
                });
                ws.send(JSON.stringify({
                  type: 'error',
                  message: `Failed to create /tmp/slides directory: ${mkdirErr.message}`
                }));
                return;
              }

              // Write additional files to /tmp/slides
              const filePromises = Object.entries(additionalFiles).map(([name, content]) => {
                return new Promise((resolve) => {
                  const filePath = path.join(slidesTmpDir, name);
                  fs.writeFile(filePath, content, (err) => {
                    if (err) {
                      log('warn', 'Failed to write additional file', {
                        connectionId,
                        filePath,
                        message: err.message
                      });
                    } else {
                      log('debug', 'Wrote additional file', { filePath });
                    }
                    resolve();
                  });
                });
              });

              Promise.all(filePromises).then(() => {
                if (session) {
                  const fullCommand = `(stty -echo; cd "${slidesTmpDir}" && ${command}; stty echo)\n`;
                  log('info', 'Executing direct shell command in /tmp/slides', {
                    connectionId,
                    language,
                    slideId
                  });
                  activeScript = { scriptPath: slidesTmpDir, startedAt: Date.now(), tempDir: slidesTmpDir };
                  session.write(fullCommand);

                  // Additional files will be cleaned up when terminal closes (see cleanupPty function)
                }
              });
            });
          } else {
            // No additional files, execute command directly
            if (session) {
              log('info', 'Executing direct shell command', {
                connectionId,
                language,
                slideId,
                cwd,
                preview: command.replace(/\n/g, ' ').slice(0, 100)
              });
              const fullCommand = cwd ? `(stty -echo; cd "${cwd}" && ${command}; stty echo)\n` : `(stty -echo; ${command}; stty echo)\n`;
              session.write(fullCommand);
            }
          }
        }

      } catch (err) {
        log('error', 'Error processing message', {
          connectionId,
          message: err.message,
          stack: err.stack
        });
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', () => {
      log('info', 'WebSocket disconnected', { connectionId });
      cleanupPty('ws-close');
    });

    ws.on('error', (err) => {
      log('error', 'WebSocket error', {
        connectionId,
        message: err.message,
        stack: err.stack
      });
      cleanupPty('ws-error');
    });
  });
}

function resolveShell() {
  // Try system's default shell first
  const candidates = [
    process.env.SHELL,
    '/bin/bash',
    '/usr/bin/bash',
    '/bin/zsh',
    '/usr/bin/zsh',
    '/bin/sh'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      log('debug', 'Resolved shell candidate', { candidate });
      return candidate;
    }
  }

  log('warn', 'No preferred shell found, falling back to sh');
  return 'sh';
}

function spawnShell(shell, message, cwd) {
  // Use whatever Java is configured in the current environment
  const baseEnv = {
    ...process.env,
    PATH: process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin'
  };

  const options = {
    name: 'xterm-color',
    cols: message.cols || 80,
    rows: message.rows || 24,
    cwd: cwd,
    env: baseEnv
  };

  try {
    const ptyProcess = pty.spawn(shell, [], options);
    return wrapPtySession(ptyProcess);
  } catch (err) {
    log('warn', 'Retrying spawn with /bin/sh after failure', {
      shell,
      message: err.message,
      stack: err.stack
    });
    try {
      const ptyProcess = pty.spawn('/bin/sh', [], options);
      return wrapPtySession(ptyProcess);
    } catch (ptyErr) {
      log('error', 'PTY spawn failed, falling back to child_process', {
        shell,
        message: ptyErr.message,
        stack: ptyErr.stack
      });
      return spawnFallbackShell(shell, cwd, baseEnv);
    }
  }
}

function wrapPtySession(ptyProcess) {
  return {
    process: ptyProcess,
    fd: ptyProcess._fd,
    onData: (handler) => ptyProcess.onData(handler),
    onExit: (handler) => ptyProcess.onExit(({ exitCode }) => handler(exitCode)),
    write: (data) => ptyProcess.write(data),
    resize: (cols, rows) => ptyProcess.resize(cols, rows),
    kill: () => ptyProcess.kill()
  };
}

function spawnFallbackShell(shell, cwd, env) {
  const child = spawn(shell, [], {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  log('warn', 'Using fallback shell (no PTY)', { shell, cwd });

  return {
    process: child,
    fd: undefined,
    onData: (handler) => {
      child.stdout.on('data', (data) => handler(data.toString()));
      child.stderr.on('data', (data) => handler(data.toString()));
    },
    onExit: (handler) => child.on('exit', (code) => handler(code ?? 0)),
    write: (data) => {
      if (!child.stdin.destroyed) {
        child.stdin.write(data);
      }
    },
    resize: null,
    kill: () => child.kill('SIGTERM')
  };
}

log('info', 'Starting terminal server', { initialPort: PORT, host: HOST });
startServer();
