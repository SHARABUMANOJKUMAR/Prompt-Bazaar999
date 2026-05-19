# PromptVerse Firebase Deployment Helper
# This script automates verification and deployment of frontend static files.

Clear-Host
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   PROMPTVERSE FIREBASE DEPLOYMENT      " -ForegroundColor Green -Bold
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verify we are in the correct directory
$currentDir = Get-Location
Write-Host "Current Directory: $currentDir" -ForegroundColor Gray

if (-not (Test-Path "firebase.json")) {
    Write-Host "[ERROR] firebase.json not found in the current directory!" -ForegroundColor Red
    Write-Host "Please make sure to run this script from the 'PromptVerse' directory." -ForegroundColor Yellow
    Exit
}

# Check if firebase-tools is installed globally
Write-Host "Verifying Firebase CLI..." -ForegroundColor Yellow
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue

if ($firebaseCmd) {
    Write-Host "Found global Firebase CLI. Proceeding with deployment..." -ForegroundColor Green
    firebase deploy --only hosting
} else {
    Write-Host "Global Firebase CLI not found. Trying via npx (local project-level package)..." -ForegroundColor Yellow
    npx firebase deploy --only hosting
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Deployment Attempt Complete!          " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
