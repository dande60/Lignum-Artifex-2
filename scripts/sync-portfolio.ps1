$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$galleryJson = "assets/data/gallery.json"
$galleryRoot = "assets/images/gallery"

function Invoke-GitCapture {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  $output = & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed."
  }
  return $output
}

function Get-CurrentBranch {
  return (Invoke-GitCapture @("branch", "--show-current")).Trim()
}

function Get-GalleryStatus {
  $output = & git status --porcelain --untracked-files=all -- $galleryJson $galleryRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read gallery git status."
  }

  if (-not $output) {
    return @()
  }

  return @($output)
}

function Get-StagedPaths {
  $output = & git diff --cached --name-only
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read staged paths."
  }

  if (-not $output) {
    return @()
  }

  return @($output)
}

function Get-ChangedPaths {
  $paths = New-Object System.Collections.Generic.List[string]

  $unstaged = & git diff --name-only
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read unstaged paths."
  }
  if ($unstaged) {
    foreach ($path in @($unstaged)) {
      $paths.Add($path)
    }
  }

  foreach ($path in Get-StagedPaths) {
    $paths.Add($path)
  }

  $untracked = & git ls-files --others --exclude-standard
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read untracked paths."
  }
  if ($untracked) {
    foreach ($path in @($untracked)) {
      $paths.Add($path)
    }
  }

  return @($paths | Select-Object -Unique)
}

function Test-IsGalleryPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return $Path -eq $galleryJson -or $Path.StartsWith("$galleryRoot/")
}

function Get-RemoteInfo {
  $remoteUrl = (Invoke-GitCapture @("remote", "get-url", "origin")).Trim()
  $webUrl = $remoteUrl

  if ($webUrl.EndsWith(".git")) {
    $webUrl = $webUrl.Substring(0, $webUrl.Length - 4)
  }

  if ($webUrl.StartsWith("git@github.com:")) {
    $webUrl = "https://github.com/" + $webUrl.Substring("git@github.com:".Length)
  }

  return @{
    RemoteUrl = $remoteUrl
    WebUrl = $webUrl
  }
}

function New-MainSafeBranchName {
  return "codex/gallery-update-" + (Get-Date -Format "yyyyMMdd-HHmmss")
}

if (Test-Path (Join-Path $repoRoot ".git/MERGE_HEAD")) {
  Write-Host "Merge in progress. Resolve or abort before syncing."
  exit 1
}

& node "scripts/build-gallery.mjs"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$galleryStatus = Get-GalleryStatus
if (-not $galleryStatus) {
  Write-Host "Nothing to commit."
  exit 0
}

$currentBranch = Get-CurrentBranch
$startedOnMain = $currentBranch -eq "main"
$createdBranch = $null

$stagedOutsideGallery = @(Get-StagedPaths | Where-Object { -not (Test-IsGalleryPath $_) })
if ($stagedOutsideGallery.Count -gt 0) {
  Write-Host "Staged files outside the gallery flow were detected:"
  $stagedOutsideGallery | ForEach-Object { Write-Host " - $_" }
  Write-Host "Unstage or commit those files separately, then re-run."
  exit 1
}

$changedOutsideGallery = @(Get-ChangedPaths | Where-Object { -not (Test-IsGalleryPath $_) })
if ($changedOutsideGallery.Count -gt 0) {
  Write-Host "Changes outside the gallery flow were detected:"
  $changedOutsideGallery | ForEach-Object { Write-Host " - $_" }
  Write-Host "Commit, stash, or discard those files separately, then re-run."
  exit 1
}

& git add -- $galleryJson $galleryRoot
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "Nothing to commit."
  exit 0
}

if ($startedOnMain) {
  $createdBranch = New-MainSafeBranchName
  Write-Host "Protected main detected. Creating branch $createdBranch..."
  & git switch -c $createdBranch
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
  $currentBranch = $createdBranch
}

$message = Read-Host "Commit message (default: Update portfolio)"
if ([string]::IsNullOrWhiteSpace($message)) {
  $message = "Update portfolio"
}

& git commit -m $message
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

if ($createdBranch) {
  Write-Host "Fetching latest main before pushing branch..."
  & git fetch origin
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  & git rebase origin/main
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Rebase onto origin/main failed. Resolve conflicts, then run: git rebase --continue"
    exit $LASTEXITCODE
  }

  & git push -u origin $createdBranch
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $remoteInfo = Get-RemoteInfo
  $prUrl = "$($remoteInfo.WebUrl)/compare/main...${createdBranch}?expand=1"
  Write-Host ""
  Write-Host "Branch created: $createdBranch"
  Write-Host "Open this PR URL:"
  Write-Host $prUrl
  exit 0
}

& git rev-parse --abbrev-ref --symbolic-full-name "@{u}" *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "No upstream configured. Set one with: git push -u origin $currentBranch"
  exit 1
}

& git push
