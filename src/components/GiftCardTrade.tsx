import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ArrowRight, 
  Gift, 
  Camera, 
  CheckCircle2, 
  Info,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, addDoc, query, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { formatCurrency, cn } from '../lib/utils';
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from '../constants';

const GIFT_CARDS = [
  { id: 'razergold', name: 'Razer Gold', icon: 'https://picsum.photos/seed/razer/100/100' },
  { id: 'itunes', name: 'iTunes/Apple', icon: 'https://picsum.photos/seed/apple/100/100' },
  { id: 'googleplay', name: 'Google Play', icon: 'https://picsum.photos/seed/google/100/100' },
  { id: 'steam', name: 'Steam', icon: 'https://picsum.photos/seed/steam/100/100' },
  { id: 'sephora', name: 'Sephora', icon: 'https://picsum.photos/seed/sephora/100/100' }
];

const COUNTRIES = [
  { id: 'usa', name: 'USA', flag: '🇺🇸' },
  { id: 'uk', name: 'UK', flag: '🇬🇧' },
  { id: 'canada', name: 'Canada', flag: '🇨🇦' },
  { id: 'euro', name: 'Euro Zone', flag: '🇪🇺' }
];

export const GiftCardTrade: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [step, setStep] = useState(1);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [amount, setAmount] = useState<string>('');
  const [deliveryEmail, setDeliveryEmail] = useState<string>(profile?.email || '');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'wallet'>('bank');
  const [rates, setRates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rates'), (snapshot) => {
      const r: any = {};
      snapshot.docs.forEach(doc => r[doc.id] = doc.data());
      setRates(r);
    });
    return () => unsub();
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

  const currentRate = selectedCard ? (mode === 'sell' ? (rates[selectedCard.id]?.buyRate || 0) : (rates[selectedCard.id]?.sellRate || 0)) : 0;
  const nairaEquivalent = (parseFloat(amount) || 0) * (currentRate || 0);

  const handleSubmit = async () => {
    if (!user || !selectedCard || !currentRate) return;
    if (mode === 'sell' && !selectedBank) return;
    if (mode === 'buy' && (!deliveryEmail || (paymentMethod === 'wallet' && (profile?.walletBalance || 0) < nairaEquivalent))) return;

    setLoading(true);
    try {
      const txType = mode === 'sell' ? TRANSACTION_TYPES.SELL_GIFTCARD : TRANSACTION_TYPES.BUY_GIFTCARD;
      
      const payload: any = {
        userId: user.uid,
        username: profile?.username || 'Trader',
        type: txType,
        assetId: selectedCard.id,
        assetName: selectedCard.name,
        amount: parseFloat(amount),
        rateUsed: currentRate,
        nairaAmount: nairaEquivalent,
        status: TRANSACTION_STATUS.PENDING,
        giftCardDetails: {
          country: selectedCountry?.name,
          platform: selectedCard.name
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (mode === 'sell') {
        payload.payoutAccount = selectedBank;
      } else {
        payload.deliveryEmail = deliveryEmail;
        payload.paymentMethod = paymentMethod;
      }

      await addDoc(collection(db, 'transactions'), payload);

      if (mode === 'buy' && paymentMethod === 'wallet') {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          walletBalance: increment(-nairaEquivalent)
        });
      }

      setStep(4);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-bold pl-2">Select Gift Card</h3>
              <div className="grid grid-cols-2 gap-4">
                {GIFT_CARDS.map(card => (
                  <button 
                    key={card.id}
                    onClick={() => { setSelectedCard(card); setStep(2); }}
                    className={cn(
                      "card-premium p-4 flex flex-col items-center gap-3 transition-all",
                      selectedCard?.id === card.id ? "ring-2 ring-accent border-accent" : ""
                    )}
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm">
                      <img src={card.icon} alt={card.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <span className="font-bold text-sm">{card.name}</span>
                  </button>
                ))}
              </div>
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
               <button onClick={() => setStep(1)} className="flex items-center gap-2 text-primary/40 font-bold mb-2">
                <ChevronLeft size={16} /> Back to selection
              </button>
              
              <div className="card-premium flex items-center gap-4 border-accent bg-accent/5">
                <img src={selectedCard.icon} alt="" className="w-12 h-12 rounded-xl" referrerPolicy="no-referrer" />
                <h3 className="font-bold text-xl">{selectedCard.name}</h3>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary/40 pl-2">Select Country</h3>
                <div className="grid grid-cols-2 gap-3">
                  {COUNTRIES.map(country => (
                    <button 
                      key={country.id}
                      onClick={() => setSelectedCountry(country)}
                      className={cn(
                        "py-4 px-6 rounded-2xl font-bold flex items-center gap-3 bg-white shadow-sm border border-black/5 transition-all text-left",
                        selectedCountry?.id === country.id ? "bg-primary text-white border-primary" : "text-primary/60"
                      )}
                    >
                      <span className="text-xl">{country.flag}</span>
                      {country.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedCountry && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-primary/40 pl-2">Enter Amount ($)</h3>
                   <div className="card-premium bg-primary text-white p-6">
                      <div className="flex justify-between items-center mb-4">
                        <TrendingUp className="text-accent" />
                        <span className="text-xs font-bold text-white/40">{mode === 'sell' ? 'BUY RATE' : 'SELL RATE'}: ₦{currentRate}/$</span>
                      </div>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-bold focus:ring-1 ring-accent outline-none"
                      />
                      <div className="mt-4 p-4 bg-white/5 rounded-xl text-center">
                        <p className="text-[10px] text-white/40 uppercase font-bold mb-1">{mode === 'sell' ? 'Expected Payout' : 'Final Cost'}</p>
                        <p className="text-2xl font-display font-bold text-accent">{formatCurrency(nairaEquivalent)}</p>
                      </div>
                   </div>

                   {mode === 'buy' && (
                      <div className="card-premium space-y-4">
                         <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-primary/40"><AlertCircle /></div>
                          <div className="flex-1">
                            <h4 className="font-bold">Delivery Email</h4>
                            <p className="text-xs text-primary/40">Where should we send the code?</p>
                          </div>
                        </div>
                        <input 
                          type="email"
                          value={deliveryEmail}
                          onChange={(e) => setDeliveryEmail(e.target.value)}
                          className="w-full bg-secondary border border-black/5 rounded-2xl py-4 px-5 text-sm outline-none focus:border-accent"
                        />
                        <div className="pt-2">
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

                    <button 
                     onClick={() => mode === 'sell' ? setStep(3) : handleSubmit()}
                     disabled={!amount || parseFloat(amount) <= 0 || (mode === 'buy' && paymentMethod === 'wallet' && (profile?.walletBalance || 0) < nairaEquivalent)}
                     className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 disabled:opacity-50"
                   >
                     {mode === 'sell' ? 'Continue to Payout' : loading ? 'Processing...' : 'Confirm Buy Order'}
                   </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <button onClick={() => setStep(2)} className="flex items-center gap-2 text-primary/40 font-bold mb-2">
                <ChevronLeft size={16} /> Back to details
              </button>

              <div className="card-premium">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="text-accent" size={18} /> Select Payout Account
                </h3>
                
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
                onClick={handleSubmit}
                disabled={loading || !selectedBank}
                className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg shadow-xl"
              >
                {loading ? 'Submitting...' : 'Submit Gift Card Trade'}
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-20 px-6"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-8">
                <CheckCircle2 size={64} />
              </div>
              <h2 className="text-3xl font-display font-bold mb-4">Submitted!</h2>
              <p className="text-primary/60 mb-10">
                Your gift card trade is being verified. You will be paid once an admin confirms the card value.
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
