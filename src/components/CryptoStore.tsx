import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Wallet, ShieldCheck, ExternalLink, Clock, 
  CheckCircle2, XCircle, ArrowUpRight, Copy, Check, RefreshCw
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { SYSTEM_WALLETS, TRANSACTION_STATUS, TRANSACTION_TYPES } from '../constants';
import { formatFiat, copyTextToClipboard } from '../lib/utils';

interface CryptoStoreProps {
  onBack: () => void;
  onBuyMore: () => void;
}

export const CryptoStore: React.FC<CryptoStoreProps> = ({ onBack, onBuyMore }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort newest first
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(items);
      setLoading(false);
    }, (err) => {
      console.error("Crypto store fetch error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Calculate total released USDT
  const totalVerifiedUSDT = orders
    .filter(o => o.type === TRANSACTION_TYPES.BUY_USDT && o.status === TRANSACTION_STATUS.PAID)
    .reduce((acc, curr) => acc + (Number(curr.usdtAmount) || 0), 0);

  const pendingOrders = orders.filter(
    o => o.type === TRANSACTION_TYPES.BUY_USDT && (o.status === TRANSACTION_STATUS.PENDING || o.status === TRANSACTION_STATUS.PROCESSING)
  );

  const handleCopy = async (text: string, id: string) => {
    await copyTextToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-secondary flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-secondary relative flex flex-col pb-28">
        {/* Header */}
        <header className="px-5 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-secondary/90 backdrop-blur-md z-40 border-b border-black/5">
          <button 
            onClick={onBack} 
            className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary border border-black/5"
            id="back-crypto-store-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <h3 className="text-base font-bold text-[#1A1A1A]">My Crypto Store</h3>
            <p className="text-[10px] text-primary/40 font-bold uppercase tracking-wider">Vault & Asset Inventory</p>
          </div>
          <button 
            onClick={onBuyMore} 
            className="px-3 py-1.5 bg-accent text-white rounded-xl text-xs font-bold shadow-xs hover:bg-accent/90 transition-all flex items-center gap-1"
          >
            <span>+ Buy</span>
          </button>
        </header>

        <main className="flex-1 px-5 pt-4 pb-12 space-y-5">
          {/* Main Vault Card */}
          <div className="p-6 bg-[#003D29] text-white rounded-[32px] shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Verified Released Assets</span>
                <h1 className="text-3xl font-display font-bold mt-1">
                  {totalVerifiedUSDT.toLocaleString()} <span className="text-sm font-sans font-bold text-accent">USDT</span>
                </h1>
                <p className="text-xs text-white/60 mt-0.5">≈ ${totalVerifiedUSDT.toLocaleString()} USD</p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-accent">
                <ShieldCheck size={26} />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-white/60 font-medium">Delivery Network</span>
              <span className="bg-white/15 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px]">TRC-20 (Tron)</span>
            </div>
          </div>

          {/* Pending Verification Notice */}
          {pendingOrders.length > 0 && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                <Clock size={16} className="text-amber-600 animate-pulse" />
                <span>{pendingOrders.length} Order(s) Awaiting Admin Verification</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Your payment proof is currently in the verification queue. Once the administrator verifies your transaction, the purchased USDT will be released to your store and destination address.
              </p>
            </div>
          )}

          {/* Purchased Crypto History */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Purchased Cryptos & Receipts</h4>
              <span className="text-[10px] text-primary/40 font-bold">{orders.length} Records</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-primary/40 text-xs flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-accent" />
                <span>Loading your purchases...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 bg-white rounded-3xl border border-black/5 text-center p-6 space-y-3">
                <Wallet size={36} className="text-primary/20 mx-auto" />
                <p className="text-xs font-bold text-primary">No Crypto Purchases Yet</p>
                <p className="text-[11px] text-primary/50">
                  Buy USDT at real market rates using USD, EUR, or GBP to see your assets and receipts here.
                </p>
                <button
                  onClick={onBuyMore}
                  className="px-5 py-2.5 bg-accent text-white rounded-xl text-xs font-bold shadow-sm inline-block"
                >
                  Buy USDT Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const isPaid = order.status === TRANSACTION_STATUS.PAID;
                  const isFailed = order.status === TRANSACTION_STATUS.FAILED;
                  const isPending = !isPaid && !isFailed;

                  return (
                    <div 
                      key={order.id} 
                      className="bg-white p-4 rounded-2xl border border-black/5 shadow-xs space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isPaid ? 'bg-green-50 text-green-700' : isFailed ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {isPaid ? <CheckCircle2 size={18} /> : isFailed ? <XCircle size={18} /> : <Clock size={18} />}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-primary">
                              {order.usdtAmount ? `${order.usdtAmount.toLocaleString()} USDT` : order.assetName || 'Crypto'}
                            </h5>
                            <span className="text-[10px] text-primary/40 font-medium">
                              {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'} • {order.fiatCurrency || 'USD'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-primary">
                            {order.fiatAmount ? formatFiat(order.fiatAmount, order.fiatCurrency || 'USD') : ''}
                          </span>
                          <span className={`block text-[9px] font-extrabold uppercase tracking-wider mt-0.5 ${
                            isPaid ? 'text-green-600' : isFailed ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {isPaid ? 'Verified & Released' : isFailed ? 'Rejected' : 'Verifying...'}
                          </span>
                        </div>
                      </div>

                      {/* Destination Address Snippet */}
                      {order.destinationAddress && (
                        <div className="p-2.5 bg-secondary rounded-xl text-[10px] space-y-1">
                          <div className="flex justify-between items-center text-primary/50">
                            <span>Delivery Destination:</span>
                            <button
                              onClick={() => handleCopy(order.destinationAddress, order.id + '-dest')}
                              className="text-accent font-bold flex items-center gap-1 hover:underline"
                            >
                              {copiedId === order.id + '-dest' ? <Check size={10} /> : <Copy size={10} />}
                              <span>{copiedId === order.id + '-dest' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <p className="font-mono text-primary font-bold break-all">
                            {order.destinationAddress}
                          </p>
                        </div>
                      )}

                      {/* Submitted TXID */}
                      {order.userTxHash && (
                        <div className="text-[10px] text-primary/50 flex justify-between items-center px-1">
                          <span>User TXID:</span>
                          <span className="font-mono text-primary truncate max-w-[180px]">
                            {order.userTxHash}
                          </span>
                        </div>
                      )}

                      {/* Release TXID link if verified */}
                      {order.releaseTxHash && (
                        <div className="pt-2 border-t border-black/5 flex justify-between items-center text-xs">
                          <span className="text-green-700 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 size={13} /> Official Release On-Chain
                          </span>
                          <a
                            href={`${SYSTEM_WALLETS.USDT_TRC20.explorer}${order.releaseTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 font-bold text-[11px] flex items-center gap-1 hover:underline"
                          >
                            <span>Explorer</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
