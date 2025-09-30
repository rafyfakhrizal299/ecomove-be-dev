import admin from "firebase-admin";
import { getMessaging } from 'firebase-admin/messaging';
import dotenv from 'dotenv'
dotenv.config()

let cachedMessaging = null;

/**
 * Fungsi utama untuk mendapatkan Messaging Service yang dijamin terinisialisasi
 */
export function getFirebaseMessagingService() {
    // 1. Kembalikan cache jika sudah tersedia
    if (cachedMessaging) {
        return cachedMessaging;
    }

    // 2. Lakukan inisialisasi HANYA JIKA belum ada instance
    if (!admin.apps.length) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log("✅ Admin SDK initialized for FCM (Lazy).");

            } catch (error) {
                console.error("❌ ERROR: Failed to init Admin SDK:", error.message);
                throw new Error("FCM Initialization Failed.");
            }
        } else {
            console.error("❌ ERROR: FIREBASE_SERVICE_ACCOUNT is missing.");
            throw new Error("FCM Environment variable missing.");
        }
    }

    // 3. Simpan dan kembalikan objek messaging yang sudah terjamin valid
    // Menggunakan getMessaging(admin.app()) adalah yang paling stabil di ESM.
    cachedMessaging = getMessaging(admin.app());
    return cachedMessaging;
}
