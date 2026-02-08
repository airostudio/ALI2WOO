import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedisClient } from '@/lib/redis/client';

// Queue names
export const QUEUES = {
  PRODUCT_IMPORT: 'product-import',
  PRODUCT_SYNC: 'product-sync',
  ORDER_FULFILLMENT: 'order-fulfillment',
  EMAIL_NOTIFICATIONS: 'email-notifications',
  ANALYTICS: 'analytics',
} as const;

// Redis connection config
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Create queues
export const productImportQueue = new Queue(QUEUES.PRODUCT_IMPORT, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 1000,
    },
  },
});

export const productSyncQueue = new Queue(QUEUES.PRODUCT_SYNC, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const orderFulfillmentQueue = new Queue(QUEUES.ORDER_FULFILLMENT, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

export const emailQueue = new Queue(QUEUES.EMAIL_NOTIFICATIONS, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const analyticsQueue = new Queue(QUEUES.ANALYTICS, {
  connection,
  defaultJobOptions: {
    attempts: 1,
  },
});

// Queue events for monitoring
export const productImportEvents = new QueueEvents(QUEUES.PRODUCT_IMPORT, {
  connection,
});

export const orderFulfillmentEvents = new QueueEvents(
  QUEUES.ORDER_FULFILLMENT,
  { connection }
);

// Add job helpers
export async function addProductImportJob(data: {
  storeId: string;
  productId: string;
  config: any;
}) {
  return await productImportQueue.add('import-product', data, {
    jobId: `import-${data.storeId}-${data.productId}`,
  });
}

export async function addBulkProductImportJob(data: {
  storeId: string;
  productIds: string[];
  config: any;
}) {
  const jobs = data.productIds.map((productId) => ({
    name: 'import-product',
    data: {
      storeId: data.storeId,
      productId,
      config: data.config,
    },
    opts: {
      jobId: `import-${data.storeId}-${productId}`,
    },
  }));

  return await productImportQueue.addBulk(jobs);
}

export async function addProductSyncJob(data: {
  storeId: string;
  productId?: string;
}) {
  return await productSyncQueue.add('sync-product', data);
}

export async function addOrderFulfillmentJob(data: {
  orderId: string;
  storeId: string;
}) {
  return await orderFulfillmentQueue.add('fulfill-order', data, {
    jobId: `fulfill-${data.orderId}`,
  });
}

export async function addEmailJob(data: {
  to: string;
  subject: string;
  template: string;
  data: any;
}) {
  return await emailQueue.add('send-email', data);
}

export async function addAnalyticsJob(data: {
  storeId: string;
  date: Date;
}) {
  return await analyticsQueue.add('calculate-analytics', data, {
    jobId: `analytics-${data.storeId}-${data.date.toISOString().split('T')[0]}`,
  });
}

// Scheduled jobs
export async function scheduleRecurringJobs() {
  // Sync all products daily at 2 AM
  await productSyncQueue.add(
    'sync-all-products',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // Every day at 2 AM
      },
    }
  );

  // Calculate analytics daily at 1 AM
  await analyticsQueue.add(
    'daily-analytics',
    {},
    {
      repeat: {
        pattern: '0 1 * * *', // Every day at 1 AM
      },
    }
  );
}
