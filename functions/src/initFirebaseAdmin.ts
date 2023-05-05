import * as admin from "firebase-admin";
import { cert, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Database, getDatabase } from "firebase-admin/database";
import { getStorage, Storage } from "firebase-admin/storage";
import * as functions from "firebase-functions";

// Create Server-Side Instance of Firebase
export default function initializeFirebaseServer(): {
  db: Database;
  auth: Auth;
  storage: Storage;
} {
  const clientEmail = functions.config().myconfig.firebase_client_email;
  const privateKey = functions
    .config()
    .myconfig.firebase_private_key.replace(/\\n/g, "\n");
  const projectId = functions.config().myconfig.public_project_id;

  if (admin.apps.length === 0) {
    initializeApp({
      credential: cert({
        clientEmail,
        privateKey,
        projectId,
      }),
      databaseURL: functions.config().myconfig.public_database_url,
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
