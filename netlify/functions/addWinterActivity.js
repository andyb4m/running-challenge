const admin = require('firebase-admin');

// Initialize Firebase Admin (same as your existing functions)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const COLLECTION_NAME = 'winter-challenge-2025';

// Point multipliers
const POINT_MULTIPLIERS = {
  z2: 0.5,
  z4: 1.56,
  z5: 2.76
};

const ACTIVITY_POINTS = {
  others: 10,
  recovery: 5
};

// Verify reCAPTCHA
async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;
  
  try {
    const response = await fetch(verifyURL, { method: 'POST' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

// Date utility functions
const getDateString = (date = new Date()) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return getDateString(monday);
};

const getWeekEnd = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust when day is Sunday
  const sunday = new Date(d.setDate(diff));
  return getDateString(sunday);
};

// Check if activity is allowed
async function checkActivityAllowed(playerName, activityType) {
  if (activityType === 'others') {
    // Check if already submitted today
    const today = getDateString();
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('name', '==', playerName)
      .where('activityType', '==', 'others')
      .where('dateString', '==', today)
      .get();
    return snapshot.empty;
  } else if (activityType === 'recovery') {
    // Check if already submitted this week
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('name', '==', playerName)
      .where('activityType', '==', 'recovery')
      .where('dateString', '>=', weekStart)
      .where('dateString', '<=', weekEnd)
      .get();
    return snapshot.empty;
  }
  
  return true; // Zone training is always allowed
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight request
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
    const { name, activityType, recaptcha } = data;

    // Verify required fields
    if (!name || !activityType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name and activity type are required' }),
      };
    }

    // Verify reCAPTCHA
    if (!recaptcha) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'reCAPTCHA verification required' }),
      };
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptcha);
    if (!isRecaptchaValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'reCAPTCHA verification failed' }),
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
      const { z2, z4, z5, z2_display, z4_display, z5_display } = data;
      
      const z2Decimal = parseFloat(z2) || 0;
      const z4Decimal = parseFloat(z4) || 0;
      const z5Decimal = parseFloat(z5) || 0;
      
      if (z2Decimal === 0 && z4Decimal === 0 && z5Decimal === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Please enter at least some training time' }),
        };
      }
      
      // Calculate points with new multipliers
      const totalPoints = (z2Decimal * POINT_MULTIPLIERS.z2) + 
                         (z4Decimal * POINT_MULTIPLIERS.z4) + 
                         (z5Decimal * POINT_MULTIPLIERS.z5);
      
      activityData = {
        ...activityData,
        z2: z2Decimal,
        z4: z4Decimal,
        z5: z5Decimal,
        z2_display,
        z4_display,
        z5_display,
        zonePoints: totalPoints
      };
    } else {
      // Simple activity (others or recovery)
      activityData.zonePoints = ACTIVITY_POINTS[activityType];
      activityData.z2 = 0;
      activityData.z4 = 0;
      activityData.z5 = 0;
    }

    // Save to Firestore
    await db.collection(COLLECTION_NAME).add(activityData);

    let successMessage = 'BANG! Your activity has been logged successfully! 🔥';
    if (activityType === 'others') {
      successMessage = `BANG! Others activity logged (+${ACTIVITY_POINTS.others} points)! 💪`;
    } else if (activityType === 'recovery') {
      successMessage = `BANG! Recovery activity logged (+${ACTIVITY_POINTS.recovery} points)! 🧘`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: successMessage }),
    };

  } catch (error) {
    console.error('Error adding winter activity:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};