#!/bin/bash

# Start LangGraph Service
# This script starts the Python LangGraph service for UAILS

echo "🚀 Starting UAILS LangGraph Service..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "langgraph-service/venv" ]; then
    echo "📦 Creating virtual environment..."
    cd langgraph-service
    python3 -m venv venv
    cd ..
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source langgraph-service/venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r langgraph-service/requirements.txt

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)/langgraph-service"

# Start the service
echo "🌟 Starting LangGraph service on http://localhost:8000"
cd langgraph-service
python main.py