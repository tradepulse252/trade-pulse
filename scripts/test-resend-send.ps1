# Test Resend send with noreply@tradepulse.io (send-only API key)
param(
  [string]$To = 'tradepulse252@gmail.com'
)
$ErrorActionPreference = 'Stop'

$envFiles = @(
  (Join-Path $PSScriptRoot '..\.env'),
  (Join-Path $PSScriptRoot '..\backend\.env')
)
$apiKey = $null
$from = 'noreply@tradepulse.io'
foreach ($envFile in $envFiles) {
  if (-not (Test-Path $envFile)) { continue }
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^RESEND_API_KEY=(.+)$') { $apiKey = $Matches[1].Trim() }
    if ($line -match '^RESEND_FROM_ADDRESS=(.+)$') { $from = $Matches[1].Trim() }
  }
}
if (-not $apiKey) { throw 'RESEND_API_KEY not found' }

$body = @{
  from = "Trade Pulse <$from>"
  to = @($To)
  reply_to = 'tradepulse252@gmail.com'
  subject = 'Trade-Pulse email test'
  html = '<p>If you received this, Resend is configured correctly.</p>'
} | ConvertTo-Json -Compress

$tmp = [System.IO.Path]::GetTempFileName()
$out = [System.IO.Path]::GetTempFileName()
try {
  Set-Content -Path $tmp -Value $body -Encoding ascii -NoNewline
  $raw = curl.exe -sS --max-time 60 -X POST 'https://api.resend.com/emails' `
    -H "Authorization: Bearer $apiKey" `
    -H 'Content-Type: application/json' `
    --data-binary "@$tmp" `
    -w "`nHTTP_STATUS:%{http_code}" `
    -o $out 2>&1 | Out-String
  $status = 0
  if ($raw -match 'HTTP_STATUS:(\d+)') { $status = [int]$Matches[1] }
  $resp = Get-Content -Path $out -Raw
  Write-Host "Status: $status"
  Write-Host $resp
  if ($status -lt 200 -or $status -ge 300) { exit 1 }
  exit 0
} finally {
  Remove-Item $tmp, $out -ErrorAction SilentlyContinue
}
