/**
 * API routes for user products
 */
import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { insertUserProductSchema, insertUserProductEndpointSchema } from "../../shared/schema";
import { logger } from "../logger";
import { recordDiagnosticError } from "../diagnostic-routes";

const router = Router();

// Authentication middleware for all routes
router.use((req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
});

// Get all user products for a user with products and endpoints details
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // First check if the user exists at all
    const user = await storage.getUser(userId);
    if (!user) {
      logger.warn(`GET /user-products/:userId - User not found for ID ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Log that we're fetching user products
    logger.debug(`Fetching user products for user ID: ${userId}`);
    
    const userProducts = await storage.getUserProductsByUser(userId);
    
    // If no products found, return empty array instead of error
    if (!userProducts || userProducts.length === 0) {
      logger.debug(`No user products found for user ID ${userId}, returning empty array`);
      return res.json([]);
    }
    
    // Enhance with product details and endpoints
    const enhanced = await Promise.all(userProducts.map(async (userProduct) => {
      // Get product details
      const product = await storage.getProduct(userProduct.productId);
      
      // Get endpoints for this user product
      const endpoints = await storage.getUserProductEndpoints(userProduct.id);
      
      // Enhance endpoints with API setting details
      const enhancedEndpoints = await Promise.all(endpoints.map(async (endpoint) => {
        // Get all API settings and find the matching one
        const apiSettings = await storage.getApiSettings();
        const apiSetting = apiSettings.find(setting => setting.id === endpoint.apiSettingId);
        return {
          ...endpoint,
          apiSetting
        };
      }));
      
      return {
        ...userProduct,
        product,
        endpoints: enhancedEndpoints
      };
    }));
    
    res.json(enhanced);
  } catch (error) {
    recordDiagnosticError(req, error);
    logger.error("Error fetching user products", { 
      error,
      userId: parseInt(req.params.userId),
      requestId: req.id.toString()
    });
    res.status(500).json({ error: "Failed to fetch user products" });
  }
});

// Get a specific user product by ID
router.get("/product/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user product ID" });
    }

    const userProduct = await storage.getUserProduct(id);
    if (!userProduct) {
      return res.status(404).json({ error: "User product not found" });
    }

    // Get the product details
    const product = await storage.getProduct(userProduct.productId);
    
    // Get the endpoints for this user product
    const endpoints = await storage.getUserProductEndpoints(userProduct.id);
    
    // Enhance endpoints with API setting details
    const enhancedEndpoints = await Promise.all(endpoints.map(async (endpoint) => {
      // Get all API settings and find the matching one
      const apiSettings = await storage.getApiSettings();
      const apiSetting = apiSettings.find(setting => setting.id === endpoint.apiSettingId);
      return {
        ...endpoint,
        apiSetting
      };
    }));

    res.json({
      ...userProduct,
      product,
      endpoints: enhancedEndpoints
    });
  } catch (error) {
    recordDiagnosticError(req, error);
    logger.error("Error fetching user product details", { error });
    res.status(500).json({ error: "Failed to fetch user product details" });
  }
});

// Create a new user product
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = insertUserProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid user product data", details: parsed.error });
    }

    // Verify that the user exists before creating the product
    const userId = parsed.data.userId;
    const user = await storage.getUser(userId);
    
    if (!user) {
      logger.warn(`POST /user-products - Attempt to create product for non-existent user ID ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }
    
    // Verify that the product exists
    const productId = parsed.data.productId;
    const product = await storage.getProduct(productId);
    
    if (!product) {
      logger.warn(`POST /user-products - Attempt to add non-existent product ID ${productId} to user ${userId}`);
      return res.status(404).json({ error: "Product not found" });
    }
    
    logger.debug(`Creating user product for user ID ${userId} with product ID ${productId}`);
    const userProduct = await storage.createUserProduct(parsed.data);
    
    // Log successful creation
    logger.info(`User product created successfully`, {
      userProductId: userProduct.id,
      userId: userProduct.userId,
      productId: userProduct.productId,
      status: userProduct.status
    });
    
    res.status(201).json(userProduct);
  } catch (error) {
    recordDiagnosticError(req, error, req.body);
    logger.error("Error creating user product", { 
      error,
      requestBody: { ...req.body, password: req.body.password ? "[REDACTED]" : undefined }
    });
    res.status(500).json({ error: "Failed to create user product" });
  }
});

// Update an existing user product
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user product ID" });
    }

    const userProduct = await storage.getUserProduct(id);
    if (!userProduct) {
      return res.status(404).json({ error: "User product not found" });
    }

    const updatedUserProduct = await storage.updateUserProduct(id, req.body);
    res.json(updatedUserProduct);
  } catch (error) {
    recordDiagnosticError(req, error);
    logger.error("Error updating user product", { error });
    res.status(500).json({ error: "Failed to update user product" });
  }
});

// Delete a user product
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user product ID" });
    }

    const deleted = await storage.deleteUserProduct(id);
    if (!deleted) {
      return res.status(404).json({ error: "User product not found" });
    }

    res.json({ success: true });
  } catch (error) {
    recordDiagnosticError(req, error);
    logger.error("Error deleting user product", { error });
    res.status(500).json({ error: "Failed to delete user product" });
  }
});

// Add an endpoint to a user product
router.post("/:id/endpoints", async (req: Request, res: Response) => {
  try {
    const userProductId = parseInt(req.params.id);
    if (isNaN(userProductId)) {
      return res.status(400).json({ error: "Invalid user product ID" });
    }

    const userProduct = await storage.getUserProduct(userProductId);
    if (!userProduct) {
      return res.status(404).json({ error: "User product not found" });
    }

    const endpointData = {
      ...req.body,
      userProductId
    };

    const parsed = insertUserProductEndpointSchema.safeParse(endpointData);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid endpoint data", details: parsed.error });
    }

    const endpoint = await storage.createUserProductEndpoint(parsed.data);
    res.status(201).json(endpoint);
  } catch (error) {
    recordDiagnosticError(req, error, req.body);
    logger.error("Error creating user product endpoint", { error });
    res.status(500).json({ error: "Failed to create user product endpoint" });
  }
});

// Delete an endpoint from a user product
router.delete("/endpoints/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid endpoint ID" });
    }

    const deleted = await storage.deleteUserProductEndpoint(id);
    if (!deleted) {
      return res.status(404).json({ error: "Endpoint not found" });
    }

    res.json({ success: true });
  } catch (error) {
    recordDiagnosticError(req, error);
    logger.error("Error deleting user product endpoint", { error });
    res.status(500).json({ error: "Failed to delete user product endpoint" });
  }
});

export default router;