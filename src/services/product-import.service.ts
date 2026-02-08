import { AliExpressClient, AliExpressProduct } from '@/lib/aliexpress/client';
import { PricingEngine } from './pricing.service';
import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis/client';
import OpenAI from 'openai';

export interface ProductImportConfig {
  autoFilterLowQuality: boolean;
  minRating: number;
  maxShippingDays: number;
  excludeKeywords: string[];
  marginRules: any[];
  aiQualityCheck: boolean;
  autoPublish: boolean;
}

export interface ImportResult {
  success: boolean;
  productId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export class ProductImportService {
  private aliexpressClient: AliExpressClient;
  private pricingEngine: PricingEngine;
  private openai?: OpenAI;

  constructor(
    appKey: string,
    appSecret: string,
    trackingId?: string,
    openaiKey?: string
  ) {
    this.aliexpressClient = new AliExpressClient({
      appKey,
      appSecret,
      trackingId,
    });
    this.pricingEngine = new PricingEngine();

    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  /**
   * Import products with smart filtering
   */
  async importProducts(
    storeId: string,
    keywords: string,
    config: ProductImportConfig,
    maxProducts = 50
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    // Search products
    const { products } = await this.aliexpressClient.searchProducts({
      keywords,
      pageSize: Math.min(maxProducts, 50),
      sort: 'orders',
    });

    for (const product of products) {
      try {
        const result = await this.importSingleProduct(storeId, product, config);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Import single product with filtering
   */
  async importSingleProduct(
    storeId: string,
    product: AliExpressProduct,
    config: ProductImportConfig
  ): Promise<ImportResult> {
    // Check if product already exists
    const existing = await prisma.product.findUnique({
      where: {
        storeId_aliexpressId: {
          storeId,
          aliexpressId: product.product_id,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        skipped: true,
        reason: 'Product already imported',
      };
    }

    // Filter by rating
    const rating = parseFloat(product.evaluate_rate);
    if (config.autoFilterLowQuality && rating < config.minRating) {
      return {
        success: false,
        skipped: true,
        reason: `Rating ${rating} below minimum ${config.minRating}`,
      };
    }

    // Filter by keywords
    const title = product.product_title.toLowerCase();
    const hasExcludedKeyword = config.excludeKeywords.some((keyword) =>
      title.includes(keyword.toLowerCase())
    );

    if (hasExcludedKeyword) {
      return {
        success: false,
        skipped: true,
        reason: 'Contains excluded keyword',
      };
    }

    // AI quality check
    if (config.aiQualityCheck && this.openai) {
      const qualityScore = await this.checkProductQuality(product);
      if (qualityScore < 6) {
        return {
          success: false,
          skipped: true,
          reason: `AI quality score ${qualityScore}/10 too low`,
        };
      }
    }

    // Get store settings
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { marginRules: true },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    // Calculate pricing
    const supplierPrice = parseFloat(product.sale_price);
    const shippingCost = parseFloat(product.shipping?.shipping_fee || '0');

    const pricing = this.pricingEngine.calculatePrice({
      supplierPrice,
      shippingCost,
      category: product.category_name,
      marginRules: store.marginRules,
    });

    // Get detailed product info
    const details = await this.aliexpressClient.getProductDetails(
      product.product_id
    );

    // Create product
    const newProduct = await prisma.product.create({
      data: {
        aliexpressId: product.product_id,
        aliexpressUrl: `https://www.aliexpress.com/item/${product.product_id}.html`,
        title: product.product_title,
        description: details.product_description || product.product_title,
        category: product.category_name,
        tags: this.extractTags(product.product_title),

        // Pricing
        supplierPrice: pricing.supplierPrice,
        sellingPrice: pricing.sellingPrice,
        compareAtPrice: pricing.compareAtPrice,
        costPrice: pricing.costPrice,
        shippingCost: pricing.shippingCost,
        profit: pricing.profit,
        marginPercent: pricing.marginPercent,

        // Media
        mainImage: product.product_main_image_url,
        images: product.product_small_image_urls || [],
        videoUrl: product.product_video_url,

        // Supplier
        supplierName: product.shop_title,
        supplierRating: rating,
        supplierUrl: product.shop_url,

        // Shipping
        estimatedDeliveryMin: 15,
        estimatedDeliveryMax: config.maxShippingDays,
        shipsFrom: 'CN',

        // Quality
        qualityScore: rating,
        reviewCount: product.order_count,
        averageRating: rating,

        // Stock
        stock: 999,
        stockStatus: 'IN_STOCK',

        // Status
        status: config.autoPublish ? 'PUBLISHED' : 'DRAFT',
        isActive: true,

        storeId,
      },
    });

    // Cache product data
    await cache.set(
      `product:${newProduct.id}`,
      newProduct,
      3600 // 1 hour
    );

    return {
      success: true,
      productId: newProduct.id,
    };
  }

  /**
   * AI-powered quality check
   */
  private async checkProductQuality(
    product: AliExpressProduct
  ): Promise<number> {
    if (!this.openai) return 5;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a product quality analyzer. Rate the product quality from 1-10 based on title, rating, and order count. Return only the number.',
          },
          {
            role: 'user',
            content: `Title: ${product.product_title}\nRating: ${product.evaluate_rate}\nOrders: ${product.order_count}`,
          },
        ],
        max_tokens: 10,
      });

      const score = parseFloat(
        response.choices[0]?.message?.content?.trim() || '5'
      );
      return Math.min(Math.max(score, 1), 10);
    } catch (error) {
      console.error('AI quality check failed:', error);
      return 5;
    }
  }

  /**
   * Extract tags from title
   */
  private extractTags(title: string): string[] {
    const words = title.toLowerCase().split(/\s+/);
    const commonWords = ['for', 'with', 'and', 'the', 'a', 'an', 'in', 'on'];
    return words
      .filter((word) => word.length > 3 && !commonWords.includes(word))
      .slice(0, 10);
  }

  /**
   * Sync product inventory and pricing
   */
  async syncProduct(productId: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { marginRules: true } } },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Get latest data from AliExpress
    const details = await this.aliexpressClient.getProductDetails(
      product.aliexpressId
    );

    if (!details) {
      // Product might be discontinued
      await prisma.product.update({
        where: { id: productId },
        data: {
          status: 'DISCONTINUED',
          stockStatus: 'DISCONTINUED',
          isActive: false,
        },
      });
      return;
    }

    // Update pricing
    const supplierPrice = parseFloat(details.sale_price);
    const pricing = this.pricingEngine.calculatePrice({
      supplierPrice,
      shippingCost: product.shippingCost,
      category: product.category,
      marginRules: product.store.marginRules,
    });

    // Update product
    await prisma.product.update({
      where: { id: productId },
      data: {
        supplierPrice: pricing.supplierPrice,
        sellingPrice: pricing.sellingPrice,
        profit: pricing.profit,
        marginPercent: pricing.marginPercent,
        lastSyncedAt: new Date(),
      },
    });

    // Invalidate cache
    await cache.delete(`product:${productId}`);
  }

  /**
   * Bulk sync all products in store
   */
  async syncAllProducts(storeId: string): Promise<void> {
    const products = await prisma.product.findMany({
      where: { storeId, isActive: true },
      select: { id: true },
    });

    for (const product of products) {
      try {
        await this.syncProduct(product.id);
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to sync product ${product.id}:`, error);
      }
    }
  }
}
