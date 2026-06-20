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
  @{ key = 'EMAIL_FROM'; value = 'Trade Pulse <onboarding@resend.dev>' }
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
    if ($line -match '^EMAIL_FROM=(.+)$') { $envVars += @{ key = 'EMAIL_FROM'; value = $Matches[1].Trim() } }
    if ($line -match '^EMAIL_REPLY_TO=(.+)$') { $envVars += @{ key = 'EMAIL_REPLY_TO'; value = $Matches[1].Trim() } }
    if ($line -match '^FRONTEND_URL=(.+)$') { $envVars += @{ key = 'FRONTEND_URL'; value = $Matches[1].Trim() } }
  }
}

foreach ($ev in $envVars) {
  $body = @{ value = $ev.value } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Put `
      -Uri "https://api.render.com/v1/services/$ServiceId/env-vars/$($ev.key)" `
      -Headers $headers `
      -Body $body | Out-Null
    Write-Host "    set $($ev.key)"
  } catch {
    # Create if missing
    $createBody = @(@{ key = $ev.key; value = $ev.value }) | ConvertTo-Json
    Invoke-RestMethod -Method Post `
      -Uri "https://api.render.com/v1/services/$ServiceId/env-vars" `
      -Headers $headers `
      -Body $createBody | Out-Null
    Write-Host "    created $($ev.key)"
  }
}

Write-Host '==> Triggering deploy (waiting)...'
& $RenderCli deploys create $ServiceId --wait --confirm --output text

Write-Host '==> Done. Health: https://tradepulse-api-eu.onrender.com/api/health'
Write-Host '    Markets: https://tradepulse-api-eu.onrender.com/api/markets?limit=3'
