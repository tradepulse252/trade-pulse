# Trade-Pulse — production deploy checklist
# Prerequisites: GitHub repo, Vercel account, Northflank account, Firebase project

Write-Host "`n=== Trade-Pulse Deploy ===" -ForegroundColor Cyan
Write-Host "See DEPLOY-FREE.md for the full guide.`n"

Write-Host "Quick steps:" -ForegroundColor Yellow
Write-Host "  1. npm run firebase:deploy"
Write-Host "  2. Import .northflank/template.json in Northflank"
Write-Host "  3. Add JWT + Firebase secrets on Northflank"
Write-Host "  4. Set Vercel NEXT_PUBLIC_API_URL + NEXT_PUBLIC_WS_URL"
Write-Host "  5. npm run db:seed (local, with backend/.env)`n"

& (Join-Path $PSScriptRoot 'deploy-northflank.ps1')
