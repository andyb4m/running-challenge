const admin = require('firebase-admin');

// Initialize Firebase Admin (same as your running challenge)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const COLLECTION_NAME = 'summerfit-2026';

// Point multipliers
const POINT_MULTIPLIERS = {
  z2: 1.0,
  z3: 0.5,
  z4: 1.5,
  z5: 2.0
};

const ACTIVITY_POINTS = {
  others: 20,
  recovery: 30
};

// Check honeypot (anti-spam)
function checkHoneypot(honeypotValue) {
  // Honeypot should be empty for legitimate users
  return honeypotValue === '' || honeypotValue === undefined || honeypotValue === null;
}

// Date utility functions
const getDateString = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return getDateString(monday);
};

const getWeekEnd = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  const sunday = new Date(d.setDate(diff));
  return getDateString(sunday);
};

// Check if activity is allowed
async function checkActivityAllowed(playerName, activityType) {
  try {
    if (activityType === 'others') {
      const today = getDateString();
      const snapshot = await db.collection(COLLECTION_NAME)
        .where('name', '==', playerName)
        .where('activityType', '==', 'others')
        .where('dateString', '==', today)
        .limit(1)
        .get();
      return snapshot.empty;
    } else if (activityType === 'recovery') {
      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd();
      const snapshot = await db.collection(COLLECTION_NAME)
        .where('name', '==', playerName)
        .where('activityType', '==', 'recovery')
        .where('dateString', '>=', weekStart)
        .where('dateString', '<=', weekEnd)
        .limit(1)
        .get();
      return snapshot.empty;
    }
    return true;
  } catch (error) {
    console.error('Error checking activity allowed:', error);
    return true; // Allow on error to not block users
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, activityType, honeypot } = data;

    // Basic validation
    if (!name || !activityType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name and activity type are required' }),
      };
    }

    // Check honeypot (anti-spam)
    if (!checkHoneypot(honeypot)) {
      // Bot detected - return generic error or silently fail
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    }

    // Check if activity is allowed
    const isAllowed = await checkActivityAllowed(name, activityType);
    if (!isAllowed) {
      let errorMessage = '';
      if (activityType === 'others') {
        errorMessage = 'You can only submit one "Others" activity per day.';
      } else if (activityType === 'recovery') {
        errorMessage = 'You can only submit one "Recovery" activity per week (Monday-Sunday).';
      }
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: errorMessage }),
      };
    }

    // Prepare activity data
    let activityData = {
      name,
      activityType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      dateString: getDateString(),
      date: new Date().toLocaleDateString('en-GB')
    };

    if (activityType === 'zone-training') {
      const { z2, z3, z4, z5, z2_display, z3_display, z4_display, z5_display } = data;
      
      const z2Decimal = parseFloat(z2) || 0;
      const z3Decimal = parseFloat(z3) || 0;
      const z4Decimal = parseFloat(z4) || 0;
      const z5Decimal = parseFloat(z5) || 0;
      
      if (z2Decimal === 0 && z3Decimal === 0 && z4Decimal === 0 && z5Decimal === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Please enter at least some training time' }),
        };
      }
      
      const totalPoints = (z2Decimal * POINT_MULTIPLIERS.z2) + 
                         (z3Decimal * POINT_MULTIPLIERS.z3) +       
                         (z4Decimal * POINT_MULTIPLIERS.z4) + 
                         (z5Decimal * POINT_MULTIPLIERS.z5);
      
      activityData = {
        ...activityData,
        z2: z2Decimal,
        z3: z3Decimal,
        z4: z4Decimal,
        z5: z5Decimal,
        z2_display: z2_display || '0:00:00',
        z3_display: z3_display || '0:00:00',
        z4_display: z4_display || '0:00:00',
        z5_display: z5_display || '0:00:00',
        zonePoints: totalPoints
      };
    } else {
      activityData.zonePoints = ACTIVITY_POINTS[activityType] || 0;
      activityData.z2 = 0;
      activityData.z3 = 0;
      activityData.z4 = 0;
      activityData.z5 = 0;
    }

    // Save to Firestore
    await db.collection(COLLECTION_NAME).add(activityData);

    let successMessage = 'Activity logged — enjoy the sunshine! ☀️';
    if (activityType === 'others') {
      successMessage = `Others activity logged (+${ACTIVITY_POINTS.others} points)! 💪`;
    } else if (activityType === 'recovery') {
      successMessage = `Recovery activity logged (+${ACTIVITY_POINTS.recovery} points)! 🧘`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: successMessage }),
    };

  } catch (error) {
    console.error('Error adding fitness activity:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};