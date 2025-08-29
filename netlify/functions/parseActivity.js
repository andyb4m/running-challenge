const cheerio = require('cheerio');

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
    const { activityUrl } = JSON.parse(event.body);
    
    if (!activityUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Activity URL is required' })
      };
    }

    console.log('Parsing activity URL:', activityUrl);

    // Determine the platform
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

    // Fetch the activity page
    const response = await fetch(activityUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let activityData = {};

    if (platform === 'polar') {
      activityData = parsePolarActivity($, html);
    } else if (platform === 'garmin') {
      activityData = parseGarminActivity($, html);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        platform: platform,
        data: activityData
      })
    };

  } catch (error) {
    console.error('Parse error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function parsePolarActivity($, html) {
  try {
    // Extract data from Polar Flow page
    let activityData = {
      name: 'Polar Activity',
      date: new Date().toLocaleDateString(),
      duration: '0:00:00',
      z2: 0,
      z4: 0,
      z5: 0
    };

    // Try to find activity name
    const titleElement = $('h1').first().text().trim();
    if (titleElement) {
      activityData.name = titleElement;
    }

    // Look for JSON data in script tags
    const scriptTags = $('script').toArray();
    for (let script of scriptTags) {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes('heartRateZones')) {
        try {
          // Extract heart rate zone data
          const hrZoneMatch = scriptContent.match(/heartRateZones["\s]*:[^}]+}/);
          if (hrZoneMatch) {
            console.log('Found HR zone data:', hrZoneMatch[0]);
            // Parse heart rate zones and convert to our zones
            activityData = parseHeartRateZones(scriptContent, activityData);
          }
        } catch (e) {
          console.log('Error parsing HR zones:', e);
        }
      }
    }

    // Try to extract duration
    const durationText = $('.duration, .time-value, [data-testid="duration"]').text().trim();
    if (durationText) {
      activityData.duration = durationText;
    }

    return activityData;
  } catch (error) {
    console.error('Polar parsing error:', error);
    return {
      name: 'Polar Activity',
      date: new Date().toLocaleDateString(),
      duration: '0:00:00',
      z2: 0,
      z4: 0,
      z5: 0,
      error: 'Could not parse activity data'
    };
  }
}

function parseGarminActivity($, html) {
  try {
    let activityData = {
      name: 'Garmin Activity',
      date: new Date().toLocaleDateString(),
      duration: '0:00:00',
      z2: 0,
      z4: 0,
      z5: 0
    };

    // Try to find activity name
    const titleElement = $('.activityName, .activity-name, h1').first().text().trim();
    if (titleElement) {
      activityData.name = titleElement;
    }

    // Look for JSON data in script tags
    const scriptTags = $('script').toArray();
    for (let script of scriptTags) {
      const scriptContent = $(script).html();
      if (scriptContent && (scriptContent.includes('activityDetails') || scriptContent.includes('heartRateZones'))) {
        try {
          // Extract activity data
          activityData = parseGarminData(scriptContent, activityData);
        } catch (e) {
          console.log('Error parsing Garmin data:', e);
        }
      }
    }

    return activityData;
  } catch (error) {
    console.error('Garmin parsing error:', error);
    return {
      name: 'Garmin Activity',
      date: new Date().toLocaleDateString(),
      duration: '0:00:00',
      z2: 0,
      z4: 0,
      z5: 0,
      error: 'Could not parse activity data'
    };
  }
}

function parseHeartRateZones(scriptContent, activityData) {
  // This is a simplified example - you'd need to implement actual parsing
  // based on the specific JSON structure from Polar/Garmin
  
  // For now, return sample data
  return {
    ...activityData,
    z2: 25.5, // 25.5 minutes in Zone 2
    z4: 8.2,  // 8.2 minutes in Zone 4
    z5: 2.1   // 2.1 minutes in Zone 5
  };
}

function parseGarminData(scriptContent, activityData) {
  // Similar to above - implement actual Garmin data parsing
  return {
    ...activityData,
    z2: 30.0,
    z4: 5.5,
    z5: 1.8
  };
}