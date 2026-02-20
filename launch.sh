#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERMINAL_PORT=3031
SLIDEV_PORT=3032
START_TERMINAL=false
TERMINAL_PID=""

# Ensure Java 26 is available
find_java_26() {
  # Check common Java installation paths
  if [ -d "$JAVA_HOME/bin" ] && java -version 2>&1 | grep -q "26"; then
    return 0
  fi
  
  # macOS paths
  for path in /Library/Java/JavaVirtualMachines/*/Contents/Home \
              /usr/local/opt/openjdk@26/libexec/openjdk.jdk/Contents/Home; do
    if [ -f "$path/bin/java" ] && "$path/bin/java" -version 2>&1 | grep -q "26"; then
      export JAVA_HOME="$path"
      return 0
    fi
  done
  
  # Linux paths
  for path in /usr/lib/jvm/java-26* /opt/java/jdk-26* ~/.jdks/openjdk-26*; do
    if [ -f "$path/bin/java" ] && "$path/bin/java" -version 2>&1 | grep -q "26"; then
      export JAVA_HOME="$path"
      return 0
    fi
  done
  
  return 1
}

if ! find_java_26; then
  echo "Warning: Java 26 not found in standard locations. Using system java."
else
  export PATH="$JAVA_HOME/bin:$PATH"
  echo "Using Java from: $JAVA_HOME"
  java -version
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --terminal)
      START_TERMINAL=true
      shift
      ;;
    --port)
      SLIDEV_PORT="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Cleanup function
cleanup() {
  if [ ! -z "$TERMINAL_PID" ]; then
    echo "Stopping terminal server (PID: $TERMINAL_PID)..."
    kill $TERMINAL_PID 2>/dev/null || true
    wait $TERMINAL_PID 2>/dev/null || true
  fi
}

# Set up trap to cleanup on exit
trap cleanup EXIT INT TERM

# Start terminal server if requested
if [ "$START_TERMINAL" = true ]; then
  echo "Starting terminal server on port $TERMINAL_PORT..."
  cd "$SCRIPT_DIR/misc/terminal-server"
  node server.js > /tmp/terminal-server.log 2>&1 &
  TERMINAL_PID=$!
  
  # Wait for server to start
  sleep 2
  
  # Check if server started successfully
  if ! kill -0 $TERMINAL_PID 2>/dev/null; then
    echo "Failed to start terminal server. Check /tmp/terminal-server.log for details."
    exit 1
  fi
  
  echo "Terminal server started (PID: $TERMINAL_PID)"
  echo "Health endpoint: http://127.0.0.1:$TERMINAL_PORT/health"
  
  # Export terminal configuration for Slidev
  export VITE_TERMINAL_WS_URL="ws://127.0.0.1:$TERMINAL_PORT"
  export VITE_TERMINAL_SERVER_PORT="$TERMINAL_PORT"
  export VITE_TERMINAL_AVAILABLE="true"
else
  # Terminal server not started, mark as unavailable
  export VITE_TERMINAL_AVAILABLE="false"
fi

# Launch Slidev
cd "$SCRIPT_DIR"
echo "Starting Slidev on port $SLIDEV_PORT..."
npx slidev slides.md --port $SLIDEV_PORT