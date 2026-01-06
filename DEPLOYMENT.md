# Deploying Book Recommender to Azure Static Web Apps

Azure Static Web Apps provides free hosting for static sites with integrated serverless APIs.

## Project Structure

```
book-recommender-swa/
├── public/                      # Static frontend
│   └── index.html
├── api/                         # Azure Functions (serverless API)
│   ├── recommendations/
│   │   ├── index.js             # Function code
│   │   └── function.json        # Function config
│   ├── host.json
│   ├── local.settings.json      # Local dev settings (don't commit)
│   └── package.json
└── staticwebapp.config.json     # SWA routing config
```

## Prerequisites

1. **GitHub/GitLab/Azure DevOps** repository (SWA deploys from source control)
2. **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)
3. **Azure CLI** (optional) - [Install Guide](https://docs.microsoft.com/cli/azure/install-azure-cli)

---

## Method 1: Azure Portal (Easiest)

### Step 1: Push Code to GitHub

```bash
# Initialize git repo
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/book-recommender.git
git push -u origin main
```

### Step 2: Create Static Web App

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → Search **Static Web App** → **Create**
3. Configure:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new or select existing
   - **Name**: `book-recommender-swa`
   - **Plan type**: Free (or Standard for more features)
   - **Region**: Select nearest region
   - **Source**: GitHub
4. Click **Sign in with GitHub** and authorize
5. Select:
   - **Organization**: Your GitHub org/username
   - **Repository**: `book-recommender`
   - **Branch**: `main`
6. Build Details:
   - **Build Presets**: Custom
   - **App location**: `/public`
   - **Api location**: `/api`
   - **Output location**: (leave empty)
7. Click **Review + create** → **Create**

### Step 3: Add Environment Variable

1. Navigate to your Static Web App in the portal
2. Go to **Settings** → **Environment variables**
3. Click **+ Add**
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key
   - **Environment**: Production
4. Click **Save**

Azure automatically deploys on every push to your repo!

---

## Method 2: Azure CLI

### Step 1: Login and Create

```bash
# Login
az login

# Install SWA extension if needed
az extension add --name staticwebapp

# Create resource group
az group create --name book-recommender-rg --location eastus2

# Create Static Web App (GitHub)
az staticwebapp create \
    --name book-recommender-swa \
    --resource-group book-recommender-rg \
    --source https://github.com/YOUR_USERNAME/book-recommender \
    --location eastus2 \
    --branch main \
    --app-location "/public" \
    --api-location "/api" \
    --login-with-github
```

### Step 2: Configure Environment Variable

```bash
az staticwebapp appsettings set \
    --name book-recommender-swa \
    --resource-group book-recommender-rg \
    --setting-names GEMINI_API_KEY="your-gemini-api-key-here"
```

---

## Method 3: VS Code Extension

1. Install [Azure Static Web Apps extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurestaticwebapps)
2. Open command palette: **Azure Static Web Apps: Create Static Web App**
3. Follow prompts to connect GitHub and configure
4. Right-click the app → **Application Settings** → Add `GEMINI_API_KEY`

---

## Local Development

### Option A: SWA CLI (Recommended)

```bash
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Install API dependencies
cd api && npm install && cd ..

# Update api/local.settings.json with your GEMINI_API_KEY

# Start local dev server
swa start public --api-location api
```

Access at `http://localhost:4280`

### Option B: Separate Servers

```bash
# Terminal 1: Start Functions
cd api
npm install
func start

# Terminal 2: Serve static files
cd public
npx serve .
```

---

## GitHub Actions Workflow

Azure automatically creates `.github/workflows/azure-static-web-apps-*.yml`. Example:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/public"
          api_location: "/api"
          output_location: ""
```

---

## Comparison: Static Web Apps vs App Service

| Feature | Static Web Apps | App Service |
|---------|----------------|-------------|
| **Cost** | Free tier available | ~$13+/month (B1) |
| **API Model** | Serverless Functions | Express/Node server |
| **Scaling** | Automatic | Manual/Auto-scale rules |
| **Cold Starts** | Yes (serverless) | No (if Always On) |
| **Custom Domains** | Free SSL included | Free SSL included |
| **Best For** | SPAs, JAMstack, light APIs | Full server control, heavy APIs |

---

## Troubleshooting

### View Logs

```bash
# Stream function logs
az staticwebapp show --name book-recommender-swa --query "defaultHostname"

# In portal: Static Web App → Functions → Click function → Monitor
```

### Common Issues

| Issue | Solution |
|-------|----------|
| API returns 404 | Check `api_location` is `/api` in workflow |
| Function timeout | Free tier has 45s limit; optimize or upgrade |
| CORS errors | Handled automatically in SWA |
| Missing env vars | Add in Portal → Settings → Environment variables |
| Build fails | Check GitHub Actions logs for errors |

### Function Cold Starts

Serverless functions may have 1-3 second cold starts. For production:
- Keep functions lightweight
- Consider Standard plan for pre-warmed instances
- Or switch to App Service for always-on

---

## Security Notes

1. **Never commit `local.settings.json`** - Add to `.gitignore`
2. **Use environment variables** for all secrets
3. **Enable authentication** if needed via portal

---

## Quick Reference

```bash
# View app URL
az staticwebapp show -n book-recommender-swa -g book-recommender-rg --query defaultHostname -o tsv

# List environment variables
az staticwebapp appsettings list -n book-recommender-swa -g book-recommender-rg

# Delete when done
az group delete -n book-recommender-rg --yes
```
