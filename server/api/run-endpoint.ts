/**
 * API route for running external API endpoints
 */
import { Request, Response, Router } from "express";
import { storage } from "../storage";
import axios from "axios";
import { logger } from "../logger";
import { recordDiagnosticError } from "../diagnostic-routes";

const router = Router();

// Authentication middleware
router.use((req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
});

/**
 * Run an API endpoint for a user product
 * POST /api/run-endpoint/:endpointId
 */
router.post("/:endpointId", async (req: Request, res: Response) => {
  try {
    const endpointId = parseInt(req.params.endpointId);
    if (isNaN(endpointId)) {
      return res.status(400).json({ error: "Invalid endpoint ID" });
    }

    // Get the endpoint details
    const endpoint = await storage.getUserProductEndpoint(endpointId);
    if (!endpoint) {
      return res.status(404).json({ error: "Endpoint not found" });
    }

    // Get the user product
    const userProduct = await storage.getUserProduct(endpoint.userProductId);
    if (!userProduct) {
      return res.status(404).json({ error: "User product not found" });
    }

    // Verify the user has permission (either owner or admin)
    if (req.user.id !== userProduct.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to access this endpoint" });
    }

    // Get the API setting
    const apiSetting = await storage.getApiSetting(endpoint.apiSettingId);
    if (!apiSetting) {
      return res.status(404).json({ error: "API setting not found" });
    }

    if (!apiSetting.isEnabled) {
      return res.status(403).json({ error: "This API endpoint is disabled" });
    }

    // Build the API URL from the base endpoint and the specific path
    const apiUrl = `${apiSetting.endpoint}${endpoint.endpointPath}`;
    logger.info(`Running external API endpoint: ${apiUrl}`, {
      endpointId,
      userId: req.user.id,
      apiUrl,
      requestId: req.id
    });

    // Add the custom parameters if any
    const params = endpoint.customParameters || {};

    // Call the external API
    try {
      const response = await axios.get(apiUrl, { 
        params,
        timeout: 10000 // 10 second timeout
      });

      // Return the API response to the client
      return res.json({
        success: true,
        data: response.data,
        status: response.status
      });
    } catch (error) {
      logger.error(`Error calling external API endpoint: ${apiUrl}`, {
        error,
        endpointId,
        userId: req.user.id,
        requestId: req.id
      });

      // Provide structured error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        return res.status(error.response.status).json({
          success: false,
          error: "External API error",
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.request) {
        // The request was made but no response was received
        return res.status(504).json({
          success: false,
          error: "No response from external API",
          message: "The external API endpoint did not respond within the timeout period."
        });
      } else {
        // Something happened in setting up the request that triggered an Error
        return res.status(500).json({
          success: false,
          error: "API request setup error",
          message: error.message
        });
      }
    }
  } catch (error) {
    // Log any uncaught errors
    recordDiagnosticError(req, error);
    logger.error("Error running endpoint", { error });
    res.status(500).json({ error: "Failed to run endpoint", details: error.message });
  }
});

export default router;