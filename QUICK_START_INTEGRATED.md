# Quick Start Guide - New Integrated Frontend

## 🚀 Start Development Server

```bash
npm run dev
```

This will:
- Start the Express API on **port 4000**
- Serve static frontend from the `public/` folder
- Your app will be at: **http://localhost:4000**

## 📍 Access Points

| Page | URL | File |
|------|-----|------|
| Login / Sign Up | `http://localhost:4000/` | `public/index.html` |
| Admin Dashboard | `http://localhost:4000/admin` | `public/admin.html` |
| Main App | `http://localhost:4000/app` | `public/contractorpro-ai.html` |

## 🔧 Build for Production

```bash
npm run build
```

Outputs:
- API compiled: `apps/api/dist/`
- Database types: `packages/db/dist/`
- Frontend: `public/` (unchanged, deployed as static files)

## 🐳 Docker Deployment

### Build Docker image
```bash
docker compose build
```

### Start all services
```bash
docker compose up
```

Services started:
- PostgreSQL on port 5432
- Redis on port 6379
- API + Frontend on port 4000
- Knowledge Worker (background)
- Reminder Worker (background)

Access at: **http://localhost:4000**

## ✅ Testing Checklist

After starting the server:

1. **Frontend Loads**: Visit http://localhost:4000
   - [ ] See login page with "ContractorPro AI" branding
   - [ ] Can click between "Sign In" and "Create Account" tabs

2. **Demo Credentials**: 
   - [ ] Can fill demo user: demo@contractorpro.ai / demo1234
   - [ ] Can fill demo admin: admin@contractorpro.ai / admin2025

3. **API Connection**:
   - [ ] Open DevTools → Network tab
   - [ ] Try login attempt
   - [ ] See POST to `/api/auth/login` (check network tab)

4. **Static Files**:
   - [ ] Check that images/CSS load (no 404 errors)
   - [ ] Admin page loads at `/admin`

5. **Health Check**:
   - [ ] Visit http://localhost:4000/health
   - [ ] Should show: `{"status":"ok","service":"dubai-ai-business-agent-api"}`

## 📝 Demo Test Flow

1. Open http://localhost:4000
2. Click "Sign In" tab
3. Enter demo credentials:
   - Email: `demo@contractorpro.ai`
   - Password: `demo1234`
4. Click "Sign In" button
5. Check browser console and network tab for API calls
6. Try admin page at http://localhost:4000/admin

## 🛠️ Troubleshooting

### Port 4000 already in use?
```bash
# Find what's using port 4000 and kill it
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Frontend not showing?
- Check that `public/` folder exists with HTML files
- Verify in browser DevTools → Network that static files load
- Check console for any errors

### API not responding?
- Check that server started: look for "API listening on http://localhost:4000"
- Verify database is configured in `.env`
- Check API logs for errors

### Database connection error?
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env`
- Run: `npm run db:migrate` to setup schema

## 📊 Project Statistics

- **API Endpoints**: 15+ routes
- **Frontend Pages**: 4 HTML files (170+ KB total)
- **Database**: PostgreSQL with Prisma ORM
- **Type Safety**: 100% TypeScript
- **Workers**: Background jobs for knowledge + reminders

## 🎯 Key Files Modified

```
✅ apps/api/src/app.ts - Added static serving + SPA fallback
✅ package.json - Removed web workspace
✅ docker-compose.yml - Removed web service
✅ .env - Updated WEB_ORIGIN to 4000
✅ public/ - NEW frontend files
❌ apps/web/ - REMOVED (old Next.js)
❌ deploy/docker/Dockerfile.web - REMOVED
```

## 🎓 Development Tips

### Watch mode for backend
```bash
npm run dev
# Terminal shows: [tsx] watching for file changes
# API reloads automatically when you modify src/
```

### Database migrations
```bash
npm run db:migrate
# Create new migrations with Prisma
```

### Run tests
```bash
npm run test
# Runs API tests
```

### Type checking
```bash
npm run typecheck
# Validates all TypeScript without building
```

---

**Ready to go!** Run `npm run dev` and visit http://localhost:4000 🎉
