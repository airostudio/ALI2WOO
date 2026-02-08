import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';

export interface AliExpressConfig {
  appKey: string;
  appSecret: string;
  trackingId?: string;
}

export interface ProductSearchParams {
  keywords?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
  sort?: 'price_asc' | 'price_desc' | 'orders' | 'rating';
  shipFromCountry?: string;
  shipToCountry?: string;
}

export interface AliExpressProduct {
  product_id: string;
  product_title: string;
  product_main_image_url: string;
  product_video_url?: string;
  product_small_image_urls: string[];
  category_id: string;
  category_name: string;
  original_price: string;
  sale_price: string;
  discount: string;
  evaluate_rate: string;
  order_count: number;
  shop_id: string;
  shop_url: string;
  shop_title: string;
  shipping?: {
    free_shipping: boolean;
    shipping_fee: string;
    delivery_time: string;
  };
}

export interface OrderPlacementParams {
  product_id: string;
  quantity: number;
  sku_attr?: string;
  logistics_address: {
    address: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    country_code: string;
    contact_person: string;
    mobile_no: string;
    phone_country?: string;
  };
}

export class AliExpressClient {
  private config: AliExpressConfig;
  private client: AxiosInstance;
  private baseUrl = 'https://api-sg.aliexpress.com/sync';

  constructor(config: AliExpressConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Generate signature for API requests
   */
  private generateSign(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    let str = this.config.appSecret;
    for (const [key, value] of Object.entries(sorted)) {
      str += key + value;
    }
    str += this.config.appSecret;

    return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
  }

  /**
   * Make API request
   */
  private async request<T>(
    method: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    const timestamp = new Date().getTime();
    const requestParams = {
      method,
      app_key: this.config.appKey,
      timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      ...params,
    };

    requestParams.sign = this.generateSign(requestParams);

    try {
      const response = await this.client.post('', null, {
        params: requestParams,
      });

      if (response.data.error_response) {
        throw new Error(
          response.data.error_response.msg || 'AliExpress API Error'
        );
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `AliExpress API request failed: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(
    params: ProductSearchParams
  ): Promise<{ products: AliExpressProduct[]; total: number }> {
    const response = await this.request<any>(
      'aliexpress.affiliate.product.query',
      {
        keywords: params.keywords,
        category_ids: params.category,
        min_price: params.minPrice,
        max_price: params.maxPrice,
        page_no: params.page || 1,
        page_size: params.pageSize || 20,
        sort: params.sort || 'orders',
        ship_to_country: params.shipToCountry || 'US',
        tracking_id: this.config.trackingId,
      }
    );

    const result =
      response.aliexpress_affiliate_product_query_response?.resp_result;
    if (!result) {
      return { products: [], total: 0 };
    }

    const data = JSON.parse(result.resp_code === 200 ? result.result : '{}');

    return {
      products: data.products?.product || [],
      total: data.total_record_count || 0,
    };
  }

  /**
   * Get product details
   */
  async getProductDetails(productId: string): Promise<any> {
    const response = await this.request<any>(
      'aliexpress.affiliate.productdetail.get',
      {
        product_ids: productId,
        fields:
          'product_id,product_title,product_main_image_url,product_video_url,product_small_image_urls,category_id,original_price,sale_price,discount,evaluate_rate,order_count,shop_id,shop_url',
        tracking_id: this.config.trackingId,
      }
    );

    const result =
      response.aliexpress_affiliate_productdetail_get_response?.resp_result;
    if (!result || result.resp_code !== 200) {
      throw new Error('Product not found');
    }

    const data = JSON.parse(result.result);
    return data.products?.[0] || null;
  }

  /**
   * Get shipping info
   */
  async getShippingInfo(
    productId: string,
    country: string,
    province?: string,
    city?: string
  ): Promise<any> {
    const response = await this.request<any>(
      'aliexpress.logistics.buyer.freight.get',
      {
        product_id: productId,
        country_code: country,
        province_code: province,
        city_code: city,
        send_goods_country_code: 'CN',
      }
    );

    return (
      response.aliexpress_logistics_buyer_freight_get_response?.result || null
    );
  }

  /**
   * Place order to AliExpress
   */
  async placeOrder(params: OrderPlacementParams): Promise<any> {
    const response = await this.request<any>(
      'aliexpress.trade.buy.placeorder',
      {
        param_place_order_request: JSON.stringify({
          product_items: [
            {
              product_id: params.product_id,
              product_count: params.quantity,
              sku_attr: params.sku_attr,
            },
          ],
          logistics_address: params.logistics_address,
        }),
      }
    );

    const result =
      response.aliexpress_trade_buy_placeorder_response?.result;
    if (!result || !result.is_success) {
      throw new Error(result?.error_msg || 'Failed to place order');
    }

    return result;
  }

  /**
   * Get order tracking
   */
  async getOrderTracking(orderId: string): Promise<any> {
    const response = await this.request<any>(
      'aliexpress.logistics.redefining.getlogisticsselleraddresses',
      {
        order_id: orderId,
      }
    );

    return response.aliexpress_logistics_redefining_getlogisticsselleraddresses_response?.result;
  }

  /**
   * Get hot products (trending)
   */
  async getHotProducts(category?: string): Promise<AliExpressProduct[]> {
    const response = await this.request<any>(
      'aliexpress.affiliate.hotproduct.query',
      {
        category_ids: category,
        tracking_id: this.config.trackingId,
        page_size: 50,
      }
    );

    const result =
      response.aliexpress_affiliate_hotproduct_query_response?.resp_result;
    if (!result || result.resp_code !== 200) {
      return [];
    }

    const data = JSON.parse(result.result);
    return data.products?.product || [];
  }

  /**
   * Get categories
   */
  async getCategories(): Promise<any[]> {
    const response = await this.request<any>(
      'aliexpress.affiliate.category.get',
      {
        app_signature: this.config.appKey,
      }
    );

    const result =
      response.aliexpress_affiliate_category_get_response?.resp_result;
    if (!result || result.resp_code !== 200) {
      return [];
    }

    const data = JSON.parse(result.result);
    return data.categories?.category || [];
  }
}
