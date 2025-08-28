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
    console.log('Fetching runs from Firestore...');
    const snapshot = await db.collection('runs').get();
    console.log(`Found ${snapshot.size} documents`);
    
    if (snapshot.empty) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }

    const playerTotals = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name;

      if (!playerTotals[name]) {
        playerTotals[name] = {
          totalPoints: 0,
          totalZ2: 0,
          totalZ4: 0,
          totalZ5: 0,
          runCount: 0
        };
      }

      playerTotals[name].totalPoints += data.zonePoints || 0;
      playerTotals[name].totalZ2 += data.z2 || 0;
      playerTotals[name].totalZ4 += data.z4 || 0;
      playerTotals[name].totalZ5 += data.z5 || 0;
      playerTotals[name].runCount += 1;
    });

    const ranking = Object.keys(playerTotals).map(name => ({
      name: name,
      totalPoints: playerTotals[name].totalPoints,
      totalZ2: playerTotals[name].totalZ2,
      totalZ4: playerTotals[name].totalZ4,
      totalZ5: playerTotals[name].totalZ5,
      runCount: playerTotals[name].runCount
    }));

    ranking.sort((a, b) => b.totalPoints - a.totalPoints);

    console.log(`Returning ${ranking.length} players`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(ranking)
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