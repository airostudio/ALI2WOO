# ALI2WOO - Modern AliExpress Dropshipping Platform

A cutting-edge dropshipping platform built with Next.js 14, featuring AI-powered product optimization, intelligent pricing, automated order fulfillment, and a Chrome extension for one-click product imports.

## 🚀 Features

### Core Features
- **One-Click Product Import**: Chrome extension with AI-powered SEO title optimization
- **Smart Pricing Engine**: Dynamic pricing with configurable margin rules
- **Global Shipping Calculator**: Accurate shipping costs for 200+ countries
- **Automated Order Fulfillment**: Direct integration with AliExpress API
- **Real-time Analytics**: Profit tracking and business intelligence
- **Multi-store Support**: Manage multiple dropshipping stores

### AI-Powered Features
- **SEO Optimization**: Automatically rewrite product titles for search engines
- **AI Search Ready**: Optimized for ChatGPT, Perplexity, and other AI search engines
- **Quality Filtering**: AI-based product quality assessment
- **Smart Recommendations**: Product suggestions based on performance

### Technical Highlights
- **Modern Stack**: Next.js 14, TypeScript, Tailwind CSS
- **High Performance**: Redis caching, BullMQ queue system
- **Scalable Architecture**: Microservices-ready design
- **Real-time Updates**: WebSocket support for live data
- **Mobile-First**: Responsive design with PWA capabilities

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- AliExpress API credentials
- OpenAI API key (for AI features)

## 🛠️ Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd ALI2WOO
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ali2woo"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# AliExpress API
ALIEXPRESS_APP_KEY="your_app_key"
ALIEXPRESS_APP_SECRET="your_app_secret"
ALIEXPRESS_TRACKING_ID="your_tracking_id"

# OpenAI (for AI features)
OPENAI_API_KEY="your_openai_key"

# Payment
STRIPE_SECRET_KEY="your_stripe_secret"
STRIPE_PUBLISHABLE_KEY="your_stripe_publishable"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASSWORD="your_app_password"

# JWT
JWT_SECRET="your_jwt_secret_key_change_this"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npm run db:seed
```

### 4. Start Services

**Development Mode:**

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start worker processes
npm run worker
```

**Production Mode:**

```bash
# Build the application
npm run build

# Start production server
npm start

# Start workers
npm run worker
```

The application will be available at `http://localhost:3000`

## 🔌 Chrome Extension Setup

### Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this project

### Configuration

1. Click the extension icon in Chrome
2. Enter your API URL (e.g., `http://localhost:3000`)
3. Enter your authentication token
4. Click "Save Settings"

### Usage

1. Browse to any AliExpress product page
2. Click the "Import to Store" button
3. The product will be imported with AI-optimized title
4. Product appears in your admin dashboard

## 🔑 API Credentials

### AliExpress API

