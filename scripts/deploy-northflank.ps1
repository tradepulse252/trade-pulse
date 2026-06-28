# Trade-Pulse — Northflank deploy helper
# Opens docs and validates local setup before you deploy in Northflank UI.

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent

Write-Host "`n=== Trade-Pulse → Northflank ===" -ForegroundColor Cyan
Write-Host "Repo root: $Root`n"

Write-Host "1. Import template:" -ForegroundColor Yellow
Write-Host "   Northflank Dashboard → Templates → Create from JSON"
Write-Host "   File: $Root\.northflank\template.json`n"

Write-Host "2. Add secrets in Northflank Secret Group:" -ForegroundColor Yellow
Write-Host "   JWT_SECRET, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
Write-Host "   RESEND_API_KEY (optional)`n"

Write-Host "3. After deploy, set Vercel env:" -ForegroundColor Yellow
Write-Host "   NEXT_PUBLIC_API_URL = https://YOUR-NORTHFLANK-URL"
Write-Host "   NEXT_PUBLIC_WS_URL  = wss://YOUR-NORTHFLANK-URL`n"

Write-Host "4. Deploy Firestore rules:" -ForegroundColor Yellow
Write-Host "   npm run firebase:deploy`n"

Write-Host "5. Seed admin user (local with .env):" -ForegroundColor Yellow
Write-Host "   npm run db:seed`n"

Write-Host "Full guide: DEPLOY-FREE.md" -ForegroundColor Green
Write-Host "Manual reference: northflank.yaml`n"

if (Test-Path (Join-Path $Root 'backend\.env')) {
  Write-Host "backend/.env found — ready for local seed." -ForegroundColor Green
} else {
  Write-Host "Copy backend/.env.example → backend/.env for local development." -ForegroundColor DarkYellow
}
