import { MarginRule, MarginType } from '@prisma/client';

export interface PricingInput {
  supplierPrice: number;
  shippingCost: number;
  category?: string;
  supplier?: string;
  destinationCountry?: string;
  competitorPrices?: number[];
  marginRules?: MarginRule[];
}

export interface PricingOutput {
  supplierPrice: number;
  shippingCost: number;
  costPrice: number;
  sellingPrice: number;
  compareAtPrice: number;
  profit: number;
  marginPercent: number;
}

export class PricingEngine {
  /**
   * Calculate optimal pricing
   */
  calculatePrice(input: PricingInput): PricingOutput {
    const costPrice = input.supplierPrice + input.shippingCost;

    // Find applicable margin rule
    const marginRule = this.findApplicableMarginRule(input);

    // Calculate base selling price
    let sellingPrice: number;
    let marginPercent: number;

    if (marginRule) {
      const result = this.applyMarginRule(costPrice, marginRule);
      sellingPrice = result.sellingPrice;
      marginPercent = result.marginPercent;
    } else {
      // Default margin rules
      marginPercent = this.getDefaultMargin(costPrice);
      sellingPrice = costPrice * (1 + marginPercent / 100);
    }

    // Round to psychological pricing
    sellingPrice = this.applyPsychologicalPricing(sellingPrice);

    // Calculate compare at price (show as "discount")
    const compareAtPrice = sellingPrice * 1.3;

    // Adjust based on competitor prices if available
    if (input.competitorPrices && input.competitorPrices.length > 0) {
      sellingPrice = this.adjustForCompetition(
        sellingPrice,
        input.competitorPrices
      );
    }

    const profit = sellingPrice - costPrice;
    const actualMargin = ((profit / sellingPrice) * 100);

    return {
      supplierPrice: input.supplierPrice,
      shippingCost: input.shippingCost,
      costPrice: this.roundPrice(costPrice),
      sellingPrice: this.roundPrice(sellingPrice),
      compareAtPrice: this.roundPrice(compareAtPrice),
      profit: this.roundPrice(profit),
      marginPercent: this.roundPrice(actualMargin),
    };
  }

  /**
   * Find the most applicable margin rule
   */
  private findApplicableMarginRule(
    input: PricingInput
  ): MarginRule | undefined {
    if (!input.marginRules || input.marginRules.length === 0) {
      return undefined;
    }

    const costPrice = input.supplierPrice + input.shippingCost;

    // Filter rules that match conditions
    const applicableRules = input.marginRules.filter((rule) => {
      if (!rule.isActive) return false;

      // Check price range
      if (rule.minPrice && costPrice < rule.minPrice) return false;
      if (rule.maxPrice && costPrice > rule.maxPrice) return false;

      // Check category
      if (rule.category && input.category !== rule.category) return false;

      // Check supplier
      if (rule.supplier && input.supplier !== rule.supplier) return false;

      return true;
    });

    // Return highest priority rule
    if (applicableRules.length === 0) return undefined;

    return applicableRules.sort((a, b) => b.priority - a.priority)[0];
  }

  /**
   * Apply margin rule to price
   */
  private applyMarginRule(
    costPrice: number,
    rule: MarginRule
  ): { sellingPrice: number; marginPercent: number } {
    let sellingPrice: number;

    switch (rule.marginType) {
      case MarginType.PERCENTAGE:
        sellingPrice = costPrice * (1 + rule.marginValue / 100);
        break;

      case MarginType.FIXED_AMOUNT:
        sellingPrice = costPrice + rule.marginValue;
        break;

      case MarginType.MULTIPLIER:
        sellingPrice = costPrice * rule.marginValue;
        break;

      default:
        sellingPrice = costPrice * 1.5;
    }

    const marginPercent = ((sellingPrice - costPrice) / sellingPrice) * 100;

    return { sellingPrice, marginPercent };
  }

  /**
   * Get default margin based on price tier
   */
  private getDefaultMargin(costPrice: number): number {
    if (costPrice < 10) return 100; // 100% margin for low-cost items
    if (costPrice < 30) return 70; // 70% margin
    if (costPrice < 50) return 50; // 50% margin
    if (costPrice < 100) return 40; // 40% margin
    return 30; // 30% margin for expensive items
  }

  /**
   * Apply psychological pricing ($9.99, $19.99, etc.)
   */
  private applyPsychologicalPricing(price: number): number {
    if (price < 10) {
      // For prices under $10, use .99
      return Math.floor(price) + 0.99;
    } else if (price < 100) {
      // For prices $10-$100, use .99
      return Math.floor(price) + 0.99;
    } else {
      // For prices over $100, round to .99
      const rounded = Math.round(price / 10) * 10;
      return rounded - 0.01;
    }
  }

  /**
   * Adjust price based on competitor prices
   */
  private adjustForCompetition(
    basePrice: number,
    competitorPrices: number[]
  ): number {
    const avgCompetitorPrice =
      competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;

    // If our price is more than 20% higher than average, reduce it
    if (basePrice > avgCompetitorPrice * 1.2) {
      return avgCompetitorPrice * 1.15; // Price slightly above average
    }

    // If our price is significantly lower, we can increase it
    if (basePrice < avgCompetitorPrice * 0.8) {
      return avgCompetitorPrice * 0.95; // Price slightly below average
    }

    return basePrice;
  }

  /**
   * Calculate dynamic pricing based on demand
   */
  calculateDynamicPrice(
    basePrice: number,
    demandFactor: number
  ): number {
    // demandFactor: 0-1 (low demand) to 1+ (high demand)
    let adjustmentFactor = 1;

    if (demandFactor > 1.5) {
      // High demand - increase price by up to 15%
      adjustmentFactor = 1.15;
    } else if (demandFactor > 1.2) {
      // Moderate demand - increase price by up to 10%
      adjustmentFactor = 1.1;
    } else if (demandFactor < 0.5) {
      // Low demand - decrease price by up to 15%
      adjustmentFactor = 0.85;
    } else if (demandFactor < 0.8) {
      // Below average demand - decrease price by up to 10%
      adjustmentFactor = 0.9;
    }

    return this.applyPsychologicalPricing(basePrice * adjustmentFactor);
  }

  /**
   * Round price to 2 decimal places
   */
  private roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  /**
   * Calculate bulk discount
   */
  calculateBulkDiscount(
    unitPrice: number,
    quantity: number
  ): { unitPrice: number; totalPrice: number; discountPercent: number } {
    let discountPercent = 0;

    if (quantity >= 10) {
      discountPercent = 15;
    } else if (quantity >= 5) {
      discountPercent = 10;
    } else if (quantity >= 3) {
      discountPercent = 5;
    }

    const discountedPrice = unitPrice * (1 - discountPercent / 100);
    const totalPrice = discountedPrice * quantity;

    return {
      unitPrice: this.roundPrice(discountedPrice),
      totalPrice: this.roundPrice(totalPrice),
      discountPercent,
    };
  }
}
