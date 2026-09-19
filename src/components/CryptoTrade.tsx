import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ArrowRight, 
  Copy, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, addDoc, doc, getDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { formatCurrency, cn, copyTextToClipboard } from '../lib/utils';
import { TRANSACTION_STATUS, TRANSACTION_TYPES, RATE_LOCK_TIME, SYSTEM_WALLETS } from '../constants';

export const CryptoTrade: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [step, setStep] = useState(1);
  const [usdtRate, setUsdtRate] = useState<any>(null);
  const [amount, setAmount] = useState<string>('');
  const [destAddress, setDestAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'wallet'>('bank');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RATE_LOCK_TIME);
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string>(SYSTEM_WALLETS.USDT_TRC20.address);

  const WALLET_ADDRESS = walletAddress;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'rates', 'usdt'), (doc) => {
      if (doc.exists()) setUsdtRate(doc.data());
    });
    const unsubWallets = onSnapshot(doc(db, 'config', 'wallets'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.USDT_TRC20?.address) {
          setWalletAddress(d.USDT_TRC20.address);
        }
      }
    });
    return () => {
      unsub();
      unsubWallets();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'bank_accounts'));
    const unsub = onSnapshot(q, (snapshot) => {
      const bankList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setBanks(bankList);
      if (bankList.length > 0 && !selectedBank) {
        setSelectedBank(bankList.find((b: any) => b.isDefault) || bankList[0]);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  const activeRate = mode === 'sell' ? (usdtRate?.buyRate || 0) : (usdtRate?.sellRate || 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    await copyTextToClipboard(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!user || !activeRate) return;
    if (mode === 'sell' && !selectedBank) return;
    if (mode === 'buy' && (!destAddress || (paymentMethod === 'wallet' && (profile?.walletBalance || 0) < nairaEquivalent))) return;

    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + RATE_LOCK_TIME);

      const txType = mode === 'sell' ? TRANSACTION_TYPES.SELL_CRYPTO : TRANSACTION_TYPES.BUY_CRYPTO;
      
      const payload: any = {
        userId: user.uid,
        username: profile?.username || 'Trader',
        type: txType,
        assetId: 'usdt',
        assetName: 'USDT (TRC20)',
        amount: parseFloat(amount),
        rateUsed: activeRate,
        nairaAmount: nairaEquivalent,
        status: mode === 'sell' ? TRANSACTION_STATUS.AWAITING_PAYMENT : TRANSACTION_STATUS.PENDING,
        network: 'TRC20',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (mode === 'sell') {
        payload.payoutAccount = selectedBank;
        payload.expiresAt = expiresAt.toISOString();
      } else {
        payload.destinationAddress = destAddress;
        payload.paymentMethod = paymentMethod;
      }

      await addDoc(collection(db, 'transactions'), payload);

      // If paying with wallet, deduct immediately (or wait for admin? User said Admin approves everything)
      // Usually better to deduct immediately if using wallet, then admin verifies the trade itself.
      if (mode === 'buy' && paymentMethod === 'wallet') {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          walletBalance: increment(-nairaEquivalent)
        });
      }

      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nairaEquivalent = mode === 'sell' 
    ? Math.floor((parseFloat(amount) || 0) * activeRate)
    : Math.floor((parseFloat(amount) || 0) * activeRate);

  return (
    <div className="min-h-screen bg-secondary p-6 pb-24">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm text-primary">
          <ChevronLeft />
        </button>
        <div className="flex bg-white/50 p-1 rounded-2xl border border-black/5 flex-1 max-w-[200px]">
          <button 
             onClick={() => setMode('buy')}
             className={cn(
               "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
               mode === 'buy' ? "bg-primary text-white shadow-md" : "text-primary/40"
             )}
          >
            Buy
          </button>
          <button 
            onClick={() => setMode('sell')}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
              mode === 'sell' ? "bg-primary text-white shadow-md" : "text-primary/40"
            )}
          >
            Sell
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="card-premium bg-primary text-white">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                       <TrendingUp className="text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">{mode === 'sell' ? 'Axiom Buys @' : 'Axiom Sells @'}</p>
                      <p className="text-lg font-bold">₦{activeRate || '---'} / $</p>
                    </div>
                  </div>
                  <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">TRC20</div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/40 uppercase font-bold tracking-widest pl-1">
                      {mode === 'sell' ? 'Amount to Sell ($)' : 'Amount to Buy ($)'}
                    </label>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter USD amount"
                      className="w-full bg-white/10 border border-white/10 rounded-2xl py-5 px-6 outline-none focus:ring-1 ring-accent text-2xl font-bold mt-1"
                    />
                  </div>
                  
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                    <p className="text-xs text-white/40 mb-1">{mode === 'sell' ? 'You will receive' : 'It will cost you'}</p>
                    <p className="text-3xl font-display font-bold text-accent">{formatCurrency(nairaEquivalent)}</p>
                  </div>
                </div>
              </div>

              {mode === 'buy' && (
                <div className="card-premium space-y-4">
                   <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-primary/40"><AlertCircle /></div>
                    <div className="flex-1">
                      <h4 className="font-bold">Destination Address</h4>
                      <p className="text-xs text-primary/40">Enter your USDT (TRC20) wallet address</p>
                    </div>
                  </div>
                  <input 
                    placeholder="TD7wK8U3Xv..."
                    value={destAddress}
                    onChange={(e) => setDestAddress(e.target.value)}
                    className="w-full bg-secondary border border-black/5 rounded-2xl py-4 px-5 text-sm font-mono outline-none focus:border-accent"
                  />
                  
                  <div className="pt-4 border-t border-black/5">
                    <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest mb-3">Payment Source</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setPaymentMethod('bank')}
                        className={cn(
                          "py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                          paymentMethod === 'bank' ? "bg-primary text-white border-primary" : "bg-white text-primary/40 border-black/5"
                        )}
                      >
                        Bank Transfer
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('wallet')}
                        className={cn(
                          "py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                          paymentMethod === 'wallet' ? "bg-primary text-white border-primary" : "bg-white text-primary/40 border-black/5"
                        )}
                      >
                        Wallet ({formatCurrency(profile?.walletBalance || 0)})
                      </button>
                    </div>
                    {paymentMethod === 'wallet' && (profile?.walletBalance || 0) < nairaEquivalent && (
                      <p className="text-red-500 text-[9px] font-bold mt-2 uppercase">Insufficient Wallet Balance</p>
                    )}
                  </div>
                </div>
              )}

              {mode === 'sell' && (
                <>
                  <div className="card-premium space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-primary/40"><CreditCard /></div>
                      <div className="flex-1">
                        <h4 className="font-bold">Select Payout Account</h4>
                        <p className="text-xs text-primary/40">Where should we send your Naira?</p>
                      </div>
                    </div>

                    {banks.length > 0 ? (
                      <div className="space-y-2">
                        {banks.map(bank => (
                          <button 
                            key={bank.id}
                            onClick={() => setSelectedBank(bank)}
                            className={cn(
                              "w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all",
                              selectedBank?.id === bank.id 
                                ? "bg-accent/5 border-accent shadow-sm" 
                                : "bg-white border-black/5 hover:border-black/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Building2 size={18} className={cn(selectedBank?.id === bank.id ? "text-accent" : "text-primary/20")} />
                              <div>
                                <p className="text-sm font-bold text-primary leading-tight">{bank.bankName}</p>
                                <p className="text-[10px] text-primary/40">{bank.accountNumber}</p>
                              </div>
                            </div>
                            {selectedBank?.id === bank.id && (
                              <CheckCircle2 size={16} className="text-accent" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3 text-orange-700">
                        <AlertCircle size={20} />
                        <p className="text-xs font-bold text-orange-800">Please add a bank account first</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setStep(2)}
                    disabled={!amount || parseFloat(amount) <= 0 || !selectedBank}
                    className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Continue to Payment
                    <ArrowRight />
                  </button>
                </>
              )}

              {mode === 'buy' && (
                <button 
                  onClick={handleSubmit}
                  disabled={loading || !amount || parseFloat(amount) <= 0 || !destAddress || (paymentMethod === 'wallet' && (profile?.walletBalance || 0) < nairaEquivalent)}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Buy Order'}
                  <ArrowRight />
                </button>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center gap-4 text-orange-700">
                <Clock className="animate-pulse" />
                <div>
                  <p className="text-sm font-bold">Rate Locked: {formatTime(timeLeft)}</p>
                  <p className="text-[10px]">Complete transfer before timer expires</p>
                </div>
              </div>

              <div className="card-premium text-center py-10">
                <p className="text-sm text-primary/40 mb-4">Send exactly <span className="font-bold text-primary">${amount}</span> USDT (TRC20)</p>
                <div className="bg-secondary p-6 rounded-3xl mb-6 relative">
                  <p className="text-xs text-primary/60 break-all font-mono mb-4">{WALLET_ADDRESS}</p>
                  <button 
                    onClick={handleCopy}
                    className="mx-auto flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-black/5"
                  >
                    {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy Address'}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4 p-4 border border-blue-100 bg-blue-50 rounded-2xl text-blue-700">
                  <ShieldCheck />
                  <p className="text-xs font-bold">Network: TRC20 (Tron Network)</p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'I have Made Payment'}
                </button>
                <button 
                  onClick={() => setStep(1)}
                  className="w-full py-4 text-primary/40 font-bold"
                >
                  Cancel Trade
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-20 px-6"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-8">
                <CheckCircle2 size={64} />
              </div>
              <h2 className="text-3xl font-display font-bold mb-4">Trade Submitted!</h2>
              <p className="text-primary/60 mb-10">
                Your transaction is being processed. You will be notified once the admin confirms your payment.
              </p>
              <button 
                onClick={onBack}
                className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg shadow-xl"
              >
                Go to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
