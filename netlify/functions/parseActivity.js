const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let browser = null;

  try {
    console.log('Function started');
    
    const body = JSON.parse(event.body);
    const { activityUrl } = body;
    
    console.log('Received URL:', activityUrl);
    
    if (!activityUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Activity URL is required' })
      };
    }

    // Check if it's a Garmin URL
    if (!activityUrl.includes('connect.garmin.com')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Only Garmin Connect URLs are supported.' })
      };
    }

    console.log('Garmin URL detected, launching browser...');

    // Launch headless browser
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Navigating to activity page...');
    
    // Navigate to the activity page
    await page.goto(activityUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('Page loaded, looking for Zeit in Bereichen tab...');

    // Wait for the page to load and look for the "Zeit in Bereichen" tab
    try {
      // Wait for the tab to be available
      await page.waitForSelector('a[href="#tab-time-in-zones"]', { timeout: 10000 });
      console.log('Found Zeit in Bereichen tab, clicking...');
      
      // Click on the "Zeit in Bereichen" tab
      await page.click('a[href="#tab-time-in-zones"]');
      
      // Wait for the content to load
      await page.waitForSelector('#tab-time-in-zones', { timeout: 10000 });
      await page.waitForTimeout(2000); // Give it extra time to load
      
      console.log('Tab content loaded, extracting zone data...');
      
    } catch (error) {
      console.log('Could not find or click Zeit in Bereichen tab:', error.message);
    }

    // Extract the zone data
    const activityData = await page.evaluate(() => {
      const data = {
        name: document.title || 'Garmin Activity',
        date: new Date().toLocaleDateString(),
        duration: '0:00:00',
        zones: {
          z1: '0:00',
          z2: '0:00', 
          z3: '0:00',
          z4: '0:00',
          z5: '0:00'
        }
      };

      try {
        // Look for the time-in-zones tab content
        const zonesTab = document.getElementById('tab-time-in-zones');
        if (zonesTab) {
          console.log('Found zones tab content');
          
          // Method 1: Look for Bereich elements with time values
          const bereichElements = zonesTab.querySelectorAll('[class*="zoneNumber"], [class*="zone"]');
          
          bereichElements.forEach(element => {
            const text = element.textContent;
            const bereichMatch = text.match(/Bereich\s*(\d+)/);
            
            if (bereichMatch) {
              const zoneNumber = bereichMatch[1];
              
              // Look for time in nearby elements
              let timeElement = element.parentElement;
              for (let i = 0; i < 5; i++) { // Search up to 5 levels
                if (timeElement) {
                  const timeMatch = timeElement.textContent.match(/(\d{1,2}:\d{2})/);
                  if (timeMatch) {
                    console.log(`Found Zone ${zoneNumber}: ${timeMatch[1]}`);
                    if (zoneNumber >= 1 && zoneNumber <= 5) {
                      data.zones[`z${zoneNumber}`] = timeMatch[1];
                    }
                    break;
                  }
                  timeElement = timeElement.parentElement;
                }
              }
            }
          });
          
          // Method 2: Look for any elements containing "Bereich" and time patterns
          if (Object.values(data.zones).every(zone => zone === '0:00')) {
            const allElements = zonesTab.querySelectorAll('*');
            
            allElements.forEach(element => {
              const text = element.textContent;
              if (text.includes('Bereich')) {
                const bereichMatch = text.match(/Bereich\s*(\d+)[\s\S]*?(\d{1,2}:\d{2})/);
                if (bereichMatch) {
                  const zoneNumber = bereichMatch[1];
                  const timeValue = bereichMatch[2];
                  console.log(`Method 2 - Zone ${zoneNumber}: ${timeValue}`);
                  if (zoneNumber >= 1 && zoneNumber <= 5) {
                    data.zones[`z${zoneNumber}`] = timeValue;
                  }
                }
              }
            });
          }
        }

        // Method 3: Fallback - look anywhere on the page for Bereich patterns
        if (Object.values(data.zones).every(zone => zone === '0:00')) {
          const bodyText = document.body.textContent;
          const bereichMatches = bodyText.match(/Bereich\s*(\d+)[\s\S]*?(\d{1,2}:\d{2})/g);
          
          if (bereichMatches) {
            bereichMatches.forEach(match => {
              const parts = match.match(/Bereich\s*(\d+)[\s\S]*?(\d{1,2}:\d{2})/);
              if (parts) {
                const zoneNumber = parts[1];
                const timeValue = parts[2];
                console.log(`Method 3 - Zone ${zoneNumber}: ${timeValue}`);
                if (zoneNumber >= 1 && zoneNumber <= 5) {
                  data.zones[`z${zoneNumber}`] = timeValue;
                }
              }
            });
          }
        }

      } catch (error) {
        console.error('Error extracting zone data:', error);
        data.error = 'Could not extract zone data';
      }

      return data;
    });

    // Convert to legacy format for backward compatibility
    activityData.z2 = timeStringToMinutes(activityData.zones.z2);
    activityData.z4 = timeStringToMinutes(activityData.zones.z4);
    activityData.z5 = timeStringToMinutes(activityData.zones.z5);

    console.log('Final parsed activity data:', activityData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        platform: 'garmin',
        data: activityData,
        debug: {
          zonesFound: Object.values(activityData.zones).filter(zone => zone !== '0:00').length,
          zones: activityData.zones
        }
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      })
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

function timeStringToMinutes(timeString) {
  if (!timeString || timeString === '0:00') return 0;
  
  // Handle MM:SS format
  const parts = timeString.split(':').map(p => parseInt(p) || 0);
  
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes + (seconds / 60);
  } else if (parts.length === 3) {
    // Handle HH:MM:SS format if present
    const [hours, minutes, seconds] = parts;
    return (hours * 60) + minutes + (seconds / 60);
  }
  
  return 0;
}