# IMPLEMENTATION GUIDE: 7-Day Action Plan

**Start Date:** June 21, 2026  
**Goal by Day 7:** One real WhatsApp conversation end-to-end, ready for outreach  
**Revenue Target by Day 30:** 5,000 AED (5 clients × 800-1,200 AED setup fee + first month)

---

## 🎯 CORE PRINCIPLE

**Do not do any outreach until you can prove the bot works live for one real conversation.** Promising "AI WhatsApp bot" and then not being able to deliver when someone says yes is reputation death in a small market like Dubai SME networks.

Everything below is sequenced to hit that milestone by Day 5, leaving Days 6-7 for cleanup and demo recording.

---

## DAY 1-2: Enable Real OpenAI & Stripe

### What You're Doing
Switching from mock AI responses to real OpenAI GPT-4o, and from fake Stripe to live billing.

### Step 1: Get OpenAI API Key

**Time: 10 minutes**

1. Go to [platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
2. Click "Create new secret key"
3. Copy it (looks like `sk-proj-xxxxx`)
4. Add $5-10 credit to account (go to Billing tab)

### Step 2: Update .env File

In the project root, open `.env` and change:

```bash
# OLD (mock mode)
OPENAI_API_KEY=
OPENAI_MOCK_RESPONSES=true
STRIPE_SECRET_KEY=
STRIPE_MOCK_CHECKOUT=true

# NEW (real mode)
OPENAI_API_KEY=sk-proj-xxxxx                    # Your key from Step 1
OPENAI_MOCK_RESPONSES=false                     # DISABLE MOCK
STRIPE_SECRET_KEY=sk_live_xxxxx                 # Leave empty for now
STRIPE_MOCK_CHECKOUT=true                       # Keep true until you get Stripe keys
```

### Step 3: Test OpenAI Integration

```bash
# Restart dev server
npm run dev:api

# In dashboard: http://localhost:3000/en/dashboard
# Go to Leads → Create New Lead
# Fill out: Name, Email, Phone, Business Type
# Click "AI Response"

# Should see REAL AI response (not canned text)
# If you see "Sorry, I couldn't generate a response", check:
# - OPENAI_API_KEY is correct (no typos)
# - Your OpenAI account has credits
# - OPENAI_MOCK_RESPONSES=false (check console output)
```

**Success Criteria:** AI generates a unique, relevant response about the lead's business.

### Step 4: Get Stripe Live Keys

**Time: 20 minutes** (you need a UAE business for this)

1. Go to [stripe.com](https://stripe.com) → Sign up
2. Fill out business info (UAE business address required)
3. Verify your account (Stripe may ask for documents)
4. Once verified, go to **Settings** → **API Keys**
5. Switch to **Live Mode** (toggle at top)
6. Copy the **Secret Key** (starts with `sk_live_`)
7. Go to **Webhooks**, click **Add Endpoint**
   - Endpoint URL: `https://yourdomain.com/api/billing/webhook` (use localhost for now)
   - Events: `invoice.payment_failed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
   - Copy the **Signing Secret** (starts with `whsec_`)

### Step 5: Update .env with Stripe Keys

```bash
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_MOCK_CHECKOUT=false                      # DISABLE STRIPE MOCK
BILLING_SUCCESS_URL=http://localhost:3000/en/dashboard?billing=success
```

### Step 6: Test Stripe Integration

```bash
# Restart API
npm run dev:api

# In dashboard:
# Go to Billing → Select a plan → Upgrade Plan
# Use test card: 4242 4242 4242 4242
# Any future expiry date, any CVV

# Should see success redirect to dashboard
# Check Stripe dashboard: you should see a real subscription (even if test)
```

**Success Criteria:** Subscription created in Stripe dashboard, not just in mock database.

---

## DAY 2: Deploy to Staging Server

### What You're Doing
Getting the API + WhatsApp webhook accessible from the internet (required for Meta BSP).

### Option A: DigitalOcean Droplet (Recommended)

**Time: 30 minutes**

1. Create account at [digitalocean.com](https://digitalocean.com)
2. Create a new **Droplet** ($5/month, Ubuntu 22.04)
3. SSH into it:
   ```bash
   ssh root@your-droplet-ip
   ```
4. Install dependencies:
   ```bash
   apt update && apt install -y nodejs npm postgresql redis-server nginx
   ```
5. Clone your repo:
   ```bash
   git clone https://github.com/yourusername/dubai-ai-business-agent.git
   cd dubai-ai-business-agent
   ```
6. Setup database:
   ```bash
   psql -U postgres
   CREATE DATABASE dubai_ai_business_agent;
   \c dubai_ai_business_agent
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
7. Install and build:
   ```bash
   npm install
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```
8. Configure `.env` on server (use same keys from Day 1):
   ```bash
   cp .env.example .env
   # Edit .env with prod values + your OpenAI/Stripe keys
   ```
9. Start with PM2:
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.cjs
   pm2 save
   ```
10. Setup Nginx (proxy to port 4000):
    ```bash
    cp deploy/nginx/dubai-ai-business-agent.conf /etc/nginx/sites-available/
    ln -s /etc/nginx/sites-available/dubai-ai-business-agent.conf /etc/nginx/sites-enabled/
    nginx -s reload
    ```

### Option B: AWS EC2

Similar steps, but use AWS dashboard to spin up t3.micro instance.

### Option C: Replit/Render (If You Can't Deploy)

Use [Replit.com](https://replit.com) or [Render.com](https://render.com) for quick hosting (free tier available). Both support Node.js + PostgreSQL.

**Success Criteria:** 
- `curl https://yourdomain.com/api/health` returns `{ status: "ok" }`
- API is accessible from your phone

---

## DAY 2: Start Meta BSP Application

### What You're Doing
Getting WhatsApp Business Account approval (takes 1-2 weeks, so start immediately).

### Step 1: Apply for Meta Cloud API Access

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app → Choose "Business" type
3. Add **WhatsApp** product
4. Fill out business verification form (Meta will ask for ID, business docs, etc.)
5. Wait for approval (usually 1-2 weeks)

### Step 2: Create WhatsApp Business Account

Once approved:
1. Go to WhatsApp Manager in Meta dashboard
2. Create new **WhatsApp Business Account**
3. Add a **Business Phone Number** (can be any number; you'll use it for testing)
4. Get your **Phone Number ID** and **Business Account ID** (save these)

### Step 3: Generate API Credentials

1. In Meta app settings, create a **System User**
2. Generate a **User Access Token** (permanent)
3. This token goes in your code as auth header

### Step 4: Setup Webhook

In Meta dashboard:
1. Go to **App Settings** → **Webhooks**
2. Setup callback URL: `https://yourdomain.com/api/whatsapp/webhook`
3. Verify Token: `your-random-secret-token` (set this in `.env` as `META_VERIFY_TOKEN`)
4. Subscribe to events: `messages`, `message_template_status_update`

**Success Criteria:**
- Meta says "webhook subscribed"
- You receive a test webhook call (Meta will send one to verify)

---

## DAY 3: Record Product Demo & Setup Landing

### What You're Doing
Creating social proof materials for outreach.

### Step 1: Record Loom Demo (3 min)

Use [loom.com](https://loom.com) (free):

1. Screen share your localhost dashboard
2. Walk through:
   - a. Login with `admin@demo.ae` / `DemoPass123!`
   - b. Navigate to "Conversations" → Click on a WhatsApp message
   - c. Show the AI auto-generating replies
   - d. Go to "Analytics" → Show lead scoring
   - e. Go to "Appointments" → Show booking automation
3. Narrate: *"This AI WhatsApp assistant helps your business capture and convert leads 24/7. No coding required. Integrates with your existing WhatsApp in minutes. Try free for 7 days."*
4. Share link (public)

### Step 2: Create 1-Page Landing Site

Use [Carrd.co](https://carrd.co) (free tier):

**Structure:**
```
HERO SECTION
- Headline: "AI WhatsApp for Your Business"
- Subheader: "Capture leads. Answer customers. Close sales. 24/7. In Arabic & English."
- CTA Button: "Start Free Trial" → links to form

BENEFITS (3 rows)
1. "Instant Leads" - Every inquiry captured, qualified by AI
2. "24/7 Support" - Never miss a customer, in any time zone
3. "Arabic & English" - Responds in customer's language

SOCIAL PROOF (future, leave empty for now)
"Join 5+ businesses using..."

PRICING
- Free Trial: 7 days, no credit card
- Starter: 800 AED setup + 200 AED/month
- Call to action: "Schedule Your Demo"

FOOTER
Contact email: your-email@domain.com
Phone: +971-XXXXXXXXX
```

### Step 3: Setup Form

Add a Typeform or Google Form to your Carrd landing:
- Ask: Name, Business, WhatsApp number, Business type
- Thank you page: "We'll set up your trial within 24 hours"

**Success Criteria:**
- Landing page is live
- Loom video embedded
- Form collects emails/WhatsApp numbers

---

## DAY 4-5: Test WhatsApp End-to-End

### What You're Doing
Confirming that a real WhatsApp message → your API → AI → WhatsApp response works.

### Step 1: Configure Meta Webhook on Staging Server

Update `.env` on your staging server:

```bash
META_APP_SECRET=xxxxx              # From Meta app settings
META_VERIFY_TOKEN=your-secret      # Your choice (use same on Meta dashboard)
```

Restart API:
```bash
pm2 restart ecosystem.config.cjs
```

### Step 2: Send Test Message

Using your personal WhatsApp, message the WhatsApp Business Number you created (or test number from Meta dashboard).

Message: *"Hello, what services do you offer?"*

### Step 3: Check Logs

On your server, watch logs:
```bash
pm2 logs
```

You should see:
1. Webhook received from Meta
2. Message parsed
3. AI generating response
4. Response sent back to WhatsApp

### Step 4: Verify Reply

Check your WhatsApp app. You should receive:
- AI-generated response (using real GPT-4o, not mock)
- In ~10-15 seconds

**Success Criteria:**
- Real WhatsApp receives real AI response
- No errors in logs
- Response is contextual (not canned)

### Step 5: Test Arabic

If your locale is set to Arabic:
Message: *"السلام عليكم، ما خدماتك؟"*

Should get Arabic response (AI understands context).

---

## DAY 6-7: Prepare for Outreach

### Step 1: Finalize Product Config

1. Choose your **first vertical** (recommend one of):
   - **Salons / Spas** (easy to demo, high repeat customer)
   - **Restaurants** (high volume orders, easy to automate)
   - **Consultancies** (high-value, clear ROI)

2. Create **AI Knowledge Base** for your vertical:
   - Go to dashboard → "Knowledge Base"
   - Upload 2-3 PDFs with:
     - Pricing
     - Services/menu
     - Policies
   - This lets AI answer "What do you charge?" without consulting human

### Step 2: Prepare Outreach Materials

Create a simple **Google Sheet** to track:
- Contact name
- Business name
- WhatsApp / Instagram
- Date contacted
- Response (yes/no/no-reply)
- Trial start date
- Conversion (paid/trial-ended/churn)

### Step 3: Build Your Target List

1. Open Instagram
2. Search hashtags like `#dubaisalons`, `#dubairestaurants`, `#dubaiservices`
3. Collect 50-100 business accounts
4. For each:
   - Check if Pakistani/Indian/Filipino-owned (look for language, descriptions)
   - Note their WhatsApp number (often in bio or first DM)
   - Note owner's name (from bio/posts)
5. Add to your Google Sheet

### Step 4: Draft Outreach Message

Keep it **short and personal**:

```
Hey [Name], 👋 

Saw your [business]. Love what you're doing!

Quick question: how many leads/inquiries do you get on WhatsApp every day?

We built something that might help → an AI that responds to EVERY inquiry in seconds (in Arabic or English).

Free 1-week trial. No credit card. Interested? I'll set it up in under 30 min. 😊
```

**Variations by vertical:**
- Salon: "...that books appointments automatically"
- Restaurant: "...that takes orders and special requests"
- Consultancy: "...that qualifies leads before you talk to them"

### Step 5: Do a Dry Run

Text 5 friends/colleagues with your message. Get feedback:
- Does it sound salesy?
- Would YOU respond?
- Refine wording

### Step 6: Record Walkthrough Video

Create a **2-min Loom** showing how YOU would set up their business in the trial:
1. Create organization
2. Upload their knowledge base (menu/pricing/policies)
3. Connect their WhatsApp number
4. Send test message
5. Show real AI response

Title: *"Setting up [Business Name] AI WhatsApp (2 min walkthrough)"*

This is what you'll send when someone says "yes."

---

## DAY 8+: WEEK 2 OUTREACH & CONVERSION

### Daily Routine (Days 8-14)

**Morning (10-11 AM):**
- 15-20 Instagram DMs to new prospects
- Track responses in Google Sheet

**Midday (2-3 PM):**
- Follow up with "no reply" from yesterday
- Re-engage with leads who responded but haven't committed

**Afternoon (4-5 PM):**
- For each "yes": setup trial
  - Create organization in dashboard
  - Upload their knowledge base
  - Connect WhatsApp number
  - Test with sample message
  - Send them setup video + instructions
  - Schedule daily check-in

**Evening (6-7 PM):**
- Check trial feedback
- Fix any issues
- Prepare conversion calls

### Conversion Script

After 3 days of trial, call them:

*"Hi [name], how's the AI bot working for you? [Listen] Great! Here's what I'd recommend: let's get you on a paid plan so you get priority support and more flexibility. It's just 800 AED to set up permanently, then 200-300 AED a month depending on your messages. Want to lock it in?"*

**If yes:** 
- Send Stripe invoice
- They pay immediately
- You're done

**If no:**
- Ask why
- Remove blocker (feature, pricing, trust, etc.)
- Offer discount or extended trial
- Aim for 60% conversion (3 out of 5)

---

## WEEK 3-4: SCALE & PARTNERSHIPS

### Week 3: Expand to 2nd Vertical

Once you have 3-5 paying customers in vertical #1:
1. Pick vertical #2 (e.g., if first was salons, now try restaurants)
2. Build 100-person list
3. Same outreach process
4. Target: 3-5 more customers

### Week 4: Approach Digital Agencies

Identify 5-10 local Dubai digital agencies (web designers, social media, marketing):
- Reach out with: *"We're looking for partners to white-label our AI WhatsApp assistant. You sell it to your clients, we deliver it. Commission 20% of lifetime revenue."*
- **One partnership could unlock 10-20 clients instantly**

### Revenue Projection by End of Week 4

| Vertical | # Customers | Setup Fee | Monthly | Total |
|----------|------------|-----------|---------|-------|
| Salons | 5 | 4,000 | 1,000 | 5,000 |
| Restaurants | 3 | 2,400 | 600 | 3,000 |
| Agency Partnership | 2 | 1,600 | 400 | 2,000 |
| **TOTAL** | **10** | **8,000** | **2,000** | **10,000 AED** |

---

## COMMON PITFALLS & FIXES

### Pitfall 1: "Demo looks good but the bot isn't actually live yet"

**Fix:** Complete Day 5 (WhatsApp test) before ANY outreach. Verify with your own number that messages work end-to-end.

### Pitfall 2: "I got 50 DMs but nobody responded"

**Fix:** Your message is too salesy. A/B test:
- **V1 (salesy):** "Our AI can automate your WhatsApp..."
- **V2 (curious):** "Quick question: how do you respond to WhatsApp after hours?"

**V2 converts better because it starts with THEIR problem, not your product.**

### Pitfall 3: "Prospect says yes but when I try to set them up, they're not responsive"

**Fix:** Set a trial START DATE explicitly:
- "Your trial starts Monday at 10 AM. I'll call you at 10:15 AM to make sure everything's working. That OK?"
- Commit them to a phone call. Removes ambiguity.

### Pitfall 4: "After 7 days, all my trials churned"

**Fix:** Don't wait til day 8 to follow up. Check in:
- Day 2: "Quick question: did you get your first message?"
- Day 4: "How many inquiries have come through? Any feedback?"
- Day 6: "Before trial ends, let's talk about getting you on paid plan..."

Be proactive. Don't let them forget you.

### Pitfall 5: "Stripe keys don't work / webhooks not firing"

**Fix:** Use Stripe's webhook test feature in dashboard. Send fake events to your endpoint. Watch logs. Debug.

---

## METRICS TO TRACK

By end of Week 4, you should have:

| Metric | Target |
|--------|--------|
| Landing page views | 200+ |
| Trial signups | 10-15 |
| Conversion rate | 50%+ |
| Paying customers | 5+ |
| Revenue | 5,000+ AED |
| Recurring MRR | 1,500+ AED |

---

## CRITICAL REMINDERS

✅ **Do:** Test end-to-end on Day 5 before ANY outreach  
✅ **Do:** Focus on ONE vertical first  
✅ **Do:** Use free trials to lower commitment barrier  
✅ **Do:** Track everything in a spreadsheet  
✅ **Do:** Follow up daily (most conversions happen on 2nd+ contact)

❌ **Don't:** Promise features that aren't built yet  
❌ **Don't:** Sell to 5 different verticals at once (spreads you thin)  
❌ **Don't:** Launch without live WhatsApp test  
❌ **Don't:** Go dark after they sign up (they need support)  
❌ **Don't:** Accept "maybe" (always get a yes/no)

---

## NEXT CHECKPOINTS

- **End of Day 2:** Staging server live + OpenAI real + Stripe configured
- **End of Day 5:** Real WhatsApp message received + AI response sent (proof of concept)
- **End of Day 7:** Landing page + demo video + target list (100 prospects)
- **End of Week 2:** 5-10 trial signups, first conversions started
- **End of Week 4:** 5+ paying customers, 5,000+ AED revenue, partnership talks started

---

**You've got this. The hardest part is behind you (the code works). Now it's just Sales = Repetition. Good luck.**
