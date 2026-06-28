# Trade-Pulse — full Render deploy helper (Windows)
# Run from repo root after you have:
#   - RENDER_API_KEY (https://dashboard.render.com/u/settings#api-keys)
#   - backend/firebase-service-account.json (Firebase Console → service account key)

param(
    [string]$RenderApiKey = $env:RENDER_API_KEY,
    [string]$RenderUrl = $env:RENDER_SERVICE_URL
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

Write-Host "`n=== Trade-Pulse Render Deploy ===" -ForegroundColor Cyan

if (-not $RenderApiKey) {
    Write-Host "`nRENDER_API_KEY not set." -ForegroundColor Yellow
    Write-Host "1. Open https://dashboard.render.com/u/settings#api-keys"
    Write-Host "2. Create API Key → copy it"
    Write-Host "3. Run: `$env:RENDER_API_KEY='rnd_...'; npm run setup:render`n"
    Start-Process "https://dashboard.render.com/blueprints/new"
    exit 1
}

$env:RENDER_API_KEY = $RenderApiKey
Write-Host "→ Running Render setup script..." -ForegroundColor Green
node scripts/setup-render-full.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $RenderUrl) {
    Write-Host "`nPaste your Render service URL (e.g. https://tradepulse-api.onrender.com):" -ForegroundColor Yellow
    $RenderUrl = Read-Host "Render URL"
}

if ($RenderUrl) {
    $RenderUrl = $RenderUrl.Trim().TrimEnd('/')
    $WsUrl = $RenderUrl -replace '^https:', 'wss:'
    Write-Host "→ Updating Vercel env vars..." -ForegroundColor Green
    Set-Location "$Root\frontend"
    echo $RenderUrl | npx vercel env add NEXT_PUBLIC_API_URL production --force
    echo $WsUrl | npx vercel env add NEXT_PUBLIC_WS_URL production --force
    Write-Host "→ Redeploying Vercel production..." -ForegroundColor Green
    npx vercel --prod --yes
    Set-Location $Root
    Write-Host "`n→ Testing Render health (may take 60s if waking)..." -ForegroundColor Green
    try {
        $health = Invoke-RestMethod -Uri "$RenderUrl/api/health" -TimeoutSec 90
        Write-Host "  API status: $($health.status)" -ForegroundColor Green
    } catch {
        Write-Host "  Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Done. App: https://tradepulse.vercel.app" -ForegroundColor Cyan
