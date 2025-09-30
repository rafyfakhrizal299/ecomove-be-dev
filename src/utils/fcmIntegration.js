const admin = require('firebase-admin');
import dotenv from 'dotenv'
dotenv.config()

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("✅ Firebase Admin SDK initialized successfully.");
        } catch (error) {
            console.error("❌ ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT or initialize Admin SDK:", error.message);
        }
    } else {
        console.warn("⚠️ WARNING: FIREBASE_SERVICE_ACCOUNT is not set. FCM will fail.");
    }
}

module.exports = admin;