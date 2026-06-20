# Complete email setup: upgrade Render OR verify Resend domain, then deploy
$ErrorActionPreference = 'Stop'

$ServiceId = 'srv-d8qqtpnavr4c73dnias0'
$RenderCli = "$env:LOCALAPPDATA\render-cli-v2\cli_v2.19.0.exe"
$Gh = 'C:\Program Files\GitHub CLI\gh.exe'
$Root = Join-Path $PSScriptRoot '..'
$Domain = 'tradepulse.io'
$FromAddress = 'noreply@tradepulse.io'

Write-Host '==> Step 1: Test Resend domain...'
& (Join-Path $PSScriptRoot 'test-resend-send.ps1') | Out-Host
if ($LASTEXITCODE -eq 0) {
  Write-Host '    Resend domain already verified.'
  $useResendDomain = $true
} else {
  Write-Host '    tradepulse.io not verified on Resend yet.'
  $useResendDomain = $false
}

if (-not $useResendDomain) {
  Write-Host ''
  Write-Host '==> Step 2: Try upgrading Render to Starter (enables Gmail SMTP)...'
  $cliYaml = Get-Content "$env:USERPROFILE\.render\cli.yaml" -Raw
  $renderKey = ([regex]::Match($cliYaml, 'key: (rnd_\S+)')).Groups[1].Value
  if (-not $renderKey) { throw 'Render API key not found' }
  $headers = @{ Authorization = "Bearer $renderKey"; 'Content-Type' = 'application/json' }
  $upgraded = $false
  try {
    $patch = @{ serviceDetails = @{ plan = 'starter' } } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Method Patch -Uri "https://api.render.com/v1/services/$ServiceId" -Headers $headers -Body $patch | Out-Null
    Write-Host '    Upgraded to Starter plan.'
    $upgraded = $true
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match '402|payment') {
      Write-Host '    Payment required on Render - cannot auto-upgrade.'
    } else {
      Write-Host "    Upgrade failed: $msg"
    }
  }

  if (-not $upgraded) {
    Write-Host ''
    Write-Host '==> Manual step required: verify tradepulse.io on Resend'
    Write-Host '    1. Open https://resend.com/domains'
    Write-Host '    2. Add domain: tradepulse.io'
    Write-Host '    3. Add DNS records at name.com (DNS host for tradepulse.io)'
    Write-Host '    4. Wait until status = Verified'
    Write-Host '    5. Re-run: powershell -File scripts/finish-email-setup.ps1'
    Write-Host ''
    Write-Host '    Opening Resend domains in browser...'
    Start-Process 'https://resend.com/domains'
    exit 2
  }

  # Starter plan: use Gmail SMTP
  Write-Host '    Using Gmail SMTP on paid Render.'
  $env:GMAIL_SMTP_MODE = 'true'
}

Write-Host ''
Write-Host '==> Step 3: Commit and push code...'
Push-Location $Root
try {
  git add .env.example backend/src/config/env.ts backend/src/services/email/email-service.ts `
    scripts/fix-render-eu.ps1 scripts/setup-resend-domain.ps1 scripts/test-resend-send.ps1 `
    scripts/finish-email-setup.ps1
  $status = git status --porcelain
  if ($status) {
    git -c user.email='tradepulse252@gmail.com' -c user.name='tradepulse252' commit -m "Fix email on Render: Resend HTTP first, skip blocked SMTP on free tier"
    if (Test-Path $Gh) {
      & $Gh auth status 2>$null | Out-Null
      git push origin main
      Write-Host '    Pushed to origin/main'
    } else {
      Write-Host '    Committed locally - push manually: git push origin main'
    }
  } else {
    Write-Host '    No code changes to commit'
  }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host '==> Step 4: Deploy to Render...'
& (Join-Path $PSScriptRoot 'fix-render-eu.ps1')

Write-Host ''
Write-Host '==> Step 5: Verify email send...'
& (Join-Path $PSScriptRoot 'test-resend-send.ps1')
if ($LASTEXITCODE -eq 0) {
  Write-Host ''
  Write-Host 'Done. Email is working.'
} else {
  Write-Host ''
  Write-Host 'Deploy complete. Try registering on the app to confirm email delivery.'
}
