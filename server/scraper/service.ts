/**
 * Scraper Service for Day Reseller Platform
 * 
 * This service handles scheduled and on-demand web scraping tasks
 * and stores the results in the database.
 */

import { chromium } from 'playwright';
import { Express } from 'express';
import { logger } from '../logger';
import { db } from '../db';
import { pgStorage } from '../pg-storage';

// Stores active scraping tasks 
const activeTasks: Record<string, NodeJS.Timeout> = {};

/**
 * Initialize the scraper service
 */
export function initScraperService(app: Express) {
  // Schedule any saved scraping tasks from the database
  setupScheduledTasks();

  // Log that the scraper service has been initialized
  logger.info('Scraper service initialized');
}

/**
 * Setup scheduled scraping tasks from database
 */
async function setupScheduledTasks() {
  try {
    // In the future, we could retrieve tasks from the database
    // For now, just log that the function has been called
    logger.info('Setting up scheduled scraping tasks');
  } catch (error) {
    logger.error('Failed to setup scheduled scraping tasks', { error });
  }
}

/**
 * Schedule a new scraping task
 */
export function scheduleScrapingTask(
  taskId: string,
  url: string,
  selector: string,
  interval: number,
  callback?: (data: any) => void
) {
  // Cancel existing task if it exists
  if (activeTasks[taskId]) {
    clearInterval(activeTasks[taskId]);
  }

  // Schedule new task
  const task = setInterval(async () => {
    try {
      logger.info('Running scheduled scraping task', { taskId, url });
      const result = await scrapeWebsite(url, selector);
      
      // Store the result in the database or process it
      // This would typically update a result in the database
      
      // Invoke callback if provided
      if (callback) {
        callback(result);
      }
    } catch (error) {
      logger.error('Scheduled scraping task failed', { taskId, url, error });
    }
  }, interval);

  // Store the task reference
  activeTasks[taskId] = task;
  
  logger.info('Scraping task scheduled', { taskId, url, interval });
}

/**
 * Cancel a scheduled scraping task
 */
export function cancelScrapingTask(taskId: string) {
  if (activeTasks[taskId]) {
    clearInterval(activeTasks[taskId]);
    delete activeTasks[taskId];
    logger.info('Scraping task canceled', { taskId });
    return true;
  }
  return false;
}

/**
 * Execute a one-time scraping task
 */
export async function executeScrapingTask(
  url: string, 
  selector: string
): Promise<any> {
  try {
    logger.info('Executing one-time scraping task', { url });
    return await scrapeWebsite(url, selector);
  } catch (error) {
    logger.error('One-time scraping task failed', { url, error });
    throw error;
  }
}

/**
 * Core function to scrape a website
 */
async function scrapeWebsite(url: string, selector: string): Promise<any> {
  // Launch browser with specific options for reliability
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  
  try {
    // Create a new browser context
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
    });
    
    // Create a new page
    const page = await context.newPage();
    
    // Navigate to the URL
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 // 60 seconds timeout
    });
    
    // Wait for the selector to be available
    await page.waitForSelector(selector, { timeout: 10000 });
    
    // Extract the data
    const data = await page.$$eval(selector, elements => 
      elements.map(el => el.textContent?.trim())
    );
    
    return data;
  } finally {
    await browser.close();
  }
}