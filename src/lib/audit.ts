import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminHistoryItem {
  id?: string;
  action: string;
  adminEmail: string;
  targetId?: string;
  targetUser?: string;
  details: string;
  amount?: number;
  status?: string;
  createdAt?: any;
  timestamp?: string;
}

export async function logAdminAction(data: {
  action: string;
  adminEmail: string;
  targetId?: string;
  targetUser?: string;
  details: string;
  amount?: number;
  status?: string;
}) {
  try {
    await addDoc(collection(db, 'admin_history'), {
      ...data,
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Audit log notice:", err);
  }
}
