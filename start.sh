#!/bin/bash
# EduMind Quick Start Script
# Usage: bash start.sh

set -e

echo ""
echo "=========================================="
echo "   EduMind AI Study Assistant"
echo "   Quick Start"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "❌ Python 3 not found. Install from https://python.org"
    exit 1
fi

PYTHON_VER=$(python3 -c "import sys; print(sys.version_info.major*100+sys.version_info.minor)")
if [ "$PYTHON_VER" -lt "309" ]; then
    echo "❌ Python 3.9+ required. Current: $(python3 --version)"
    exit 1
fi

echo "✓ Python $(python3 --version)"

# Create .env if missing
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "⚠️  .env file created from template."
    echo "   Please edit .env and add your OPENAI_API_KEY, then run this script again."
    echo ""
    exit 1
fi

# Check API key
if grep -q "sk-your-openai-api-key-here" .env; then
    echo ""
    echo "⚠️  OPENAI_API_KEY not set in .env"
    echo "   Edit .env and replace 'sk-your-openai-api-key-here' with your real key."
    echo "   The app will still run in DEMO MODE without a key."
    echo ""
fi

# Create venv if missing
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate
source venv/bin/activate

# Install deps
echo "📦 Installing dependencies..."
pip install "setuptools<70.0.0" numba llvmlite --only-binary :all: -q
pip install -r requirements.txt -q

# Create runtime dirs
mkdir -p data uploads study_db

echo ""
echo "🚀 Starting EduMind on http://localhost:5000"
echo "   Press Ctrl+C to stop"
echo ""

python backend/app.py
