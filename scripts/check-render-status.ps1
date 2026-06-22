# Check Render backend status for TradePulse
$ErrorActionPreference = 'Stop'
$RenderCli = "$env:LOCALAPPDATA\render-cli-v2\cli_v2.19.0.exe"

if (-not (Test-Path $RenderCli)) {
  Write-Host 'Render CLI not found. Install: https://render.com/docs/cli'
  exit 1
}

$services = & $RenderCli services list --output json | ConvertFrom-Json
foreach ($row in $services) {
  $s = $row.service
  Write-Host ""
  Write-Host "==> $($s.name) ($($s.serviceDetails.url))"
  Write-Host "    Status: $($s.suspended)"
  if ($s.suspenders) { Write-Host "    Reason: $($s.suspenders -join ', ')" }
}

Write-Host ""
Write-Host "If suspended=billing: open https://dashboard.render.com → Billing → add payment method or wait for next billing period."
Write-Host "Billing-suspended services cannot be resumed via API — only user-suspended ones can."
