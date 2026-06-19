# Trade-Pulse One-Click Deploy Script
# Prerequisites: GitHub repo created, Neon DATABASE_URL, accounts on Vercel + Render
#
# Usage:
#   $env:GITHUB_REPO = "https://github.com/YOUR_USER/trade-pulse.git"
#   $env:DATABASE_URL = "postgresql://...@neon.tech/neondb?sslmode=require"
#   $env:JWT_SECRET = "your-64-char-secret"
#   .\scripts\deploy.ps1

param(
    [string]$GitHubRepo = $env:GITHUB_REPO,
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$JwtSecret = $env:JWT_SECRET,
    [string]$VercelProject = "trade-pulse"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== Trade-Pulse Deploy ===" -ForegroundColor Cyan

# 1. Git push
Set-Location $Root
if (-not (Test-Path ".git")) { git init; git branch -M main }
git add -A
git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
    git commit -m "Deploy Trade-Pulse to production"
}
if ($GitHubRepo) {
    git remote remove origin 2>$null
    git remote add origin $GitHubRepo
    git push -u origin main --force
    Write-Host "Pushed to GitHub" -ForegroundColor Green
} else {
    Write-Host "Set GITHUB_REPO to push code" -ForegroundColor Yellow
}

# 2. Vercel frontend
Set-Location "$Root\frontend"
if (-not $env:VERCEL_TOKEN) {
    Write-Host "Run: npx vercel login" -ForegroundColor Yellow
}
npx vercel link --yes 2>$null
$BackendUrl = $env:BACKEND_URL
if ($BackendUrl) {
    npx vercel env rm NEXT_PUBLIC_API_URL production -y 2>$null
    npx vercel env rm NEXT_PUBLIC_WS_URL production -y 2>$null
    echo $BackendUrl | npx vercel env add NEXT_PUBLIC_API_URL production
    $WsUrl = $BackendUrl -replace '^https://', 'wss://' -replace '^http://', 'ws://'
    echo $WsUrl | npx vercel env add NEXT_PUBLIC_WS_URL production
}
npx vercel --prod --yes
Write-Host "Frontend deployed to Vercel" -ForegroundColor Green

Write-Host "`n=== Manual steps (Render + Neon) ===" -ForegroundColor Cyan
Write-Host "1. Neon: paste DATABASE_URL in Render env"
Write-Host "2. Render: connect GitHub repo, use render.yaml blueprint"
Write-Host "3. Render env: DATABASE_URL, JWT_SECRET, CORS_ORIGIN=<vercel-url>"
Write-Host "4. Update Vercel NEXT_PUBLIC_API_URL with Render URL"
