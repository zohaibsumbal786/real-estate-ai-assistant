# ⚡ QUICK REFERENCE CHECKLIST

Print this page or keep it open while deploying!

---

## 🎯 PHASE 1: GITHUB (Copy/Paste Commands)

### PowerShell Commands (Run in Order)

```
cd "c:\Users\zohai\OneDrive\Desktop\ai prtoject promt\real estate ai assitant"
git --version
git init
git add .
git commit -m "Initial commit - Dubai AI Business Agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dubai-ai-business-agent.git
git push -u origin main
```

### Result Expected
```
✅ Branch 'main' set up to track remote branch 'main'
```

---

## 🎯 PHASE 2: REPLIT (5 Clicks + 8 Variables)

### Secrets to Add (Copy These Exactly)

| Secret Name | Value | From Where |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Your .env file |
| `OPENAI_API_KEY` | `sk-proj-WgpdKaC_...` | Already provided |
| `STRIPE_SECRET_KEY` | `sk_test_51TkhV7...` | Already provided |
| `JWT_ACCESS_SECRET` | `your-random-secret-123` | Create one |
| `JWT_REFRESH_SECRET` | `your-random-secret-456` | Create one |
| `NODE_ENV` | `production` | Type as is |
| `STRIPE_MOCK_CHECKOUT` | `false` | Type as is |
| `OPENAI_MOCK_RESPONSES` | `false` | Type as is |

### Run Command
```bash
npm install && npm run db:migrate && npm run db:seed && npm run build && npm start
```

### Expected Result
```
✅ Ready on https://your-username-dubai-ai-business-agent.replit.dev
```

---

## 🎯 PHASE 3: TEST (5 Tests)

- [ ] Open public URL
- [ ] Register account
- [ ] Login with registered account
- [ ] Create lead (wait for AI response)
- [ ] Test Stripe checkout

---

## 🎯 PHASE 4: STRIPE WEBHOOK

### Webhook URL
```
https://your-username-dubai-ai-business-agent.replit.dev/api/webhooks/stripe
```

### Add to Replit Secrets
```
KEY: STRIPE_WEBHOOK_SECRET
VALUE: whsec_xxxxxxxxxxxx (from Stripe)
```

---

## 📊 TIME BREAKDOWN

| Phase | Time | Tasks |
|---|---|---|
| GitHub Account | 5 min | Sign up, create repo, push code |
| Replit Setup | 20 min | Create account, import repo, add secrets, deploy |
| Testing | 5 min | Verify all features work |
| Stripe Webhook | 5 min | Configure payment webhook |
| **TOTAL** | **35 min** | **✅ LIVE!** |

---

## 🆘 COMMON ISSUES

| Problem | Solution |
|---|---|
| `git remote already exists` | Run: `git remote remove origin` then add again |
| `Permission denied (publickey)` | Setup SSH key or use HTTPS URL |
| `Cannot find DATABASE_URL` | Check your local .env file |
| `App crashes on startup` | Check all secrets are entered correctly |
| `AI not responding` | Verify OPENAI_MOCK_RESPONSES=false |
| `Cannot login` | Did you run `npm run db:seed` to create demo user? |

---

## 🔗 IMPORTANT LINKS

- **GitHub**: https://github.com
- **Replit**: https://replit.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Your API Key**: YOUR_OPENAI_API_KEY_HERE
- **Your Stripe Key**: YOUR_STRIPE_SECRET_KEY_HERE

---

## ✅ FINAL SUCCESS INDICATORS

When you see these, you've won:

```
✅ App loads in browser
✅ Can create account
✅ Can login
✅ Dashboard displays
✅ Can create lead
✅ AI generates response within 3 seconds
✅ Can access billing page
✅ Can complete Stripe test checkout
✅ No console errors
✅ URL is public (friends can access)
```

---

**READY? Let's go! Follow STEP_BY_STEP_DEPLOYMENT.md and deploy! 🚀**
