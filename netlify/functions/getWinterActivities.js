const admin = require('firebase-admin');

// Initialize Firebase Admin (same as your running challenge)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const COLLECTION_NAME = 'winter-challenge-2025';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .orderBy('timestamp', 'desc')
      .get();

    const activities = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Convert Firestore timestamp if needed
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        data.timestamp = data.timestamp.toDate();
      }
      
      activities.push(data);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(activities),
    };

  } catch (error) {
    console.error('Error getting winter activities:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error: ' + error.message }),
    };
  }
};