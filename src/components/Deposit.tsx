import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  Upload, 
  Info,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { formatCurrency, cn, copyTextToClipboard } from '../lib/utils';
import { TRANSACTION_STATUS, TRANSACTION_TYPES, SETTLEMENT_ACCOUNT } from '../constants';

interface DepositProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const Deposit: React.FC<DepositProps> = ({ onBack, onSuccess }) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await copyTextToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!user || !amount) return;
    setLoading(true);
    try {
      const txId = `DEP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      await setDoc(doc(db, 'transactions', txId), {
        userId: user.uid,
        username: profile?.username || 'User',
        type: TRANSACTION_TYPES.DEPOSIT,
        status: TRANSACTION_STATUS.PENDING,
        nairaAmount: Number(amount),
        payoutAccount: SETTLEMENT_ACCOUNT, // For internal tracking of where money should have gone
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-secondary flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-secondary relative flex flex-col pb-12">
        {/* Header */}
        <header className="px-5 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-secondary/90 backdrop-blur-md z-40 border-b border-black/5">
          <button onClick={onBack} className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary border border-black/5">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Fund Wallet</h2>
          <div className="w-10" />
        </header>

        <main className="flex-1 px-5 pt-4 pb-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 pt-4"
              >
                <div className="bg-[#003D29] rounded-[32px] p-6 text-white text-center shadow-xl">
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Current Balance</p>
                  <h1 className="text-3xl font-display font-bold">{formatCurrency(profile?.walletBalance || 0)}</h1>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[11px] font-bold text-primary/40 uppercase tracking-widest">Enter Amount (₦)</label>
                    <span className="text-[10px] font-bold text-accent">Min: ₦1,000</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/20 font-bold text-xl">₦</div>
                    <input 
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white border border-black/5 rounded-2xl py-5 pl-12 pr-6 text-xl font-bold text-primary outline-none focus:border-accent/30 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[5000, 10000, 25000, 50000].map((val) => (
                    <button 
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className="bg-white border border-black/5 py-3 rounded-xl text-[10px] font-bold text-primary/60 hover:border-accent hover:text-accent transition-all"
                    >
                      +₦{val.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                    <Info size={20} />
                  </div>
                  <p className="text-[11px] text-orange-800 leading-relaxed font-medium">
                    Deposits are processed manually. You will receive bank details in the next step to make a transfer.
                  </p>
                </div>

                <button 
                  disabled={!amount || Number(amount) < 1000}
                  onClick={() => setStep(2)}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-bold shadow-xl shadow-primary/20 disabled:opacity-30 disabled:shadow-none transition-all mt-8"
                >
                  Continue to Payment
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 pt-4"
              >
                <div className="bg-white border border-black/5 rounded-[32px] p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6 px-1">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Bank Transfer</h3>
                    <ShieldCheck className="text-accent" size={20} />
                  </div>

                  <div className="space-y-4">
                    <div className="bg-secondary rounded-2xl p-5 border border-black/5 relative group">
                      <p className="text-[9px] font-bold text-primary/40 uppercase tracking-widest mb-1">Account Number</p>
                      <p className="text-lg font-display font-bold text-primary tracking-wider">{SETTLEMENT_ACCOUNT.accountNumber}</p>
                      <button 
                        onClick={() => handleCopy(SETTLEMENT_ACCOUNT.accountNumber)}
                        className="absolute top-1/2 -translate-y-1/2 right-4 p-2 bg-white rounded-lg shadow-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-secondary rounded-2xl p-4 border border-black/5">
                        <p className="text-[8px] font-bold text-primary/40 uppercase tracking-widest mb-0.5">Bank Name</p>
                        <p className="text-[11px] font-bold text-primary">{SETTLEMENT_ACCOUNT.bankName}</p>
                      </div>
                      <div className="bg-secondary rounded-2xl p-4 border border-black/5">
                        <p className="text-[8px] font-bold text-primary/40 uppercase tracking-widest mb-0.5">Account Name</p>
                        <p className="text-[11px] font-bold text-primary leading-tight">{SETTLEMENT_ACCOUNT.accountName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-black/5 flex flex-col items-center">
                    <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest mb-2">Total to Pay</p>
                    <h2 className="text-3xl font-display font-bold text-primary">{formatCurrency(Number(amount))}</h2>
                    <p className="text-[9px] text-[#666666] mt-1 italic">Reference: DEP-{user?.uid.substring(0, 4)}</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                    Ensure you pay the exact amount and include the reference code in your bank transfer description.
                  </p>
                </div>

                <button 
                  disabled={loading}
                  onClick={handleSubmit}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-bold shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? "Processing..." : "I have made the Transfer"}
                </button>
                <button onClick={() => setStep(1)} className="w-full text-primary/40 text-[10px] font-bold uppercase tracking-widest">Change Amount</button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full pt-20"
              >
                <div className="w-20 h-20 bg-accent rounded-[32px] flex items-center justify-center text-white mb-6 animate-pulse shadow-lg shadow-accent/20">
                  <Clock size={40} />
                </div>
                <h2 className="text-xl font-bold text-primary mb-2">Notice Received!</h2>
                <p className="text-center text-sm text-primary/60 px-8 leading-relaxed mb-10">
                  We've received your deposit notice for <span className="font-bold text-primary">{formatCurrency(Number(amount))}</span>. 
                  Our team will verify the bank transfer and fund your wallet shortly.
                </p>
                <button 
                  onClick={onBack}
                  className="w-full bg-white border border-black/5 text-primary py-5 rounded-2xl font-bold shadow-sm"
                >
                  Back to Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
