// Revoke a specific device session — Vercel Node function.
import type { IncomingMessage, ServerResponse } from "node:http";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import process from "node:process";

// Initialize Firebase Admin
function initAdmin() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    
    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
  }
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req: IncomingMessage, limitBytes = 4096): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

// Verify Firebase ID token from Authorization header
async function verifyAuthToken(req: IncomingMessage): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  
  const token = authHeader.slice(7);
  try {
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    json(res, 405, { error: "method_not_allowed" });
    return;
  }

  initAdmin();
  
  const userId = await verifyAuthToken(req);
  if (!userId) {
    json(res, 401, { error: "unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const { deviceId } = body as { deviceId?: string };

    if (!deviceId) {
      json(res, 400, { error: "Missing deviceId" });
      return;
    }

    const db = getFirestore();
    
    // Delete the specific device record if it belongs to this user
    const deviceRef = db.collection("user_devices").doc(deviceId);
    const deviceSnap = await deviceRef.get();
    
    if (deviceSnap.exists) {
      const deviceData = deviceSnap.data();
      if (deviceData?.user_id === userId) {
        await deviceRef.delete();
        
        // Also delete FCM token for this device
        const fcmQuery = db.collection("fcm_tokens")
          .where("user_id", "==", userId)
          .where("device_id", "==", deviceId);
        const fcmSnapshot = await fcmQuery.get();
        const batch = db.batch();
        fcmSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    json(res, 200, { message: "Device session revoked" });
  } catch (e) {
    console.error("[revoke-device-session]", (e as Error).message);
    json(res, 500, { error: "Internal server error" });
  }
}