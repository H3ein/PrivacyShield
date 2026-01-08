#!/bin/bash

# PrivacyShield GitHub Setup Script
# This script helps you set up the GitHub repository

echo "🛡️  PrivacyShield GitHub Setup"
echo "=============================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it first: https://cli.github.com/"
    echo ""
    echo "Or create the repository manually at:"
    echo "https://github.com/new"
    exit 1
fi

# Check if user is logged in
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub CLI."
    echo "Please run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI found and authenticated"
echo ""

# Get repository name
read -p "📝 Enter your GitHub username: " USERNAME
REPO_NAME="privacyshield"
FULL_NAME="$USERNAME/$REPO_NAME"

echo ""
echo "🚀 Creating repository: $FULL_NAME"
echo ""

# Create the repository
gh repo create "$REPO_NAME" \
    --public \
    --description "🛡️ Brutalist minimal privacy protection browser extension for Chrome" \
    --clone=false \
    --source=. \
    --remote=origin \
    --push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Repository created successfully!"
    echo ""
    echo "🌐 Repository URL: https://github.com/$FULL_NAME"
    echo "📦 Clone URL: https://github.com/$FULL_NAME.git"
    echo ""
    echo "📋 Next steps:"
    echo "1. Visit: https://github.com/$FULL_NAME"
    echo "2. Add README badges and update links"
    echo "3. Set up GitHub Pages for documentation"
    echo "4. Enable GitHub Actions for CI/CD"
    echo "5. Share on social media and tech communities"
    echo ""
    echo "🎉 Your PrivacyShield extension is now open source!"
else
    echo ""
    echo "❌ Failed to create repository."
    echo "Please create it manually at: https://github.com/new"
    echo ""
    echo "Repository details:"
    echo "- Name: privacyshield"
    echo "- Description: Brutalist minimal privacy protection browser extension for Chrome"
    echo "- Visibility: Public"
    echo "- Initialize: No (we'll push existing code)"
fi
