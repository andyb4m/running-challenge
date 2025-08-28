const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'runningchallenge-6c1f8',
    credential: admin.credential.applicationDefault()
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
    const snapshot = await db.collection('runs').get();
    
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(ranking)
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