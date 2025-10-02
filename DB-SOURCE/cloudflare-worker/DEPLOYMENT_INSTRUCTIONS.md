# Cloudflare Worker Deployment Instructions

## 🚀 Quick Deployment Guide

### Step 1: Register workers.dev Subdomain
1. **Open this URL in your browser:**
   ```
   https://dash.cloudflare.com/f69d84520904e4266f75a0f0827c1144/workers/onboarding
   ```

2. **Register your subdomain:**
   - Suggested name: `ra8ga-archiwum`
   - This will give you: `https://ra8ga-archiwum.workers.dev`

### Step 2: Deploy the Worker
After registering the subdomain, run:

```bash
cd /Users/rafalfurmaga/Downloads/kancelaria-faktury/DB-SOURCE/cloudflare-worker
export CLOUDFLARE_ACCOUNT_ID=f69d84520904e4266f75a0f0827c1144
wrangler deploy
```

### Step 3: Test the API
Once deployed, test these endpoints:

```bash
# Health check
curl https://ra8ga-archiwum.workers.dev/health

# Get companies summary
curl https://ra8ga-archiwum.workers.dev/api/companies_summary
```

## 📋 Configuration Status

### ✅ Completed
- D1 database created: `archiwum-danych`
- Database ID: `b0db5c41-2ccc-48d4-ba3e-d37a017b13fd`
- Data imported: 254 tables, ~8,000 records
- Worker code ready: `src/index.js`
- wrangler.toml configured

### 🔄 In Progress
- [ ] Register workers.dev subdomain
- [ ] Deploy worker to production

### 📊 Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check - returns `{ ok: true }` |
| GET | `/api/companies_summary` | Returns list of companies with metrics |

### 🔧 Alternative Deployment (Custom Domain)

If you have a custom domain, add this to `wrangler.toml`:

```toml
routes = ["yourdomain.com/api/*"]
```

Then deploy with:
```bash
wrangler deploy
```

## 🧪 Testing Before Production

You can test the D1 database directly:

```bash
# Test database connection
wrangler d1 execute archiwum-danych --remote --command "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"

# Test specific table
wrangler d1 execute archiwum-danych --remote --command "SELECT COUNT(*) FROM ADWKAROLINA_Magazyn_dbo_dokTOW;"
```

## 📞 Support

If you encounter issues:
1. Ensure `CLOUDFLARE_ACCOUNT_ID` is set correctly
2. Verify D1 database binding in `wrangler.toml`
3. Check that the workers.dev subdomain is registered
4. Review deployment logs with `wrangler tail`