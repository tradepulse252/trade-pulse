# Trade-Pulse — finish production deploy (GitHub + Render backend)
# Run from repo root after: gh auth login

$ErrorActionPreference = 'Stop'
$RenderCli = "$env:LOCALAPPDATA\render-cli\cli_v1.1.0.exe"
$Gh = 'C:\Program Files\GitHub CLI\gh.exe'
$FrontendUrl = 'https://frontend-omega-two-31.vercel.app'
$NeonOrg = 'org-crimson-night-79903682'
$NeonProject = 'aged-heart-97671343'

Write-Host '==> Checking GitHub auth...'
& $Gh auth status | Out-Null

Write-Host '==> Creating GitHub repo and pushing...'
if (-not (git remote | Select-String -Quiet 'origin')) {
  & $Gh repo create trade-pulse --public --source=. --remote=origin --push
} else {
  git push -u origin main
}

$repoUrl = (& $Gh repo view --json url -q .url)
Write-Host "    Repo: $repoUrl"

Write-Host '==> Setting Render workspace...'
& $RenderCli workspace set tea-d8qptanlk1mc73b03410 --confirm --output text | Out-Null

Write-Host '==> Fetching Neon DATABASE_URL...'
$databaseUrl = neonctl connection-string `
  --project-id $NeonProject `
  --branch production `
  --org-id $NeonOrg `
  --database-name neondb `
  --role-name neondb_owner `
  --pooled

$jwt = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

Write-Host '==> Creating Render backend service...'
& $RenderCli services create `
  --name tradepulse-api `
  --type web_service `
  --runtime node `
  --region oregon `
  --plan free `
  --repo "$repoUrl.git" `
  --branch main `
  --root-directory backend `
  --build-command "npm install && npx prisma migrate deploy && npx prisma generate && npm run build" `
  --start-command "npm start" `
  --health-check-path /api/health `
  --env-var "NODE_ENV=production" `
  --env-var "DATABASE_URL=$databaseUrl" `
  --env-var "JWT_SECRET=$jwt" `
  --env-var "CORS_ORIGIN=$FrontendUrl" `
  --env-var "BINANCE_REST_BASE=https://fapi.binance.com" `
  --env-var "BINANCE_WS_BASE=wss://fstream.binance.com" `
  --env-var "MIN_VOLUME_USDT=1000000" `
  --env-var "MIN_OPEN_INTEREST_USDT=500000" `
  --env-var "SCORING_INTERVAL_MS=5000" `
  --env-var "OI_REFRESH_INTERVAL_MS=60000" `
  --confirm `
  --output json

Write-Host '==> Done. Backend URL: https://tradepulse-api.onrender.com'
Write-Host '    Health: https://tradepulse-api.onrender.com/api/health'
Write-Host "    Frontend: $FrontendUrl"
Write-Host '    First API request may take ~30s while Render free tier wakes up.'
