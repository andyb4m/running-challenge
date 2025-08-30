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

    // Determine platform
    let platform = 'unknown';
    if (activityUrl.includes('flow.polar.com')) {
      platform = 'polar';
    } else if (activityUrl.includes('connect.garmin.com')) {
      platform = 'garmin';
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Unsupported platform. Only Polar and Garmin links are supported.' })
      };
    }

    console.log('Platform detected:', platform);

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

    // Log a portion of HTML to see what we're working with
    console.log('HTML sample (first 1000 chars):', html.substring(0, 1000));

    // Parse based on platform
    let activityData = {};
    if (platform === 'polar') {
      activityData = parsePolarActivity(html);
    } else if (platform === 'garmin') {
      activityData = parseGarminActivity(html);
    }

    console.log('Final parsed activity data:', activityData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        platform: platform,
        data: activityData,
        debug: {
          htmlLength: html.length,
          containsHighcharts: html.includes('highcharts'),
          containsTimeInZones: html.includes('tab-time-in-zones'),
          containsHeartRate: html.includes('heart rate') || html.includes('Heart Rate'),
          containsZones: html.includes('zone') || html.includes('Zone') || html.includes('Bereich')
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

function parsePolarActivity(html) {
  console.log('Parsing Polar activity...');
  
  let activityData = {
    name: 'Polar Activity',
    date: new Date().toLocaleDateString(),
    duration: '0:00:00',
    z2: 0,
    z4: 0,
    z5: 0
  };

  try {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      activityData.name = titleMatch[1].replace(/\s+/g, ' ').trim();
    }

    console.log('Looking for Polar heart rate zones...');

    // Strategy 1: Look for JSON data in script tags
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      console.log(`Found ${scriptMatches.length} script tags`);
      
      for (let i = 0; i < scriptMatches.length; i++) {
        const script = scriptMatches[i];
        
        // Look for heart rate zone data in JSON
        if (script.includes('heartRateZones') || script.includes('zones') || script.includes('timeInZone')) {
          console.log(`Script ${i} contains zone data`);
          
          // Try to extract time values
          const timeMatches = script.match(/(\d{2}:\d{2}:\d{2})/g);
          if (timeMatches) {
            console.log('Found times in script:', timeMatches);
            
            // Assign times to zones (adjust mapping as needed)
            if (timeMatches.length >= 3) {
              activityData.z2 = timeStringToMinutes(timeMatches[0]) || 0;
              activityData.z4 = timeStringToMinutes(timeMatches[1]) || 0;
              activityData.z5 = timeStringToMinutes(timeMatches[2]) || 0;
            }
          }
        }
      }
    }

    // Strategy 2: Look for specific Polar patterns from your screenshot
    // Look for highcharts data with specific patterns
    const highchartsPattern = /data-z-index="(\d+)"[\s\S]*?00:(\d{2}):(\d{2})/g;
    let match;
    const zones = {};
    
    while ((match = highchartsPattern.exec(html)) !== null) {
      const zoneIndex = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const totalMinutes = minutes + (seconds / 60);
      
      console.log(`Found Polar zone ${zoneIndex}: ${minutes}:${match[3]} = ${totalMinutes} minutes`);
      zones[zoneIndex] = totalMinutes;
    }

    // Map zones if we found any
    if (Object.keys(zones).length > 0) {
      // Polar zones: 0=recovery, 1=fat burn, 2=aerobic, 3=anaerobic, 4=max
      // Map to our system: Zone 2 (aerobic), Zone 4 (anaerobic), Zone 5 (max)
      activityData.z2 = zones[2] || 0;  // Polar Zone 3 -> Our Zone 2
      activityData.z4 = zones[3] || 0;  // Polar Zone 4 -> Our Zone 4
      activityData.z5 = zones[4] || 0;  // Polar Zone 5 -> Our Zone 5
    }

    // Strategy 3: Look for any time patterns and try to extract them
    if (activityData.z2 === 0 && activityData.z4 === 0 && activityData.z5 === 0) {
      console.log('No zones found yet, trying broader search...');
      
      // Look for any time patterns in the format 00:06:32
      const allTimeMatches = html.match(/00:(\d{2}):(\d{2})/g);
      if (allTimeMatches && allTimeMatches.length >= 5) {
        console.log('Found time patterns:', allTimeMatches);
        
        // Take the last 3 non-zero times (assuming they are the higher zones)
        const nonZeroTimes = allTimeMatches
          .map(timeStringToMinutes)
          .filter(minutes => minutes > 0)
          .slice(-3); // Take last 3
        
        if (nonZeroTimes.length >= 3) {
          activityData.z2 = nonZeroTimes[0];
          activityData.z4 = nonZeroTimes[1];
          activityData.z5 = nonZeroTimes[2];
        }
      }
    }

  } catch (error) {
    console.error('Polar parsing error:', error);
    activityData.error = 'Could not parse Polar activity data';
  }

  return activityData;
}

function parseGarminActivity(html) {
  console.log('Parsing Garmin activity...');
  
  let activityData = {
    name: 'Garmin Activity',
    date: new Date().toLocaleDateString(),
    duration: '0:00:00',
    z2: 0,
    z4: 0,
    z5: 0
  };

  try {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      activityData.name = titleMatch[1].replace(/\s+/g, ' ').trim();
    }

    console.log('Looking for Garmin heart rate zones...');

    // Strategy 1: Look for the specific tab content you showed
    const tabTimeInZonesPattern = /tab-time-in-zones[\s\S]*?tab-content[\s\S]*?(\d{1,2}:\d{2}:\d{2})[\s\S]*?(\d{1,2}:\d{2}:\d{2})[\s\S]*?(\d{1,2}:\d{2}:\d{2})[\s\S]*?(\d{1,2}:\d{2}:\d{2})[\s\S]*?(\d{1,2}:\d{2}:\d{2})/;
    const tabMatch = tabTimeInZonesPattern.exec(html);
    
    if (tabMatch) {
      console.log('Found Garmin tab time zones:', tabMatch.slice(1));
      
      // Map the 5 zones: Z1, Z2, Z3, Z4, Z5
      const times = tabMatch.slice(1).map(timeStringToMinutes);
      activityData.z2 = times[1] || 0;  // Zone 2
      activityData.z4 = times[3] || 0;  // Zone 4
      activityData.z5 = times[4] || 0;  // Zone 5
    } else {
      // Strategy 2: Look for any time patterns in Garmin format
      console.log('Tab pattern not found, trying broader search...');
      
      // Look for script tags with zone data
      const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (scriptMatches) {
        for (let script of scriptMatches) {
          if (script.includes('timeInZone') || script.includes('heartRateZones')) {
            console.log('Found script with zone data');
            
            const timeMatches = script.match(/(\d{1,2}:\d{2}:\d{2})/g);
            if (timeMatches && timeMatches.length >= 5) {
              console.log('Found times in script:', timeMatches);
              
              const times = timeMatches.map(timeStringToMinutes);
              activityData.z2 = times[1] || 0;
              activityData.z4 = times[3] || 0;
              activityData.z5 = times[4] || 0;
              break;
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('Garmin parsing error:', error);
    activityData.error = 'Could not parse Garmin activity data';
  }

  return activityData;
}

function timeStringToMinutes(timeString) {
  if (!timeString) return 0;
  
  // Handle different time formats
  const parts = timeString.replace(/[^\d:]/g, '').split(':').map(p => parseInt(p) || 0);
  
  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return (hours * 60) + minutes + (seconds / 60);
  } else if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes + (seconds / 60);
  }
  
  return 0;
}