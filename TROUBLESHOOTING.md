# 🆘 TROUBLESHOOTING GUIDE

**Quick problem solver - Find your issue below!**

---

## 🔴 GITHUB SETUP ISSUES

### Problem: "git command not found"

**Cause:** Git is not installed on your computer

**Solution:**
1. Download: https://git-scm.com/download/win
2. Run installer (accept all defaults)
3. Restart PowerShell
4. Try command again

### Problem: "fatal: remote origin already exists"

**Cause:** You already initialized git in this folder

**Solution:**
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/dubai-ai-business-agent.git
git push -u origin main
```

### Problem: "Permission denied (publickey)"

**Cause:** SSH key not configured

**Solution:**
```powershell
# Use HTTPS instead of SSH
git remote set-url origin https://github.com/YOUR_USERNAME/dubai-ai-business-agent.git
git push -u origin main
```

### Problem: "fatal: not a git repository"

**Cause:** You didn't run `git init`

**Solution:**
```powershell
cd "c:\Users\zohai\OneDrive\Desktop\ai prtoject promt\real estate ai assitant"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dubai-ai-business-agent.git
git push -u origin main
```

---

## 🔴 REPLIT DEPLOYMENT ISSUES

### Problem: "Import from GitHub failed"

**Cause:** GitHub URL is wrong or private key issue

**Solution:**
1. Copy exact repo URL: `https://github.com/YOUR_USERNAME/dubai-ai-business-agent.git`
2. Try again
3. If still fails, check repo is public/private correctly

### Problem: "App won't start / Crashes immediately"

**Cause:** Missing environment variables

**Solution:**
1. Check Replit console (bottom) for error message
2. Find which variable is missing
3. Add to Replit Secrets
4. Verify spelling exactly
5. Click "Run" to restart

**Common missing variables:**
- DATABASE_URL
- OPENAI_API_KEY
- STRIPE_SECRET_KEY
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET

### Problem: "Cannot find database / Database connection error"

**Cause:** DATABASE_URL is wrong

**Solution:**
1. In Replit, click "Database"
2. Create PostgreSQL database
3. Copy connection URL
4. Update DATABASE_URL secret with exact URL
5. Run: `npm run db:migrate`
6. Restart app

### Problem: "Build is taking forever / Stuck on installing"

**Cause:** Normal for first build or dependency issue

**Solution:**
- Wait 5-10 minutes (first build takes longer)
- If still stuck, click stop and restart
- Check internet connection
- Clear Replit cache: Add secret `DISABLE_CACHE=true`

### Problem: "Port already in use"

**Cause:** Another process using port 3000 or 4000

**Solution:**
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9
# or
lsof -ti:4000 | xargs kill -9
```

---

## 🔴 TESTING ISSUES

### Problem: "Can't register / Registration fails"

**Cause:** Database not initialized

**Solution:**
```bash
npm run db:migrate
npm run db:seed
npm start
```

### Problem: "Can login but dashboard is blank"

**Cause:** Frontend not loading properly

**Solution:**
1. Hard refresh: `Ctrl + Shift + R`
2. Clear browser cache
3. Try incognito window
4. Check browser console for errors

### Problem: "AI not responding / Stuck loading"

**Cause:** OpenAI API not configured

**Check:**
- OPENAI_API_KEY is correct (starts with `sk-proj-`)
- OPENAI_MOCK_RESPONSES = `false`
- API key has remaining credit ($5 free)
- Restart app after fixing

**Verify in Replit console:**
```bash
echo $OPENAI_API_KEY
echo $OPENAI_MOCK_RESPONSES
```

### Problem: "AI responds but slowly"

**Cause:** Normal for first request (cold start)

**Solution:**
- First request takes 2-3 seconds (normal)
- Subsequent requests are faster
- This is expected behavior

### Problem: "Stripe checkout not working"

**Cause:** Stripe not configured properly

**Check:**
- STRIPE_SECRET_KEY is correct (starts with `sk_test_`)
- STRIPE_MOCK_CHECKOUT = `false`
- Test card: `4242 4242 4242 4242`
- Any future date, any CVC
- Restart app after fixing

### Problem: "Can't complete Stripe test checkout"

**Cause:** Using wrong test card

**Solution:**
Use this test card:
```
Card: 4242 4242 4242 4242
Month: Any future month (e.g., 12)
Year: Any future year (e.g., 2026)
CVC: Any 3 digits (e.g., 123)
```

**Other test cards:**
- Visa: `4242 4242 4242 4242`
- Mastercard: `5555 5555 5555 4444`
- Amex: `3782 822463 10005`

---

## 🔴 SECRET/ENVIRONMENT ISSUES

### Problem: "How do I find my DATABASE_URL?"

**Solution:**
1. Open your local `.env` file
2. Find the line: `DATABASE_URL=postgresql://...`
3. Copy the entire value after `=`
4. Paste into Replit secret

