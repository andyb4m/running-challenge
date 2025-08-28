const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Add a new run entry
exports.addRun = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { name, z2, z4, z5, z2_display, z4_display, z5_display } = req.body;
      
      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      // Calculate zone points
      const zonePoints = (parseFloat(z2) * 0.5) + (parseFloat(z4) * 1) + (parseFloat(z5) * 2);
      
      // Add to Firestore - Use new Date() instead of serverTimestamp for emulator
      const docRef = await db.collection('runs').add({
        name: name,
        z2: parseFloat(z2) || 0,
        z4: parseFloat(z4) || 0,
        z5: parseFloat(z5) || 0,
        zonePoints: zonePoints,
        timestamp: new Date(), // Changed this line
        z2Display: z2_display || '0:00:00',
        z4Display: z4_display || '0:00:00',
        z5Display: z5_display || '0:00:00'
      });

      console.log('Run added with ID:', docRef.id);
      return res.json({ message: "Entry added successfully! Ranking updated." });
    } catch (error) {
      console.error('Error adding run:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

// Get ranking data
exports.getRanking = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const snapshot = await db.collection('runs').get();
      
      if (snapshot.empty) {
        return res.json([]);
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

      // Convert to array and sort
      const ranking = Object.keys(playerTotals).map(name => ({
        name: name,
        totalPoints: playerTotals[name].totalPoints,
        totalZ2: playerTotals[name].totalZ2,
        totalZ4: playerTotals[name].totalZ4,
        totalZ5: playerTotals[name].totalZ5,
        runCount: playerTotals[name].runCount
      }));

      ranking.sort((a, b) => b.totalPoints - a.totalPoints);

      return res.json(ranking);
    } catch (error) {
      console.error('Error getting ranking:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

// Get activities
exports.getActivities = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const snapshot = await db.collection('runs')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      const activities = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Handle both Date objects and Firestore Timestamps
        let dateString = "Unknown";
        if (data.timestamp) {
          if (data.timestamp.toDate) {
            // Firestore Timestamp
            dateString = data.timestamp.toDate().toLocaleDateString();
          } else if (data.timestamp instanceof Date) {
            // Regular Date object
            dateString = data.timestamp.toLocaleDateString();
          } else if (typeof data.timestamp === 'string') {
            // String date
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

      return res.json(activities);
    } catch (error) {
      console.error('Error getting activities:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});