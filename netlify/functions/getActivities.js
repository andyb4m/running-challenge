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
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    console.log('Fetching activities from Firestore...');
    const snapshot = await db.collection('runs')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    console.log(`Found ${snapshot.size} activities`);

    const activities = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      let dateString = "Unknown";
      if (data.timestamp) {
        if (data.timestamp.toDate) {
          dateString = data.timestamp.toDate().toLocaleDateString();
        } else if (data.timestamp instanceof Date) {
          dateString = data.timestamp.toLocaleDateString();
        } else if (typeof data.timestamp === 'string') {
          dateString = new Date(data.timestamp).toLocaleDateString();
        }
      }

      activities.push({
        name: data.name || 'Unknown',
        z2: data.z2 || 0,
        z4: data.z4 || 0,
        z5: data.z5 || 0,
        zonePoints: data.zonePoints || 0,
        date: dateString
      });
    });

    console.log(`Returning ${activities.length} activities`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(activities)
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