/**
 * Web Scraper API Module for Day Reseller Platform
 * 
 * This module provides functionality to scrape websites that don't have an API
 * and expose the data through a REST API endpoint.
 */

import { chromium, firefox, webkit } from 'playwright';
import { Express, Request, Response } from 'express';
import { logger } from '../logger';

/**
 * Setup scraper API routes
 */
export function setupScraperRoutes(app: Express) {
  // Endpoint to scrape a website
  app.post('/api/scrape', async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated and admin
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const { url, selector, extractType, actions } = req.body;
      
      if (!url || !selector) {
        return res.status(400).json({ 
          success: false, 
          error: 'URL and selector are required' 
        });
      }
      
      // Launch browser and scrape the website
      const result = await scrapeWebsite(url, selector, extractType, actions);
      res.json({ success: true, data: result });
    } catch (error) {
      let errorMessage = 'Failed to scrape website';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      logger.error('Scraper API error', { path: '/api/scrape', error: errorMessage });
      res.status(500).json({ success: false, error: errorMessage });
    }
  });
  
  // Health check endpoint for the scraper
  app.get('/api/scraper/status', async (_req: Request, res: Response) => {
    try {
      // Test if browser can be launched
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      res.json({ success: true, status: 'Scraper is operational' });
    } catch (error) {
      let errorMessage = 'Scraper is not operational';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      logger.error('Scraper status check failed', { error: errorMessage });
      res.status(500).json({ success: false, error: errorMessage });
    }
  });
}

/**
 * Scrape a website using Playwright
 */
async function scrapeWebsite(
  url: string, 
  selector: string, 
  extractType: 'text' | 'html' | 'attribute' = 'text',
  actions: ScraperAction[] = []
): Promise<any> {
  // Use chromium as the default browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    logger.info('Scraping website', { url, selector });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Execute any actions before extraction
    if (actions && actions.length > 0) {
      for (const action of actions) {
        await executeAction(page, action);
      }
    }
    
    // Extract the content based on the extraction type
    let result;
    switch (extractType) {
      case 'text':
        result = await page.$$eval(selector, elements => 
          elements.map(el => el.textContent?.trim())
        );
        break;
      case 'html':
        result = await page.$$eval(selector, elements => 
          elements.map(el => el.outerHTML)
        );
        break;
      case 'attribute':
        // For attribute extraction, the selector should include the attribute name
        // e.g., { selector: 'img', attribute: 'src' }
        if (typeof selector === 'object' && selector !== null && 'attribute' in selector) {
          const selectorObj = selector as { selector: string; attribute: string };
          result = await page.$$eval(selectorObj.selector, (elements, attr) => 
            elements.map(el => el.getAttribute(attr)), 
            selectorObj.attribute
          );
        } else {
          throw new Error('Attribute extraction requires an attribute name');
        }
        break;
      default:
        result = await page.$$eval(selector, elements => 
          elements.map(el => el.textContent?.trim())
        );
    }
    
    return result;
  } finally {
    await browser.close();
  }
}

/**
 * Execute a scraper action on the page
 */
async function executeAction(page: any, action: ScraperAction): Promise<void> {
  switch (action.type) {
    case 'click':
      await page.click(action.selector);
      break;
    case 'type':
      await page.fill(action.selector, action.value || '');
      break;
    case 'wait':
      if (action.selector) {
        await page.waitForSelector(action.selector, { timeout: action.timeout || 30000 });
      } else {
        await page.waitForTimeout(action.timeout || 1000);
      }
      break;
    case 'select':
      await page.selectOption(action.selector, action.value || '');
      break;
    case 'scroll':
      {
        const selector = action.selector || '';
        await page.evaluate(
          (sel: string) => {
            const element = document.querySelector(sel);
            if (element) {
              element.scrollIntoView();
            }
          }, 
          selector
        );
      }
      break;
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
  
  // Add a small delay after each action
  await page.waitForTimeout(500);
}

/**
 * Scraper action interface
 */
interface ScraperAction {
  type: 'click' | 'type' | 'wait' | 'select' | 'scroll';
  selector?: string;
  value?: string;
  timeout?: number;
}