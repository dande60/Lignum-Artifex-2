$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$galleryJson = "assets/data/gallery.json"
$galleryRoot = "assets/images/gallery"
$desktopResultPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "gallery-sync-result.txt"
$defaultCommitMessage = "Update portfolio"
$defaultMergeMethod = "squash"

$status = [ordered]@{
  Timestamp = (Get-Date).ToString("s")
  RepoPath = $repoRoot
  RepoName = Split-Path -Leaf $repoRoot
  StartedBranch = $null
  MainSync = "Not attempted"
  BranchName = $null
  CommitHash = $null
  PrUrl = $null
  CompareUrl = $null
  AutoMergeState = "Not attempted"
  FinalStatus = "FAILED"
  Stage = "Starting"
  Summary = "Gallery sync did not complete."
  NextStep = "Review the error output in this window."
}

function Invoke-CommandCapture {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,

    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  $output = & $Command @Args 2>&1
  if ($LASTEXITCODE -ne 0) {
    $message = ($output | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($message)) {
      $message = "$Command $($Args -join ' ') failed."
    }
    throw $message
  }

  return $output
}

function Invoke-GitCapture {
  param(
    [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  return Invoke-CommandCapture -Command "git" -Args (@("-c", "core.safecrlf=false") + $Args)
}

function Test-CommandAvailable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-CurrentBranch {
  return ((Invoke-GitCapture -Args @("branch", "--show-current")) | Out-String).Trim()
}

function Get-CleanGitLines {
  param(
    [Parameter(Mandatory = $false)]
    [object[]]$Lines
  )

  if (-not $Lines) {
    return @()
  }

  return @(
    $Lines |
      ForEach-Object { [string]$_ } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Where-Object { -not $_.StartsWith("warning:") }
  )
}

function Get-GalleryStatus {
  $output = Invoke-GitCapture -Args @("status", "--porcelain", "--untracked-files=all", "--", $galleryJson, $galleryRoot)
  $cleanOutput = Get-CleanGitLines $output
  if (-not $cleanOutput) {
    return @()
  }

  return $cleanOutput
}

function Get-StagedPaths {
  $output = Invoke-GitCapture -Args @("diff", "--cached", "--name-only")
  $cleanOutput = Get-CleanGitLines $output
  if (-not $cleanOutput) {
    return @()
  }

  return $cleanOutput
}

function Get-ChangedPaths {
  $paths = New-Object System.Collections.Generic.List[string]

  $unstaged = Invoke-GitCapture -Args @("diff", "--name-only")
  $unstaged = Get-CleanGitLines $unstaged
  if ($unstaged) {
    foreach ($path in @($unstaged)) {
      $paths.Add($path)
    }
  }

  foreach ($path in Get-StagedPaths) {
    $paths.Add($path)
  }

  $untracked = Invoke-GitCapture -Args @("ls-files", "--others", "--exclude-standard")
  $untracked = Get-CleanGitLines $untracked
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
  $remoteUrl = ((Invoke-GitCapture -Args @("remote", "get-url", "origin")) | Out-String).Trim()
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

function Test-RebaseInProgress {
  return (
    (Test-Path (Join-Path $repoRoot ".git\rebase-merge")) -or
    (Test-Path (Join-Path $repoRoot ".git\rebase-apply")) -or
    (Test-Path (Join-Path $repoRoot ".git\REBASE_HEAD"))
  )
}

function Get-StashReference {
  try {
    return ((Invoke-GitCapture -Args @("rev-parse", "--verify", "refs/stash")) | Out-String).Trim()
  } catch {
    return $null
  }
}

function Get-MainSyncState {
  $countsText = ((Invoke-GitCapture -Args @("rev-list", "--left-right", "--count", "main...origin/main")) | Out-String).Trim()
  $counts = $countsText -split "\s+"
  $ahead = [int]$counts[0]
  $behind = [int]$counts[1]

  $state = if ($ahead -gt 0 -and $behind -gt 0) {
    "diverged"
  } elseif ($ahead -gt 0) {
    "ahead"
  } elseif ($behind -gt 0) {
    "behind"
  } else {
    "current"
  }

  return @{
    Ahead = $ahead
    Behind = $behind
    State = $state
  }
}

function Sync-LocalMainIfNeeded {
  Update-Status -Stage "Sync Main"

  & git -c core.safecrlf=false fetch origin
  if ($LASTEXITCODE -ne 0) {
    Update-Status -FinalStatus "FAILED" -Summary "Fetching origin failed." -NextStep "Fix the git fetch error shown above."
    throw "Git fetch failed."
  }

  $mainSyncState = Get-MainSyncState
  switch ($mainSyncState.State) {
    "current" {
      $status.MainSync = "Already current"
      return
    }
    "ahead" {
      $status.MainSync = "Manual sync required"
      Update-Status -FinalStatus "ACTION NEEDED" -Summary "Local main is ahead of origin/main." -NextStep "Push or reconcile local main manually, then rerun update-gallery.bat."
      throw "Local main is ahead of origin/main."
    }
    "diverged" {
      $status.MainSync = "Manual sync required"
      Update-Status -FinalStatus "ACTION NEEDED" -Summary "Local main has diverged from origin/main." -NextStep "Reconcile local main manually, then rerun update-gallery.bat."
      throw "Local main has diverged from origin/main."
    }
  }

  $stashRefBefore = Get-StashReference
  $stashRefAfter = $stashRefBefore
  $createdStash = $false
  $galleryChanges = Get-GalleryStatus

  if ($galleryChanges.Count -gt 0) {
    & git -c core.safecrlf=false stash push --include-untracked -m "gallery-sync-main-sync" -- $galleryJson $galleryRoot
    if ($LASTEXITCODE -ne 0) {
      Update-Status -FinalStatus "FAILED" -Summary "Could not temporarily stash gallery changes." -NextStep "Resolve the git stash error shown above."
      throw "Unable to stash gallery changes before syncing main."
    }

    $stashRefAfter = Get-StashReference
    $createdStash = $stashRefAfter -and $stashRefAfter -ne $stashRefBefore
  }

  & git -c core.safecrlf=false merge --ff-only origin/main
  if ($LASTEXITCODE -ne 0) {
    Update-Status -FinalStatus "FAILED" -Summary "Fast-forwarding local main failed." -NextStep "Reconcile local main manually, then rerun update-gallery.bat."
    throw "Fast-forwarding local main failed."
  }

  $status.MainSync = "Auto-fast-forwarded main to origin/main"

  if ($createdStash) {
    & git -c core.safecrlf=false stash apply $stashRefAfter
    if ($LASTEXITCODE -ne 0) {
      $status.MainSync = "Manual sync required"
      Update-Status -FinalStatus "ACTION NEEDED" -Summary "Gallery changes conflict with the updated main branch." -NextStep "Resolve the restored gallery conflicts on main, or abort and reapply your changes manually."
      throw "Gallery changes conflict with the updated main branch."
    }

    & git -c core.safecrlf=false stash drop $stashRefAfter *> $null
  }
}

function Update-Status {
  param(
    [string]$Stage,
    [string]$FinalStatus,
    [string]$Summary,
    [string]$NextStep,
    [string]$AutoMergeState
  )

  if ($PSBoundParameters.ContainsKey("Stage")) {
    $status.Stage = $Stage
  }
  if ($PSBoundParameters.ContainsKey("FinalStatus")) {
    $status.FinalStatus = $FinalStatus
  }
  if ($PSBoundParameters.ContainsKey("Summary")) {
    $status.Summary = $Summary
  }
  if ($PSBoundParameters.ContainsKey("NextStep")) {
    $status.NextStep = $NextStep
  }
  if ($PSBoundParameters.ContainsKey("AutoMergeState")) {
    $status.AutoMergeState = $AutoMergeState
  }
}

function Get-CommitHash {
  try {
    return ((Invoke-GitCapture -Args @("rev-parse", "--short", "HEAD")) | Out-String).Trim()
  } catch {
    return $null
  }
}

function Test-GhAuthenticated {
  if (-not (Test-CommandAvailable "gh")) {
    return $false
  }

  & gh auth status 1>$null 2>$null
  return $LASTEXITCODE -eq 0
}

function Get-ExistingPullRequestUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BranchName
  )

  $output = & gh pr list --head $BranchName --base main --state open --json url 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw (($output | Out-String).Trim())
  }

  $text = ($output | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }

  $prs = $text | ConvertFrom-Json
  if ($prs.Count -gt 0) {
    return $prs[0].url
  }

  return $null
}

