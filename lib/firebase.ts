import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Diagnostic connection test to verify Firestore connectivity
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration or network connectivity.');
    }
    return false;
  }
}

// Standardized error handler conforming to SKILL.md specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(_error: unknown, operationType: OperationType, _path: string | null): never {
  // Avoid logging document paths or authentication data that may identify a user.
  console.error(`Firestore ${operationType} operation failed.`);
  throw new Error(`Firestore ${operationType} operation failed.`);
}

// Run test on boot if in browser
if (typeof window !== 'undefined') {
  void testFirestoreConnection();
}
