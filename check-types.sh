#!/bin/bash

echo "🔍 Checking TypeScript errors..."
npx tsc --noEmit 2>&1 | grep -E "error TS|Type error" | head -50

