# Deployment Guide

## Vercel Deployment (Recommended)

### Prerequisites
- Vercel account
- GitHub repository

### Steps

1. **Push to GitHub**
```bash
git push origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import your GitHub repository
- Configure project settings:
  - Framework Preset: Next.js
  - Root Directory: ./
  - Build Command: `npm run build`
  - Output Directory: `.next`

3. **Add Environment Variables**

Go to Project Settings > Environment Variables and add:

```
DATABASE_URL
REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
ALIEXPRESS_APP_KEY
ALIEXPRESS_APP_SECRET
ALIEXPRESS_TRACKING_ID
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
JWT_SECRET
NEXT_PUBLIC_APP_URL
```

**Note**: Store sensitive credentials in Vercel Environment Variables, not in code.

4. **Deploy**
- Click "Deploy"
- Wait for deployment to complete
- Your site will be live at `your-project.vercel.app`

### Custom Domain

1. Go to Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate will be auto-provisioned

## Database Setup

### Option 1: Vercel Postgres (Recommended)
```bash
# Install Vercel Postgres
npm i @vercel/postgres

# Create database in Vercel dashboard
# Copy connection string to DATABASE_URL
```

### Option 2: Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from project settings
3. Add to Vercel environment variables

### Option 3: Railway
1. Create project at [railway.app](https://railway.app)
2. Add PostgreSQL service
3. Copy connection string

### Run Migrations
```bash
# After setting DATABASE_URL in Vercel
npx prisma migrate deploy
```

## Redis Setup

### Option 1: Upstash (Recommended for Vercel)
1. Create database at [upstash.com](https://upstash.com)
2. Copy connection details
3. Add to Vercel environment variables:
   - REDIS_HOST
   - REDIS_PORT
   - REDIS_PASSWORD

### Option 2: Redis Cloud
1. Create database at [redis.com](https://redis.com)
2. Get connection details
3. Add to environment variables

## Worker Processes

Workers need to run separately from Next.js:

### Option 1: Separate Vercel Deployment
```bash
# Create vercel.json for worker
{
  "builds": [
    {
      "src": "src/workers/index.ts",
      "use": "@vercel/node"
    }
  ]
}
```

### Option 2: Railway/Render
1. Create new service
2. Set start command: `npm run worker`
3. Add same environment variables
4. Deploy

## Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations run successfully
- [ ] Redis connection tested
- [ ] AliExpress API credentials valid
- [ ] OpenAI API key has credits
- [ ] Stripe keys are production keys
- [ ] SMTP credentials tested
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Worker processes running
- [ ] Error monitoring setup (Sentry)
- [ ] Analytics configured (Google Analytics)
- [ ] Backup strategy in place

## Monitoring

### Vercel Analytics
Enable in Project Settings > Analytics

### Error Tracking
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Uptime Monitoring
- Use [Better Uptime](https://betteruptime.com)
- Monitor: `/api/health`
- Alert on downtime

## Environment-Specific Configuration

### Development
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Staging
```env
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.your-store.com
```

### Production
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-store.com
```

## Scaling

### Database
- Enable connection pooling
- Add read replicas for analytics
- Use database indexes

### Redis
- Use Redis Cluster for high traffic
- Enable persistence
- Configure eviction policies

### Next.js
- Enable ISR for product pages
- Use edge functions where possible
- Optimize images with next/image

### Workers
- Scale horizontally with multiple instances
- Use queue priorities
- Monitor queue metrics

## Backup Strategy

### Database Backups
```bash
# Daily automated backups
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to S3/Backblaze
aws s3 cp backup-$(date +%Y%m%d).sql s3://your-bucket/
```

### Redis Snapshots
Enable persistence in Redis config:
```
save 900 1
save 300 10
save 60 10000
```

## Security

### Rate Limiting
```typescript
// Add to API routes
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### API Key Rotation
- Rotate JWT secrets quarterly
- Rotate API keys annually
- Use different keys per environment

### HTTPS Only
```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Build Failures
- Check Node.js version matches (18+)
- Clear Next.js cache: `rm -rf .next`
- Verify all dependencies installed

### Database Connection Issues
- Check connection string format
- Verify SSL settings
- Test connection locally first

### Worker Not Processing Jobs
- Verify Redis connection
- Check worker logs
- Ensure queue names match

## Support

For deployment issues:
- Check Vercel logs
- Review error monitoring
- Contact support team