function New-PullRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BranchName,

    [Parameter(Mandatory = $true)]
    [string]$CommitMessage
  )

  $title = $CommitMessage
  $body = @(
    "Automated gallery update from update-gallery.bat.",
    "",
    "- Source branch: $BranchName",
    "- Generated from gallery-only changes"
  ) -join "`n"

  $output = & gh pr create --base main --head $BranchName --title $title --body $body 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw (($output | Out-String).Trim())
  }

  return (($output | Out-String).Trim())
}

function Enable-PullRequestAutoMerge {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PrUrl
  )

  $mergeFlag = "--$defaultMergeMethod"
  $output = & gh pr merge --auto $mergeFlag $PrUrl 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw (($output | Out-String).Trim())
  }
}

function Merge-PullRequestNow {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PrUrl
  )

  $mergeFlag = "--$defaultMergeMethod"
  $output = & gh pr merge $mergeFlag $PrUrl 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw (($output | Out-String).Trim())
  }
}

function Get-PullRequestAutomationState {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PrUrl
  )

  $output = & gh pr view $PrUrl --json state,autoMergeRequest,mergeable 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw (($output | Out-String).Trim())
  }

  $text = ($output | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    throw "GitHub returned an empty response while checking PR state."
  }

  return ($text | ConvertFrom-Json)
}

