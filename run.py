"""
DEV ONLY — starts the FastAPI dev server (uvicorn, auto-reload off) and the
Vite dev server together, for local development.

For production, do NOT use this script. Use Docker instead:
    docker compose up --build -d
which runs `alembic upgrade head` then `gunicorn app.main:app -k uvicorn.workers.UvicornWorker`
and serves the built frontend from FastAPI directly (see app/main.py and the
root Dockerfile). See README.md for full deployment instructions.
"""
import subprocess
import threading
import sys
import os
import time

def run_backend():
    print("[Backend] Starting FastAPI server on port 8000...")
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="info")

def run_frontend():
    print("[Frontend] Starting Vite Dev Server on port 5173...")
    # Use shell=True for windows npm execution compatibility
    cmd = "npm run dev"
    cwd = os.path.join(os.path.dirname(__file__), "frontend")
    
    # Run npm run dev in the frontend directory
    if sys.platform == "win32":
        subprocess.run(cmd, shell=True, cwd=cwd)
    else:
        subprocess.run(cmd.split(), cwd=cwd)

if __name__ == "__main__":
    print("====================================================")
    print("Starting Textile Brokerage Dashboard Application...")
    print("Backend: http://127.0.0.1:8000")
    print("Frontend: http://localhost:5173 (Vite)")
    print("====================================================")
    
    # Start Backend Thread
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    # Brief pause to let backend bind to port 8000
    time.sleep(2)
    
    # Start Frontend (in main thread to capture Ctrl+C properly)
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        sys.exit(0)
