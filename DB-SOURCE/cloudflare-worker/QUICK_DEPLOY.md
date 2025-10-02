# 🚀 Quick Deploy Guide (2 minutes)

## Step 1: Register Subdomain (1 minute)

1. **Open this link**: https://dash.cloudflare.com/f69d84520904e4266f75a0f0827c1144/workers/onboarding

2. **You'll see a form like this:**
   ```
   Choose your workers.dev subdomain
   [________________]
   .workers.dev

   Example: my-app.my-subdomain.workers.dev
   ```

3. **Enter**: `ra8ga-archiwum`

4. **Click**: "Register Subdomain"

5. **Result**: You get `https://ra8ga-archiwum.workers.dev`

## Step 2: Deploy Worker (30 seconds)

Run this command in your terminal:

```bash
cd /Users/rafalfurmaga/Downloads/kancelaria-faktury/DB-SOURCE/cloudflare-worker
export CLOUDFLARE_ACCOUNT_ID=f69d84520904e4266f75a0f0827c1144
./deploy.sh
```

**Or manually:**
```bash
export CLOUDFLARE_ACCOUNT_ID=f69d84520904e4266f75a0f0827c1144
wrangler deploy
```

## Step 3: Test API (30 seconds)

```bash
curl https://ra8ga-archiwum.workers.dev/health
# Expected: {"ok":true}

curl https://ra8ga-archiwum.workers.dev/api/companies_summary
# Expected: Array of companies with data
```

## ✅ Success Indicators

- ✅ Subdomain registration: "Registration successful"
- ✅ Worker deploy: "Uploaded archiwum-worker" + "Worker deployed successfully"
- ✅ Health test: `{"ok": true}`
- ✅ API test: JSON array with company data

## 🆘 Troubleshooting

**If deploy fails with subdomain error:**
- Wait 2-3 minutes after registration before deploying
- The subdomain might need time to propagate

**If health test fails:**
- Check: `wrangler d1 execute archiwum-danych --remote --command "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"`
- Ensure D1 binding is correct in wrangler.toml

**If API returns empty:**
- Database might need time to initialize
- Try again after 1 minute

## 📊 What You Get

- **Health endpoint**: `https://ra8ga-archiwum.workers.dev/health`
- **Companies API**: `https://ra8ga-archiwum.workers.dev/api/companies_summary`
- **Database**: 254 tables, ~8,000 records
- **Performance**: Sub-second response times

---

**Total time: 2-3 minutes**

Your database is already migrated and ready - just need to activate the public API!