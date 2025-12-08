#!/bin/bash

# Navigate to the GTM directory
cd "$(dirname "$0")"

# Print startup message
echo "======================================"
echo "Starting GTM Golf Tournament System"
echo "======================================"
echo ""
echo "Server will start on: http://localhost:8080"
echo "Press Ctrl+C to stop the server"
echo ""

# Wait 2 seconds then open browser
(sleep 2 && open http://localhost:8080/index.html) &

# Start the Python HTTP server
python3 -m http.server 8080