### Problem: "Where do I get JWT_ACCESS_SECRET?"

**Solution:**
Create a random string:
```
jwt-secret-access-random-string-12345-unique-123456789
```
Or generate here: https://generate-random.org/

Make it at least 32 characters long, unique, and random.

### Problem: "STRIPE_SECRET_KEY is wrong"

**Correct Key:**
```
YOUR_STRIPE_SECRET_KEY_HERE
```

**DO NOT USE:**
- Live key (sk_live_...)
- Publishable key (pk_...)
- Wrong stripe account

### Problem: "OPENAI_API_KEY is wrong"

**Correct Key:**
```
YOUR_OPENAI_API_KEY_HERE
```

**DO NOT USE:**
- Org API key
- Expired key
- Wrong organization

### Problem: "I don't see my secret values"

**Cause:** Replit hides them for security

**Solution:**
- This is NORMAL (security feature)
- You can still use them
- Don't worry if you can't see the values
- Just make sure you entered them correctly

---

## 🔴 URL/DOMAIN ISSUES

### Problem: "I don't have a public URL"

**Solution:**
Wait for app to finish building:
```
npm install...     (2 min)
npm run build...   (3 min)
npm start...       (1 min)
        ↓
✅ Ready on https://your-username-...
```

Copy the URL from console output.

### Problem: "My URL keeps changing"

**Cause:** Replit regenerates URL on redeploy

**Solution:**
- This is normal
- Keep the latest URL
- Each deploy may have new URL
- Later buy custom domain to fix

### Problem: "URL shows error page"

**Cause:** App didn't start properly

**Solution:**
1. Check Replit console for errors
2. Read error message carefully
3. Fix the issue (usually environment variable)
4. Restart app
5. Wait 10 seconds
6. Refresh browser

### Problem: "App loads but shows 404"

**Cause:** Wrong route or build didn't complete

**Solution:**
1. Make sure app finished building
2. Try accessing `/` or `/dashboard`
3. Check console for errors
4. Try hard refresh: `Ctrl + Shift + R`

---

## 🔴 WEBHOOK ISSUES

### Problem: "Stripe webhook not working"

**Cause:** Webhook URL is wrong or not configured

**Check:**
1. Webhook URL: `https://your-app.replit.dev/api/webhooks/stripe`
2. Stripe events: ✅ checkout.session.completed
3. Secret added to Replit: STRIPE_WEBHOOK_SECRET
4. App restarted after adding secret

**Verify webhook working:**
1. Go to Stripe Dashboard → Webhooks
2. Find your endpoint
3. Click "Send test event"
4. Check "Event delivered" shows ✅

### Problem: "Webhook secret is wrong"

**Solution:**
1. Go to Stripe Dashboard
2. Click on your webhook endpoint
3. Click "Reveal" (next to signing secret)
4. Copy exact value (starts with `whsec_`)
5. Add to Replit as STRIPE_WEBHOOK_SECRET
6. Restart app

---

## 🔴 BUILD/COMPILATION ISSUES

### Problem: "npm error during build"

**Cause:** Dependency issue or code error

**Solution:**
1. Check error message in console
2. Common fixes:
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### Problem: "TypeScript error"

**Cause:** Code has type issues

**Solution:**
```bash
# Check for errors
npm run build

# Fix and redeploy
git add .
git commit -m "Fix TypeScript errors"
git push
```

---

## 🔴 PERFORMANCE ISSUES

