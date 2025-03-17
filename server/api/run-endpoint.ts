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
    const baseUrl = "https://www-lab.broadband.is";
    
    // Make the API request
    const response = await axios({
      method: "post",
      url: `${baseUrl}${endpoint.endpointPath}`,
      data: params,
      headers: {
        "Content-Type": "application/json"
      }
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