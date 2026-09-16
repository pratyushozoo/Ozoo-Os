#!/bin/bash

echo "=================================================="
echo " OZOO Space OS Status"
echo "=================================================="

if lsof -i :3001 >/dev/null 2>&1; then
    echo "✓ Frontend: RUNNING on http://localhost:3001"
else
    echo "✗ Frontend: STOPPED (port 3001)"
fi

if lsof -i :8000 >/dev/null 2>&1; then
    echo "✓ Backend:  RUNNING on http://localhost:8000"
else
    echo "✗ Backend:  STOPPED (port 8000)"
fi

if lsof -i :27017 >/dev/null 2>&1; then
    echo "✓ MongoDB:  RUNNING on port 27017"
else
    echo "✗ MongoDB:  STOPPED (port 27017)"
fi
echo "=================================================="
