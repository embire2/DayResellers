import { BroadbandScraper } from './broadband-scraper';

async function testScraper() {
  console.log('Testing Broadband.is scraper...');
  
  try {
    const result = await BroadbandScraper.getUsageData('test-username');
    console.log('Scraper result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testScraper();