### Problem: "App is very slow"

**Cause:**
- First request cold start (normal)
- Database query slow (check indexes)
- API call slow (external service)
- Replit free tier limitations

**Solution:**
- First request slow is NORMAL (3-5 seconds)
- Subsequent requests are faster
- If consistent, check Replit console logs
- Monitor response times in Replit dashboard

### Problem: "Database queries are slow"

**Cause:** Missing indexes or complex query

**Solution:**
- Database is optimized (20+ indexes)
- First query slow is normal
- Subsequent same queries cached
- Monitor in Replit dashboard

---

## 🔴 SECURITY ISSUES

### Problem: "CORS error / can't access API from frontend"

**Cause:** CORS not configured

**Solution:**
- CORS already configured in code
- Add WEB_ORIGIN to secrets:
  ```
  WEB_ORIGIN = https://your-app.replit.dev
  ```
- Restart app

### Problem: "Getting 401 Unauthorized"

**Cause:** Token invalid or expired

**Solution:**
- Login again
- Clear browser cookies
- Try incognito window

### Problem: "Getting 403 Forbidden"

**Cause:** No permission for resource

**Solution:**
- Check JWT token is valid
- Verify user has correct role
- Try with admin account

---

## 🟡 COMMON MISTAKES

### ❌ Adding .env to GitHub

**Problem:** Exposes API keys!

**Solution:**
- .env is in .gitignore (don't commit it)
- Use Replit Secrets instead
- Never share .env file

### ❌ Using live Stripe key instead of test key

**Problem:** Real charges will happen!

**Solution:**
- Use: `sk_test_` key (testing)
- NOT: `sk_live_` key (real charges)
- Current key is: `sk_test_51TkhV7...` ✅

### ❌ Leaving NODE_ENV as "development"

**Problem:** Performance issues, debug info exposed

**Solution:**
- Set: `NODE_ENV = production`
- Not: `development`
- Updated in production

### ❌ Forgetting to run migrations

**Problem:** Database tables don't exist

**Solution:**
```bash
npm run db:migrate
npm run db:seed
npm start
```

### ❌ Wrong database URL format

**Problem:** Can't connect to database

**Solution:**
Correct format:
```
postgresql://username:password@host:5432/dbname
```

Not:
- `postgresql://host` (missing port)
- `postgres://...` (old format)
- `mongodb://...` (wrong database type)

---

## ✅ STEP-BY-STEP DEBUGGING

**When something doesn't work:**

1. **Read the error message** (first line usually tells you the issue)
2. **Check Replit console** (scroll to see full error)
3. **Find your issue above** in this guide
4. **Follow the solution**
5. **Restart the app** (click Run)
6. **Refresh browser** (Ctrl + F5)
7. **Wait 30 seconds**
8. **Try again**

If it still doesn't work:
1. Check all environment variables are correct
2. Verify database is running
3. Check for typos
4. Try redeploying
5. Start fresh if stuck

---

## 🎯 MOST COMMON ISSUE: Missing or Wrong Secrets

**99% of deployment problems are due to:**

- ❌ Wrong database URL
- ❌ Wrong OpenAI key
- ❌ Wrong Stripe key
- ❌ Missing JWT secrets
- ❌ Typos in secret names

**Fix:**
1. Go to Replit Secrets
2. Check ALL 8 secrets are there
3. Verify exact spelling
4. Copy/paste values from this guide
5. Restart app

---

## 📞 IF YOU'RE STILL STUCK

1. **Re-read STEP_BY_STEP_DEPLOYMENT.md**
   - Follow each step exactly
   - Don't skip anything

2. **Check Replit console** 
   - Error message is your best clue
   - Google the error message

3. **Verify secrets** (most common issue)
   - All 8 present?
   - Spelled correctly?
   - Values complete?

4. **Try fresh restart**
   - Stop app (click stop)
   - Wait 10 seconds
   - Click Run again
   - Wait for build complete

5. **Check your internet**
   - Download speed ok?
   - Not on public WiFi?
   - VPN interfering?

---

**YOU'VE GOT THIS! Almost all issues have simple fixes.** 🎉

Check your specific error above and follow the solution!
