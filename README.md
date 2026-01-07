# Book Recommender - Azure Static Web Apps

AI-powered book recommendation app using Gemini, with book covers and Amazon purchase links.

## Features

- 🤖 AI recommendations via Google Gemini
- 📚 Book cover images from Google Books API
- 🛒 Amazon purchase links
- 📖 Google Books preview links
- 📱 Responsive design

## Project Structure

```
book-recommender-swa/
├── public/                     # Static frontend
│   └── index.html
├── api/                        # Azure Functions
│   ├── recommendations/        # Main API endpoint
│   │   ├── index.js
│   │   └── function.json
│   ├── health/                 # Health check endpoint
│   │   ├── index.js
│   │   └── function.json
│   ├── package.json
│   └── host.json
├── staticwebapp.config.json    # SWA configuration
└── .gitignore
```

## Deployment

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/book-recommender.git
git push -u origin main
```

### Step 2: Create Static Web App in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a resource → Search "Static Web App" → Create
3. Configure:
   - **Name**: `book-recommender`
   - **Plan**: Free
   - **Source**: GitHub (connect your repo)
   - **Branch**: `main`
   - **Build Presets**: Custom
   - **App location**: `/public`
   - **API location**: `/api`
   - **Output location**: (leave empty)
4. Click Create

### Step 3: Add Environment Variable

1. Go to your Static Web App in Azure Portal
2. Settings → Environment variables
3. Add:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your API key from [Google AI Studio](https://aistudio.google.com/apikey)
4. Click Save

### Step 4: Verify Deployment

- Visit `https://your-app.azurestaticapps.net`
- Test health endpoint: `https://your-app.azurestaticapps.net/api/health`

## Local Development

```bash
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Install API dependencies
cd api && npm install && cd ..

# Create local settings file
cat > api/local.settings.json << EOF
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "GEMINI_API_KEY": "your-api-key-here"
  }
}
EOF

# Start local server
swa start public --api-location api
```

Visit http://localhost:4280

## API Endpoints

### POST /api/recommendations

Request:
```json
{
  "preferences": "I love sci-fi books with philosophical themes"
}
```

Response:
```json
{
  "recommendations": [
    {
      "title": "Dune",
      "author": "Frank Herbert",
      "reason": "A sci-fi epic exploring politics, religion, and ecology.",
      "coverUrl": "https://books.google.com/...",
      "amazonUrl": "https://www.amazon.com/s?k=...",
      "previewUrl": "https://books.google.com/books?id=..."
    }
  ]
}
```

### GET /api/health

Returns API status and configuration check.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on /api/* | Check `api_location: "/api"` in GitHub workflow |
| Empty response | Verify `GEMINI_API_KEY` in Environment variables |
| Model not found | Using `gemini-2.0-flash` (1.5 deprecated) |
| No book covers | Google Books API may not have the book |

## License

MIT
