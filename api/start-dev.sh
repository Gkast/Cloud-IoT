#!/bin/bash

declare -a pids=()  # Array to store PIDs

# Function to start server with nodemon and store its PID
start_server() {
    cd "$1" || return 1
    npm run start-dev &
    pids+=($!)  # Store PID of the last background process
    cd ..
}

# Start HTTP server with nodemon and store its PID
start_server "http"

# Start MQTT server with nodemon and store its PID
start_server "mqtt"

# Start WebSocket server with nodemon and store its PID
start_server "websocket"

# Function to stop servers using their PIDs
stop_servers() {
    for pid in "${pids[@]}"; do
        kill "$pid"  # Send termination signal to the PID
    done
}

# Trap termination signals to stop servers before exiting
trap stop_servers SIGINT SIGTERM EXIT

# Wait for all background jobs to finish
wait
