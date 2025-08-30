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
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      },
      timeout: 15000
    });

    console.log('Fetch response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);

    // Parse based on platform
    let activityData = {};
    if (platform === 'polar') {
      activityData = parsePolarActivity(html);
    } else if (platform === 'garmin') {
      activityData = parseGarminActivity(html);
    }

    console.log('Parsed activity data:', activityData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        platform: platform,
        data: activityData
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

    // Parse Polar Highcharts heart rate zones
    // Look for highcharts data labels with data-z-index and time values
    const zonePattern = /<div[^>]*class="[^"]*highcharts-data-label[^"]*"[^>]*data-z-index="(\d+)"[^>]*>[\s\S]*?<span[^>]*class="values"[^>]*>[\s\S]*?(\d{2}:\d{2}:\d{2})<\/span>/gi;
    
    let match;
    const zones = {};
    
    while ((match = zonePattern.exec(html)) !== null) {
      const zoneIndex = parseInt(match[1]);
      const timeString = match[2];
      
      console.log(`Found Polar zone ${zoneIndex}: ${timeString}`);
      
      // Convert time string to minutes
      const minutes = timeStringToMinutes(timeString);
      zones[zoneIndex] = minutes;
    }

    // Map Polar zones to our system
    // Polar typically has 5 zones (0-4), we need zones 2, 4, 5
    // Assuming: Zone 1 = Z2, Zone 3 = Z4, Zone 4 = Z5
    activityData.z2 = zones[1] || 0;  // Polar Zone 2 -> Our Zone 2
    activityData.z4 = zones[3] || 0;  // Polar Zone 4 -> Our Zone 4  
    activityData.z5 = zones[4] || 0;  // Polar Zone 5 -> Our Zone 5

    console.log('Polar zones mapped:', { z2: activityData.z2, z4: activityData.z4, z5: activityData.z5 });

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

    // Parse Garmin heart rate zones from #tab-time-in-zones
    // Look for the time-in-zones tab content
    const timeInZonesMatch = html.match(/<div[^>]*id="tab-time-in-zones"[^>]*class="tab-pane[^"]*active[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    
    if (timeInZonesMatch) {
      const zoneContent = timeInZonesMatch[1];
      console.log('Found Garmin time-in-zones content');
      
      // Look for time values in the zone content
      // Pattern: look for time formats like 00:05:32 or 0:05:32
      const timePattern = /(\d{1,2}:\d{2}:\d{2})/g;
      const times = [];
      let timeMatch;
      
      while ((timeMatch = timePattern.exec(zoneContent)) !== null) {
        const timeString = timeMatch[1];
        const minutes = timeStringToMinutes(timeString);
        if (minutes > 0) { // Only include non-zero times
          times.push(minutes);
          console.log(`Found Garmin time: ${timeString} = ${minutes} minutes`);
        }
      }

      // Map times to zones (assuming order: Z1, Z2, Z3, Z4, Z5)
      // We want zones 2, 4, 5 (indices 1, 3, 4)
      if (times.length >= 5) {
        activityData.z2 = times[1] || 0;  // Zone 2
        activityData.z4 = times[3] || 0;  // Zone 4
        activityData.z5 = times[4] || 0;  // Zone 5
      } else if (times.length >= 3) {
        // If we only have 3 times, assume they are Z2, Z4, Z5
        activityData.z2 = times[0] || 0;
        activityData.z4 = times[1] || 0;
        activityData.z5 = times[2] || 0;
      }

      console.log('Garmin zones mapped:', { z2: activityData.z2, z4: activityData.z4, z5: activityData.z5 });
    } else {
      console.log('Could not find Garmin time-in-zones content');
    }

  } catch (error) {
    console.error('Garmin parsing error:', error);
    activityData.error = 'Could not parse Garmin activity data';
  }

  return activityData;
}

function timeStringToMinutes(timeString) {
  // Convert "HH:MM:SS" or "MM:SS" to decimal minutes
  const parts = timeString.split(':').map(p => parseInt(p) || 0);
  
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