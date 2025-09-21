#!/usr/bin/env python3
"""
Startup script for Excel Agent FastAPI backend
"""

import subprocess
import sys
import os
from pathlib import Path

def install_requirements():
    """Install required Python packages."""
    requirements = [
        "fastapi==0.104.1",
        "uvicorn==0.24.0",
        "openpyxl==3.1.2",
        "pydantic==2.5.0",
        "python-multipart==0.0.6"
    ]

    for req in requirements:
        try:
            print(f"📦 Installing {req}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", req])
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install {req}: {e}")
            return False

    return True

def start_server():
    """Start the FastAPI Excel Agent server."""
    backend_dir = Path(__file__).parent / "backend"
    excel_executor = backend_dir / "excel_executor.py"

    if not excel_executor.exists():
        print(f"❌ Excel executor not found at: {excel_executor}")
        return False

    # Change to backend directory
    os.chdir(backend_dir)

    print("🚀 Starting Excel Agent FastAPI server on port 3005...")
    print("📊 Excel Agent API will be available at: http://localhost:3005")
    print("📋 API Documentation at: http://localhost:3005/docs")
    print("💡 Use Ctrl+C to stop the server")
    print("-" * 60)

    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "excel_executor:app",
            "--host", "0.0.0.0",
            "--port", "3005",
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n🛑 Excel Agent server stopped")
    except Exception as e:
        print(f"❌ Server error: {e}")
        return False

    return True

def main():
    """Main entry point."""
    print("🤖 Excel AI Agent - FastAPI Backend Starter")
    print("=" * 50)

    # Install requirements
    print("1️⃣ Installing Python dependencies...")
    if not install_requirements():
        print("❌ Failed to install dependencies")
        sys.exit(1)

    print("✅ Dependencies installed successfully")
    print()

    # Start server
    print("2️⃣ Starting Excel Agent server...")
    if not start_server():
        print("❌ Failed to start server")
        sys.exit(1)

if __name__ == "__main__":
    main()