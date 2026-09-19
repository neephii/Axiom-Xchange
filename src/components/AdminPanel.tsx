import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard, 
  ArrowUpRight,
  TrendingUp,
  Settings,
  ShieldCheck,
  ShieldAlert,
  User,
  History,
  Copy,
  ExternalLink,
  ChevronRight,
  Check,
  AlertCircle,
  Trash2,
  Ban,
  UserCheck,
  DollarSign,
  Save,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Plus,
  Wallet,
  CheckCheck,
  Radio,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, query, onSnapshot, doc, updateDoc, 
  orderBy, limit, setDoc, deleteDoc, serverTimestamp, increment, getDoc, addDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatFiat, cn, copyTextToClipboard } from '../lib/utils';
import { 
  TRANSACTION_STATUS, 
  SYSTEM_WALLETS, 
  FiatCurrency,
  FIAT_RATES, 
  USDT_PACKAGES,
  DEFAULT_CRYPTO_PRICES,
  CryptoPriceItem
} from '../constants';
import { useAuth } from '../lib/AuthContext';
import { logAdminAction } from '../lib/audit';
import { AdminPricingTab } from './admin/AdminPricingTab';
import { AdminHistoryTab } from './admin/AdminHistoryTab';
import { 
  notifyDealVerified, 
  notifyDealRejected, 
  notifySecurityAlert 
} from '../lib/notifications';

