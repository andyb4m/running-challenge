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

    const playerStats = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const playerName = data.name;

      if (!playerStats[playerName]) {
        playerStats[playerName] = {
          name: playerName,
          totalZ2: 0,
          totalZ4: 0,
          totalZ5: 0,
          totalPoints: 0,
          activityCount: 0,
          lastActivity: data.timestamp
        };
      }

      playerStats[playerName].totalZ2 += data.z2 || 0;
      playerStats[playerName].totalZ4 += data.z4 || 0;
      playerStats[playerName].totalZ5 += data.z5 || 0;
      playerStats[playerName].totalPoints += data.zonePoints || 0;
      playerStats[playerName].activityCount += 1;

      if (data.timestamp && data.timestamp.toDate() > playerStats[playerName].lastActivity?.toDate()) {
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
    console.error('Error getting winter ranking:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};