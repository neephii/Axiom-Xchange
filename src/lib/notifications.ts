import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { AppNotification } from '../types';

export async function createNotification(data: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { read?: boolean }): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...data,
      read: data.read ?? false,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.warn("Failed to create notification:", error);
    return '';
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), {
      read: true
    });
  } catch (error) {
    console.warn("Failed to mark notification as read:", error);
  }
}

export async function markAllNotificationsAsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      const ref = doc(db, 'notifications', id);
      batch.update(ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    console.warn("Failed to mark all notifications as read:", error);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (error) {
    console.warn("Failed to delete notification:", error);
  }
}

export async function notifyDealPending(
  userId: string,
  orderId: string,
  usdtAmount: number,
  fiatAmount: number,
  currency: string
) {
  return createNotification({
    userId,
    title: 'Order Submitted & In Verification',
    message: `Your payment for ${usdtAmount.toLocaleString()} USDT (${currency} ${fiatAmount.toLocaleString()}) has been received and queued for on-chain verification. Estimated 5–15 mins.`,
    type: 'deal_pending',
    orderId,
    usdtAmount,
    fiatAmount,
    currency
  });
}

export async function notifyDealVerified(
  userId: string,
  orderId: string,
  usdtAmount: number,
  destinationAddress: string,
  releaseTxHash?: string
) {
  return createNotification({
    userId,
    title: 'Deal Verified & USDT Released! 🎉',
    message: `Verification complete! ${usdtAmount.toLocaleString()} USDT has been transferred to your wallet ${destinationAddress.slice(0, 6)}...${destinationAddress.slice(-4)}.`,
    type: 'deal_verified',
    orderId,
    usdtAmount,
    releaseTxHash
  });
}

export async function notifyDealRejected(
  userId: string,
  orderId: string,
  usdtAmount: number,
  reason: string
) {
  return createNotification({
    userId,
    title: 'Order Verification Failed',
    message: `Your order for ${usdtAmount.toLocaleString()} USDT could not be verified: ${reason}. Please contact 24/7 support for assistance.`,
    type: 'deal_rejected',
    orderId,
    usdtAmount
  });
}

export async function notifySecurityAlert(
  userId: string,
  title: string,
  message: string
) {
  return createNotification({
    userId,
    title,
    message,
    type: 'security'
  });
}