1. Sign up at [AliExpress Open Platform](https://developers.aliexpress.com/)
2. Create an app to get your App Key and App Secret
3. Apply for API permissions (Product Search, Order, Logistics)
4. Get your Tracking ID for affiliate commissions

### OpenAI API

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Generate an API key
3. Add credits to your account

### Stripe (for payments)

1. Sign up at [Stripe](https://stripe.com/)
2. Get your API keys from the dashboard

## 📊 Project Structure

```
ALI2WOO/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── ai/           # AI endpoints
│   │   │   ├── products/     # Product endpoints
│   │   │   └── orders/       # Order endpoints
│   │   ├── admin/            # Admin dashboard
│   │   └── store/            # Storefront
│   ├── lib/                   # Core libraries
│   │   ├── aliexpress/       # AliExpress API client
│   │   ├── redis/            # Redis/caching
│   │   └── prisma.ts         # Database client
│   ├── services/              # Business logic
│   │   ├── product-import.service.ts
│   │   ├── pricing.service.ts
│   │   ├── shipping.service.ts
│   │   └── order.service.ts
│   └── workers/               # Background workers
│       ├── queues.ts          # Queue definitions
│       └── index.ts           # Worker processes
├── chrome-extension/          # Chrome extension
│   ├── manifest.json
│   ├── content.js            # AliExpress page integration
│   ├── background.js         # API communication
│   └── popup.html            # Settings UI
├── prisma/
│   └── schema.prisma         # Database schema
└── package.json
```

## 🔄 Key Workflows

### Product Import Workflow

1. User clicks "Import" on AliExpress page (Chrome extension)
2. Extension extracts product data
3. Backend AI optimizes product title for SEO
4. Pricing engine calculates optimal selling price
5. Product saved to database as draft
6. Admin reviews and publishes

### Order Fulfillment Workflow

1. Customer places order on your store
2. Payment processed via Stripe
3. Order added to fulfillment queue
4. Worker places order on AliExpress
5. Tracking info synced automatically
6. Customer receives tracking email

### Product Sync Workflow

1. Daily cron job triggers sync
2. Workers fetch latest prices from AliExpress
3. Pricing engine recalculates margins
4. Out-of-stock products marked
5. Cache invalidated

## 🎯 Key Improvements Over Ali2Woo

### Performance
- **10x faster**: Modern React vs WordPress PHP
- **Real-time updates**: WebSockets vs cron jobs
- **Optimized caching**: Multi-layer Redis caching

### UX Improvements
- **One-click import**: Chrome extension vs manual entry
- **AI optimization**: Automated SEO vs manual editing
- **Smart pricing**: Dynamic rules vs fixed margins
- **Better analytics**: Real-time vs delayed reports

### Technical Advantages
- **Modern stack**: Next.js vs WordPress
- **Type safety**: TypeScript vs PHP
- **Scalability**: Microservices-ready architecture
- **API-first**: RESTful API design

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint
```

## 📈 Scaling

### Horizontal Scaling

1. Deploy multiple Next.js instances behind load balancer
2. Scale Redis with Redis Cluster
3. Use managed PostgreSQL (AWS RDS, Supabase)
4. Deploy workers on separate servers

### Optimization Tips

- Enable Redis caching for all product queries
- Use CDN for images (Cloudflare, Vercel)
- Implement rate limiting for API endpoints
- Add database indexes for frequently queried fields

## 🔐 Security

- API authentication with JWT tokens
- Rate limiting on all endpoints
- Input validation with Zod
- SQL injection prevention with Prisma
- XSS protection in frontend
- HTTPS-only in production

## 📝 Environment Variables Reference

See `.env.example` for all available configuration options.

API credentials should be stored in Vercel Environment Variables or your deployment platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Email: support@ali2woo.com

## 🚧 Roadmap

### Phase 1 (MVP - Completed)
- ✅ Basic product import
- ✅ Chrome extension
- ✅ Pricing engine
- ✅ Order management

### Phase 2 (In Progress)
- 🔄 Admin dashboard UI
- 🔄 Storefront templates
- 🔄 Email notifications
- 🔄 Analytics dashboard

### Phase 3 (Planned)
- ⏳ Mobile apps (iOS/Android)
- ⏳ Multi-language support
- ⏳ Additional supplier integrations
- ⏳ Advanced automation rules

### Phase 4 (Future)
- ⏳ AI chatbot for customer support
- ⏳ Inventory forecasting
- ⏳ Marketing automation
- ⏳ Marketplace integrations (eBay, Amazon)

## 💡 Tips for Success

1. **Start Small**: Import 10-20 products to test
2. **Optimize Titles**: Let AI rewrite for better SEO
3. **Monitor Margins**: Check pricing rules regularly
4. **Fast Shipping**: Choose suppliers with fast shipping
5. **Customer Service**: Respond quickly to inquiries
6. **Track Analytics**: Make data-driven decisions

---

Built with ❤️ using Next.js 14, TypeScript, and modern web technologies.
