/**
 * API route for running external API endpoints
 */
import { Router, Request, Response } from "express";
import { pgStorage as storage } from "../pg-storage";
import axios from "axios";
import { logger } from "../logger";

export const router = Router();

// Authentication middleware for secured routes
router.use((req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false, 
      error: "Authentication required" 
    });
  }
  next();
});

/**
 * Run an API endpoint for a user product
 * POST /api/run-endpoint/:endpointId
 */
router.post("/:endpointId", async (req: Request, res: Response) => {
  try {
    const endpointId = parseInt(req.params.endpointId, 10);
    if (isNaN(endpointId)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid endpoint ID" 
      });
    }

    // Get endpoint configuration
    const endpoint = await storage.getUserProductEndpoint(endpointId);
    if (!endpoint) {
      return res.status(404).json({ 
        success: false, 
        error: "Endpoint not found" 
      });
    }

    // Get API settings
    const apiSetting = await storage.getApiSetting(endpoint.apiSettingId);
    if (!apiSetting) {
      return res.status(404).json({ 
        success: false, 
        error: "API setting not found" 
      });
    }

    // Get the user product to get access to username/MSISDN
    const userProduct = await storage.getUserProduct(endpoint.userProductId);
    if (!userProduct) {
      return res.status(404).json({ 
        success: false, 
        error: "User product not found" 
      });
    }

    // Merge request parameters with stored custom parameters
    const params = {
      ...(endpoint.customParameters || {}),
      ...(req.body.params || {})
    };

    // Add username/MSISDN to params if they exist
    if (userProduct.username) {
      params.username = userProduct.username;
    }
    if (userProduct.msisdn) {
      params.msisdn = userProduct.msisdn;
    }

    // Log the request
    logger.info(`Running endpoint: ${endpoint.endpointPath}`, {
      userId: req.user?.id,
      endpointId,
      params: JSON.stringify(params)
    });

    // Base URL for Broadband.is API
    const baseUrl = "https://www.broadband.is/api";
    
    // Replit production IP address that the provider has whitelisted
    const REPLIT_PRODUCTION_IP = '34.111.179.208';
    
    // Check if running in production environment
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Get the product to determine the master category
    const product = userProduct.productId ? await storage.getProduct(userProduct.productId) : null;
    
    // Get the product's category to determine the master category
    let masterCategory = 'MTN GSM'; // Default to MTN GSM if we can't determine
    if (product?.categoryId) {
      const categories = await storage.getProductCategories();
      const category = categories.find(cat => cat.id === product.categoryId);
      if (category) {
        masterCategory = category.masterCategory;
      }
    }
    
    // Get credentials based on master category
    const credentials = {
      username: masterCategory === 'MTN GSM' ? process.env.MTN_GSM_USERNAME || 'api@openweb.email.gsm' : process.env.MTN_FIXED_USERNAME || 'api@openweb.email',
      password: masterCategory === 'MTN GSM' ? process.env.MTN_GSM_PASSWORD || 'fsV4iYUx0M' : process.env.MTN_FIXED_PASSWORD || 'fsV4iYUx0M'
    };
    
    // Ensure the endpoint path starts with a slash
    const formattedEndpointPath = endpoint.endpointPath.startsWith('/') 
      ? endpoint.endpointPath 
      : `/${endpoint.endpointPath}`;
    
    // Add headers for IP verification when in production
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    // In production, include information about the Replit production IP
    if (isProduction) {
      // The provider blocks all IPs except the Replit production IP
      // Note: We don't need to manually set the IP - this is informational 
      // as the request will be coming from the Replit production IP
      headers['X-Replit-Production'] = 'true';
    }
    
    // Make the API request
    const response = await axios({
      method: "get",
      url: `${baseUrl}${formattedEndpointPath}`,
      params: params,
      auth: credentials,
      headers
    });

    return res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: any) {
    logger.error(`Error running endpoint: ${error.message}`, {
      userId: req.user?.id,
      path: req.path,
      errorDetails: error.stack
    });

    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || "No additional details available"
    });
  }
});

export default router;