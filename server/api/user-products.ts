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
      logger.warn(`GET /user-products/:userId - Invalid user ID format: ${req.params.userId}`);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // VERBOSE: Log the request details
    logger.info(`GET /user-products/:userId - Received request to fetch user products`, {
      userId: userId,
      requestId: req.id,
      requestedBy: req.user?.id,
      url: req.originalUrl,
    });

    // First check if the user exists at all
    const user = await storage.getUser(userId);
    
    // VERBOSE: Log user existence check
    logger.debug(`GET /user-products/:userId - User existence check`, {
      userId: userId,
      userExists: !!user,
      userDetails: user ? {
        username: user.username,
        role: user.role,
        paymentMode: user.paymentMode
      } : null,
      requestId: req.id,
    });
    
    if (!user) {
      logger.warn(`GET /user-products/:userId - User not found for ID ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Log that we're fetching user products
    logger.debug(`GET /user-products/:userId - Fetching user products from storage for user ID: ${userId}`, {
      requestId: req.id,
    });
    
    // VERBOSE: Log the storage layer call
    let callStartTime = Date.now();
    const userProducts = await storage.getUserProductsByUser(userId);
    let callDuration = Date.now() - callStartTime;
    
    // VERBOSE: Log the storage layer response
    logger.debug(`GET /user-products/:userId - Storage response`, {
      userId: userId,
      callDuration: `${callDuration}ms`,
      productsFound: userProducts ? userProducts.length : 0,
      userProductsRaw: userProducts,
      requestId: req.id,
    });
    
    // If no products found, return empty array instead of error
    if (!userProducts || userProducts.length === 0) {
      logger.debug(`GET /user-products/:userId - No user products found for user ID ${userId}, returning empty array`, {
        requestId: req.id,
      });
      return res.json([]);
    }
    
    // VERBOSE: Log the enhancement process
    logger.debug(`GET /user-products/:userId - Enhancing ${userProducts.length} products with details and endpoints`, {
      requestId: req.id,
    });
    
    // Enhance with product details and endpoints
    const enhanced = await Promise.all(userProducts.map(async (userProduct) => {
      // Get product details
      const product = await storage.getProduct(userProduct.productId);
      
      // VERBOSE: Log product fetch
      logger.debug(`GET /user-products/:userId - Product details for userProduct #${userProduct.id}`, {
        userProductId: userProduct.id,
        productId: userProduct.productId,
        productExists: !!product,
        requestId: req.id,
      });
      
      // Get endpoints for this user product
      const endpoints = await storage.getUserProductEndpoints(userProduct.id);
      
      // VERBOSE: Log endpoints fetch
      logger.debug(`GET /user-products/:userId - Endpoints for userProduct #${userProduct.id}`, {
        userProductId: userProduct.id,
        endpointsCount: endpoints.length,
        requestId: req.id,
      });
      
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
    
    // VERBOSE: Log response
    logger.debug(`GET /user-products/:userId - Successfully enhanced products, returning response`, {
      userId: userId,
      enhancedProductsCount: enhanced.length,
      requestId: req.id,
    });
    
    res.json(enhanced);
  } catch (error: any) {
    // VERBOSE: Enhanced error logging
    logger.error(`GET /user-products/:userId - Critical error fetching user products`, { 
      error,
      errorMessage: error.message || "Unknown error",
      errorStack: error.stack || "No stack trace",
      userId: parseInt(req.params.userId),
      requestId: req.id.toString()
    });
    
    recordDiagnosticError(req, error);
    res.status(500).json({ error: "Failed to fetch user products", details: error.message || "Unknown error" });
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
    // VERBOSE: Log the incoming request
    logger.info(`POST /user-products - Received request to create user product`, {
      requestBody: req.body,
      requestId: req.id,
      userId: req.user?.id,
    });

    const parsed = insertUserProductSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(`POST /user-products - Invalid schema validation`, {
        validationErrors: parsed.error?.format() || "Unknown validation error",
        requestBody: req.body,
        requestId: req.id,
      });
      return res.status(400).json({ error: "Invalid user product data", details: parsed.error });
    }

    // Verify that the user exists before creating the product
    const userId = parsed.data.userId;
    const user = await storage.getUser(userId);
    
    logger.debug(`POST /user-products - Checking user existence`, {
      userId,
      userExists: !!user,
      requestId: req.id,
    });
    
    if (!user) {
      logger.warn(`POST /user-products - Attempt to create product for non-existent user ID ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }
    
    // Verify that the product exists
    const productId = parsed.data.productId;
    const product = await storage.getProduct(productId);
    
    logger.debug(`POST /user-products - Checking product existence`, {
      productId,
      productExists: !!product,
      requestId: req.id,
    });
    
    if (!product) {
      logger.warn(`POST /user-products - Attempt to add non-existent product ID ${productId} to user ${userId}`);
      return res.status(404).json({ error: "Product not found" });
    }

    // VERBOSE: Check user payment mode and credit balance 
    logger.debug(`POST /user-products - User payment info`, {
      userId,
      paymentMode: user.paymentMode,
      creditBalance: user.creditBalance,
      productPrice: product.basePrice,
      requestId: req.id,
    });
    
    // VERBOSE: Log exactly what data is being passed to storage
    logger.debug(`POST /user-products - Attempting to create user product with data:`, {
      userProductData: parsed.data,
      requestId: req.id,
    });
    
    const userProduct = await storage.createUserProduct(parsed.data);
    
    // VERBOSE: Log response from storage layer
    logger.debug(`POST /user-products - Response from storage layer:`, {
      userProductCreated: !!userProduct,
      userProduct: userProduct,
      requestId: req.id,
    });
    
    // Log successful creation
    logger.info(`POST /user-products - User product created successfully`, {
      userProductId: userProduct.id,
      userId: userProduct.userId,
      productId: userProduct.productId,
      status: userProduct.status,
      requestId: req.id,
    });
    
    res.status(201).json(userProduct);
  } catch (error: any) {
    // VERBOSE: Enhanced error logging
    logger.error(`POST /user-products - Critical error during user product creation`, { 
      error,
      errorMessage: error.message || "Unknown error",
      errorStack: error.stack || "No stack trace",
      requestBody: { ...req.body, password: req.body.password ? "[REDACTED]" : undefined },
      requestId: req.id,
    });
    
    recordDiagnosticError(req, error, req.body);
    res.status(500).json({ error: "Failed to create user product", details: error.message || "Unknown error" });
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