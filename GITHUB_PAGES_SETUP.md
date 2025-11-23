# GitHub Pages Deployment Setup

This document describes the GitHub Pages deployment configuration for the APRS-TX PWA application.

## What Was Added

### 1. GitHub Actions Workflow
**File:** `.github/workflows/build-deploy-gh-pages.yml`

This workflow:
- **Triggers:** Automatically runs on push to `main` or `dev` branches, and on pull requests for validation
- **Build:** Installs dependencies and builds the Astro PWA with `npm run build`
- **Artifact:** Uploads the built `dist/` folder to GitHub Pages artifact storage
- **Deploy:** Automatically deploys to GitHub Pages when on `main` or `dev` branches
- **Permissions:** Configured with proper GitHub Pages permissions for deployment

### 2. Astro Configuration Update
**File:** `astro.config.mjs`

Added:
```javascript
base: '/aprs-pwa/',
```

This configures the base path for the GitHub Pages project site deployment at `https://username.github.io/aprs-pwa/`.

### 3. README Documentation
**File:** `README.md`

Added a new **GitHub Pages Deployment** section documenting:
- How the workflow operates
- Configuration details
- Steps to enable GitHub Pages in repository settings

## Deployment Flow

```
Push to main/dev branch
        ↓
GitHub Actions triggers
        ↓
Checkout code
        ↓
Setup Node.js (v20)
        ↓
npm ci (clean install)
        ↓
npm run build
        ↓
Upload dist/ to artifact storage
        ↓
Deploy to GitHub Pages
        ↓
Available at: https://nigh.github.io/aprs-pwa/
```

## Setup in Repository Settings

To complete the setup in your GitHub repository:

1. Go to your repository settings
2. Navigate to **Settings → Pages**
3. Under "Build and deployment":
   - Source: Select "GitHub Actions"
4. The workflow will automatically create and manage the `gh-pages` branch

## How It Works

- **First run:** The workflow will create a `gh-pages` branch automatically
- **Subsequent runs:** Each push to `main` or `dev` triggers a rebuild and redeploy
- **Pull requests:** Also trigger a build to validate that the application builds successfully
- **Auto-deployment:** Disabled for PRs, only pushes to `main`/`dev` are deployed

## Environment Variables

Currently, no environment variables are required. If you add API keys or secrets later:

1. Go to **Settings → Secrets and variables → Actions**
2. Click "New repository secret"
3. Add your secrets there
4. Reference them in the workflow as: `${{ secrets.SECRET_NAME }}`

## Monitoring Deployments

1. Go to your repository
2. Click **Actions** tab
3. View the workflow runs
4. Click on a run to see detailed logs
5. Check the "Deploy to GitHub Pages" step for deployment status

## Troubleshooting

If the deployment fails:
1. Check the Actions tab for error logs
2. Verify Node.js version compatibility (v20)
3. Ensure `npm run build` works locally: `npm install && npm run build`
4. Check that the base path in `astro.config.mjs` matches your deployment URL

## Local Testing

To test the build locally before pushing:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Preview the production build
npm run preview
```

Then navigate to `http://localhost:4321/aprs-pwa/` to verify the base path works correctly.

## More Information

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Astro Deployment Guide](https://docs.astro.build/en/guides/deploy/)
