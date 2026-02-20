#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERMINAL_PORT=3031
SLIDEV_PORT=3032
START_TERMINAL=false
TERMINAL_PID=""

# Parse arguments first to determine if terminal is needed
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

# Check Java version - expect Java 26 when using --terminal
if [ "$START_TERMINAL" = true ]; then
  if ! java -version 2>&1 | grep -q "26"; then
    echo "ERROR: Java 26 is required when using --terminal flag"
    echo "Current Java version:"
    java -version 2>&1 | head -3
    echo ""
    echo "Please switch to Java 26 (e.g., using 'sdk use java 26.ea.29-open')"
    exit 1
  fi
  echo "Using Java 26:"
  java -version 2>&1 | head -1
fi

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