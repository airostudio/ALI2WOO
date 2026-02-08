import prisma from '@/lib/prisma';
import { AliExpressClient } from '@/lib/aliexpress/client';
import { ShippingService } from './shipping.service';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';

export interface CreateOrderInput {
  customerId?: string;
  customerEmail: string;
  customerName: string;
  items: {
    productId: string;
    quantity: number;
    variantId?: string;
  }[];
  shippingAddress: any;
  billingAddress: any;
  paymentMethod: string;
  paymentId?: string;
}

export interface OrderWithItems {
  id: string;
  orderNumber: string;
  items: any[];
  totalAmount: number;
  shippingAddress: any;
}

export class OrderService {
  private aliexpressClient?: AliExpressClient;
  private shippingService: ShippingService;

  constructor() {
    this.shippingService = new ShippingService();

    if (process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET) {
      this.aliexpressClient = new AliExpressClient({
        appKey: process.env.ALIEXPRESS_APP_KEY,
        appSecret: process.env.ALIEXPRESS_APP_SECRET,
        trackingId: process.env.ALIEXPRESS_TRACKING_ID,
      });
    }
  }

  /**
   * Create new order
   */
  async createOrder(
    storeId: string,
    input: CreateOrderInput
  ): Promise<OrderWithItems> {
    // Fetch product details
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: input.items.map((item) => item.productId),
        },
        storeId,
      },
    });

    if (products.length !== input.items.length) {
      throw new Error('Some products not found');
    }

    // Calculate order totals
    let subtotal = 0;
    let supplierCost = 0;

    const orderItems = input.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error('Product not found');

      const itemTotal = product.sellingPrice * item.quantity;
      const itemSupplierCost = product.costPrice * item.quantity;

      subtotal += itemTotal;
      supplierCost += itemSupplierCost;

      return {
        productId: product.id,
        productName: product.title,
        productImage: product.mainImage,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        totalPrice: itemTotal,
        supplierCost: itemSupplierCost,
        profit: itemTotal - itemSupplierCost,
      };
    });

    // Calculate shipping
    const shipping = await this.shippingService.calculateShipping(
      input.shippingAddress,
      subtotal
    );

    // Calculate taxes
    const taxes = await this.shippingService.estimateTaxes(
      input.shippingAddress,
      subtotal,
      shipping.cost
    );

    const totalAmount = subtotal + shipping.cost + taxes.totalTax;
    const profit = totalAmount - supplierCost - shipping.cost;

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        storeId,
        customerId: input.customerId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        shippingAddress: input.shippingAddress,
        billingAddress: input.billingAddress,
        subtotal,
        shippingCost: shipping.cost,
        taxAmount: taxes.totalTax,
        totalAmount,
        supplierCost,
        profit,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        paymentMethod: input.paymentMethod,
        paymentId: input.paymentId,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return order;
  }

  /**
   * Process payment and fulfill order
   */
  async processPayment(orderId: string, paymentId: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentId,
        paidAt: new Date(),
        orderStatus: OrderStatus.PROCESSING,
      },
    });

    // Trigger fulfillment if auto-order is enabled
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
      },
    });

    if (order?.store.autoOrder) {
      await this.fulfillOrder(orderId);
    }
  }

  /**
   * Fulfill order by placing order on AliExpress
   */
  async fulfillOrder(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.fulfillmentStatus !== FulfillmentStatus.UNFULFILLED) {
      throw new Error('Order already fulfilled');
    }

    if (!this.aliexpressClient) {
      throw new Error('AliExpress client not configured');
    }

    // Place order for each item on AliExpress
    for (const item of order.items) {
      try {
        const result = await this.aliexpressClient.placeOrder({
          product_id: item.product.aliexpressId,
          quantity: item.quantity,
          logistics_address: {
            address: order.shippingAddress.address1,
            address2: order.shippingAddress.address2,
            city: order.shippingAddress.city,
            province: order.shippingAddress.province,
            zip: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
            country_code: order.shippingAddress.countryCode,
            contact_person: order.customerName,
            mobile_no: order.shippingAddress.phone,
          },
        });

        // Update order item with AliExpress order info
        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            aliexpressOrderId: result.order_id,
          },
        });
      } catch (error) {
        console.error(`Failed to place order for item ${item.id}:`, error);
        // Continue with other items
      }
    }

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: FulfillmentStatus.ORDERED_FROM_SUPPLIER,
        orderStatus: OrderStatus.CONFIRMED,
      },
    });
  }

  /**
   * Update tracking information
   */
  async updateTracking(
    orderId: string,
    trackingNumber: string,
    trackingUrl?: string
  ): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber,
        trackingUrl,
        fulfillmentStatus: FulfillmentStatus.SHIPPED,
        orderStatus: OrderStatus.SHIPPED,
      },
    });

    // TODO: Send tracking email to customer
  }

  /**
   * Mark order as delivered
   */
  async markDelivered(orderId: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: FulfillmentStatus.DELIVERED,
        orderStatus: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (
      order.fulfillmentStatus === FulfillmentStatus.SHIPPED ||
      order.fulfillmentStatus === FulfillmentStatus.DELIVERED
    ) {
      throw new Error('Cannot cancel shipped or delivered order');
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.CANCELLED,
        notes: reason,
      },
    });

    // TODO: Process refund if payment was made
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
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
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const totalProfit = orders.reduce((sum, order) => sum + order.profit, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue,
      totalProfit,
      averageOrderValue,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    };
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Get count of orders today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const todayOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const sequence = (todayOrders + 1).toString().padStart(4, '0');

    return `ORD-${year}${month}${day}-${sequence}`;
  }
}
