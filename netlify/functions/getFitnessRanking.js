const admin = require('firebase-admin');

// Initialize Firebase Admin (same as your running challenge)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const COLLECTION_NAME = 'fitness-challenge-2026';

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

    const playerStats = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const playerName = data.name;

      if (!playerStats[playerName]) {
        playerStats[playerName] = {
          name: playerName,
          totalZ2: 0,
          totalZ3: 0,
          totalZ4: 0,
          totalZ5: 0,
          totalPoints: 0,
          activityCount: 0,
          lastActivity: null
        };
      }

      playerStats[playerName].totalZ2 += data.z2 || 0;
      playerStats[playerName].totalZ3 += data.z3 || 0;
      playerStats[playerName].totalZ4 += data.z4 || 0;
      playerStats[playerName].totalZ5 += data.z5 || 0;
      playerStats[playerName].totalPoints += data.zonePoints || 0;
      playerStats[playerName].activityCount += 1;

      if (data.timestamp) {
        playerStats[playerName].lastActivity = data.timestamp;
      }
    });

    // Sort by total points (descending)
    const sortedPlayers = Object.values(playerStats)
      .sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(sortedPlayers),
    };

  } catch (error) {
    console.error('Error getting fitness ranking:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error: ' + error.message }),
    };
  }
};