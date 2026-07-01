# Trade-Pulse — deploy backend to Railway (Docker)
# Railway dashboard expects config at /backend/railway.json (monorepo layout).

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Stage = Join-Path $Root '.railway-staging'

Write-Host "`n=== Trade-Pulse -> Railway ===" -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $Root 'backend\railway.json'))) {
  throw 'Missing backend\railway.json — run from repo with Docker config present.'
}

if (Test-Path $Stage) { Remove-Item $Stage -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $Stage 'backend') -Force | Out-Null
Copy-Item -Path (Join-Path $Root 'backend\*') -Destination (Join-Path $Stage 'backend') -Recurse -Force

Push-Location $Stage
try {
  npx @railway/cli up --detach -s TradePulse @args
  Write-Host "`nDone. Check: https://tradepulse-production-a56b.up.railway.app/api/health" -ForegroundColor Green
} finally {
  Pop-Location
}
