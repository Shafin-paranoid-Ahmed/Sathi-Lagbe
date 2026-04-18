# Quick Deployment Guide - Sathi Lagbe

## 🚀 Deploy in 15 Minutes (Free)

### Prerequisites
- Git repository (GitHub recommended)
- Vercel account (free - sign up at vercel.com)
- MongoDB Atlas account (already set up)
- Cloudinary account (already set up)

---

## Step 1: Prepare Your Code (2 minutes)

```bash
# Ensure you're on the optimization branch
git checkout optimization

# Verify build works locally
cd client
npm run build  # Should complete without errors

cd ../server
npm test -- --passWithNoTests  # Run quick test
```

---

## Step 2: Deploy Backend to Vercel (5 minutes)

### Option A: Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to server directory
cd server

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Option B: Using Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your Git repository
3. Set **Root Directory** to `server`
4. Click **Deploy**

### Configure Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables, add:

```
NODE_ENV=production
MONGO_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=<generate-a-strong-random-string-min-32-chars>
FRONTEND_URL=https://your-app.vercel.app
CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
CLOUDINARY_API_KEY=<your-key>
CLOUDINARY_API_SECRET=<your-secret>
```

**Generate JWT_SECRET**:
```bash
# In terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 3: Deploy Frontend to Vercel (5 minutes)

### Option A: Using Vercel CLI
```bash
# Navigate to client directory
cd client

# Update API URL (if not already set)
# Create .env.production file:
echo "VITE_API_URL=https://your-backend.vercel.app" > .env.production

# Deploy
vercel --prod
```

### Option B: Using Vercel Dashboard
1. Go to https://vercel.com/new (or add new project)
2. Import same Git repository (or create separate)
3. Set **Root Directory** to `client`
4. Add environment variable: `VITE_API_URL=https://your-backend.vercel.app`
5. Click **Deploy**

---

## Step 4: Update CORS Configuration (3 minutes)

After deploying frontend, update your backend:

1. In Vercel Dashboard → Backend Project → Environment Variables
2. Update `FRONTEND_URL` to your actual frontend URL:
   ```
   FRONTEND_URL=https://sathi-lagbe.vercel.app
   ```
3. Redeploy backend (Vercel → Deployments → ... → Redeploy)

---

## Step 5: Configure MongoDB Atlas (2 minutes)

1. Go to MongoDB Atlas Dashboard
2. Navigate to Network Access
3. Add IP Address: `0.0.0.0/0` (allow all - required for Vercel serverless)
   - Note: This is safe as your database requires authentication
4. Verify connection string is correct in Vercel environment variables

---

## Step 5.5: Realtime + Cron Decisions (Required)

Before going live on Vercel, configure these architecture items:

1. **Socket hosting**
   - Set `SOCKET_ENABLED=false` on the Vercel API deployment (recommended default).
   - Run Socket.IO on a long-lived host (or managed realtime provider), then set client `VITE_SOCKET_URL`.

2. **Socket CORS**
   - Set `SOCKET_CORS_ORIGINS` to your production frontend origins (comma-separated).

3. **Cron jobs**
   - Set `CRON_SECRET` in backend environment variables.
   - Vercel cron calls:
     - `POST /api/internal/cron/cleanup-notifications`
     - `POST /api/internal/cron/auto-status-tick`
   - Send secret via `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`.

---

## Step 6: Test Your Deployment ✅

### Smoke Tests
```bash
# Test backend health
curl https://your-backend.vercel.app/

# Expected response:
# {"message":"API is running"}

# Test CORS
curl https://your-backend.vercel.app/api/cors-test

# Visit your frontend
open https://your-frontend.vercel.app
```

### Manual Tests
1. ✅ Can access homepage
2. ✅ Can sign up with BRACU email
3. ✅ Can log in
4. ✅ Can create a ride offer
5. ✅ Can search for rides
6. ✅ Chat works (send/receive messages)
7. ✅ Profile updates work
8. ✅ Images upload successfully

---

## Troubleshooting

### Issue: "CORS Error" in Browser Console
**Solution**: Verify `FRONTEND_URL` in backend environment variables matches your frontend URL exactly.

### Issue: "MongoDB Connection Failed"
**Solution**: 
- Check MongoDB Atlas Network Access (0.0.0.0/0 whitelisted)
- Verify `MONGO_URI` in environment variables
- Check MongoDB Atlas cluster is running

### Issue: "JWT Secret Missing" Error
**Solution**: Add `JWT_SECRET` to backend environment variables and redeploy.

### Issue: Images Not Uploading
**Solution**: Verify Cloudinary credentials in backend environment variables.

### Issue: "Rate Limit Exceeded" During Testing
**Solution**: Rate limits are relaxed in development. For testing production, they're set to reasonable limits (100 req/15min).

---

## Monitoring & Maintenance (Free Tools)

### 1. Vercel Analytics (Built-in)
- View in Vercel Dashboard → Analytics
- Tracks page views, load times, errors

### 2. MongoDB Atlas Monitoring (Built-in)
- View in Atlas Dashboard → Metrics
- Tracks connection count, queries, storage

### 3. Browser DevTools
- Check for console errors
- Monitor network requests
- Check application performance

### 4. Optional: Sentry (Free Tier)
```bash
# Add error tracking (optional)
npm install @sentry/react @sentry/node
```

---

## Updating Your Deployment

### Method 1: Automatic (Recommended)
Connect your Git repository to Vercel:
- Every push to `main` branch auto-deploys to production
- Every push to other branches creates preview deployments

### Method 2: Manual
```bash
# Make your changes
git add .
git commit -m "Update feature X"
git push

# Redeploy
cd client && vercel --prod
cd ../server && vercel --prod
```

---

## Cost Breakdown (All Free)

| Service | Free Tier Limits | Cost |
|---------|------------------|------|
| Vercel (Frontend) | Unlimited bandwidth, 100 GB-hours | $0 |
| Vercel (Backend) | 100k invocations, 100 GB-hours | $0 |
| MongoDB Atlas | 512MB storage, shared cluster | $0 |
| Cloudinary | 25GB storage, 25GB bandwidth | $0 |
| **Total** | | **$0/month** |

**Upgrade Needed When:**
- Users > 1000 daily active
- Data > 500MB
- Images > 25GB/month

---

## Scaling (Future)

When you outgrow free tiers:

1. **Vercel Pro** ($20/month)
   - 1TB bandwidth
   - Better performance

2. **MongoDB Atlas M10** ($0.08/hour = ~$57/month)
   - Dedicated cluster
   - Better performance
   - Automated backups

3. **Cloudinary Plus** ($89/month)
   - 180GB storage
   - 180GB bandwidth

**Estimated cost at scale**: $166/month for ~10K users

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **GitHub Issues**: Create issue in your repository
- **BRACU Support**: Contact your project advisor

---

## Security Checklist ✅

Before going live, verify:

- [x] Rate limiting enabled
- [x] CORS properly configured  
- [x] JWT_SECRET is strong (32+ characters)
- [x] MongoDB Atlas network access configured
- [x] HTTPS enabled (automatic on Vercel)
- [x] Environment variables not committed to Git
- [x] Debug logging disabled in production
- [x] Error messages don't expose sensitive data

---

**You're all set!** 🎉

Your application is now running in production on a completely free infrastructure.

*Questions? Check PRODUCTION-READINESS-REPORT.md for detailed information.*