export const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'pricing' | 'history' | 'users' | 'wallets'>('orders');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  
  // Modal states for user actions
  const [selectedUserForAction, setSelectedUserForAction] = useState<any>(null);
  const [userActionType, setUserActionType] = useState<'suspend' | 'unsuspend' | 'delete' | null>(null);
  const [suspendReason, setSuspendReason] = useState('Suspicious transaction activity detected');
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');

  // Order modal states
  const [releaseTxInput, setReleaseTxInput] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dynamic Wallets State
  const [customWallets, setCustomWallets] = useState<any[]>([]);
  const [activeWalletsMap, setActiveWalletsMap] = useState<Record<string, any>>({});
  const [selectedCryptoFilter, setSelectedCryptoFilter] = useState<string>('USDT_TRC20');
  const [showAddWalletModal, setShowAddWalletModal] = useState<boolean>(false);
  const [newWalletCryptoKey, setNewWalletCryptoKey] = useState<string>('USDT_TRC20');
  const [newWalletCustomCryptoName, setNewWalletCustomCryptoName] = useState<string>('');
  const [newWalletCustomSymbol, setNewWalletCustomSymbol] = useState<string>('');
  const [newWalletNetwork, setNewWalletNetwork] = useState<string>('TRC20 (Tron)');
  const [newWalletAddress, setNewWalletAddress] = useState<string>('');
  const [newWalletLabel, setNewWalletLabel] = useState<string>('');
  const [newWalletMemo, setNewWalletMemo] = useState<string>('');
  const [newWalletSetAsCurrent, setNewWalletSetAsCurrent] = useState<boolean>(true);
  const [walletActionLoading, setWalletActionLoading] = useState<boolean>(false);
  const [walletSuccessToast, setWalletSuccessToast] = useState<string | null>(null);

  // Real-time Crypto Prices & Config
  const [cryptoList, setCryptoList] = useState<CryptoPriceItem[]>(DEFAULT_CRYPTO_PRICES);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [pricingConfig, setPricingConfig] = useState({
    usdRate: 1.0,
    eurRate: 0.92,
    gbpRate: 0.78,
    bonusPercent: 0,
    note: ''
  });
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingSaveSuccess, setPricingSaveSuccess] = useState(false);

  // Sync transactions, users, live pricing, crypto prices, and audit history
  useEffect(() => {
    // 1. Transactions (extended limit to 200 for full historical tracking)
    const qTxs = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(200));
    const unsubTxs = onSnapshot(qTxs, (snapshot) => {
      const newTxs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setTransactions(newTxs);
    }, (err) => console.warn("Admin transactions sync note:", err));

    // 2. Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Admin users sync note:", err));

    // 3. System Pricing Config
    const unsubPricing = onSnapshot(doc(db, 'config', 'pricing'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPricingConfig({
          usdRate: Number(data.usdRate) || 1.0,
          eurRate: Number(data.eurRate) || 0.92,
          gbpRate: Number(data.gbpRate) || 0.78,
          bonusPercent: Number(data.bonusPercent) || 0,
          note: data.note || ''
        });
      }
    }, (err) => console.warn("Admin pricing sync note:", err));

    // 4. Custom Wallets in collection 'wallets'
    const unsubWallets = onSnapshot(collection(db, 'wallets'), (snapshot) => {
      setCustomWallets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Admin wallets collection sync note:", err));

    // 5. Active Wallets mapping in doc 'config/wallets'
    const unsubActiveWallets = onSnapshot(doc(db, 'config', 'wallets'), (snapshot) => {
      if (snapshot.exists()) {
        setActiveWalletsMap(snapshot.data());
      }
    }, (err) => console.warn("Admin active wallets config sync note:", err));

    // 6. Live Crypto Prices Catalog in doc 'config/crypto_prices'
    const unsubCryptoPrices = onSnapshot(doc(db, 'config', 'crypto_prices'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.list) && data.list.length > 0) {
          setCryptoList(data.list);
        }
      }
    }, (err) => console.warn("Admin crypto prices sync note:", err));

    // 7. Admin Action History and Audit Trail
    const qAudit = query(collection(db, 'admin_history'), orderBy('createdAt', 'desc'), limit(100));
    const unsubAudit = onSnapshot(qAudit, (snapshot) => {
      setAuditLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Admin audit log sync note:", err));

    return () => {
      unsubTxs();
      unsubUsers();
      unsubPricing();
      unsubWallets();
      unsubActiveWallets();
      unsubCryptoPrices();
      unsubAudit();
    };
  }, []);

  const copyToClipboard = async (text: string, key: string) => {
    await copyTextToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Order Actions
  const handleApproveOrder = async (tx: any) => {
    setLoading(true);
    try {
      const releaseHash = releaseTxInput.trim() || 'VERIFIED-ADMIN-RELEASE';
      const txRef = doc(db, 'transactions', tx.id);
      await updateDoc(txRef, { 
        status: TRANSACTION_STATUS.PAID,
        releaseTxHash: releaseHash,
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update user's volume
      const userRef = doc(db, 'users', tx.userId);
      const volumeUsd = tx.usdtAmount || 0;
      await setDoc(userRef, {
        totalTradeVolume: increment(volumeUsd),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Send real-time notification to user
      if (tx.userId) {
        notifyDealVerified(
          tx.userId,
          tx.id,
          tx.usdtAmount || 0,
          tx.destinationAddress || '',
          releaseHash
        );
      }

      // Record in Admin Audit History
      await logAdminAction({
        action: 'ORDER_VERIFIED',
        adminEmail: currentAdmin?.email || 'admin',
        targetId: tx.id,
        targetUser: tx.userEmail || tx.username || tx.userId,
        amount: tx.usdtAmount || tx.amount || 0,
        details: `Verified & released transfer (${tx.usdtAmount || tx.amount || 0} USDT). Release Hash: ${releaseHash}`,
        status: 'VERIFIED'
      });

      setSelectedTx(null);
      setReleaseTxInput('');
    } catch (err) {
      console.error("Error approving order:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOrder = async (tx: any) => {
    setLoading(true);
    try {
      const reason = rejectionReason.trim() || 'Payment could not be verified on-chain.';
      const txRef = doc(db, 'transactions', tx.id);
      await updateDoc(txRef, { 
        status: TRANSACTION_STATUS.FAILED,
        rejectionReason: reason,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Send real-time notification to user
      if (tx.userId) {
        notifyDealRejected(
          tx.userId,
          tx.id,
          tx.usdtAmount || 0,
          reason
        );
      }

      // Record in Admin Audit History
      await logAdminAction({
        action: 'ORDER_REJECTED',
        adminEmail: currentAdmin?.email || 'admin',
        targetId: tx.id,
        targetUser: tx.userEmail || tx.username || tx.userId,
        amount: tx.usdtAmount || tx.amount || 0,
        details: `Rejected transfer order: ${reason}`,
        status: 'REJECTED'
      });

      setSelectedTx(null);
      setRejectionReason('');
    } catch (err) {
      console.error("Error rejecting order:", err);
    } finally {
      setLoading(false);
    }
  };

  // User Actions: Suspend
  const handleSuspendUser = async () => {
    if (!selectedUserForAction) return;
    setLoading(true);
    try {
      const reason = suspendReason.trim() || 'Suspicious transaction activity detected';
      const userRef = doc(db, 'users', selectedUserForAction.id);
      await updateDoc(userRef, {
        suspended: true,
        suspendedReason: reason,
        suspendedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Send notification
      notifySecurityAlert(
        selectedUserForAction.id,
        'Account Access Restricted',
        reason
      );

      // Record in Admin Audit History
      await logAdminAction({
        action: 'USER_SUSPENDED',
        adminEmail: currentAdmin?.email || 'admin',
        targetId: selectedUserForAction.id,
        targetUser: selectedUserForAction.email || selectedUserForAction.username,
        details: `Suspended account: ${reason}`,
        status: 'SUSPENDED'
      });

      setSelectedUserForAction(null);
      setUserActionType(null);
    } catch (err) {
      console.error("Error suspending user:", err);
    } finally {
      setLoading(false);
    }
  };

  // User Actions: Unsuspend
  const handleUnsuspendUser = async () => {
    if (!selectedUserForAction) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', selectedUserForAction.id);
      await updateDoc(userRef, {
        suspended: false,
        suspendedReason: null,
        suspendedAt: null,
        updatedAt: serverTimestamp()
      });

      // Send notification
      notifySecurityAlert(
        selectedUserForAction.id,
        'Account Reactivated',
        'Your account access has been fully restored by admin.'
      );

      // Record in Admin Audit History
      await logAdminAction({
        action: 'USER_UNSUSPENDED',
        adminEmail: currentAdmin?.email || 'admin',
        targetId: selectedUserForAction.id,
        targetUser: selectedUserForAction.email || selectedUserForAction.username,
        details: 'Reactivated user account access',
        status: 'ACTIVE'
      });

      setSelectedUserForAction(null);
      setUserActionType(null);
    } catch (err) {
      console.error("Error unsuspending user:", err);
    } finally {
      setLoading(false);
    }
  };

  // User Actions: Delete
  const handleDeleteUser = async () => {
    if (!selectedUserForAction) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', selectedUserForAction.id);
      await deleteDoc(userRef);
      setSelectedUserForAction(null);
      setUserActionType(null);
      setConfirmDeleteInput('');
    } catch (err) {
      console.error("Error deleting user account:", err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Wallets Management Handlers
  const handleSetCurrentWallet = async (cryptoKey: string, wallet: any) => {
    setWalletActionLoading(true);
    try {
      const updatedMap = {
        ...activeWalletsMap,
        [cryptoKey]: {
          id: wallet.id || cryptoKey,
          cryptoKey,
          name: wallet.name || cryptoKey,
          network: wallet.network,
          symbol: wallet.symbol,
          address: wallet.address,
          memo: wallet.memo || '',
          label: wallet.label || 'Active System Receiving Wallet',
          isCurrent: true,
          updatedAt: new Date().toISOString()
        }
      };

      // Save to config/wallets document
      await setDoc(doc(db, 'config', 'wallets'), updatedMap, { merge: true });

      // Update in wallets collection
      for (const w of customWallets.filter(cw => cw.cryptoKey === cryptoKey)) {
        if (w.id) {
          await updateDoc(doc(db, 'wallets', w.id), {
            isCurrent: w.id === wallet.id
          });
        }
      }

      setWalletSuccessToast(`Successfully activated receiving address for ${wallet.symbol || cryptoKey}!`);
      setTimeout(() => setWalletSuccessToast(null), 3500);
    } catch (err) {
      console.error("Error setting current active wallet:", err);
    } finally {
      setWalletActionLoading(false);
    }
  };

  const handleSaveNewWallet = async () => {
    if (!newWalletAddress.trim()) return;
    setWalletActionLoading(true);
    try {
      let sym = 'USDT';
      let name = 'USDT (TRC-20)';
      let defaultNetwork = 'TRC20 (Tron)';

      if (newWalletCryptoKey === 'BTC') {
        sym = 'BTC';
        name = 'Bitcoin (BTC)';
        defaultNetwork = 'Bitcoin Network';
      } else if (newWalletCryptoKey === 'ETH') {
        sym = 'ETH';
        name = 'Ethereum (ETH)';
        defaultNetwork = 'Ethereum (ERC-20)';
      } else if (newWalletCryptoKey === 'SOL') {
        sym = 'SOL';
        name = 'Solana (SOL)';
        defaultNetwork = 'Solana Mainnet';
      } else if (newWalletCryptoKey === 'BNB') {
        sym = 'BNB';
        name = 'BNB Smart Chain (BNB)';
        defaultNetwork = 'BNB Smart Chain (BEP-20)';
      } else if (newWalletCryptoKey === 'TON') {
        sym = 'TON';
        name = 'Toncoin (TON)';
        defaultNetwork = 'TON Network';
      } else if (newWalletCryptoKey === 'CUSTOM') {
        sym = newWalletCustomSymbol.trim().toUpperCase() || 'CUSTOM';
        name = newWalletCustomCryptoName.trim() || sym;
        defaultNetwork = newWalletNetwork.trim() || 'Blockchain Network';
      }

      const walletDoc = {
        cryptoKey: newWalletCryptoKey === 'CUSTOM' ? sym : newWalletCryptoKey,
        name,
        symbol: sym,
        network: newWalletNetwork.trim() || defaultNetwork,
        address: newWalletAddress.trim(),
        label: newWalletLabel.trim() || `${sym} Vault`,
        memo: newWalletMemo.trim(),
        isCurrent: newWalletSetAsCurrent,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'wallets'), walletDoc);

      if (newWalletSetAsCurrent) {
        await handleSetCurrentWallet(walletDoc.cryptoKey, { ...walletDoc, id: docRef.id });
      }

      setShowAddWalletModal(false);
      setNewWalletAddress('');
      setNewWalletLabel('');
      setNewWalletMemo('');
      setWalletSuccessToast(`Added new ${sym} wallet and saved to system!`);
      setTimeout(() => setWalletSuccessToast(null), 3500);
    } catch (err) {
      console.error("Error adding system wallet:", err);
    } finally {
      setWalletActionLoading(false);
    }
  };

  const handleDeleteCustomWallet = async (walletId: string, cryptoKey: string) => {
    if (!confirm('Are you sure you want to remove this wallet address from the system?')) return;
    setWalletActionLoading(true);
    try {
      await deleteDoc(doc(db, 'wallets', walletId));

      // If this wallet was the active one, fallback to default or another
      if (activeWalletsMap[cryptoKey]?.id === walletId) {
        const remaining = customWallets.filter(w => w.cryptoKey === cryptoKey && w.id !== walletId);
        if (remaining.length > 0) {
          await handleSetCurrentWallet(cryptoKey, remaining[0]);
        } else if (SYSTEM_WALLETS[cryptoKey as keyof typeof SYSTEM_WALLETS]) {
          const def = SYSTEM_WALLETS[cryptoKey as keyof typeof SYSTEM_WALLETS];
          await handleSetCurrentWallet(cryptoKey, {
            ...def,
            id: cryptoKey,
            cryptoKey,
            label: 'Default Primary Vault'
          });
        }
      }

      setWalletSuccessToast('Wallet address removed.');
      setTimeout(() => setWalletSuccessToast(null), 3000);
    } catch (err) {
      console.error("Error deleting wallet:", err);
    } finally {
      setWalletActionLoading(false);
    }
  };

  // Real-Time Pricing: Save to Firestore
  const handleSavePricing = async (customCryptoList?: CryptoPriceItem[], customConfig?: any) => {
    setPricingSaving(true);
    try {
      const listToSave = customCryptoList || cryptoList;
      const cfgToSave = customConfig || pricingConfig;

      // 1. Save crypto_prices list
      await setDoc(doc(db, 'config', 'crypto_prices'), {
        list: listToSave,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin?.email || 'admin'
      }, { merge: true });

      // 2. Save pricing config (fiat rates & notes)
      const configRef = doc(db, 'config', 'pricing');
      await setDoc(configRef, {
        usdRate: Number(cfgToSave.usdRate) || 1.0,
        eurRate: Number(cfgToSave.eurRate) || 0.92,
        gbpRate: Number(cfgToSave.gbpRate) || 0.78,
        bonusPercent: Number(cfgToSave.bonusPercent) || 0,
        note: cfgToSave.note || 'Updated by admin',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 3. Keep rates/usdt synced if USDT is present
      const usdtItem = listToSave.find(c => c.symbol === 'USDT');
      if (usdtItem) {
        await setDoc(doc(db, 'rates', 'usdt'), {
          sellRate: usdtItem.priceUsd * (cfgToSave.usdRate || 1.0),
          buyRate: usdtItem.priceUsd * (cfgToSave.usdRate || 1.0) * 0.98,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // 4. Log Admin Action in audit trail
      await logAdminAction({
        action: 'PRICES_UPDATED',
        adminEmail: currentAdmin?.email || 'admin',
        details: `Saved & broadcasted ${listToSave.length} cryptocurrency prices (USD Base: $${cfgToSave.usdRate}, EUR: €${cfgToSave.eurRate}, GBP: £${cfgToSave.gbpRate})`,
        status: 'SUCCESS'
      });

      setPricingSaveSuccess(true);
      setTimeout(() => setPricingSaveSuccess(false), 3500);
    } catch (err) {
      console.error("Error saving pricing config:", err);
    } finally {
      setPricingSaving(false);
    }
  };

  // Filtered lists
  const pendingOrders = transactions.filter(
    t => t.status === TRANSACTION_STATUS.PENDING || t.status === TRANSACTION_STATUS.PROCESSING
  );

  const filteredOrders = transactions.filter(t => {
    if (orderFilter === 'pending') return t.status === TRANSACTION_STATUS.PENDING || t.status === TRANSACTION_STATUS.PROCESSING;
    if (orderFilter === 'paid') return t.status === TRANSACTION_STATUS.PAID;
    if (orderFilter === 'failed') return t.status === TRANSACTION_STATUS.FAILED;
    return true;
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.id || '').toLowerCase().includes(userSearchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (userFilter === 'active') return !u.suspended;
    if (userFilter === 'suspended') return !!u.suspended;
    return true;
  });

  return (
    <div className="min-h-screen bg-secondary flex flex-col pt-4 relative">
      {/* Top Header */}
      <header className="px-5 pb-3 flex items-center justify-between border-b border-black/5 bg-secondary sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="w-10 h-10 bg-white rounded-2xl shadow-xs text-primary border border-black/5 flex items-center justify-center hover:bg-black/5 transition-all"
            aria-label="Back to App"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold text-primary leading-tight">Admin Console</h1>
            <p className="text-[10px] text-accent font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Live System Control
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white p-1 rounded-2xl border border-black/5 flex gap-0.5 shadow-xs overflow-x-auto max-w-[280px] sm:max-w-none">
          {[
            { id: 'orders', label: 'Orders', count: pendingOrders.length },
            { id: 'pricing', label: 'Pricing' },
            { id: 'history', label: 'History', count: transactions.length },
            { id: 'users', label: 'Users', count: users.filter(u => u.suspended).length },
            { id: 'wallets', label: 'Wallets' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1",
                activeTab === tab.id 
                  ? "bg-primary text-white shadow-xs" 
                  : "text-primary/40 hover:text-primary"
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[8px] font-extrabold",
                  activeTab === tab.id ? "bg-accent text-white" : "bg-accent/20 text-accent"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 pb-24 space-y-4 max-w-xl mx-auto w-full">
        {/* TAB 1: ORDERS & VERIFICATION */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#003D29] p-3.5 rounded-2xl text-white shadow-xs">
                <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mb-0.5">Pending</p>
                <p className="text-xl font-bold font-display">{pendingOrders.length}</p>
              </div>
              <div className="bg-accent p-3.5 rounded-2xl text-white shadow-xs">
                <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mb-0.5">Completed</p>
                <p className="text-xl font-bold font-display">
                  {transactions.filter(t => t.status === TRANSACTION_STATUS.PAID).length}
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-xs">
                <p className="text-[9px] font-bold text-primary/40 uppercase tracking-widest mb-0.5">Total Orders</p>
                <p className="text-xl font-bold font-display text-primary">{transactions.length}</p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(['all', 'pending', 'paid', 'failed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                    orderFilter === f 
                      ? "bg-primary text-white border-primary shadow-xs" 
                      : "bg-white text-primary/60 border-black/5 hover:border-black/10"
                  )}
                >
                  {f} ({f === 'all' ? transactions.length : f === 'pending' ? pendingOrders.length : transactions.filter(t => t.status === (f === 'paid' ? TRANSACTION_STATUS.PAID : TRANSACTION_STATUS.FAILED)).length})
                </button>
              ))}
            </div>

            {/* Orders List */}
            <div className="space-y-2.5">
              {filteredOrders.map((tx) => {
                const isPaid = tx.status === TRANSACTION_STATUS.PAID;
                const isFailed = tx.status === TRANSACTION_STATUS.FAILED;

                return (
                  <button 
                    key={tx.id} 
                    onClick={() => {
                      setSelectedTx(tx);
                      setReleaseTxInput('');
                      setRejectionReason('');
                    }}
                    className="w-full bg-white p-4 rounded-2xl border border-black/5 shadow-xs flex items-center justify-between hover:border-accent/40 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0",
                        isPaid ? "bg-green-50 text-green-700" : isFailed ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {isPaid ? <CheckCircle2 size={18} /> : isFailed ? <XCircle size={18} /> : <Clock size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-primary">
                            {tx.usdtAmount ? `${Number(tx.usdtAmount).toLocaleString()} USDT` : tx.assetName || 'Crypto'}
                          </h4>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-secondary text-primary/70 font-mono font-bold">
                            {tx.fiatCurrency || 'USD'}
                          </span>
                        </div>
                        <p className="text-[10px] text-primary/40 font-medium truncate mt-0.5">
                          @{tx.username} • {tx.createdAt?.seconds ? new Date(tx.createdAt.seconds * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-primary">
                        {tx.fiatAmount ? formatFiat(tx.fiatAmount, tx.fiatCurrency || 'USD') : ''}
                      </p>
                      <span className={cn(
                        "text-[9px] font-extrabold uppercase tracking-wider block mt-0.5",
                        isPaid ? "text-green-600" : isFailed ? "text-red-600" : "text-amber-600"
                      )}>
                        {isPaid ? 'Verified' : isFailed ? 'Rejected' : 'Action Req'}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredOrders.length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-black/5 p-6">
                  <Clock className="mx-auto mb-2 opacity-20" size={30} />
                  <p className="text-xs font-bold text-primary/40">No orders match filter</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REAL-TIME PRICING ENGINE & CRYPTO RATES */}
        {activeTab === 'pricing' && (
          <AdminPricingTab 
            cryptoList={cryptoList}
            setCryptoList={setCryptoList}
            pricingConfig={pricingConfig}
            setPricingConfig={setPricingConfig}
            onSave={handleSavePricing}
            isSaving={pricingSaving}
            saveSuccess={pricingSaveSuccess}
          />
        )}

        {/* TAB 3: AUDIT HISTORY, ALL TRANSACTIONS & TRANSFERS */}
        {activeTab === 'history' && (
          <AdminHistoryTab 
            transactions={transactions}
            users={users}
            auditLogs={auditLogs}
            onSelectTx={(tx) => {
              setSelectedTx(tx);
              setReleaseTxInput('');
              setRejectionReason('');
            }}
          />
        )}

        {/* TAB 3: USER MANAGEMENT & SUSPENSIONS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/40" />
                <input 
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search user by email, username, or UID..."
                  className="w-full bg-white border border-black/5 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium text-primary shadow-xs outline-none focus:border-accent"
                />
              </div>

              <div className="flex gap-1.5">
                {(['all', 'active', 'suspended'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setUserFilter(f)}
                    className={cn(
                      "px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                      userFilter === f 
                        ? "bg-primary text-white border-primary shadow-xs" 
                        : "bg-white text-primary/60 border-black/5 hover:border-black/10"
                    )}
                  >
                    {f} ({f === 'all' ? users.length : f === 'active' ? users.filter(u => !u.suspended).length : users.filter(u => u.suspended).length})
                  </button>
                ))}
              </div>
            </div>

            {/* User List */}
            <div className="space-y-2.5">
              {filteredUsers.map((u) => {
                const isSuspended = !!u.suspended;

                return (
                  <div 
                    key={u.id}
                    className={cn(
                      "bg-white p-4 rounded-2xl border shadow-xs transition-all space-y-3",
                      isSuspended ? "border-red-200 bg-red-50/20" : "border-black/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-primary truncate">{u.username || 'User'}</h4>
                          <span className={cn(
                            "text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-full",
                            isSuspended ? "bg-red-100 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          )}>
                            {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                          </span>
                        </div>
                        <p className="text-[11px] text-primary/50 font-medium truncate mt-0.5">{u.email}</p>
                        <p className="font-mono text-[9px] text-primary/30 truncate mt-0.5">UID: {u.id}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-accent block">
                          ${Number(u.totalTradeVolume || 0).toLocaleString()} USD
                        </span>
                        <span className="text-[9px] text-primary/40 font-medium">Trade Volume</span>
                      </div>
                    </div>

                    {isSuspended && u.suspendedReason && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-red-800">Suspension Notice</p>
                          <p className="text-[10px] text-red-700/90 font-medium">{u.suspendedReason}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Bar for User */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-black/5">
                      {isSuspended ? (
                        <button
                          onClick={() => {
                            setSelectedUserForAction(u);
                            setUserActionType('unsuspend');
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold border border-emerald-200 flex items-center gap-1 transition-all"
                        >
                          <UserCheck size={13} />
                          <span>Reactivate Account</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUserForAction(u);
                            setUserActionType('suspend');
                            setSuspendReason('Suspicious transaction activity detected');
                          }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[10px] font-bold border border-amber-200 flex items-center gap-1 transition-all"
                        >
                          <Ban size={13} />
                          <span>Suspend Account</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedUserForAction(u);
                          setUserActionType('delete');
                          setConfirmDeleteInput('');
                        }}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-bold border border-red-200 flex items-center gap-1 transition-all"
                      >
                        <Trash2 size={13} />
                        <span>Delete User</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-black/5 p-6">
                  <User className="mx-auto mb-2 opacity-20" size={30} />
                  <p className="text-xs font-bold text-primary/40">No users found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: WALLETS */}
        {activeTab === 'wallets' && (
          <div className="space-y-4">
            {/* Success Toast */}
            <AnimatePresence>
              {walletSuccessToast && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 shadow-sm"
                >
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold">{walletSuccessToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header with Add Wallet button */}
            <div className="p-5 bg-white rounded-3xl border border-black/5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet size={15} className="text-accent" />
                  <span>System Receiving Wallets</span>
                </h3>
                <p className="text-[11px] text-primary/60 font-medium mt-0.5">
                  Add new addresses and instantly switch which wallet is currently active for buyer checkout.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewWalletCryptoKey(selectedCryptoFilter);
                  if (selectedCryptoFilter === 'USDT_TRC20') setNewWalletNetwork('TRC20 (Tron)');
                  else if (selectedCryptoFilter === 'BTC') setNewWalletNetwork('Bitcoin Network');
                  else if (selectedCryptoFilter === 'ETH') setNewWalletNetwork('Ethereum (ERC-20)');
                  else if (selectedCryptoFilter === 'SOL') setNewWalletNetwork('Solana Mainnet');
                  else setNewWalletNetwork('TRC20 (Tron)');
                  setShowAddWalletModal(true);
                }}
                className="px-3.5 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all shrink-0 self-start sm:self-auto"
                id="admin-add-wallet-btn"
              >
                <Plus size={15} />
                <span>Add New Wallet</span>
              </button>
            </div>

            {/* Crypto Asset Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { key: 'USDT_TRC20', label: 'USDT (TRC-20)' },
                { key: 'BTC', label: 'Bitcoin (BTC)' },
                { key: 'ETH', label: 'Ethereum (ETH)' },
                { key: 'SOL', label: 'Solana (SOL)' },
                { key: 'BNB', label: 'BNB Chain' },
                { key: 'TON', label: 'Toncoin' }
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => setSelectedCryptoFilter(c.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCryptoFilter === c.key
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white text-primary/70 border border-black/5 hover:border-black/10'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Wallets Display for Selected Crypto */}
            {(() => {
              // 1. Current Active Wallet for this crypto
              const activeConfig = activeWalletsMap[selectedCryptoFilter];
              const defaultSys = SYSTEM_WALLETS[selectedCryptoFilter as keyof typeof SYSTEM_WALLETS];
              
              const currentActive = activeConfig || (defaultSys ? {
                id: selectedCryptoFilter,
                cryptoKey: selectedCryptoFilter,
                name: defaultSys.name,
                network: defaultSys.network,
                symbol: defaultSys.symbol,
                address: defaultSys.address,
                label: 'Default Primary Vault',
                isCurrent: true
              } : null);

              // 2. All saved custom wallets for this crypto
              const savedForCrypto = customWallets.filter(w => w.cryptoKey === selectedCryptoFilter);
              const standbyWallets = savedForCrypto.filter(w => w.address !== currentActive?.address);

              return (
                <div className="space-y-4">
                  {/* Current Active Wallet Card */}
                  <div className="bg-white p-5 rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/[0.015] shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                          Current Active Receiving Address
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-primary/50 bg-secondary px-2.5 py-1 rounded-full border border-black/5">
                        {currentActive?.network || 'Blockchain'}
                      </span>
                    </div>

                    {currentActive ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-primary">
                            {currentActive.label || `${currentActive.symbol} Primary Vault`}
                          </h4>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            LIVE AT CHECKOUT
                          </span>
                        </div>

                        <div className="p-3 bg-secondary rounded-2xl border border-black/5 flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-primary font-bold break-all select-all">
                            {currentActive.address}
                          </span>
                          <button
                            onClick={() => copyToClipboard(currentActive.address, `active-${selectedCryptoFilter}`)}
                            className="text-xs text-accent font-bold flex items-center gap-1 shrink-0 hover:underline p-1"
                          >
                            {copiedKey === `active-${selectedCryptoFilter}` ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedKey === `active-${selectedCryptoFilter}` ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        {currentActive.memo && (
                          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
                            <span><strong>Required Memo / Tag:</strong> {currentActive.memo}</span>
                            <button
                              onClick={() => copyToClipboard(currentActive.memo, `memo-${selectedCryptoFilter}`)}
                              className="text-amber-900 font-bold hover:underline text-[10px]"
                            >
                              Copy
                            </button>
                          </div>
                        )}

                        <p className="text-[10px] text-primary/50 leading-relaxed font-medium">
                          All buyer orders and payment instructions are currently directed to this address.
                        </p>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-primary/50">
                        No active wallet found. Click below to add an address for this crypto.
                      </div>
                    )}
                  </div>

                  {/* Standby / Alternative Addresses */}
                  <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                        Standby Wallets for {selectedCryptoFilter.replace('_', ' ')}
                      </h4>
                      <span className="text-[10px] font-bold text-primary/40">
                        {standbyWallets.length} available
                      </span>
                    </div>

                    {standbyWallets.length > 0 ? (
                      <div className="space-y-3">
                        {standbyWallets.map((wallet) => (
                          <div 
                            key={wallet.id} 
                            className="p-3.5 bg-secondary rounded-2xl border border-black/5 space-y-2.5 transition-all hover:border-black/10"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-primary block">
                                  {wallet.label || 'Saved Wallet'}
                                </span>
                                <span className="text-[10px] text-primary/50 font-medium">
                                  {wallet.network}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-primary/40 bg-white px-2 py-0.5 rounded-full border border-black/5">
                                Standby
                              </span>
                            </div>

                            <div className="p-2.5 bg-white rounded-xl font-mono text-[11px] text-primary font-bold break-all border border-black/5 select-all flex items-center justify-between gap-2">
                              <span>{wallet.address}</span>
                              <button
                                onClick={() => copyToClipboard(wallet.address, wallet.id)}
                                className="text-primary/40 hover:text-primary shrink-0"
                              >
                                {copiedKey === wallet.id ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
                              </button>
                            </div>

                            {wallet.memo && (
                              <div className="text-[10px] text-primary/60 font-mono">
                                Memo: {wallet.memo}
                              </div>
                            )}

                            {/* Actions: Set as Current Active / Delete */}
                            <div className="flex items-center justify-between pt-1 border-t border-black/5">
                              <button
                                onClick={() => handleSetCurrentWallet(selectedCryptoFilter, wallet)}
                                disabled={walletActionLoading}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs"
                              >
                                <CheckCheck size={13} />
                                <span>Set as Current Active</span>
                              </button>

                              <button
                                onClick={() => handleDeleteCustomWallet(wallet.id, selectedCryptoFilter)}
                                disabled={walletActionLoading}
                                className="p-1.5 text-primary/30 hover:text-red-500 rounded-lg transition-colors"
                                title="Remove wallet"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-2 border border-dashed border-black/10 rounded-2xl p-4">
                        <p className="text-xs font-bold text-primary/50">
                          No alternative wallets saved for this asset.
                        </p>
                        <button
                          onClick={() => {
                            setNewWalletCryptoKey(selectedCryptoFilter);
                            setShowAddWalletModal(true);
                          }}
                          className="text-xs font-bold text-accent hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus size={13} />
                          <span>Add an alternate address</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* MODAL: ADD NEW WALLET ADDRESS */}
      <AnimatePresence>
        {showAddWalletModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAddWalletModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Add System Wallet</h3>
                    <p className="text-[10px] text-primary/50">Configure receiving address for checkout</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddWalletModal(false)}
                  className="p-1 rounded-lg text-primary/40 hover:text-primary"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Select Crypto */}
                <div>
                  <label className="text-[10px] font-bold text-primary/50 uppercase tracking-wider block mb-1">
                    Crypto Asset
                  </label>
                  <select
                    value={newWalletCryptoKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewWalletCryptoKey(val);
                      if (val === 'USDT_TRC20') setNewWalletNetwork('TRC20 (Tron)');
                      else if (val === 'BTC') setNewWalletNetwork('Bitcoin Network');
                      else if (val === 'ETH') setNewWalletNetwork('Ethereum (ERC-20)');
                      else if (val === 'SOL') setNewWalletNetwork('Solana Mainnet');
                      else if (val === 'BNB') setNewWalletNetwork('BNB Smart Chain (BEP-20)');
                      else if (val === 'TON') setNewWalletNetwork('TON Network');
                    }}
                    className="w-full bg-secondary border border-black/5 rounded-xl p-3 text-xs font-bold text-primary outline-none focus:border-accent"
                  >
                    <option value="USDT_TRC20">USDT (TRC-20)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="ETH">Ethereum (ETH / ERC-20)</option>
                    <option value="SOL">Solana (SOL)</option>
                    <option value="BNB">BNB Smart Chain (BNB)</option>
                    <option value="TON">Toncoin (TON)</option>
                    <option value="CUSTOM">Custom Token / Asset</option>
                  </select>
                </div>

                {newWalletCryptoKey === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-primary/50 uppercase tracking-wider block mb-1">
                        Token Name
                      </label>
                      <input
                        type="text"
                        value={newWalletCustomCryptoName}
                        onChange={(e) => setNewWalletCustomCryptoName(e.target.value)}
                        placeholder="e.g. Polygon"
                        className="w-full bg-secondary border border-black/5 rounded-xl p-2.5 text-xs font-bold text-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-primary/50 uppercase tracking-wider block mb-1">
                        Symbol
                      </label>
                      <input
                        type="text"
                        value={newWalletCustomSymbol}
                        onChange={(e) => setNewWalletCustomSymbol(e.target.value)}
                        placeholder="e.g. MATIC"
                        className="w-full bg-secondary border border-black/5 rounded-xl p-2.5 text-xs font-bold text-primary outline-none uppercase"
                      />
                    </div>
                  </div>
                )}

                {/* Network */}
                <div>
                  <label className="text-[10px] font-bold text-primary/50 uppercase tracking-wider block mb-1">
                    Network
                  </label>
                  <input
                    type="text"
                    value={newWalletNetwork}
                    onChange={(e) => setNewWalletNetwork(e.target.value)}
                    placeholder="e.g. TRC20 (Tron)"
                    className="w-full bg-secondary border border-black/5 rounded-xl p-3 text-xs font-medium text-primary outline-none focus:border-accent"
                  />
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="text-[10px] font-bold text-primary/50 uppercase tracking-wider block mb-1">
                    Receiving Wallet Address *
                  </label>
                  <textarea
                    rows={2}
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    placeholder="Paste full wallet address (e.g. TSno...)"
                    className="w-full bg-secondary border border-black/5 rounded-xl p-3 text-xs font-mono font-bold text-primary outline-none focus:border-accent"
                  />
                </div>

                {/* Label / Vault Name */}
                <div>
                  <label className="text-[10px] font-bold text-primary/50 uppercase tracking-wider block mb-1">
                    Wallet Label / Alias
                  </label>
                  <input
                    type="text"
                    value={newWalletLabel}
                    onChange={(e) => setNewWalletLabel(e.target.value)}
                    placeholder="e.g. Binance Deposit Vault #2"
                    className="w-full bg-secondary border border-black/5 rounded-xl p-3 text-xs font-medium text-primary outline-none focus:border-accent"
                  />
                </div>

                {/* Optional Memo */}
                <div>
                  <label className="text-[10px] font-bold text-primary/50 uppercase tracking-wider block mb-1">
                    Memo / Destination Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={newWalletMemo}
                    onChange={(e) => setNewWalletMemo(e.target.value)}
                    placeholder="Leave empty if not required"
                    className="w-full bg-secondary border border-black/5 rounded-xl p-3 text-xs font-medium text-primary outline-none focus:border-accent"
                  />
                </div>

                {/* Set as current toggle */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/80 cursor-pointer border border-black/5">
                  <input
                    type="checkbox"
                    checked={newWalletSetAsCurrent}
                    onChange={(e) => setNewWalletSetAsCurrent(e.target.checked)}
                    className="w-4 h-4 rounded text-accent focus:ring-accent"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-primary block">Set as Current Active Address</span>
                    <span className="text-[10px] text-primary/50 block">Immediately display this address to buyers at checkout</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowAddWalletModal(false)}
                  className="py-3 bg-secondary text-primary/60 rounded-xl text-xs font-bold hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewWallet}
                  disabled={walletActionLoading || !newWalletAddress.trim()}
                  className="py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  {walletActionLoading ? 'Saving...' : 'Save Wallet'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER ACTION MODAL: SUSPEND / UNSUSPEND / DELETE */}
      <AnimatePresence>
        {selectedUserForAction && userActionType && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedUserForAction(null); setUserActionType(null); }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4"
            >
              {/* Suspend Action */}
              {userActionType === 'suspend' && (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <Ban size={24} />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-primary">Suspend User Account</h3>
                    <p className="text-xs text-primary/60">
                      User <strong className="text-primary">{selectedUserForAction.email}</strong> will be locked out of trading immediately.
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-primary/50 uppercase tracking-wider block mb-1">
                      Reason for Suspension
                    </label>
                    <textarea 
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      rows={2}
                      className="w-full bg-secondary border border-black/5 rounded-xl p-3 text-xs text-primary font-medium outline-none focus:border-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => { setSelectedUserForAction(null); setUserActionType(null); }}
                      className="py-3 bg-secondary text-primary/60 rounded-xl text-xs font-bold hover:text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={loading}
                      onClick={handleSuspendUser}
                      className="py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      {loading ? 'Suspending...' : 'Confirm Suspend'}
                    </button>
                  </div>
                </>
              )}

              {/* Unsuspend Action */}
              {userActionType === 'unsuspend' && (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <UserCheck size={24} />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-primary">Reactivate Account</h3>
                    <p className="text-xs text-primary/60">
                      Restore full trading access for <strong className="text-primary">{selectedUserForAction.email}</strong>?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => { setSelectedUserForAction(null); setUserActionType(null); }}
                      className="py-3 bg-secondary text-primary/60 rounded-xl text-xs font-bold hover:text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={loading}
                      onClick={handleUnsuspendUser}
                      className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      {loading ? 'Reactivating...' : 'Confirm Reactivate'}
                    </button>
                  </div>
                </>
              )}

              {/* Delete Action */}
              {userActionType === 'delete' && (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                    <Trash2 size={24} />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-red-600">Delete Account Permanently</h3>
                    <p className="text-xs text-primary/60 leading-relaxed">
                      This will permanently erase all profile records for <strong className="text-primary">{selectedUserForAction.email}</strong>. This action is irreversible.
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-primary/50 uppercase tracking-wider block mb-1">
                      Type <span className="font-mono text-red-600">DELETE</span> to confirm
                    </label>
                    <input 
                      type="text"
                      value={confirmDeleteInput}
                      onChange={(e) => setConfirmDeleteInput(e.target.value)}
                      placeholder="DELETE"
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2.5 px-3 text-xs font-mono font-bold text-primary outline-none focus:border-red-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => { setSelectedUserForAction(null); setUserActionType(null); }}
                      className="py-3 bg-secondary text-primary/60 rounded-xl text-xs font-bold hover:text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={loading || confirmDeleteInput !== 'DELETE'}
                      onClick={handleDeleteUser}
                      className="py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      {loading ? 'Deleting...' : 'Delete Forever'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ORDER VERIFICATION & RELEASE MODAL */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-white rounded-t-[36px] md:rounded-[36px] p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-primary">Order Verification</h2>
                  <p className="text-[10px] text-primary/40 font-mono">{selectedTx.id}</p>
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider",
                  selectedTx.status === TRANSACTION_STATUS.PAID ? "bg-green-50 text-green-700" :
                  selectedTx.status === TRANSACTION_STATUS.FAILED ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                )}>
                  {selectedTx.status}
                </span>
              </div>

              {/* Order Info */}
              <div className="p-4 bg-primary text-white rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Required Release</span>
                <h3 className="text-2xl font-display font-bold">
                  {selectedTx.usdtAmount?.toLocaleString() || selectedTx.amount} USDT
                </h3>
                <p className="text-xs text-accent font-bold">
                  Payment: {selectedTx.fiatAmount ? formatFiat(selectedTx.fiatAmount, selectedTx.fiatCurrency || 'USD') : ''} ({selectedTx.fiatCurrency || 'USD'})
                </p>
              </div>

              {/* Destination Address */}
              <div className="p-3.5 bg-secondary rounded-xl border border-black/5 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-primary/50 font-bold uppercase tracking-wider">
                  <span>Customer TRC-20 Address</span>
                  <button 
                    onClick={() => copyToClipboard(selectedTx.destinationAddress, 'dest-addr')}
                    className="text-accent hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'dest-addr' ? <Check size={10} /> : <Copy size={10} />}
                    <span>{copiedKey === 'dest-addr' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-mono text-xs text-primary font-bold break-all bg-white p-2 rounded-lg border border-black/5 select-all">
                  {selectedTx.destinationAddress || 'None provided'}
                </p>
              </div>

              {/* User Payment TXID Proof */}
              <div className="p-3.5 bg-secondary rounded-xl border border-black/5 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-primary/50 font-bold uppercase tracking-wider">
                  <span>Buyer Submitted TXID</span>
                  <button 
                    onClick={() => copyToClipboard(selectedTx.userTxHash, 'tx-hash')}
                    className="text-accent hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'tx-hash' ? <Check size={10} /> : <Copy size={10} />}
                    <span>{copiedKey === 'tx-hash' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-mono text-xs text-primary font-bold break-all bg-white p-2 rounded-lg border border-black/5 select-all">
                  {selectedTx.userTxHash || 'None provided'}
                </p>
                {selectedTx.userTxHash && (
                  <a
                    href={`https://tronscan.org/#/transaction/${selectedTx.userTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-accent font-bold flex items-center gap-1 hover:underline pt-1"
                  >
                    <ExternalLink size={11} />
                    <span>Check on Tronscan</span>
                  </a>
                )}
              </div>

              {/* Actions */}
              {selectedTx.status !== TRANSACTION_STATUS.PAID && selectedTx.status !== TRANSACTION_STATUS.FAILED && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[10px] text-primary/50 font-bold uppercase tracking-wider block mb-1">
                      On-Chain Release Hash (Optional)
                    </label>
                    <input 
                      type="text"
                      value={releaseTxInput}
                      onChange={(e) => setReleaseTxInput(e.target.value)}
                      placeholder="Paste payout TXID..."
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2.5 px-3 text-xs font-mono text-primary outline-none focus:border-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      disabled={loading}
                      onClick={() => handleApproveOrder(selectedTx)}
                      className="bg-accent hover:bg-accent/90 text-white py-3 rounded-xl font-bold text-xs shadow-md shadow-accent/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <CheckCircle2 size={16} />
                      <span>Verify & Release</span>
                    </button>
                    
                    <button 
                      disabled={loading}
                      onClick={() => handleRejectOrder(selectedTx)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-bold text-xs border border-red-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 text-center text-xs font-bold text-primary/40 hover:text-primary transition-colors"
              >
                Close Window
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
