export type NotificationType = 
  | 'deal_verified' 
  | 'deal_pending' 
  | 'deal_rejected' 
  | 'security' 
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  orderId?: string;
  usdtAmount?: number;
  fiatAmount?: number;
  currency?: string;
  txHash?: string;
  releaseTxHash?: string;
  actionUrl?: string;
  createdAt: string;
}

export interface SystemWallet {
  id: string;
  cryptoKey: string; // e.g. 'USDT_TRC20', 'BTC', 'ETH', 'SOL'
  name: string; // e.g. 'USDT (TRC-20)'
  network: string; // e.g. 'TRC20 (Tron)'
  symbol: string; // e.g. 'USDT'
  address: string;
  label?: string; // e.g. 'Primary Hot Vault'
  memoRequired?: boolean;
  memo?: string;
  isCurrent: boolean;
  createdAt?: string;
  updatedAt?: string;
}
