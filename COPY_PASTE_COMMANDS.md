# 💻 COPY-PASTE COMMAND REFERENCE

**All commands ready to copy and paste!**

---

## 🎯 PHASE 1: GITHUB SETUP

### Step 1: Initialize Git

```powershell
cd "c:\Users\zohai\OneDrive\Desktop\ai prtoject promt\real estate ai assitant"
```

```powershell
git --version
```

```powershell
git init
```

### Step 2: Commit Your Code

```powershell
git add .
```

```powershell
git commit -m "Initial commit - Dubai AI Business Agent"
```

```powershell
git branch -M main
```

### Step 3: Add GitHub Remote

**Replace `REPLACE_WITH_YOUR_USERNAME` with your actual GitHub username!**

```powershell
git remote add origin https://github.com/REPLACE_WITH_YOUR_USERNAME/dubai-ai-business-agent.git
```

### Step 4: Push to GitHub

```powershell
git push -u origin main
```

---

## 🎯 PHASE 2: REPLIT SETUP

### When app first starts, run these:

```bash
npm install
```

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run build
```

```bash
npm start
```

### Or all at once:

```bash
npm install && npm run db:migrate && npm run db:seed && npm run build && npm start
```

---

## 🎯 PHASE 3: ADD THESE SECRETS TO REPLIT

**Copy each value exactly and paste into Replit Secrets:**

### Secret 1: Database
```
KEY: DATABASE_URL
VALUE: [Copy from your .env file]
```

### Secret 2: OpenAI API Key
```
KEY: OPENAI_API_KEY
VALUE: YOUR_OPENAI_API_KEY_HERE
```

### Secret 3: Stripe Key
```
KEY: STRIPE_SECRET_KEY
VALUE: YOUR_STRIPE_SECRET_KEY_HERE
```

### Secret 4: JWT Access Secret
```
KEY: JWT_ACCESS_SECRET
VALUE: your-super-secret-access-token-string-minimum-32-characters-12345
```

### Secret 5: JWT Refresh Secret
```
KEY: JWT_REFRESH_SECRET
VALUE: your-super-secret-refresh-token-string-minimum-32-characters-98765
```

### Secret 6: Environment
```
KEY: NODE_ENV
VALUE: production
```

### Secret 7: Stripe Mock (Disable)
```
KEY: STRIPE_MOCK_CHECKOUT
VALUE: false
```

### Secret 8: OpenAI Mock (Disable)
```
KEY: OPENAI_MOCK_RESPONSES
VALUE: false
```

---

## 🎯 PHASE 4: TESTING COMMANDS

### Test if server is running:

```bash
curl http://localhost:4000/api/health
```

### Test database connection:

```bash
npm run db:migrate
```

### Seed demo data:

```bash
npm run db:seed
```

### View logs:

```bash
npm start
```

---

## 🔐 REPLIT WEBHOOK CONFIGURATION

### Stripe Webhook Setup:

**Webhook URL:**
```
https://your-username-dubai-ai-business-agent.replit.dev/api/webhooks/stripe
```

**Replit Secret to Add:**
```
KEY: STRIPE_WEBHOOK_SECRET
VALUE: whsec_xxxxxxxxxxxx [Copy from Stripe Dashboard]
```

---

## 🛠️ TROUBLESHOOTING COMMANDS

### If app won't start:

```bash
# Clear everything and rebuild
rm -rf node_modules package-lock.json dist build .next
npm install
npm run build
npm start
```

### If database connection fails:

```bash
# Check connection
npm run db:migrate

# Seed demo data
npm run db:seed
```

### Check environment variables:

```bash
# Show OpenAI key (in Replit only)
echo $OPENAI_API_KEY

# Show Stripe key (in Replit only)
echo $STRIPE_SECRET_KEY

# Show NODE_ENV
echo $NODE_ENV
```

### Update code and redeploy:

```powershell
# Make changes locally
# Then:
git add .
git commit -m "Your changes"
git push

# Replit automatically redeploys!
```

### Kill a stuck process:

```bash
# Find process on port 3000
lsof -ti:3000 | xargs kill -9

# Find process on port 4000
lsof -ti:4000 | xargs kill -9
```

---

## 📋 QUICK COPY BLOCKS

### Entire GitHub Setup (Copy & Run):

```powershell
cd "c:\Users\zohai\OneDrive\Desktop\ai prtoject promt\real estate ai assitant"
git init
git add .
git commit -m "Initial commit - Dubai AI Business Agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dubai-ai-business-agent.git
git push -u origin main
```

### Entire Replit Startup (Copy & Run):

```bash
npm install && npm run db:migrate && npm run db:seed && npm run build && npm start
```

---

## 🔗 IMPORTANT URLS

```
GitHub Sign Up: https://github.com/signup
Replit Sign Up: https://replit.com/signup
Stripe Dashboard: https://dashboard.stripe.com
```

---

## 📝 NOTES

- Replace `YOUR_USERNAME` with your GitHub username
- Replace database URL with your actual database URL from Replit
- Use exact values - typos will break it
- Don't forget to restart app after adding secrets
- Test commands locally first before Replit

---

**Ready? Copy and paste these commands step by step!** ✅
