import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PricingEngine } from '@/services/pricing.service';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication middleware
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.productId || !data.title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Get store ID from authenticated user
    // For now, we'll assume it's passed in the request or use a default
    const storeId = data.storeId || 'default-store-id';

    // Check if product already exists
    const existing = await prisma.product.findFirst({
      where: {
        aliexpressId: data.productId,
        storeId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Product already imported', productId: existing.id },
        { status: 409 }
      );
    }

    // Parse price
    const priceMatch = data.price?.match(/[\d.]+/);
    const supplierPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;

    if (supplierPrice === 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    // Get store settings for pricing
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { marginRules: true },
    });

    // Calculate pricing
    const pricingEngine = new PricingEngine();
    const pricing = pricingEngine.calculatePrice({
      supplierPrice,
      shippingCost: 0, // Will be calculated at checkout
      marginRules: store?.marginRules || [],
    });

    // Use optimized title if available, otherwise use original
    const title = data.optimizedTitle || data.title;

    // Create product
    const product = await prisma.product.create({
      data: {
        aliexpressId: data.productId,
        aliexpressUrl: data.url,
        title,
        description: data.description || title,
        category: 'Imported', // TODO: AI-powered category detection
        tags: extractTags(title),

        // Pricing
        supplierPrice: pricing.supplierPrice,
        sellingPrice: pricing.sellingPrice,
        compareAtPrice: pricing.compareAtPrice,
        costPrice: pricing.costPrice,
        shippingCost: 0,
        profit: pricing.profit,
        marginPercent: pricing.marginPercent,

        // Media
        mainImage: data.mainImage,
        images: data.images || [],
        videoUrl: data.videoUrl,

        // Supplier
        supplierName: data.storeName,
        supplierRating: data.rating || 0,
        supplierUrl: data.storeUrl,

        // Shipping
        estimatedDeliveryMin: 15,
        estimatedDeliveryMax: 30,
        shipsFrom: 'CN',

        // Quality
        qualityScore: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        averageRating: data.rating || 0,

        // Stock
        stock: 999,
        stockStatus: 'IN_STOCK',

        // SEO
        metaTitle: title,
        metaDescription: title.substring(0, 160),

        // Status - draft by default, admin can publish
        status: 'DRAFT',
        isActive: true,

        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        price: product.sellingPrice,
        status: product.status,
      },
    });
  } catch (error) {
    console.error('Product import error:', error);
    return NextResponse.json(
      { error: 'Failed to import product' },
      { status: 500 }
    );
  }
}

function extractTags(title: string): string[] {
  const words = title.toLowerCase().split(/\s+/);
  const commonWords = [
    'for',
    'with',
    'and',
    'the',
    'a',
    'an',
    'in',
    'on',
    'at',
    'to',
    'of',
  ];
  return words
    .filter((word) => word.length > 3 && !commonWords.includes(word))
    .slice(0, 10);
}
