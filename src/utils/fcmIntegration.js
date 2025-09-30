import admin from "firebase-admin";
// ⚠️ Impor khusus untuk Messaging:
import { getMessaging } from "firebase-admin/messaging"; 
import dotenv from 'dotenv';
dotenv.config();

// import serviceAccount from "../../serviceAccountKey.json";
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

let firebaseApp;

if (!admin.apps.length) {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  firebaseApp = admin.app();
}

// ⚠️ Definisikan fcm menggunakan getMessaging()
export const fcm = getMessaging(firebaseApp);