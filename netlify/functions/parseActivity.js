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

    // Check if it's a Garmin URL and extract activity ID
    const garminMatch = activityUrl.match(/connect\.garmin\.com\/modern\/activity\/(\d+)/);
    if (!garminMatch) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid Garmin Connect URL format.' })
      };
    }

    const activityId = garminMatch[1];
    console.log('Extracted activity ID:', activityId);

    // Try multiple approaches to get the zone data
    let activityData = await tryMultipleApproaches(activityId, activityUrl);

    console.log('Final parsed activity data:', activityData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        platform: 'garmin',
        data: activityData,
        debug: {
          activityId: activityId,
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
  }
};

async function tryMultipleApproaches(activityId, activityUrl) {
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

  // Approach 1: Try to get data from potential API endpoints
  try {
    console.log('Approach 1: Trying API endpoints...');
    
    const apiUrls = [
      `https://connect.garmin.com/modern/proxy/activity-service/activity/${activityId}/details`,
      `https://connect.garmin.com/modern/proxy/activity-service/activity/${activityId}`,
      `https://connect.garmin.com/modern/proxy/activity-service/activity/${activityId}/zones`,
      `https://connect.garmin.com/modern/proxy/activity-service/activity/${activityId}/heartRateZones`
    ];

    for (const apiUrl of apiUrls) {
      try {
        console.log(`Trying API URL: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': activityUrl
          },
          timeout: 10000
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`API response from ${apiUrl}:`, JSON.stringify(data).substring(0, 500));
          
          // Try to extract zone data from API response
          const extractedZones = extractZonesFromApiData(data);
          if (extractedZones && Object.values(extractedZones).some(zone => zone !== '0:00')) {
            console.log('Found zones in API data:', extractedZones);
            activityData.zones = { ...activityData.zones, ...extractedZones };
            break;
          }
        }
      } catch (apiError) {
        console.log(`API ${apiUrl} failed:`, apiError.message);
      }
    }
  } catch (error) {
    console.log('Approach 1 failed:', error.message);
  }

  // Approach 2: Parse the main activity page HTML
  if (Object.values(activityData.zones).every(zone => zone === '0:00')) {
    try {
      console.log('Approach 2: Parsing main HTML page...');
      
      const response = await fetch(activityUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000
      });

      if (response.ok) {
        const html = await response.text();
        console.log('HTML length:', html.length);
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          activityData.name = titleMatch[1].replace(/\s+/g, ' ').trim();
        }

        // Look for embedded JSON data in script tags
        const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
        if (scriptMatches) {
          for (let script of scriptMatches) {
            // Look for zone data in various formats
            const zonePatterns = [
              /timeInZone[s]?\s*[:=]\s*(\[[^\]]+\])/gi,
              /heartRateZone[s]?\s*[:=]\s*(\[[^\]]+\])/gi,
              /zone[s]?\s*[:=]\s*(\[[^\]]+\])/gi,
              /"zones"\s*:\s*(\[[^\]]+\])/gi,
              /bereich[s]?\s*[:=]\s*(\[[^\]]+\])/gi
            ];

            for (let pattern of zonePatterns) {
              const matches = script.match(pattern);
              if (matches) {
                console.log('Found potential zone data in script:', matches[0].substring(0, 200));
                try {
                  // Try to parse as JSON
                  const jsonMatch = matches[0].match(/(\[[^\]]+\])/);
                  if (jsonMatch) {
                    const zoneData = JSON.parse(jsonMatch[1]);
                    const extractedZones = extractZonesFromArray(zoneData);
                    if (extractedZones) {
                      console.log('Extracted zones from script:', extractedZones);
                      activityData.zones = { ...activityData.zones, ...extractedZones };
                      break;
                    }
                  }
                } catch (parseError) {
                  console.log('Failed to parse zone JSON:', parseError.message);
                }
              }
            }
            
            if (Object.values(activityData.zones).some(zone => zone !== '0:00')) {
              break;
            }
          }
        }
      }
    } catch (error) {
      console.log('Approach 2 failed:', error.message);
    }
  }

  // Approach 3: Try the activity details with different headers
  if (Object.values(activityData.zones).every(zone => zone === '0:00')) {
    try {
      console.log('Approach 3: Trying with session headers...');
      
      const detailsUrl = `https://connect.garmin.com/modern/activity/${activityId}`;
      const response = await fetch(detailsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 15000
      });

      if (response.ok) {
        const html = await response.text();
        console.log('Details page HTML length:', html.length);
        
        // Look for any time patterns that might be zone data
        const timePatterns = html.match(/(\d{1,2}:\d{2})/g);
        if (timePatterns && timePatterns.length >= 5) {
          console.log('Found time patterns:', timePatterns);
          
          // Filter out obvious non-zone times (like 00:00, very long times)
          const validTimes = timePatterns.filter(time => {
            const [min, sec] = time.split(':').map(Number);
            return min > 0 || sec > 0; // Not 00:00
          });
          
          if (validTimes.length >= 3) {
            // Assign the most likely zone times (assuming they appear in order)
            for (let i = 0; i < Math.min(5, validTimes.length); i++) {
              activityData.zones[`z${i + 1}`] = validTimes[i];
            }
            console.log('Assigned times to zones:', activityData.zones);
          }
        }
      }
    } catch (error) {
      console.log('Approach 3 failed:', error.message);
    }
  }

  // Convert to legacy format for backward compatibility
  activityData.z2 = timeStringToMinutes(activityData.zones.z2);
  activityData.z4 = timeStringToMinutes(activityData.zones.z4);
  activityData.z5 = timeStringToMinutes(activityData.zones.z5);

  return activityData;
}

function extractZonesFromApiData(data) {
  // Try to extract zone data from various API response formats
  if (!data) return null;
  
  const zones = {};
  
  // Look for timeInZones array
  if (data.timeInZones && Array.isArray(data.timeInZones)) {
    data.timeInZones.forEach((zone, index) => {
      if (zone.time || zone.duration) {
        const time = formatSecondsToTime(zone.time || zone.duration);
        zones[`z${index + 1}`] = time;
      }
    });
  }
  
  // Look for heartRateZones
  if (data.heartRateZones && Array.isArray(data.heartRateZones)) {
    data.heartRateZones.forEach((zone, index) => {
      if (zone.timeInZone || zone.duration) {
        const time = formatSecondsToTime(zone.timeInZone || zone.duration);
        zones[`z${index + 1}`] = time;
      }
    });
  }
  
  return Object.keys(zones).length > 0 ? zones : null;
}

function extractZonesFromArray(zoneArray) {
  if (!Array.isArray(zoneArray)) return null;
  
  const zones = {};
  zoneArray.forEach((zone, index) => {
    if (typeof zone === 'object' && (zone.time || zone.duration || zone.timeInZone)) {
      const time = formatSecondsToTime(zone.time || zone.duration || zone.timeInZone);
      zones[`z${index + 1}`] = time;
    } else if (typeof zone === 'number' && zone > 0) {
      const time = formatSecondsToTime(zone);
      zones[`z${index + 1}`] = time;
    }
  });
  
  return Object.keys(zones).length > 0 ? zones : null;
}

function formatSecondsToTime(seconds) {
  if (!seconds || seconds === 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function timeStringToMinutes(timeString) {
  if (!timeString || timeString === '0:00') return 0;
  
  const parts = timeString.split(':').map(p => parseInt(p) || 0);
  
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes + (seconds / 60);
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours * 60) + minutes + (seconds / 60);
  }
  
  return 0;
}