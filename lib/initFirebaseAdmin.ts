import admin from "firebase-admin";
import { cert, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Database, getDatabase } from "firebase-admin/database";
import { getStorage, Storage } from "firebase-admin/storage";

// Create Server-Side Instance of Firebase
export default function initializeFirebaseServer(): {
  db: Database;
  auth: Auth;
  storage: Storage;
} {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY as string).replace(
    /\\n/g,
    "\n"
  );
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

  if (admin.apps.length === 0) {
    initializeApp({
      credential: cert({
        clientEmail,
        privateKey,
        projectId,
      }),
      databaseURL: process.env.NEXT_PUBLIC_DATABASE_URL,
    });
  }

  const db = getDatabase();
  const auth = getAuth();
  const storage = getStorage();

  return {
    db,
    auth,
    storage,
  };
}
