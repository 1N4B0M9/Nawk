#!/bin/bash

# NawkNawk Fly.io Deployment Script

echo "🚀 Starting NawkNawk deployment to Fly.io..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in to Fly.io
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please run: fly auth login"
    exit 1
fi

# Build the application
echo "📦 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Deploy to Fly.io
echo "🚀 Deploying to Fly.io..."
fly deploy

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your app is now live at: https://nawknawk.fly.dev"
    echo ""
    echo "📊 To monitor your app:"
    echo "   fly status"
    echo "   fly logs"
    echo ""
    echo "🔧 To scale your app:"
    echo "   fly scale count 2"
    echo ""
    echo "🛠️  To open a shell:"
    echo "   fly ssh console"
else
    echo "❌ Deployment failed!"
    exit 1
fi 