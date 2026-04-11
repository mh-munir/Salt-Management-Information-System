# Vercel Deployment Guide

This guide will help you deploy the Salt Mill System to Vercel.

## Prerequisites

1. **Git Repository**: Your project must be pushed to GitHub/GitLab/Bitbucket
2. **Vercel Account**: Create one at https://vercel.com (free tier available)
3. **Environment Variables**: Prepare production values for all required env vars

## Required Environment Variables

Before deploying, you'll need these production values ready:

### 1. **MONGODB_URI** (Database Connection)
- Current: `mongodb+srv://munir:Mhmunir%401234@cluster0...`
- Action: Keep your existing MongoDB Atlas connection
- **IMPORTANT**: Add Vercel's IP addresses to MongoDB Atlas whitelist
  - Go to MongoDB Atlas → Network Access → IP Whitelist
  - Add: `0.0.0.0/0` for Vercel IPs (or use Vercel's specific ranges from their docs)

### 2. **JWT_SECRET** (Token Signing)
- Current: `salt-mill-dev-jwt-secret-change-this` (development only)
- Action: Generate a new 64+ character random string
- Example: Use https://1password.com/password-generator/ or `openssl rand -base64 32`

### 3. **SUPERUSER_EMAIL** & **SUPERUSER_PASSWORD** (Admin Credentials)
- Current: `admin@saltmill.local` / `SaltMillAdmin2026!`
- Action: Update with production values (change password!)
- These are your initial login credentials

### 4. **RESEND_API_KEY** (Email Service)
- Current: Missing (dev only logs to console)
- Action: Get from https://resend.com
  1. Create free account
  2. Go to API Keys
  3. Create new key (unlimited for free account)

### 5. **OTP_FROM_EMAIL** (OTP Email Sender)
- Current: Missing (dev only)
- Action: Use any email domain verified in Resend
- Example: `noreply@saltmill.com` or `otp@saltmill.com`
- Must be verified in Resend account

### 6. **OTP_HASH_SECRET** (OTP Hashing)
- Current: Falls back to `dev-only-otp-secret`
- Action: Generate a new 32+ character random string
- Example: Use OpenSSL: `openssl rand -base64 24`

## Step-by-Step Deployment

### Step 1: Generate Production Secrets

Generate secure values for JWT_SECRET and OTP_HASH_SECRET:

```bash
# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or on Mac/Linux
openssl rand -base64 32
```

**Save these somewhere secure** — you'll need them shortly.

### Step 2: Push Code to Git

```bash
cd your-project-directory
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 3: Connect to Vercel

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to https://vercel.com/new
2. Choose your git provider (GitHub/GitLab/Bitbucket)
3. Select this repository: `salt-mill-system`
4. Click "Import"

**Option B: Via Vercel CLI**

```bash
npm i -g vercel
vercel link
vercel
```

### Step 4: Configure Environment Variables in Vercel

In the Vercel dashboard project settings:

1. Go to **Settings** → **Environment Variables**
2. Add each variable:
   - `MONGODB_URI` = Your production MongoDB connection
   - `JWT_SECRET` = Your generated 64-char secret
   - `SUPERUSER_EMAIL` = Production admin email
   - `SUPERUSER_PASSWORD` = Production admin password
   - `RESEND_API_KEY` = Your Resend API key
   - `OTP_FROM_EMAIL` = Your verified Resend email
   - `OTP_HASH_SECRET` = Your generated 32-char secret

3. For each variable, select which environments it applies to:
   - `Production` for all (unless testing separately)

### Step 5: Prepare MongoDB for Vercel

1. Go to **MongoDB Atlas** → **Network Access**
2. Add IP Whitelist entry:
   - For development/testing: `0.0.0.0/0` (allows all)
   - For production: Add specific Vercel regions (see Vercel docs)
3. Ensure your database user credentials are correct in `MONGODB_URI`

### Step 6: Deploy

The deployment should start automatically if you connected via GitHub.

**Check deployment status:**
- Vercel dashboard shows build progress in real-time
- Check for build errors in logs
- Preview URL appears at top of deployment

### Step 7: Verify Production Features

Once deployed, test these:

1. **Login** → Use SUPERUSER_EMAIL and SUPERUSER_PASSWORD
2. **Forgot Password** → Request OTP, verify email received
3. **Create Customers** → Test dashboard functionality
4. **Create Suppliers** → Test API routes
5. **Check Logs** → Vercel dashboard shows API errors

## Troubleshooting

### Build Failing: "Cannot find module X"
- Solution: Check `npm install` ran successfully
- Verify all dependencies in `package.json`

### Database Connection Error
- Solution: Check MONGODB_URI is correct
- Verify MongoDB Atlas whitelist includes Vercel IPs
- Check credentials in connection string

### Email Not Sending
- Solution: Verify RESEND_API_KEY is set in Vercel environment
- Confirm OTP_FROM_EMAIL is verified in Resend
- Check Resend dashboard for API errors

### 500 Errors on API Routes
- Check Vercel Function logs
- Ensure all env vars are set in Vercel dashboard
- Verify API routes are not timing out (max 30s on free tier)

## Production Checklist

- [ ] Generate new JWT_SECRET for production
- [ ] Generate new OTP_HASH_SECRET for production
- [ ] Change SUPERUSER_PASSWORD from default
- [ ] Get RESEND_API_KEY from resend.com
- [ ] Verify email in Resend for OTP_FROM_EMAIL
- [ ] Update MongoDB Atlas IP whitelist
- [ ] Push code to git
- [ ] Set all environment variables in Vercel
- [ ] Test login on production
- [ ] Test password reset OTP flow
- [ ] Test database queries
- [ ] Monitor error logs first 24 hours

## Files Modified for Deployment

- `vercel.json` — Vercel configuration
- `.vercelignore` — Files to ignore during build
- `.env.example` — Updated with all required variables

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
- **Resend Docs**: https://resend.com/docs
