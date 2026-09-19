import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { SYSTEM_WALLETS } from '../constants';
import { SystemWallet } from '../types';

export const DEFAULT_CRYPTO_OPTIONS = [
  { key: 'USDT_TRC20', name: 'USDT (TRC-20)', network: 'TRC20 (Tron)', symbol: 'USDT' },
  { key: 'BTC', name: 'Bitcoin (BTC)', network: 'Bitcoin Network', symbol: 'BTC' },
  { key: 'ETH', name: 'Ethereum (ETH)', network: 'Ethereum (ERC-20)', symbol: 'ETH' },
  { key: 'SOL', name: 'Solana (SOL)', network: 'Solana Mainnet', symbol: 'SOL' },
  { key: 'BNB', name: 'BNB (BEP-20)', network: 'BNB Smart Chain', symbol: 'BNB' },
  { key: 'TON', name: 'Toncoin (TON)', network: 'TON Network', symbol: 'TON' }
];

export async function getActiveWallets(): Promise<Record<string, SystemWallet>> {
  try {
    const configSnap = await getDoc(doc(db, 'config', 'wallets'));
    if (configSnap.exists()) {
      return configSnap.data() as Record<string, SystemWallet>;
    }
  } catch (err) {
    console.warn("Could not fetch active wallets from Firestore, using default:", err);
  }

  // Fallback to default
  const defaults: Record<string, SystemWallet> = {};
  Object.entries(SYSTEM_WALLETS).forEach(([key, val]) => {
    defaults[key] = {
      id: key,
      cryptoKey: key,
      name: val.name,
      network: val.network,
      symbol: val.symbol,
      address: val.address,
      memoRequired: val.memoRequired,
      isCurrent: true,
      label: 'Default Primary Vault'
    };
  });
  return defaults;
}

export async function setActiveWalletForCrypto(cryptoKey: string, wallet: SystemWallet): Promise<void> {
  const currentWallets = await getActiveWallets();
  const updated = {
    ...currentWallets,
    [cryptoKey]: {
      ...wallet,
      cryptoKey,
      isCurrent: true,
      updatedAt: new Date().toISOString()
    }
  };

  // Save to config/wallets doc
  await setDoc(doc(db, 'config', 'wallets'), updated, { merge: true });

  // Update in wallets collection if id exists
  if (wallet.id && wallet.id !== cryptoKey) {
    try {
      await updateDoc(doc(db, 'wallets', wallet.id), {
        isCurrent: true,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Could not update wallet document:", e);
    }
  }
}

export async function addSystemWallet(data: Omit<SystemWallet, 'id' | 'isCurrent'> & { isCurrent?: boolean }): Promise<string> {
  const docRef = await addDoc(collection(db, 'wallets'), {
    ...data,
    isCurrent: !!data.isCurrent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  if (data.isCurrent) {
    await setActiveWalletForCrypto(data.cryptoKey, {
      ...data,
      id: docRef.id,
      isCurrent: true
    });
  }

  return docRef.id;
}

export async function deleteSystemWallet(id: string): Promise<void> {
  await deleteDoc(doc(db, 'wallets', id));
}
