# Add tradepulse.io to Resend and show DNS records / verification status
$ErrorActionPreference = 'Stop'
$Domain = 'tradepulse.io'

$envFiles = @(
  (Join-Path $PSScriptRoot '..\.env'),
  (Join-Path $PSScriptRoot '..\backend\.env')
)
$apiKey = $null
foreach ($envFile in $envFiles) {
  if (-not (Test-Path $envFile)) { continue }
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^RESEND_API_KEY=(.+)$') { $apiKey = $Matches[1].Trim() }
  }
}
if (-not $apiKey) { throw 'RESEND_API_KEY not found in .env' }

function Invoke-ResendJson($Method, $Path, $BodyObj) {
  $tmpIn = [System.IO.Path]::GetTempFileName()
  $tmpOut = [System.IO.Path]::GetTempFileName()
  try {
    if ($BodyObj) {
      ($BodyObj | ConvertTo-Json -Compress) | Set-Content -Path $tmpIn -Encoding ascii -NoNewline
      $args = @('-sS', '--max-time', '60', '-X', $Method, "https://api.resend.com$Path", '-H', "Authorization: Bearer $apiKey", '-H', 'Content-Type: application/json', '--data-binary', "@$tmpIn", '-w', "`nHTTP_STATUS:%{http_code}", '-o', $tmpOut)
    } else {
      $args = @('-sS', '--max-time', '60', '-X', $Method, "https://api.resend.com$Path", '-H', "Authorization: Bearer $apiKey", '-H', 'Content-Type: application/json', '-w', "`nHTTP_STATUS:%{http_code}", '-o', $tmpOut)
    }
    $raw = & curl.exe @args 2>&1 | Out-String
    $status = 0
    if ($raw -match 'HTTP_STATUS:(\d+)') { $status = [int]$Matches[1] }
    $body = Get-Content -Path $tmpOut -Raw -ErrorAction SilentlyContinue
    if ($status -lt 200 -or $status -ge 300) {
      throw "Resend $Method $Path failed ($status): $body"
    }
    if ([string]::IsNullOrWhiteSpace($body)) { return $null }
    return $body | ConvertFrom-Json
  } finally {
    Remove-Item $tmpIn, $tmpOut -ErrorAction SilentlyContinue
  }
}

Write-Host '==> Checking Resend domains...'
$list = Invoke-ResendJson GET '/domains'
$existing = @($list.data) | Where-Object { $_.name -eq $Domain } | Select-Object -First 1

if ($existing) {
  Write-Host "    Found $Domain (status: $($existing.status))"
  $domainId = $existing.id
} else {
  Write-Host "==> Adding $Domain to Resend..."
  try {
    $created = Invoke-ResendJson POST '/domains' @{ name = $Domain }
    $domainId = $created.id
    Write-Host "    Created (status: $($created.status))"
  } catch {
    Write-Host "    Add failed: $_"
    $list = Invoke-ResendJson GET '/domains'
    $existing = @($list.data) | Where-Object { $_.name -eq $Domain } | Select-Object -First 1
    if (-not $existing) { throw }
    $domainId = $existing.id
  }
}

$detail = Invoke-ResendJson GET "/domains/$domainId"
Write-Host ''
Write-Host "--- Domain: $($detail.name) ---"
Write-Host "Status: $($detail.status)"
Write-Host ''
Write-Host '--- DNS records (add at name.com for tradepulse.io) ---'
foreach ($r in @($detail.records)) {
  Write-Host ''
  Write-Host "$($r.type)  $($r.name)"
  Write-Host "  Value:  $($r.value)"
  Write-Host "  Status: $($r.status)"
}

if ($detail.status -eq 'verified') {
  Write-Host ''
  Write-Host 'OK: Domain verified - noreply@tradepulse.io is ready.'
  exit 0
}

Write-Host ''
Write-Host 'Pending: Add DNS records at name.com, wait a few minutes, re-run this script.'
exit 2
