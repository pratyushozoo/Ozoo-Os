#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=================================================="
echo " Stopping OZOO Space OS"
echo "=================================================="

# Stop Frontend
echo "Stopping Frontend (port 3001)..."
if lsof -ti :3001 >/dev/null 2>&1; then
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    echo "✓ Frontend stopped"
else
    echo "- Frontend is not running"
fi

# Stop Backend
echo "Stopping Backend (port 8000)..."
if lsof -ti :8000 >/dev/null 2>&1; then
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    echo "✓ Backend stopped"
else
    echo "- Backend is not running"
fi

# Stop MongoDB
echo "Stopping MongoDB (port 27017)..."
if lsof -ti :27017 >/dev/null 2>&1; then
    lsof -ti :27017 | xargs kill -15 2>/dev/null || true
    sleep 1
    echo "✓ MongoDB stopped"
else
    echo "- MongoDB is not running"
fi

echo "=================================================="
