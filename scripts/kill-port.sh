#!/bin/bash

# Kill any process running on specified port
# Usage: ./kill-port.sh [PORT]

PORT=${1:-6277}  # Default to 6277 if no argument provided

echo "Searching for processes on port $PORT..."

# Find the process ID using the port
PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
    echo "No process found running on port $PORT"
    exit 0
else
    echo "Found process $PID running on port $PORT"
    echo "Killing process $PID..."
    
    # Try graceful kill first
    kill $PID
    
    # Wait a moment
    sleep 2
    
    # Check if it's still running
    if kill -0 $PID 2>/dev/null; then
        echo "Process still running, force killing..."
        kill -9 $PID
    fi
    
    # Verify it's dead
    sleep 1
    if kill -0 $PID 2>/dev/null; then
        echo "ERROR: Failed to kill process $PID"
        exit 1
    else
        echo "Successfully killed process on port $PORT"
    fi
fi
