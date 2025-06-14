# Git Auto-Push Script for Chess Project
# This script automatically adds, commits, and pushes changes

param(
    [string]$CommitMessage = "Auto-update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "[CHESS] Git Auto-Push Starting" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Check if we're in a git repository
if (!(Test-Path ".git")) {
    Write-Host "[ERROR] Not in a git repository!" -ForegroundColor Red
    exit 1
}

# Check git status first
Write-Host "[INFO] Checking git status..." -ForegroundColor Yellow
$status = git status --porcelain

if ([string]::IsNullOrEmpty($status)) {
    Write-Host "[SUCCESS] No changes to commit. Everything is up to date!" -ForegroundColor Green
    exit 0
}

Write-Host "[INFO] Files to be processed:" -ForegroundColor Yellow
git status --short

# Add all changes (excluding .class files thanks to .gitignore)
Write-Host "[INFO] Adding changes..." -ForegroundColor Yellow
git add .

# Show what's been staged
Write-Host "[INFO] Staged changes:" -ForegroundColor Yellow
git diff --cached --name-only

# Commit with the provided or default message
Write-Host "[INFO] Committing changes..." -ForegroundColor Yellow
git commit -m $CommitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Commit failed!" -ForegroundColor Red
    exit 1
}

# Push to remote
Write-Host "[INFO] Pushing to remote..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Successfully pushed all changes!" -ForegroundColor Green
    Write-Host "[COMPLETE] Your chess project is now updated on GitHub!" -ForegroundColor Magenta
} else {
    Write-Host "[ERROR] Push failed! Please check your internet connection and try again." -ForegroundColor Red
    exit 1
}

Write-Host "===============================" -ForegroundColor Cyan
Write-Host "[FINISHED] Git auto-push completed!" -ForegroundColor Cyan 