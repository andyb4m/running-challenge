// migrate-to-prod.js
const admin = require('firebase-admin');

// Use the service account that works in Netlify
const serviceAccount = {
  "type": "service_account",
  "project_id": "runningchallenge-6c1f8",
  "private_key_id": "4040773599a91cdf1e22bee768e66758dae1492e",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDPZ5LYEJ0CQCUQ\nOWRYwYvZiaQ6qUSoxms7kuC4xLezF18GQXavXbMFSeA2ZlLsY2wyrFQ7wFdyu8eh\n1URx1f5hdcdUykjb+0ZTAlRMaOmIwXt9G3hpsGXuOdk4b6jyKGUgVCXkBvCz4NAU\nmhLvCn08cOeZvovjSOV+q3a61v+Xsiw4I3W2gcSZeC856ESFU3J+h/eyPX4cQJTk\nbM8kBocdHol/s44WqV/RyBM+VHaJFUAZD0sflq1iWTRmgcBGbDa1BjcFDJ1zoCUJ\n1jstV4Of4MxhdI9WLbFraguPpYrgicuspFHF4tZVKmWm1wwmlby9fJULBTzBB+Io\n8sHxzXMDAgMBAAECggEAIFsYHXz6AY/gOFe7v9zx5E4EwOIHRA0wTWrsg+asgdPz\njxZHXbRQaVLNF69+4EHib0VTHr8y5UNGMYkD1H594NZu8ltcYnUg03JZlFIJnLwS\nd8IBVvud6zw7FwLUaHLE0/ZMsvYiNu2riItAyOnp/7Pdba68RAjrRIebTiqcVR2+\nvHT6HQPB1KN4Fv2+qOsdleB72tVzSDl54nTlksVnRNFnPfNuKPw5RyG7Knh3b9YM\nBIfECfyEmVQ2vNuCCglNJwyiTOvCMS2NI9Q9m9Ol96Mc6fgjmwegDlbQczM+adY9\nG+vGVnICjx2HvwhyQ9QKHeuQz3lEseuG320L8aw9AQKBgQDssSqmNjEVxxeKVfim\nofQxCotJpdoW5n+XGYwH4NEgWW4EQXR8Rp7FaCCvREmhJYm4QFyWHSjh8NU8k/Eb\nbs7fhBbhx+5dmGhCP428B1e3pPYwuhcuh88jdo7mMyHtieai0CrftU0w9VeKrHaN\nWnw70f3bUUhisOBzl2kFN7lFeQKBgQDgUswtMqWk/x1rvVRu2RyWwvVs3RTteleS\n7VzFd9D+WIFYY6NSzcc9yLoplJfOXszvvpAJ5fhyW6k5f5RG9PobFqYvVzUbed9j\nwdXhs2OB+32GF9BrJJ+UN5arUgFe6fOC8q/fx9y7YWyGIaIqW8Q4whaYMnlxODYI\n75ZFxeSJWwKBgQCpiOUBlMNn0+kanyWxRUPBdMn8AJ3L1WICerwAUJm6UBQrXC7x\nbSwAPetbXtBWaqrQnNk0dMJ5w6UY9Oa4PZBULSquoiQsSiQzf44n5iKAWdo1YLWG\nEKTfw+XrISjmGeZnLC/peNVHghQoMgvgh7WAq5LnarssZYD/iq4gnJ9KEQKBgQCs\n+GsjttfvICApgXXne1YGEhJ4fQi0DRAV5R0Rzs/CL7Cc3UeEg9PMGkkh4sgjgwn3\nGzOpzkACvhcAlRVamW95D7/Y5R+4LgNIwqAPRunFwowJp7c3xqed/Dcbp0ITU8ZH\nBKcEoPHdMsQhsTGAA/6L3WzasqDd4oAX59YxuuP73QKBgEbcygjUMpKGZSCrRRzU\nCI6XgWZdYlg5fTgV/mrkmjECGnDx6HoXAhuPGKtmhcNbrGGAinpsOKMv+dEi8uA7\noH1X/NLlp02TyLXcwLNdFsVbO/nSikXIdEXapm0eryWmCsyuo7YXm80zksVNWMYJ\nmjd/TtOjC3sgDtWkGNoySHNz\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@runningchallenge-6c1f8.iam.gserviceaccount.com",
  "client_id": "103206230348007162832",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40runningchallenge-6c1f8.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Initialize Firebase Admin for PRODUCTION
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Your existing data from Google Sheets
const existingData = [
  ['Batz', 0, 20.88, 0, 20.88, '8/1/2025 16:43:11', '0:00:00', '0:20:53', '0:00:00'],
  ['Andy', 24.07, 4.58, 3.45, 23.515, '8/3/2025 21:12:22', '0:24:04', '0:04:35', '0:03:27'],
  ['Batz', 8.37, 5.7, 0, 9.885, '8/4/2025 17:55:53', '0:08:22', '0:05:42', '0:00:00'],
  ['Andy', 21.12, 6.78, 1.12, 19.58, '8/8/2025 21:37:00', '0:21:07', '0:06:47', '0:01:07'],
  ['Andy', 24.98, 2.6, 1.12, 17.33, '8/10/2025 20:27:58', '0:24:59', '0:02:36', '0:01:07'],
  ['Andy', 28.88, 0, 0, 14.44, '8/11/2025 21:40:08', '0:28:53', '0:00:00', '0:00:00'],
  ['Batz', 10.67, 7.23, 0.62, 13.805, '8/14/2025 17:27:39', '0:10:40', '0:07:14', '0:00:37'],
  ['Hans', 19.3, 6.3, 0, 15.95, '8/14/2025 17:32:22', '0:19:18', '0:06:18', '0:00:00'],
  ['Batz', 17.98, 5.75, 0, 14.74, '8/15/2025 21:00:47', '0:17:59', '0:05:45', '0:00:00'],
  ['Hans', 27.72, 8.62, 0, 22.48, '8/16/2025 12:53:25', '0:27:43', '0:08:37', '0:00:00'],
  ['Andy', 27.53, 0.95, 0, 14.715, '8/16/2025 20:35:46', '0:27:32', '0:00:57', '0:00:00'],
  ['Batz', 35.48, 0.77, 0, 18.51, '8/18/2025 17:33:23', '0:35:29', '0:00:46', '0:00:00'],
  ['Andy', 29.42, 0, 0, 14.71, '8/18/2025 20:49:58', '0:29:25', '0:00:00', '0:00:00'],
  ['Hans', 14.3, 3.18, 0, 10.33, '8/21/2025 16:52:48', '0:14:18', '0:03:11', '0:00:00'],
  ['Batz', 19.32, 9.38, 0, 19.04, '8/21/2025 19:33:38', '0:19:19', '0:09:23', '0:00:00'],
  ['Andy', 29.42, 0, 0, 14.71, '8/21/2025 21:46:40', '0:29:25', '0:00:00', '0:00:00'],
  ['Hans', 47.4, 0, 0, 23.7, '8/22/2025 18:15:43', '0:47:24', '0:00:00', '0:00:00'],
  ['Batz', 24.45, 8.95, 0, 21.175, '8/24/2025 9:42:32', '0:24:27', '0:08:57', '0:00:00'],
  ['Andy', 23.13, 4, 0, 15.565, '8/25/2025 21:28:30', '0:23:08', '0:04:00', '0:00:00'],
  ['Hans', 18.97, 9.82, 0.27, 19.845, '8/27/2025 18:56:31', '0:18:58', '0:09:49', '0:00:16'],
  ['Batz', 17.35, 9.63, 0.03, 18.365, '8/28/2025 12:59:38', '0:17:21', '0:09:38', '0:00:02']
];

// Function to parse date string to JavaScript Date
function parseDate(dateString) {
  // Convert "8/1/2025 16:43:11" to proper Date object
  const [datePart, timePart] = dateString.split(' ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  
  return new Date(year, month - 1, day, hour, minute, second);
}

// Migration function
async function migrateData() {
  console.log('Starting data migration to PRODUCTION...');
  
  try {
    const batch = db.batch();
    let count = 0;
    
    for (const row of existingData) {
      const [name, z2, z4, z5, zonePoints, timestamp, z2Display, z4Display, z5Display] = row;
      
      // Create document reference
      const docRef = db.collection('runs').doc();
      
      // Prepare data
      const data = {
        name: name,
        z2: parseFloat(z2),
        z4: parseFloat(z4),
        z5: parseFloat(z5),
        zonePoints: parseFloat(zonePoints),
        timestamp: parseDate(timestamp),
        z2Display: z2Display,
        z4Display: z4Display,
        z5Display: z5Display
      };
      
      // Add to batch
      batch.set(docRef, data);
      count++;
      
      console.log(`Prepared entry ${count}: ${name} - ${zonePoints} points (${timestamp})`);
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`✅ Successfully migrated ${count} entries to PRODUCTION!`);
    
    // Verify the migration
    const snapshot = await db.collection('runs').get();
    console.log(`📊 Total documents in production database: ${snapshot.size}`);
    
    // Show summary by player
    const playerCounts = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      playerCounts[data.name] = (playerCounts[data.name] || 0) + 1;
    });
    
    console.log('\n📈 Final summary:');
    Object.keys(playerCounts).forEach(name => {
      console.log(`   ${name}: ${playerCounts[name]} runs`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
  
  process.exit(0);
}

// Run the migration
migrateData();