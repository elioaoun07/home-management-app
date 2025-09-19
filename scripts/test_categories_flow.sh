#!/bin/bash

# Test script to verify the categories flow
# Run this after starting your dev server

echo "🧪 Testing Categories API Flow"
echo "================================"

# Test 1: Categories API without accountId (should fail)
echo "1. Testing API without accountId (should require accountId):"
curl -s "http://localhost:3003/api/categories" | head -1
echo ""

# Test 2: Categories API with accountId (should return default categories)
echo "2. Testing API with sample accountId (should return default categories):"
curl -s "http://localhost:3003/api/categories?accountId=test-account-123" | head -1
echo ""

# Test 3: Get available accounts
echo "3. Getting available accounts:"
curl -s "http://localhost:3003/api/accounts" | head -1
echo ""

echo "✅ Test complete! Check the expense form at http://localhost:3003/expense"
echo "   1. Select an account from the dropdown"
echo "   2. Categories should appear below"