function Resolve-PullRequestAutoMerge {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PrUrl
  )

  $mergeFlag = "--$defaultMergeMethod"
  $attemptErrors = New-Object System.Collections.Generic.List[string]

  for ($attempt = 1; $attempt -le 2; $attempt++) {
    $output = & gh pr merge --auto $mergeFlag $PrUrl 2>&1
    if ($LASTEXITCODE -eq 0) {
      return @{
        Success = $true
        AutoMergeState = "Enabled"
        Summary = "PR created and auto-merge enabled."
        NextStep = "No further GitHub action required."
      }
    }

    $errorText = (($output | Out-String).Trim())
    if (-not [string]::IsNullOrWhiteSpace($errorText)) {
      $attemptErrors.Add($errorText)
    }

    $shouldMergeNow = $errorText -match "Pull request is in clean status" -or $errorText -match "enablePullRequestAutoMerge"
    if ($shouldMergeNow) {
      try {
        Merge-PullRequestNow -PrUrl $PrUrl
        return @{
          Success = $true
          AutoMergeState = "Merged"
          Summary = "PR merged successfully."
          NextStep = "No further GitHub action required."
        }
      } catch {
        $mergeNowError = $_.Exception.Message
        if (-not [string]::IsNullOrWhiteSpace($mergeNowError)) {
          $attemptErrors.Add("Immediate merge failed: $mergeNowError")
        }
      }
    }

    Start-Sleep -Seconds 2

    try {
      $prState = Get-PullRequestAutomationState -PrUrl $PrUrl
      if ($prState.state -eq "MERGED") {
        return @{
          Success = $true
          AutoMergeState = "Merged"
          Summary = "PR merged successfully."
          NextStep = "No further GitHub action required."
        }
      }

      if ($prState.mergeable -eq "MERGEABLE") {
        try {
          Merge-PullRequestNow -PrUrl $PrUrl
          return @{
            Success = $true
            AutoMergeState = "Merged"
            Summary = "PR merged successfully."
            NextStep = "No further GitHub action required."
          }
        } catch {
          $mergeableError = $_.Exception.Message
          if (-not [string]::IsNullOrWhiteSpace($mergeableError)) {
            $attemptErrors.Add("Immediate merge failed: $mergeableError")
          }
        }
      }

      if ($null -ne $prState.autoMergeRequest) {
        return @{
          Success = $true
          AutoMergeState = "Enabled"
          Summary = "PR created and auto-merge enabled."
          NextStep = "No further GitHub action required."
        }
      }
    } catch {
      $stateError = $_.Exception.Message
      if (-not [string]::IsNullOrWhiteSpace($stateError)) {
        $attemptErrors.Add("PR status check failed: $stateError")
      }
    }
  }

  $detail = @($attemptErrors | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique) -join " | "
  if ([string]::IsNullOrWhiteSpace($detail)) {
    $detail = "GitHub did not confirm auto-merge."
  }

  return @{
    Success = $false
    AutoMergeState = "Failed to enable"
    Summary = "PR created, but auto-merge could not be enabled."
    NextStep = "Open the PR URL to review the blocking rule or merge manually. GitHub said: $detail"
  }
}

