#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

export PATH="$DIR/.tools/node/bin:$DIR/.tools/mongodb_pkg/bin:$PATH"

echo "=================================================="
echo " Starting OZOO Space OS on Localhost"
echo "=================================================="

# 1. Start MongoDB
mkdir -p "$DIR/.tools/mongodb/data" "$DIR/.tools/logs"
if lsof -i :27017 >/dev/null 2>&1; then
    echo "✓ MongoDB is running on port 27017"
else
    echo "▶ Starting MongoDB..."
    "$DIR/.tools/mongodb_pkg/bin/mongod" --dbpath "$DIR/.tools/mongodb/data" --port 27017 --logpath "$DIR/.tools/logs/mongodb.log" --fork
    echo "✓ MongoDB started on port 27017"
fi

# 2. Stop old backend on port 8000 if running from another directory
if lsof -ti :8000 >/dev/null 2>&1; then
    echo "Stopping existing process on port 8000..."
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start Backend
echo "▶ Starting OZOO Backend (FastAPI on port 8000)..."
cd "$DIR/backend"
nohup "$DIR/backend/venv/bin/uvicorn" server:app --host 127.0.0.1 --port 8000 --reload > "$DIR/.tools/logs/ozoo_backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$DIR/.tools/logs/ozoo_backend.pid"
cd "$DIR"
echo "✓ Backend started (PID: $BACKEND_PID, Log: .tools/logs/ozoo_backend.log)"

# 3. Stop old frontend on port 3001 if running
if lsof -ti :3001 >/dev/null 2>&1; then
    echo "Stopping existing process on port 3001..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start Frontend
echo "▶ Starting OZOO Frontend (React on port 3001)..."
cd "$DIR/frontend"
BROWSER=none nohup "$DIR/.tools/node/bin/yarn" start > "$DIR/.tools/logs/ozoo_frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$DIR/.tools/logs/ozoo_frontend.pid"
cd "$DIR"
echo "✓ Frontend started (PID: $FRONTEND_PID, Log: .tools/logs/ozoo_frontend.log)"

echo ""
echo "=================================================="
echo " OZOO Space OS is running:"
echo " - Frontend: http://localhost:3001"
echo " - Backend:  http://localhost:8000 (API: http://localhost:8000/api)"
echo " - MongoDB:  mongodb://127.0.0.1:27017"
echo ""
echo " Demo Credentials:"
echo " 1. Super Admin:    pratyush@ozoo.me  / OzooAdmin#2026"
echo " 2. Business Admin: aarav@ozoo.me     / ozoo123"
echo " 3. Staff:          rahul@ozoo.me     / ozoo123"
echo " 4. Client:         client@abc.com    / ozoo123"
echo "=================================================="
