#!/bin/bash

# Script untuk build dan push ke git
# Pastikan tidak ada error sebelum push

echo "🧹 Cleaning .next directory..."
rm -rf .next

echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    echo "📝 Checking git status..."
    git status
    
    echo "📦 Staging all changes..."
    git add .
    
    echo "💾 Committing changes..."
    git commit -m "fix: ensure customer_id is always included in order payload with proper validation and logging"
    
    echo "🚀 Pushing to origin main..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pushed to origin main!"
    else
        echo "❌ Failed to push. Please check your git remote and permissions."
    fi
else
    echo "❌ Build failed! Please fix errors before pushing."
    exit 1
fi