function Write-ResultFile {
  $lines = @(
    "Timestamp: $($status.Timestamp)",
    "Repository: $($status.RepoName)",
    "Repo Path: $($status.RepoPath)",
    "Started Branch: $($status.StartedBranch)",
    "Main Sync: $($status.MainSync)",
    "Branch: $($status.BranchName)",
    "Commit: $($status.CommitHash)",
    "PR URL: $($status.PrUrl)",
    "Compare URL: $($status.CompareUrl)",
    "Auto-Merge: $($status.AutoMergeState)",
    "Final Status: $($status.FinalStatus)",
    "Stage: $($status.Stage)",
    "Summary: $($status.Summary)",
    "Next Step: $($status.NextStep)"
  )

  Set-Content -Path $desktopResultPath -Value ($lines -join "`r`n") -Encoding ascii
}

function Write-StatusSummary {
  $label = switch ($status.FinalStatus) {
    "SUCCESS" { "[SUCCESS]" }
    "ACTION NEEDED" { "[ACTION NEEDED]" }
    default { "[FAILED]" }
  }

  Write-Host ""
  Write-Host "================ Gallery Sync Result ================"
  Write-Host "$label $($status.Summary)"
  Write-Host "Stage: $($status.Stage)"
  Write-Host "Started Branch: $($status.StartedBranch)"
  Write-Host "Main Sync: $($status.MainSync)"
  Write-Host "Branch: $($status.BranchName)"
  Write-Host "Commit: $($status.CommitHash)"
  Write-Host "PR URL: $($status.PrUrl)"
  Write-Host "Compare URL: $($status.CompareUrl)"
  Write-Host "Auto-Merge: $($status.AutoMergeState)"
  Write-Host "Next Step: $($status.NextStep)"
  Write-Host "Desktop Result: $desktopResultPath"
  Write-Host "===================================================="
}

$exitCode = 0

