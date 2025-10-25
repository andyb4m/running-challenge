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
      
      // Convert Firestore timestamp to readable date if needed
      if (data.timestamp && data.timestamp.toDate) {
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
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};