# Quick test: Resend test sender (onboarding@resend.dev)
$ErrorActionPreference = 'Stop'
$envFiles = @((Join-Path $PSScriptRoot '..\.env'), (Join-Path $PSScriptRoot '..\backend\.env'))
$apiKey = $null
foreach ($envFile in $envFiles) {
  if (-not (Test-Path $envFile)) { continue }
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^RESEND_API_KEY=(.+)$') { $apiKey = $Matches[1].Trim() }
  }
}
$body = '{"from":"Trade Pulse <onboarding@resend.dev>","to":["tradepulse252@gmail.com"],"reply_to":"tradepulse252@gmail.com","subject":"Trade-Pulse test","html":"<p>Email works.</p>"}'
$tmp = [System.IO.Path]::GetTempFileName()
$out = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tmp -Value $body -Encoding ascii -NoNewline
$raw = curl.exe -sS --max-time 60 -X POST 'https://api.resend.com/emails' -H "Authorization: Bearer $apiKey" -H 'Content-Type: application/json' --data-binary "@$tmp" -w "`nHTTP:%{http_code}" -o $out
Write-Host (Get-Content $out -Raw)
Write-Host $raw
Remove-Item $tmp, $out -ErrorAction SilentlyContinue
