$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (Test-Path (Join-Path $repoRoot ".git/MERGE_HEAD")) {
  Write-Host "Merge in progress. Resolve or abort before syncing."
  exit 1
}

& node "scripts/build-gallery.mjs"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$status = & git status --porcelain
if (-not $status) {
  Write-Host "Nothing to commit."
  exit 0
}

& git rev-parse --abbrev-ref --symbolic-full-name "@{u}" *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "No upstream configured. Set one with: git push -u origin main"
  exit 1
}

& git add -A
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "Nothing to commit."
  exit 0
}

$message = Read-Host "Commit message (default: Update portfolio)"
if ([string]::IsNullOrWhiteSpace($message)) {
  $message = "Update portfolio"
}

& git commit -m $message
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& git push