try {
  $status.StartedBranch = Get-CurrentBranch
  $status.BranchName = $status.StartedBranch
  $remoteInfo = Get-RemoteInfo

  if (Test-Path (Join-Path $repoRoot ".git/MERGE_HEAD")) {
    Update-Status -Stage "Preflight" -FinalStatus "FAILED" -Summary "Merge in progress." -NextStep "Resolve or abort the merge, then run update-gallery.bat again."
    throw "Merge in progress. Resolve or abort before syncing."
  }

  if (Test-RebaseInProgress) {
    $status.MainSync = "Manual sync required"
    Update-Status -Stage "Preflight" -FinalStatus "FAILED" -Summary "Rebase already in progress." -NextStep "Run git rebase --abort or finish the rebase, then rerun update-gallery.bat."
    throw "Rebase already in progress."
  }

  Update-Status -Stage "Preflight"
  $stagedOutsideGallery = @(Get-StagedPaths | Where-Object { -not (Test-IsGalleryPath $_) })
  if ($stagedOutsideGallery.Count -gt 0) {
    Update-Status -Stage "Preflight" -FinalStatus "FAILED" -Summary "Staged files outside the gallery flow were detected." -NextStep "Unstage or commit non-gallery files separately, then rerun."
    throw "Staged files outside the gallery flow were detected: $($stagedOutsideGallery -join ', ')"
  }

  $changedOutsideGallery = @(Get-ChangedPaths | Where-Object { -not (Test-IsGalleryPath $_) })
  if ($changedOutsideGallery.Count -gt 0) {
    Update-Status -Stage "Preflight" -FinalStatus "FAILED" -Summary "Changes outside the gallery flow were detected." -NextStep "Commit, stash, or discard non-gallery files separately, then rerun."
    throw "Changes outside the gallery flow were detected: $($changedOutsideGallery -join ', ')"
  }

  if ($status.StartedBranch -eq "main") {
    Sync-LocalMainIfNeeded
  }

  Update-Status -Stage "Build"
  & node "scripts/build-gallery.mjs"
  if ($LASTEXITCODE -ne 0) {
    Update-Status -FinalStatus "FAILED" -Summary "Gallery build failed." -NextStep "Fix the gallery build error shown above."
    throw "Gallery build failed."
  }

  $galleryStatus = Get-GalleryStatus
  if (-not $galleryStatus) {
    Update-Status -FinalStatus "SUCCESS" -Summary "Nothing to commit." -NextStep "No further action required." -AutoMergeState "Not needed"
  } else {
    Update-Status -Stage "Stage"
    & git -c core.safecrlf=false add -- $galleryJson $galleryRoot
    & git -c core.safecrlf=false diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
      Update-Status -FinalStatus "SUCCESS" -Summary "Nothing to commit." -NextStep "No further action required." -AutoMergeState "Not needed"
    } else {
      $currentBranch = $status.StartedBranch
      $startedOnMain = $currentBranch -eq "main"
      $createdBranch = $null

      if ($startedOnMain) {
        $createdBranch = New-MainSafeBranchName
        Write-Host "Protected main detected. Creating branch $createdBranch..."
        Update-Status -Stage "Branch"
        & git -c core.safecrlf=false switch -c $createdBranch
        if ($LASTEXITCODE -ne 0) {
          Update-Status -FinalStatus "FAILED" -Summary "Could not create the gallery update branch." -NextStep "Fix the git branch error shown above."
          throw "Unable to create branch $createdBranch."
        }
        $currentBranch = $createdBranch
      }

      $status.BranchName = $currentBranch

      $message = Read-Host "Commit message (default: $defaultCommitMessage)"
      if ([string]::IsNullOrWhiteSpace($message)) {
        $message = $defaultCommitMessage
      }

      Update-Status -Stage "Commit"
      & git -c core.safecrlf=false commit -m $message
      if ($LASTEXITCODE -ne 0) {
        Update-Status -FinalStatus "FAILED" -Summary "Gallery commit failed." -NextStep "Fix the git commit error shown above."
        throw "Git commit failed."
      }

      $status.CommitHash = Get-CommitHash

      $shouldAutomatePr = $startedOnMain -or $currentBranch.StartsWith("codex/gallery-update-")

      if (-not $createdBranch) {
        & git -c core.safecrlf=false rev-parse --abbrev-ref --symbolic-full-name "@{u}" *> $null
        if ($LASTEXITCODE -ne 0) {
          Update-Status -FinalStatus "FAILED" -Summary "No upstream branch is configured." -NextStep "Run git push -u origin $currentBranch once, then rerun the workflow."
          throw "No upstream configured for $currentBranch."
        }
      }

      Update-Status -Stage "Push"
      if ($createdBranch) {
        & git -c core.safecrlf=false push -u origin $currentBranch
      } else {
        & git -c core.safecrlf=false push
      }
      if ($LASTEXITCODE -ne 0) {
        Update-Status -FinalStatus "FAILED" -Summary "Branch push failed." -NextStep "Fix the git push error shown above."
        throw "Git push failed."
      }

      $status.CompareUrl = "$($remoteInfo.WebUrl)/compare/main...$($currentBranch)?expand=1"

      if (-not $shouldAutomatePr) {
        Update-Status -Stage "Push" -FinalStatus "ACTION NEEDED" -Summary "Gallery branch pushed, but PR automation is only enabled for gallery update branches." -NextStep "Open the compare URL if you want to merge this branch into main." -AutoMergeState "Not attempted"
      } elseif (-not (Test-CommandAvailable "gh")) {
        Update-Status -Stage "PR" -FinalStatus "ACTION NEEDED" -Summary "Gallery branch pushed, but GitHub CLI is not installed." -NextStep "Install GitHub CLI, or open the compare URL manually to create the PR." -AutoMergeState "Skipped: gh not installed"
      } elseif (-not (Test-GhAuthenticated)) {
        Update-Status -Stage "PR" -FinalStatus "ACTION NEEDED" -Summary "Gallery branch pushed, but GitHub CLI is not authenticated." -NextStep "Run gh auth login, then rerun update-gallery.bat or open the compare URL manually." -AutoMergeState "Skipped: gh not authenticated"
      } else {
        Update-Status -Stage "PR"
        try {
          $existingPrUrl = Get-ExistingPullRequestUrl -BranchName $currentBranch
          if ($existingPrUrl) {
            $status.PrUrl = $existingPrUrl
          } else {
            $status.PrUrl = New-PullRequest -BranchName $currentBranch -CommitMessage $message
          }
        } catch {
          Update-Status -FinalStatus "ACTION NEEDED" -Summary "Gallery branch pushed, but pull request creation failed." -NextStep "Open the compare URL manually to create the PR." -AutoMergeState "Skipped: PR creation failed"
          throw
        }

        try {
          Update-Status -Stage "Auto-Merge"
          $autoMergeResult = Resolve-PullRequestAutoMerge -PrUrl $status.PrUrl
          if ($autoMergeResult.Success) {
            Update-Status -FinalStatus "SUCCESS" -Summary $autoMergeResult.Summary -NextStep $autoMergeResult.NextStep -AutoMergeState $autoMergeResult.AutoMergeState
          } else {
            Update-Status -FinalStatus "ACTION NEEDED" -Summary $autoMergeResult.Summary -NextStep $autoMergeResult.NextStep -AutoMergeState $autoMergeResult.AutoMergeState
          }
        } catch {
          Update-Status -FinalStatus "ACTION NEEDED" -Summary "PR created, but auto-merge verification failed." -NextStep "Open the PR URL to review the PR manually. GitHub said: $($_.Exception.Message)" -AutoMergeState "Verification failed"
          throw
        }
      }
    }
  }
} catch {
  $errorMessage = $_.Exception.Message
  if ([string]::IsNullOrWhiteSpace($errorMessage)) {
    $errorMessage = ($_ | Out-String).Trim()
  }
  Write-Host $errorMessage

  if ($status.FinalStatus -eq "FAILED") {
    if ($status.Summary -eq "Gallery sync did not complete.") {
      $status.Summary = $errorMessage
    }
    $exitCode = 1
  } elseif ($status.FinalStatus -eq "ACTION NEEDED") {
    if ($status.Summary -eq "Gallery sync did not complete.") {
      $status.Summary = $errorMessage
    }
    $exitCode = 0
  } else {
    $status.FinalStatus = "FAILED"
    $status.Summary = $errorMessage
    $status.NextStep = "Review the error output in this window."
    $exitCode = 1
  }
} finally {
  if (-not $status.BranchName) {
    $status.BranchName = Get-CurrentBranch
  }
  if (-not $status.CommitHash) {
    $status.CommitHash = Get-CommitHash
  }
  $status.Timestamp = (Get-Date).ToString("s")
  Write-ResultFile
  Write-StatusSummary
}

exit $exitCode
