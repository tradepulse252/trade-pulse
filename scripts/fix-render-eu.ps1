# Fix and redeploy tradepulse-api-eu on Render
$ErrorActionPreference = 'Stop'

$ServiceId = 'srv-d8qqtpnavr4c73dnias0'
$RenderCli = "$env:LOCALAPPDATA\render-cli-v2\cli_v2.19.0.exe"
$FrontendUrl = 'https://frontend-omega-two-31.vercel.app'
$NeonOrg = 'org-crimson-night-79903682'
$NeonProject = 'aged-heart-97671343'

Write-Host '==> Reading Render API key...'
$cliYaml = Get-Content "$env:USERPROFILE\.render\cli.yaml" -Raw
$key = ([regex]::Match($cliYaml, 'key: (rnd_\S+)')).Groups[1].Value
if (-not $key) { throw 'Render API key not found. Run: render login' }

$headers = @{
  Authorization = "Bearer $key"
  'Content-Type' = 'application/json'
}

Write-Host '==> Fetching Neon DATABASE_URL...'
$databaseUrl = neonctl connection-string `
  --project-id $NeonProject `
  --branch production `
  --org-id $NeonOrg `
  --database-name neondb `
  --role-name neondb_owner `
  --pooled

$jwt = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

Write-Host '==> Updating service build/start commands...'
$patchBody = @{
  serviceDetails = @{
    env = 'node'
    buildCommand = 'npm install && npx prisma migrate deploy && npx prisma generate && npm run build'
    startCommand = 'npm start'
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Patch `
  -Uri "https://api.render.com/v1/services/$ServiceId" `
  -Headers $headers `
  -Body $patchBody | Out-Null

Write-Host '==> Setting environment variables...'
$productionFromAddress = 'onboarding@resend.dev'
$envVars = @(
  @{ key = 'NODE_ENV'; value = 'production' },
  @{ key = 'DATABASE_URL'; value = $databaseUrl },
  @{ key = 'JWT_SECRET'; value = $jwt },
  @{ key = 'CORS_ORIGIN'; value = $FrontendUrl },
  @{ key = 'BINANCE_REST_BASE'; value = 'https://fapi.binance.com' },
  @{ key = 'BINANCE_WS_BASE'; value = 'wss://fstream.binance.com' },
  @{ key = 'MIN_VOLUME_USDT'; value = '1000000' },
  @{ key = 'MIN_OPEN_INTEREST_USDT'; value = '500000' },
  @{ key = 'SCORING_INTERVAL_MS'; value = '5000' },
  @{ key = 'OI_REFRESH_INTERVAL_MS'; value = '60000' },
  @{ key = 'REDIS_URL'; value = '' },
  @{ key = 'FRONTEND_URL'; value = $FrontendUrl },
  @{ key = 'EMAIL_REPLY_TO'; value = 'tradepulse252@gmail.com' },
  @{ key = 'EMAIL_FROM_NAME'; value = 'Trade Pulse' },
  @{ key = 'GMAIL_USER'; value = 'tradepulse252@gmail.com' },
  @{ key = 'EMAIL_USE_SMTP'; value = 'false' }
)

# Set secrets from local .env files (backend/.env and root .env)
$envFiles = @(
  (Join-Path $PSScriptRoot '..\backend\.env'),
  (Join-Path $PSScriptRoot '..\.env')
)
foreach ($envFile in $envFiles) {
  if (-not (Test-Path $envFile)) { continue }
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^BINANCE_API_KEY=(.+)$') { $envVars += @{ key = 'BINANCE_API_KEY'; value = $Matches[1].Trim() } }
    if ($line -match '^BINANCE_API_SECRET=(.+)$') { $envVars += @{ key = 'BINANCE_API_SECRET'; value = $Matches[1].Trim() } }
    if ($line -match '^RESEND_API_KEY=(.+)$') { $envVars += @{ key = 'RESEND_API_KEY'; value = $Matches[1].Trim() } }
    if ($line -match '^EMAIL_FROM_NAME=(.+)$') { $envVars += @{ key = 'EMAIL_FROM_NAME'; value = $Matches[1].Trim() } }
    if ($line -match '^EMAIL_FROM=(.+)$') { $envVars += @{ key = 'EMAIL_FROM'; value = $Matches[1].Trim() } }
    if ($line -match '^EMAIL_REPLY_TO=(.+)$') { $envVars += @{ key = 'EMAIL_REPLY_TO'; value = $Matches[1].Trim() } }
    if ($line -match '^GMAIL_USER=(.+)$') { $envVars += @{ key = 'GMAIL_USER'; value = $Matches[1].Trim() } }
    # GMAIL_APP_PASSWORD intentionally omitted for Render on free tier
    if ($line -match '^RESEND_FROM_ADDRESS=(.+)$') {
      $val = $Matches[1].Trim()
      if ($val) { $productionFromAddress = $val }
      $envVars += @{ key = 'RESEND_FROM_ADDRESS'; value = $val }
    }
    if ($line -match '^FRONTEND_URL=(.+)$') { $envVars += @{ key = 'FRONTEND_URL'; value = $Matches[1].Trim() } }
  }
}

# Use verified domain sender if Resend accepts it; otherwise fall back to test sender
if ($productionFromAddress -ne 'onboarding@resend.dev') {
  Write-Host "==> Testing Resend sender: $productionFromAddress"
  $testScript = Join-Path $PSScriptRoot 'test-resend-send.ps1'
  & $testScript -To 'tradepulse252@gmail.com' 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host '    Domain not verified yet - using onboarding@resend.dev (owner email only)'
    $productionFromAddress = 'onboarding@resend.dev'
  } else {
    Write-Host '    Domain verified - using production sender'
  }
}

$renderPlan = 'free'
try {
  $svc = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$ServiceId" -Headers $headers
  $renderPlan = $svc.serviceDetails.plan
  Write-Host "==> Render plan: $renderPlan"
} catch {
  Write-Host '==> Could not read Render plan - assuming free'
}

if ($renderPlan -ne 'free') {
  Write-Host '==> Paid Render - enabling Gmail SMTP'
  $envVars += @{ key = 'EMAIL_USE_SMTP'; value = 'true' }
  $envVars += @{ key = 'EMAIL_FROM_ADDRESS'; value = 'tradepulse252@gmail.com' }
  foreach ($envFile in $envFiles) {
    if (-not (Test-Path $envFile)) { continue }
    foreach ($line in Get-Content $envFile) {
      if ($line -match '^GMAIL_APP_PASSWORD=(.+)$') {
        $envVars += @{ key = 'GMAIL_APP_PASSWORD'; value = $Matches[1].Trim() }
      }
    }
  }
} else {
  Write-Host '==> Free Render - Resend only (SMTP blocked)'
  try {
    Invoke-RestMethod -Method Delete `
      -Uri "https://api.render.com/v1/services/$ServiceId/env-vars/GMAIL_APP_PASSWORD" `
      -Headers $headers | Out-Null
    Write-Host '    removed GMAIL_APP_PASSWORD'
  } catch {
    Write-Host '    GMAIL_APP_PASSWORD not set on Render'
  }
  $envVars += @{ key = 'EMAIL_FROM_ADDRESS'; value = $productionFromAddress }
}

# Dedupe by key — later entries (root .env) override backend/.env
$deduped = @{}
foreach ($ev in $envVars) {
  if (-not [string]::IsNullOrWhiteSpace($ev.value)) {
    $deduped[$ev.key] = $ev.value
  }
}

foreach ($key in ($deduped.Keys | Sort-Object)) {
  $value = $deduped[$key]
  $body = @{ value = $value } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Put `
      -Uri "https://api.render.com/v1/services/$ServiceId/env-vars/$key" `
      -Headers $headers `
      -Body $body | Out-Null
    Write-Host "    set $key"
  } catch {
    $createBody = @(@{ key = $key; value = $value }) | ConvertTo-Json
    Invoke-RestMethod -Method Post `
      -Uri "https://api.render.com/v1/services/$ServiceId/env-vars" `
      -Headers $headers `
      -Body $createBody | Out-Null
    Write-Host "    created $key"
  }
}

Write-Host '==> Triggering deploy (waiting)...'
& $RenderCli deploys create $ServiceId --wait --confirm --output text

Write-Host '==> Done. Health: https://tradepulse-api-eu.onrender.com/api/health'
Write-Host '    Markets: https://tradepulse-api-eu.onrender.com/api/markets?limit=3'
