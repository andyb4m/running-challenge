const fetch = require('node-fetch');

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

    console.log('Garmin URL detected');

    // Fetch the activity page
    console.log('Fetching activity page...');
    
    const response = await fetch(activityUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });

    console.log('Fetch response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);

    // Parse Garmin activity
    const activityData = parseGarminActivity(html);

    console.log('Final parsed activity data:', activityData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        platform: 'garmin',
        data: activityData,
        debug: {
          htmlLength: html.length,
          containsTimeInZones: html.includes('tab-time-in-zones'),
          containsBereich: html.includes('Bereich'),
          containsZoneNumber: html.includes('timeInZonesChart_zoneNumber'),
          containsProgressBar: html.includes('timeInZonesChart_progressBar')
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
  }
};

function parseGarminActivity(html) {
  console.log('Parsing Garmin activity...');
  
  let activityData = {
    name: 'Garmin Activity',
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
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      activityData.name = titleMatch[1].replace(/\s+/g, ' ').trim();
    }

    console.log('Looking for Garmin heart rate zones...');

    // Strategy 1: Look for the time-in-zones tab structure
    const timeInZonesPattern = /tab-time-in-zones[\s\S]*?tab-content/;
    const tabMatch = timeInZonesPattern.exec(html);
    
    if (tabMatch) {
      console.log('Found tab-time-in-zones section');
      
      // Extract the zones section
      const zonesSection = html.substring(tabMatch.index, tabMatch.index + 10000); // Get a reasonable chunk
      
      // Look for zone data using the structure from your screenshot
      const zonePattern = /timeInZonesChart_zoneNumber[^>]*>([^<]*Bereich\s*(\d+)[^<]*)<[\s\S]*?timeInZonesChart_progressBar[\s\S]*?<span[^>]*>(\d+:\d+)</g;
      
      let match;
      while ((match = zonePattern.exec(zonesSection)) !== null) {
        const zoneText = match[1]; // e.g., "Bereich 5"
        const zoneNumber = match[2]; // e.g., "5"
        const timeValue = match[3]; // e.g., "0:02"
        
        console.log(`Found zone ${zoneNumber}: ${timeValue}`);
        
        // Map to our zone structure
        if (zoneNumber >= 1 && zoneNumber <= 5) {
          activityData.zones[`z${zoneNumber}`] = timeValue;
        }
      }
    }

    // Strategy 2: Alternative pattern matching if the first doesn't work
    if (Object.values(activityData.zones).every(zone => zone === '0:00')) {
      console.log('Primary pattern failed, trying alternative patterns...');
      
      // Look for Bereich patterns with time values
      const bereichPattern = /Bereich\s*(\d+)[\s\S]*?(\d+:\d+)/g;
      let match;
      
      while ((match = bereichPattern.exec(html)) !== null) {
        const zoneNumber = match[1];
        const timeValue = match[2];
        
        console.log(`Alternative pattern - Zone ${zoneNumber}: ${timeValue}`);
        
        if (zoneNumber >= 1 && zoneNumber <= 5) {
          activityData.zones[`z${zoneNumber}`] = timeValue;
        }
      }
    }

    // Strategy 3: Look for any time patterns in zone context
    if (Object.values(activityData.zones).every(zone => zone === '0:00')) {
      console.log('All patterns failed, trying broad time search...');
      
      // Look for script tags that might contain zone data
      const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (scriptMatches) {
        for (let script of scriptMatches) {
          if (script.includes('timeInZone') || script.includes('heartRateZones') || script.includes('Bereich')) {
            console.log('Found script with potential zone data');
            
            // Look for time patterns
            const timeMatches = script.match(/(\d{1,2}:\d{2})/g);
            if (timeMatches && timeMatches.length >= 5) {
              console.log('Found times in script:', timeMatches);
              
              // Assign to zones (assuming order Z1-Z5)
              for (let i = 0; i < Math.min(5, timeMatches.length); i++) {
                activityData.zones[`z${i + 1}`] = timeMatches[i];
              }
              break;
            }
          }
        }
      }
    }

    // Convert to legacy format for backward compatibility
    activityData.z2 = timeStringToMinutes(activityData.zones.z2);
    activityData.z4 = timeStringToMinutes(activityData.zones.z4);
    activityData.z5 = timeStringToMinutes(activityData.zones.z5);

  } catch (error) {
    console.error('Garmin parsing error:', error);
    activityData.error = 'Could not parse Garmin activity data';
  }

  return activityData;
}

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