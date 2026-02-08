import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication and get storeId from user
    const storeId = 'default-store-id';

    // Get total products
    const totalProducts = await prisma.product.count({
      where: { storeId },
    });

    // Get products imported today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayProducts = await prisma.product.count({
      where: {
        storeId,
        createdAt: {
          gte: today,
        },
      },
    });

    return NextResponse.json({
      totalProducts,
      todayProducts,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
