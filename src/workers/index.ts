import { Worker, Job } from 'bullmq';
import { QUEUES } from './queues';
import { ProductImportService } from '@/services/product-import.service';
import { OrderService } from '@/services/order.service';
import prisma from '@/lib/prisma';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Product Import Worker
const productImportWorker = new Worker(
  QUEUES.PRODUCT_IMPORT,
  async (job: Job) => {
    const { storeId, productId, config } = job.data;

    console.log(`Processing product import: ${productId}`);

    const importService = new ProductImportService(
      process.env.ALIEXPRESS_APP_KEY!,
      process.env.ALIEXPRESS_APP_SECRET!,
      process.env.ALIEXPRESS_TRACKING_ID,
      process.env.OPENAI_API_KEY
    );

    // Get product details from AliExpress
    const aliexpressClient = importService['aliexpressClient'];
    const product = await aliexpressClient.getProductDetails(productId);

    if (!product) {
      throw new Error('Product not found on AliExpress');
    }

    // Import the product
    const result = await importService.importSingleProduct(
      storeId,
      product,
      config
    );

    return result;
  },
  {
    connection,
    concurrency: 5, // Process 5 imports concurrently
  }
);

// Product Sync Worker
const productSyncWorker = new Worker(
  QUEUES.PRODUCT_SYNC,
  async (job: Job) => {
    const { storeId, productId } = job.data;

    console.log(`Syncing product: ${productId || 'all'}`);

    const importService = new ProductImportService(
      process.env.ALIEXPRESS_APP_KEY!,
      process.env.ALIEXPRESS_APP_SECRET!,
      process.env.ALIEXPRESS_TRACKING_ID
    );

    if (productId) {
      await importService.syncProduct(productId);
    } else {
      await importService.syncAllProducts(storeId);
    }

    return { success: true };
  },
  {
    connection,
    concurrency: 3,
  }
);

// Order Fulfillment Worker
const orderFulfillmentWorker = new Worker(
  QUEUES.ORDER_FULFILLMENT,
  async (job: Job) => {
    const { orderId } = job.data;

    console.log(`Fulfilling order: ${orderId}`);

    const orderService = new OrderService();
    await orderService.fulfillOrder(orderId);

    return { success: true, orderId };
  },
  {
    connection,
    concurrency: 2, // Process 2 orders concurrently
  }
);

// Email Worker
const emailWorker = new Worker(
  QUEUES.EMAIL_NOTIFICATIONS,
  async (job: Job) => {
    const { to, subject, template, data } = job.data;

    console.log(`Sending email to: ${to}`);

    // TODO: Implement email sending with nodemailer
    // For now, just log
    console.log(`Email: ${subject} to ${to}`);

    return { success: true };
  },
  {
    connection,
    concurrency: 10, // Send emails in parallel
  }
);

// Analytics Worker
const analyticsWorker = new Worker(
  QUEUES.ANALYTICS,
  async (job: Job) => {
    const { storeId, date } = job.data;

    console.log(`Calculating analytics for store: ${storeId}`);

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get orders for the day
    const orders = await prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalOrders = orders.length;
    const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const profit = orders.reduce((sum, order) => sum + order.profit, 0);
    const supplierCost = orders.reduce(
      (sum, order) => sum + order.supplierCost,
      0
    );
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Save analytics
    await prisma.analytics.upsert({
      where: {
        storeId_date: {
          storeId,
          date: startDate,
        },
      },
      create: {
        storeId,
        date: startDate,
        revenue,
        orders: totalOrders,
        avgOrderValue,
        profit,
        profitMargin,
        supplierCost,
      },
      update: {
        revenue,
        orders: totalOrders,
        avgOrderValue,
        profit,
        profitMargin,
        supplierCost,
      },
    });

    return { success: true, storeId, date };
  },
  {
    connection,
    concurrency: 1,
  }
);

// Error handling
const workers = [
  productImportWorker,
  productSyncWorker,
  orderFulfillmentWorker,
  emailWorker,
  analyticsWorker,
];

workers.forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed in queue ${worker.name}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed in queue ${worker.name}:`, err);
  });

  worker.on('error', (err) => {
    console.error(`Worker ${worker.name} error:`, err);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});

console.log('Workers started successfully');
console.log('Listening on queues:', Object.values(QUEUES));
