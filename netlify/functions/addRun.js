const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables
if (!admin.apps.length) {
  let credential;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the service account from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Fallback for local development
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential: credential,
    projectId: process.env.FIREBASE_PROJECT_ID || 'runningchallenge-6c1f8'
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Enable CORS
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
    const { name, z2, z4, z5, z2_display, z4_display, z5_display } = JSON.parse(event.body);
    
    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name is required' })
      };
    }
    
    const zonePoints = (parseFloat(z2) * 0.5) + (parseFloat(z4) * 1) + (parseFloat(z5) * 2);
    
    await db.collection('runs').add({
      name: name,
      z2: parseFloat(z2) || 0,
      z4: parseFloat(z4) || 0,
      z5: parseFloat(z5) || 0,
      zonePoints: zonePoints,
      timestamp: new Date(),
      z2Display: z2_display || '0:00:00',
      z4Display: z4_display || '0:00:00',
      z5Display: z5_display || '0:00:00'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Entry added successfully! Ranking updated." })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};