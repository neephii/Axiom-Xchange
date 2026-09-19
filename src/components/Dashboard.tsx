import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Eye, EyeOff, ShieldCheck, Power, Clock, 
  ArrowUpRight, ChevronRight, MessageCircle, Home, 
  Repeat, CreditCard, User, Sparkles, CheckCircle2, 
  ExternalLink, ArrowRight, ShoppingCart, Wallet,
  HelpCircle, AlertTriangle, ShieldAlert, TrendingUp
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { BuyUSDT } from './BuyUSDT';
import { CryptoStore } from './CryptoStore';
import { AdminPanel } from './AdminPanel';
import { Support } from './Support';
import { Notifications } from './Notifications';
import { CryptoTrade } from './CryptoTrade';
import { GiftCardTrade } from './GiftCardTrade';
import { BankAccounts } from './BankAccounts';
import { Deposit } from './Deposit';
import { 
  USDT_PACKAGES, 
  FiatCurrency, 
  FIAT_RATES, 
  SYSTEM_WALLETS, 
  TRANSACTION_STATUS, 
  TRANSACTION_TYPES,
  DEFAULT_CRYPTO_PRICES,
  CryptoPriceItem,
  calculateUsdtFiatPrice
} from '../constants';
import { cn, formatFiat } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  
  // Views: 'main' | 'buy_usdt' | 'store' | 'admin' | 'support' | 'crypto' | 'giftcard' | 'banks' | 'deposit'
  const [view, setView] = useState<string>('main');
  const [showBalance, setShowBalance] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<FiatCurrency>('USD');
  const [selectedPackageAmount, setSelectedPackageAmount] = useState<number>(1000);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [totalStoreBalance, setTotalStoreBalance] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPriceItem[]>(DEFAULT_CRYPTO_PRICES);

  // Dynamic rates configured by admin in real-time
  const [dynamicRates, setDynamicRates] = useState<Record<FiatCurrency, number>>({
    USD: FIAT_RATES.USD.rateToUsd,
    EUR: FIAT_RATES.EUR.rateToUsd,
    GBP: FIAT_RATES.GBP.rateToUsd,
  });

  // Listen for admin real-time pricing updates
  useEffect(() => {
    const unsubPricing = onSnapshot(doc(db, 'config', 'pricing'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setDynamicRates({
          USD: Number(d.usdRate) || FIAT_RATES.USD.rateToUsd,
          EUR: Number(d.eurRate) || FIAT_RATES.EUR.rateToUsd,
          GBP: Number(d.gbpRate) || FIAT_RATES.GBP.rateToUsd,
        });
      }
    }, (err) => console.warn("Pricing listener note:", err));

    const unsubCryptoPrices = onSnapshot(doc(db, 'config', 'crypto_prices'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (Array.isArray(d.list) && d.list.length > 0) {
          setCryptoPrices(d.list);
        }
      }
    }, (err) => console.warn("Crypto prices sync note:", err));

    return () => {
      unsubPricing();
      unsubCryptoPrices();
    };
  }, []);

  // Sync user unread notifications count
  useEffect(() => {
    if (!user) return;
    const qNotifs = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(qNotifs, (snapshot) => {
      setUnreadNotificationsCount(snapshot.size);
    }, (err) => console.warn("Notifications count listener note:", err));
    return () => unsub();
  }, [user]);

  // Sync user's real-time orders from transactions collection
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      let verifiedSum = 0;
      snapshot.forEach(docSnap => {
        const d: any = { id: docSnap.id, ...docSnap.data() };
        docs.push(d);
        if (d.type === TRANSACTION_TYPES.BUY_USDT && d.status === TRANSACTION_STATUS.PAID) {
          verifiedSum += Number(d.usdtAmount) || 0;
        }
      });
      // Sort newest first
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRecentOrders(docs.slice(0, 5));
      setTotalStoreBalance(verifiedSum);
    }, (err) => console.error("Transactions sync error:", err));

    return () => unsub();
  }, [user]);

  const currentRate = dynamicRates[selectedCurrency] || FIAT_RATES[selectedCurrency].rateToUsd;
  const isSuspended = !!profile?.suspended;

  // View routing
  if (view === 'support') {
    return (
      <Support 
        onBack={() => setView('main')} 
        onGoToBuy={() => {
          if (!isSuspended) {
            setSelectedPackageAmount(1000);
            setView('buy_usdt');
          }
        }}
      />
    );
  }

  if (view === 'buy_usdt') {
    return (
      <BuyUSDT 
        initialAmount={selectedPackageAmount}
        initialCurrency={selectedCurrency}
        onBack={() => setView('main')} 
        onSuccess={() => {}}
        onGoToStore={() => setView('store')}
        onGoToSupport={() => setView('support')}
      />
    );
  }

  if (view === 'store') {
    return (
      <CryptoStore 
        onBack={() => setView('main')}
        onBuyMore={() => {
          if (isSuspended) {
            setView('support');
          } else {
            setSelectedPackageAmount(250);
            setView('buy_usdt');
          }
        }}
      />
    );
  }

  if (view === 'notifications') {
    return (
      <Notifications 
        onBack={() => setView('main')} 
        onNavigateToStore={() => setView('store')}
        onNavigateToSupport={() => setView('support')}
        onNavigateToBuy={() => {
          if (!isSuspended) {
            setSelectedPackageAmount(250);
            setView('buy_usdt');
          } else {
            setView('support');
          }
        }}
      />
    );
  }

  if (view === 'admin') return <AdminPanel onBack={() => setView('main')} />;
  if (view === 'crypto') return <CryptoTrade onBack={() => setView('main')} />;
  if (view === 'giftcard') return <GiftCardTrade onBack={() => setView('main')} />;
  if (view === 'banks') return <BankAccounts onBack={() => setView('main')} />;
  if (view === 'deposit') return <Deposit onBack={() => setView('main')} onSuccess={() => setView('main')} />;

  return (
    <div className="min-h-screen w-full bg-secondary flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-secondary relative flex flex-col pb-28">
        
        {/* Top App Header */}
        <header className="px-5 pt-6 pb-4 flex justify-between items-center bg-secondary/90 backdrop-blur-md sticky top-0 z-40 border-b border-black/5">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-[#1A1A1A] leading-tight">{profile?.username || 'Trader'}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn(
                "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                isSuspended 
                  ? "bg-red-100 text-red-700 border border-red-200" 
                  : "bg-accent/10 text-accent"
              )}>
                {isSuspended ? 'ACCOUNT SUSPENDED' : `TIER ${profile?.tier || 1} VERIFIED`}
              </span>
              {isAdmin && (
                <button 
                  onClick={() => setView('admin')}
                  className="bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-xs"
                >
                  ADMIN
                </button>
              )}
            </div>
          </div>

          {/* Right Actions: Currency Selector, Support Link & Logout */}
          <div className="flex items-center gap-2">
            {/* Currency Selector Pill */}
            <div className="flex bg-white p-1 rounded-2xl border border-black/5 shadow-xs">
              {(['USD', 'EUR', 'GBP'] as FiatCurrency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCurrency(c)}
                  className={cn(
                    "px-2 py-1 rounded-xl text-[10px] font-bold transition-all",
                    selectedCurrency === c ? "bg-primary text-white shadow-xs" : "text-primary/40 hover:text-primary"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setView('notifications')}
              className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-primary/60 hover:text-primary transition-colors bg-white shadow-xs border border-black/5"
              title="Notifications & Deal Updates"
              id="header-notifications-btn"
            >
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => setView('support')}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-primary/60 hover:text-primary transition-colors bg-white shadow-xs border border-black/5"
              title="Official Help & Support"
            >
              <HelpCircle size={18} />
            </button>

            <button 
              onClick={() => signOut(auth)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-primary/40 hover:text-primary transition-colors bg-white shadow-xs border border-black/5"
              title="Sign Out"
            >
              <Power size={17} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 pt-3 pb-6 space-y-4">
          {/* SUSPENSION BANNER (If user account is suspended by admin) */}
          {isSuspended && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 rounded-3xl p-4.5 text-red-900 shadow-sm space-y-2.5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-red-800">Account Access Restricted</h3>
                  <p className="text-[11px] text-red-700/90 leading-relaxed font-medium mt-0.5">
                    {profile?.suspendedReason || 'Your account was flagged for suspicious activity and suspended by security.'}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => setView('support')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98"
                >
                  <HelpCircle size={14} />
                  <span>Contact Support to Appeal Suspension</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Main Vault / USDT Balance Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#003D29] to-[#026C4A] rounded-[30px] p-6 text-white shadow-[0_12px_28px_rgba(0,61,41,0.25)] relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Released USDT Store</p>
                  <button 
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    {showBalance ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                </div>
                <div className="flex items-center gap-1 text-accent text-xs font-bold">
                  <ShieldCheck size={14} />
                  <span>TRC-20</span>
                </div>
              </div>

              <div className="flex items-end justify-between mb-5 mt-2">
                <div>
                  <h1 className="text-3xl font-display font-bold tracking-tight">
                    {showBalance ? `${totalStoreBalance.toLocaleString()} USDT` : '•••••••'}
                  </h1>
                  <p className="text-xs text-white/60 mt-0.5">
                    ≈ {formatFiat(totalStoreBalance * currentRate, selectedCurrency)} ({selectedCurrency})
                  </p>
                </div>

                <button 
                  onClick={() => setView('store')}
                  className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-accent/20 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>My Store</span>
                  <ArrowRight size={13} />
                </button>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                <div>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Live Admin Rate</p>
                  <p className="font-bold text-white text-xs">1 USDT = {formatFiat(currentRate, selectedCurrency)}</p>
                </div>
                <button 
                  disabled={isSuspended}
                  onClick={() => {
                    if (isSuspended) return;
                    setSelectedPackageAmount(250);
                    setView('buy_usdt');
                  }}
                  className={cn(
                    "text-accent font-bold text-xs flex items-center gap-1 hover:underline",
                    isSuspended && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <span>Buy USDT</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>

            <div className="absolute -right-8 -top-8 w-32 h-32 bg-accent/20 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-[60px]"></div>
          </motion.div>

          {/* Live Crypto Market Rates (Synced directly with Admin Pricing) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-accent" />
                  <span>Live Crypto Rates</span>
                </h3>
                <p className="text-[10px] text-primary/40 font-medium">Real-time market prices across Axiom Xchange</p>
              </div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Live Feed</span>
              </span>
            </div>

            {/* Horizontal Scroll / Grid of live crypto prices */}
            <div className="grid grid-cols-2 gap-2.5">
              {cryptoPrices.map((coin) => {
                const fiatPrice = (coin.priceUsd || 1) * (currentRate || 1);
                const changeVal = typeof coin.change24h === 'number' 
                  ? coin.change24h 
                  : (parseFloat(String(coin.change24h ?? 0)) || 0);
                const isPositive = changeVal >= 0;
                const changeDisplay = `${isPositive ? '+' : ''}${changeVal.toFixed(2)}%`;

                return (
                  <div 
                    key={coin.id}
                    className="p-3 bg-white rounded-2xl border border-black/5 shadow-xs hover:border-accent/30 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-secondary flex items-center justify-center font-bold text-xs text-primary shadow-2xs">
                          {coin.symbol?.slice(0, 3)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-primary leading-tight">{coin.symbol}</h4>
                          <span className="text-[9px] text-primary/40 font-medium truncate block max-w-[70px]">
                            {coin.network || coin.name}
                          </span>
                        </div>
                      </div>

                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.2 rounded-md",
                        isPositive ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                      )}>
                        {changeDisplay}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-black/5 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs font-bold text-primary block">
                          {formatFiat(fiatPrice, selectedCurrency)}
                        </span>
                        <span className="text-[8px] text-primary/40 font-medium">
                          ${Number(coin.priceUsd).toLocaleString()} USD
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (!isSuspended) {
                            setSelectedPackageAmount(100);
                            setView('buy_usdt');
                          }
                        }}
                        className="text-[9px] font-bold text-accent hover:underline flex items-center gap-0.5"
                      >
                        <span>Trade</span>
                        <ArrowUpRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Buy Packages Header */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A]">Buy USDT Packages</h3>
                <p className="text-[10px] text-primary/40 font-medium">Real-time pricing in USD, EUR & GBP</p>
              </div>
              <button 
                disabled={isSuspended}
                onClick={() => {
                  if (isSuspended) return;
                  setSelectedPackageAmount(1000);
                  setView('buy_usdt');
                }}
                className={cn(
                  "text-[11px] text-accent font-bold px-3 py-1 bg-accent/5 rounded-lg hover:bg-accent/10 transition-colors",
                  isSuspended && "opacity-40 cursor-not-allowed"
                )}
              >
                Custom Order
              </button>
            </div>

            {/* List of USDT Packages with Real-Time Dynamic Pricing */}
            <div className="space-y-2.5">
              {USDT_PACKAGES.map((pkg) => {
                const pkgFiatCost = calculateUsdtFiatPrice(pkg.amount, selectedCurrency, dynamicRates);

                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      "p-4 bg-white rounded-2xl border transition-all flex items-center justify-between shadow-xs",
                      pkg.popular ? "border-accent/40 bg-gradient-to-r from-white to-accent/5 ring-1 ring-accent/20" : "border-black/5 hover:border-black/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-bold">
                        <span className="text-xs font-mono font-black">$</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-primary">
                            {pkg.amount.toLocaleString()} USDT
                          </h4>
                          {pkg.popular && (
                            <span className="bg-accent text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-tight">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-primary/50 font-medium mt-0.5">
                          Price: <strong className="text-primary">{formatFiat(pkgFiatCost, selectedCurrency)}</strong> ({selectedCurrency})
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={isSuspended}
                      onClick={() => {
                        if (isSuspended) {
                          setView('support');
                        } else {
                          setSelectedPackageAmount(pkg.amount);
                          setView('buy_usdt');
                        }
                      }}
                      className={cn(
                        "px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 active:scale-95",
                        isSuspended && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <span>Buy</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <button 
              onClick={() => setView('store')}
              className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-xs flex flex-col items-center gap-2 group hover:border-accent/30 transition-all text-center"
            >
              <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 flex items-center justify-center transition-transform group-hover:scale-105">
                <Wallet size={22} />
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-tight">Crypto Store</span>
            </button>

            <button 
              disabled={isSuspended}
              onClick={() => {
                if (isSuspended) {
                  setView('support');
                } else {
                  setSelectedPackageAmount(250);
                  setView('buy_usdt');
                }
              }}
              className={cn(
                "bg-white p-3.5 rounded-2xl border border-black/5 shadow-xs flex flex-col items-center gap-2 group hover:border-accent/30 transition-all text-center",
                isSuspended && "opacity-60 cursor-not-allowed"
              )}
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center transition-transform group-hover:scale-105">
                <ShoppingCart size={22} />
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-tight">Buy USDT</span>
            </button>

            <button 
              onClick={() => setView('support')}
              className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-xs flex flex-col items-center gap-2 group hover:border-accent/30 transition-all text-center"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-105">
                <HelpCircle size={22} />
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-tight">Support</span>
            </button>
          </div>

          {/* Recent Orders Section */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-3 px-1">
              <h3 className="text-sm font-bold text-[#1A1A1A]">Recent Orders</h3>
              <button 
                onClick={() => setView('store')}
                className="text-[11px] text-accent font-bold hover:underline"
              >
                View Store
              </button>
            </div>

            <div className="space-y-2.5">
              {recentOrders.map((order) => {
                const isPaid = order.status === TRANSACTION_STATUS.PAID;
                const isFailed = order.status === TRANSACTION_STATUS.FAILED;

                return (
                  <div 
                    key={order.id} 
                    className="bg-white border border-black/5 rounded-2xl p-3.5 flex items-center justify-between shadow-xs hover:border-accent/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold",
                        isPaid ? "bg-green-50 text-green-700" : isFailed ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {isPaid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-primary">
                          {order.usdtAmount ? `${Number(order.usdtAmount).toLocaleString()} USDT` : order.assetName || 'Crypto'}
                        </h4>
                        <p className="text-[10px] text-primary/40 font-medium">
                          {order.fiatAmount ? formatFiat(order.fiatAmount, order.fiatCurrency || 'USD') : ''} • {order.fiatCurrency || 'USD'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={cn(
                        "text-[9px] font-extrabold uppercase tracking-wider block",
                        isPaid ? "text-green-600" : isFailed ? "text-red-600" : "text-amber-600"
                      )}>
                        {isPaid ? 'Verified' : isFailed ? 'Rejected' : 'Verifying...'}
                      </span>
                      <span className="text-[9px] text-primary/40 font-medium">
                        {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {recentOrders.length === 0 && (
                <div className="text-center py-8 bg-white/70 border border-dashed border-black/5 rounded-2xl p-4">
                  <Clock className="mx-auto mb-2 opacity-20" size={24} />
                  <p className="text-xs font-bold text-primary/40">No orders placed yet</p>
                  <p className="text-[10px] text-primary/30 mt-0.5">Select a USDT package above to place your first order.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Bottom Navigation Dock */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-black/5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
          <div className="max-w-md mx-auto px-4 flex justify-around items-center">
            {[
              { icon: Home, label: 'Home', active: view === 'main', action: () => setView('main') },
              { icon: ShoppingCart, label: 'Buy USDT', active: view === 'buy_usdt', action: () => { if (!isSuspended) { setSelectedPackageAmount(250); setView('buy_usdt'); } else { setView('support'); } } },
              { icon: Wallet, label: 'Store', active: view === 'store', action: () => setView('store') },
              { 
                icon: Bell, 
                label: 'Alerts', 
                active: view === 'notifications', 
                badge: unreadNotificationsCount, 
                action: () => setView('notifications') 
              },
              { icon: HelpCircle, label: 'Support', active: view === 'support', action: () => setView('support') }
            ].map((tab, i) => (
              <button 
                key={i} 
                onClick={tab.action} 
                className={cn(
                  "relative flex flex-col items-center gap-1 transition-all outline-none", 
                  tab.active ? "text-primary scale-105" : "text-[#BDBDBD] hover:text-primary/60"
                )}
              >
                <div className="relative">
                  <tab.icon size={21} strokeWidth={tab.active ? 2.6 : 2} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 bg-red-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">{tab.label}</span>
                {tab.active && <motion.div layoutId="activeTab" className="w-1.5 h-1.5 bg-accent rounded-full mt-0.5" />}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};
