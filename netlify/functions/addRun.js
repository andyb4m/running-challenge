const admin = require('firebase-admin');

// Initialize Firebase Admin - simplified approach
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing');
    }

    console.log('Parsing service account...');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    console.log('Initializing Firebase Admin...');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase initialization failed:', error.message);
    throw error;
  }
}

const db = admin.firestore();

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
    const { name, z2, z4, z5, z2_display, z4_display, z5_display } = JSON.parse(event.body);
    
    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name is required' })
      };
    }
    
    const zonePoints = (parseFloat(z2) * 0.5) + (parseFloat(z4) * 1) + (parseFloat(z5) * 2);
    
    console.log(`Adding run for ${name} with ${zonePoints} points`);
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

    console.log('Run added successfully');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Entry added successfully! Ranking updated." })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};