#!/bin/bash

# Cloudflare Worker Deployment Script
# Run this after registering your workers.dev subdomain

echo "🚀 Starting Cloudflare Worker deployment..."

# Set environment variables
export CLOUDFLARE_ACCOUNT_ID=f69d84520904e4266f75a0f0827c1144

# Verify we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: wrangler.toml not found. Please run this script from the cloudflare-worker directory."
    exit 1
fi

# Test D1 connection before deployment
echo "🔍 Testing D1 database connection..."
wrangler d1 execute archiwum-danych --remote --command "SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table';" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ D1 database connection successful"
else
    echo "❌ D1 database connection failed. Please check your configuration."
    exit 1
fi

# Deploy the worker
echo "📤 Deploying worker to Cloudflare..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo "✅ Worker deployed successfully!"
    echo ""
    echo "🌐 Your API is now live at:"
    echo "   Health: https://ra8ga-archiwum.workers.dev/health"
    echo "   API:    https://ra8ga-archiwum.workers.dev/api/companies_summary"
    echo ""
    echo "🧪 Test commands:"
    echo "   curl https://ra8ga-archiwum.workers.dev/health"
    echo "   curl https://ra8ga-archiwum.workers.dev/api/companies_summary"
else
    echo "❌ Deployment failed. Please check the error message above."
    echo ""
    echo "💡 Make sure you have registered your workers.dev subdomain at:"
    echo "   https://dash.cloudflare.com/f69d84520904e4266f75a0f0827c1144/workers/onboarding"
fi