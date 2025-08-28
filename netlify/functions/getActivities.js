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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const snapshot = await db.collection('runs')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(activities)
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