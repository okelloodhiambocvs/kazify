# Kazify Light Smoke Test Script

This document provides curl commands to verify health, authentication, and role endpoints for Kazify.

## 1. Health Check
```bash
curl -s http://localhost:3000/api/health
```
Expected Response:
```json
{
  "status": "ok",
  "timestamp": "2026-07-29T16:03:47.014Z",
  "authStore": "memory",
  "dataStore": "memory",
  "wsAuth": "jwt",
  "nodeEnv": "development"
}
```

## 2. Admin Login
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kazify.com","password":"Admin@12345"}'
```

## 3. Customer Login
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+254700000001","password":"Customer@123"}'
```

## 4. Fundi Login
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+254700000002","password":"Fundi@123"}'
```

## 5. Fetch Profile (`GET /api/auth/me`)
```bash
TOKEN="<ACCESS_TOKEN_FROM_LOGIN>"

curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```
