import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis/client';

export interface ShippingAddress {
  country: string;
  countryCode: string;
  province?: string;
  city?: string;
  postalCode?: string;
}

export interface ShippingEstimate {
  cost: number;
  currency: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  carrier: string;
  method: string;
  isFreeShipping: boolean;
}

export interface TaxEstimate {
  taxAmount: number;
  dutyAmount: number;
  totalTax: number;
  currency: string;
}

export class ShippingService {
  /**
   * Calculate shipping cost for destination
   */
  async calculateShipping(
    address: ShippingAddress,
    cartTotal: number,
    weight?: number
  ): Promise<ShippingEstimate> {
    // Try cache first
    const cacheKey = `shipping:${address.countryCode}:${cartTotal}:${weight || 0}`;
    const cached = await cache.get<ShippingEstimate>(cacheKey);
    if (cached) return cached;

    // Find matching shipping zone
    const zone = await prisma.shippingZone.findFirst({
      where: {
        countries: {
          has: address.countryCode,
        },
        isActive: true,
      },
    });

    let cost: number;
    let estimatedDaysMin: number;
    let estimatedDaysMax: number;

    if (zone) {
      // Check for free shipping
      if (zone.freeShippingMin && cartTotal >= zone.freeShippingMin) {
        cost = 0;
      } else {
        // Calculate based on weight
        const itemWeight = weight || 0.5; // Default 0.5kg if not specified
        cost = zone.baseRate + itemWeight * zone.perKgRate;
      }

      estimatedDaysMin = zone.estimatedDaysMin;
      estimatedDaysMax = zone.estimatedDaysMax;
    } else {
      // Default shipping for countries not in zones
      cost = this.getDefaultShippingCost(address.countryCode, cartTotal);
      estimatedDaysMin = 15;
      estimatedDaysMax = 30;
    }

    const estimate: ShippingEstimate = {
      cost: Math.round(cost * 100) / 100,
      currency: 'USD',
      estimatedDaysMin,
      estimatedDaysMax,
      carrier: 'AliExpress Standard Shipping',
      method: 'standard',
      isFreeShipping: cost === 0,
    };

    // Cache for 1 hour
    await cache.set(cacheKey, estimate, 3600);

    return estimate;
  }

  /**
   * Get default shipping cost for countries not in zones
   */
  private getDefaultShippingCost(
    countryCode: string,
    cartTotal: number
  ): number {
    // Free shipping over certain amount
    if (cartTotal >= 50) {
      return 0;
    }

    // Regional pricing
    const northAmerica = ['US', 'CA', 'MX'];
    const europe = [
      'GB',
      'DE',
      'FR',
      'IT',
      'ES',
      'NL',
      'BE',
      'AT',
      'SE',
      'NO',
      'DK',
      'FI',
    ];
    const asia = ['JP', 'KR', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID'];
    const oceania = ['AU', 'NZ'];

    if (northAmerica.includes(countryCode)) {
      return 5.99;
    } else if (europe.includes(countryCode)) {
      return 7.99;
    } else if (asia.includes(countryCode)) {
      return 4.99;
    } else if (oceania.includes(countryCode)) {
      return 9.99;
    }

    return 8.99; // Rest of world
  }

  /**
   * Estimate taxes and duties for international shipping
   */
  async estimateTaxes(
    address: ShippingAddress,
    subtotal: number,
    shippingCost: number
  ): Promise<TaxEstimate> {
    const cacheKey = `tax:${address.countryCode}:${subtotal}`;
    const cached = await cache.get<TaxEstimate>(cacheKey);
    if (cached) return cached;

    let taxRate = 0;
    let dutyRate = 0;

    // Tax rates by country (simplified - in production use TaxJar/Avalara API)
    const taxRates: Record<string, number> = {
      US: 0, // Varies by state
      CA: 0.13, // HST
      GB: 0.2, // VAT
      DE: 0.19, // VAT
      FR: 0.2, // VAT
      AU: 0.1, // GST
      NZ: 0.15, // GST
      JP: 0.1, // Consumption tax
      SG: 0.08, // GST
    };

    // Duty thresholds (simplified)
    const dutyThresholds: Record<string, number> = {
      US: 800, // De minimis
      CA: 20,
      GB: 135,
      EU: 150,
      AU: 1000,
    };

    taxRate = taxRates[address.countryCode] || 0;

    // Check if duty applies
    const threshold = dutyThresholds[address.countryCode] || 0;
    if (subtotal > threshold) {
      dutyRate = 0.05; // Simplified 5% duty rate
    }

    const taxableAmount = subtotal + shippingCost;
    const taxAmount = taxableAmount * taxRate;
    const dutyAmount = subtotal * dutyRate;
    const totalTax = taxAmount + dutyAmount;

    const estimate: TaxEstimate = {
      taxAmount: Math.round(taxAmount * 100) / 100,
      dutyAmount: Math.round(dutyAmount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      currency: 'USD',
    };

    // Cache for 24 hours
    await cache.set(cacheKey, estimate, 86400);

    return estimate;
  }

  /**
   * Get tracking information
   */
  async getTrackingInfo(trackingNumber: string): Promise<any> {
    // In production, integrate with tracking APIs (AfterShip, etc.)
    // For now, return mock data structure

    return {
      trackingNumber,
      status: 'in_transit',
      carrier: 'AliExpress Standard Shipping',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      events: [
        {
          date: new Date(),
          status: 'in_transit',
          location: 'International Hub',
          description: 'Package in transit',
        },
      ],
    };
  }

  /**
   * Validate shipping address
   */
  validateAddress(address: ShippingAddress): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!address.country || address.country.length === 0) {
      errors.push('Country is required');
    }

    if (!address.countryCode || address.countryCode.length !== 2) {
      errors.push('Invalid country code');
    }

    if (!address.postalCode) {
      errors.push('Postal code is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get supported countries
   */
  async getSupportedCountries(): Promise<
    { code: string; name: string }[]
  > {
    return [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'AU', name: 'Australia' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
      { code: 'IT', name: 'Italy' },
      { code: 'ES', name: 'Spain' },
      { code: 'NL', name: 'Netherlands' },
      { code: 'BE', name: 'Belgium' },
      { code: 'SE', name: 'Sweden' },
      { code: 'NO', name: 'Norway' },
      { code: 'DK', name: 'Denmark' },
      { code: 'FI', name: 'Finland' },
      { code: 'JP', name: 'Japan' },
      { code: 'KR', name: 'South Korea' },
      { code: 'SG', name: 'Singapore' },
      { code: 'NZ', name: 'New Zealand' },
      // Add more countries as needed
    ];
  }
}
