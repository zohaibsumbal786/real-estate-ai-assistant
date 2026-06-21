#!/usr/bin/env pwsh

# Navigate to project directory
cd "c:\Users\zohai\OneDrive\Desktop\ai prtoject promt\real estate ai assitant"

# Configure remote
git remote set-url origin "https://github.com/zyftora-code/Real-Estate-Ai-Assitant.git"

# Show current status
Write-Host "Current git status:"
git status

# Push to remote
Write-Host "`nPushing to GitHub..."
git push -u origin main --force --verbose

Write-Host "`nPush complete!"
