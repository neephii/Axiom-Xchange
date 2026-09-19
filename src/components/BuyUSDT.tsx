import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Copy, Check, Clock, ShieldCheck, AlertCircle, 
  ExternalLink, CheckCircle2, ChevronRight, RefreshCw, QrCode
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { 
  SYSTEM_WALLETS, 
  FiatCurrency, 
  FIAT_RATES, 
  TRANSACTION_STATUS, 
  TRANSACTION_TYPES,
  USDT_PACKAGES,
  calculateUsdtFiatPrice
} from '../constants';
import { formatFiat, copyTextToClipboard } from '../lib/utils';
import { notifyDealPending } from '../lib/notifications';

interface BuyUSDTProps {
  initialAmount?: number;
  initialCurrency?: FiatCurrency;
  onBack: () => void;
  onSuccess: (orderId: string) => void;
  onGoToStore: () => void;
  onGoToSupport?: () => void;
}

export const BuyUSDT: React.FC<BuyUSDTProps> = ({
  initialAmount = 1000,
  initialCurrency = 'USD',
  onBack,
  onSuccess,
  onGoToStore,
  onGoToSupport
}) => {
  const { user, profile } = useAuth();
  
  // Steps: 1 = Configure Order, 2 = Send Payment, 3 = Verification Waiting
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currency, setCurrency] = useState<FiatCurrency>(initialCurrency);
  const [usdtAmount, setUsdtAmount] = useState<number>(initialAmount);
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  
  // Real-time rates from Firestore admin configuration
  const [rates, setRates] = useState<Record<FiatCurrency, number>>({
    USD: FIAT_RATES.USD.rateToUsd,
    EUR: FIAT_RATES.EUR.rateToUsd,
    GBP: FIAT_RATES.GBP.rateToUsd,
  });

  // Dynamic active wallets from config/wallets (configured by admin)
  const [activeWalletsMap, setActiveWalletsMap] = useState<Record<string, any>>({});

  // Listen to live pricing and active wallets configured by admin
  useEffect(() => {
    const unsubPricing = onSnapshot(doc(db, 'config', 'pricing'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setRates({
          USD: Number(d.usdRate) || FIAT_RATES.USD.rateToUsd,
          EUR: Number(d.eurRate) || FIAT_RATES.EUR.rateToUsd,
          GBP: Number(d.gbpRate) || FIAT_RATES.GBP.rateToUsd,
        });
      }
    }, (err) => console.warn("Pricing config sync notice:", err));

    const unsubWallets = onSnapshot(doc(db, 'config', 'wallets'), (snap) => {
      if (snap.exists()) {
        setActiveWalletsMap(snap.data());
      }
    }, (err) => console.warn("Wallets config sync notice:", err));

    return () => {
      unsubPricing();
      unsubWallets();
    };
  }, []);
  
  // Payment network selection (USDT TRC20, BTC, ETH)
  const [paymentAsset, setPaymentAsset] = useState<'USDT_TRC20' | 'BTC' | 'ETH'>('USDT_TRC20');
  
  // User submitted proof
  const [txHash, setTxHash] = useState<string>('');
  const [senderNameOrNote, setSenderNameOrNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Tracking created order
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>(TRANSACTION_STATUS.AWAITING_PAYMENT);
  const [orderReleaseTx, setOrderReleaseTx] = useState<string | null>(null);

  // Get dynamic wallet or fallback to system default
  const fallbackWallet = SYSTEM_WALLETS[paymentAsset];
  const dynamicWallet = activeWalletsMap[paymentAsset];
  const selectedWallet = {
    name: dynamicWallet?.name || fallbackWallet.name,
    symbol: dynamicWallet?.symbol || fallbackWallet.symbol,
    network: dynamicWallet?.network || fallbackWallet.network,
    address: dynamicWallet?.address || fallbackWallet.address,
    memo: dynamicWallet?.memo || '',
    explorer: dynamicWallet?.explorer || fallbackWallet.explorer || 'https://tronscan.org/#/transaction/'
  };

  // Real converted fiat price for the entered or selected USDT amount
  const fiatTotal = calculateUsdtFiatPrice(usdtAmount, currency, rates);

  // Real-time listener when an order is created and in Step 3
  useEffect(() => {
    if (!activeOrderId) return;

    const unsub = onSnapshot(doc(db, 'transactions', activeOrderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOrderStatus(data.status);
        if (data.releaseTxHash) {
          setOrderReleaseTx(data.releaseTxHash);
        }
      }
    }, (err) => {
      console.error("Order status listener error:", err);
    });

    return () => unsub();
  }, [activeOrderId]);

  const handleCopy = async (text: string) => {
    await copyTextToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateOrder = () => {
    if (profile?.suspended) {
      setError('Your account is currently suspended due to security verification. Please contact official support.');
      return;
    }
    if (!destinationAddress.trim()) {
      setError('Please provide your destination USDT (TRC-20) address to receive your tokens.');
      return;
    }
    if (destinationAddress.trim().length < 24) {
      setError('Please enter a valid wallet destination address.');
      return;
    }
    if (usdtAmount < 10) {
      setError('Minimum purchase amount is 10 USDT.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmitPaymentProof = async () => {
    if (!txHash.trim()) {
      setError('Please paste your Transaction Hash (TXID) or transfer reference as proof of payment.');
      return;
    }
    if (!user) {
      setError('You must be signed in to complete this order.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const orderData = {
        userId: user.uid,
        username: profile?.username || user.email?.split('@')[0] || 'Trader',
        userEmail: user.email,
        type: TRANSACTION_TYPES.BUY_USDT,
        assetName: 'USDT (Tether)',
        paymentAssetKey: paymentAsset,
        paymentAssetLabel: selectedWallet.name,
        systemAddress: selectedWallet.address,
        network: selectedWallet.network,
        usdtAmount: Number(usdtAmount),
        fiatAmount: Number(fiatTotal.toFixed(2)),
        fiatCurrency: currency,
        destinationAddress: destinationAddress.trim(),
        userTxHash: txHash.trim(),
        senderNote: senderNameOrNote.trim(),
        status: TRANSACTION_STATUS.PENDING,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'transactions'), orderData);
      setActiveOrderId(docRef.id);
      setOrderStatus(TRANSACTION_STATUS.PENDING);
      setStep(3);

      // Trigger deal pending notification
      notifyDealPending(
        user.uid,
        docRef.id,
        Number(usdtAmount),
        Number(fiatTotal.toFixed(2)),
        currency
      );

      onSuccess(docRef.id);
    } catch (err: any) {
      console.error("Error creating buy order:", err);
      setError(err.message || 'Failed to submit payment proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-secondary flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-secondary relative flex flex-col pb-12">
        {/* Header */}
        <header className="px-5 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-secondary/90 backdrop-blur-md z-40 border-b border-black/5">
          <button 
            onClick={step === 3 ? onGoToStore : onBack} 
            className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary border border-black/5 hover:bg-black/5 transition-all"
            id="back-buy-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <h3 className="text-base font-bold text-[#1A1A1A]">
              {step === 1 ? 'Buy USDT' : step === 2 ? 'Send Payment' : 'Verification Status'}
            </h3>
            <p className="text-[10px] text-primary/40 font-bold uppercase tracking-wider">
              Step {step} of 3
            </p>
          </div>
          <div className="w-10 flex justify-end">
            {step === 1 && (
              <div className="flex bg-white p-1 rounded-xl border border-black/5 shadow-xs">
                {(['USD', 'EUR', 'GBP'] as FiatCurrency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                      currency === c ? 'bg-primary text-white shadow-xs' : 'text-primary/40 hover:text-primary'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-5 pt-4 pb-12">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-4 p-3.5 bg-red-50 text-red-600 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-red-100"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 1: CONFIGURE AMOUNT & DESTINATION */}
            {step === 1 && (
              <motion.div 
                key="step-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {/* Cost Banner */}
                <div className="p-6 bg-primary text-white rounded-[32px] shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 font-mono text-9xl font-black select-none pointer-events-none">
                    $
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent">Real-Time Quote</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <h1 className="text-4xl font-display font-bold tracking-tight">
                      {formatFiat(fiatTotal, currency)}
                    </h1>
                    <span className="text-white/60 text-xs font-bold uppercase">{currency}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/70">
                    You receive: <strong className="text-white">{usdtAmount.toLocaleString()} USDT</strong> (TRC-20)
                  </p>
                </div>

                {/* Amount Selection */}
                <div className="bg-white p-5 rounded-[28px] border border-black/5 shadow-xs space-y-3">
                  <label className="text-[11px] font-bold text-primary/60 uppercase tracking-wider block">
                    Select or Enter USDT Amount
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {USDT_PACKAGES.map((pkg) => {
                      const isSelected = usdtAmount === pkg.amount;
                      const pkgPrice = calculateUsdtFiatPrice(pkg.amount, currency, rates);

                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setUsdtAmount(pkg.amount)}
                          className={`py-2.5 px-3 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                            isSelected 
                              ? 'bg-primary text-white border-primary shadow-sm scale-101' 
                              : 'bg-secondary text-primary/70 border-black/5 hover:border-accent/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold font-mono">
                              {pkg.amount.toLocaleString()} USDT
                            </span>
                            {pkg.popular && (
                              <span className={`text-[8px] font-extrabold uppercase px-1 rounded-sm ${
                                isSelected ? 'bg-accent text-white' : 'bg-accent/15 text-accent'
                              }`}>
                                Pop
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-semibold mt-0.5 ${
                            isSelected ? 'text-white/80' : 'text-primary/50'
                          }`}>
                            {formatFiat(pkgPrice, currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-3 border-t border-black/5">
                    <label className="text-[10px] text-primary/40 font-bold uppercase tracking-wider block mb-1.5">
                      Custom USDT Amount
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="10"
                        value={usdtAmount}
                        onChange={(e) => setUsdtAmount(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-secondary border border-black/5 rounded-2xl py-3 px-4 text-sm font-bold text-primary focus:outline-none focus:border-accent"
                        placeholder="e.g. 750"
                      />
                      <span className="absolute right-4 text-xs font-bold text-primary/40">USDT</span>
                    </div>
                  </div>
                </div>

                {/* Destination Wallet */}
                <div className="bg-white p-5 rounded-[28px] border border-black/5 shadow-xs space-y-3">
                  <label className="text-[11px] font-bold text-primary/60 uppercase tracking-wider block">
                    Your Destination Wallet Address
                  </label>
                  <p className="text-[11px] text-primary/50 leading-relaxed">
                    Enter the external TRC-20 wallet address where your USDT will be sent after admin release.
                  </p>
                  <input
                    type="text"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    placeholder="e.g. T..."
                    className="w-full bg-secondary border border-black/5 rounded-2xl py-3.5 px-4 text-xs font-mono font-medium text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateOrder}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 rounded-2xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2"
                  id="proceed-to-payment-btn"
                >
                  <span>Proceed to Payment</span>
                  <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {/* STEP 2: SEND PAYMENT TO SYSTEM WALLET */}
            {step === 2 && (
              <motion.div 
                key="step-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {/* Order Summary Pill */}
                <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-xs flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-primary/40 font-bold uppercase tracking-wider block">Total Payable</span>
                    <span className="text-xl font-display font-bold text-primary">{formatFiat(fiatTotal, currency)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-primary/40 font-bold uppercase tracking-wider block">Delivery</span>
                    <span className="text-sm font-bold text-accent">{usdtAmount.toLocaleString()} USDT</span>
                  </div>
                </div>

                {/* Payment Network Selection */}
                <div className="bg-white p-5 rounded-[28px] border border-black/5 shadow-xs space-y-3">
                  <label className="text-[11px] font-bold text-primary/60 uppercase tracking-wider block">
                    Choose System Receiving Wallet
                  </label>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'USDT_TRC20', label: 'USDT (TRC-20)' },
                      { key: 'BTC', label: 'Bitcoin' },
                      { key: 'ETH', label: 'Ethereum' }
                    ].map((w) => (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setPaymentAsset(w.key as any)}
                        className={`py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all border text-center ${
                          paymentAsset === w.key 
                            ? 'bg-primary text-white border-primary shadow-sm' 
                            : 'bg-secondary text-primary/70 border-black/5 hover:border-accent/40'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>

                  {/* Wallet Display Box */}
                  <div className="mt-3 p-4 bg-secondary rounded-2xl border border-black/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-primary/50 font-bold uppercase tracking-wider">
                        Official {selectedWallet.network} Address
                      </span>
                      <span className="text-[9px] px-2 py-0.5 bg-green-50 text-green-700 font-bold rounded-full border border-green-100">
                        Verified
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-black/5 font-mono text-xs text-primary font-bold break-all select-all leading-relaxed">
                      {selectedWallet.address}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(selectedWallet.address)}
                      className="w-full py-2.5 bg-white hover:bg-black/5 text-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-black/5 shadow-xs transition-all"
                      id="copy-system-wallet-btn"
                    >
                      {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied to Clipboard!' : 'Copy Wallet Address'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 text-amber-800 text-[11px] leading-snug">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>Send only <strong>{selectedWallet.symbol} ({selectedWallet.network})</strong> to this address. Sending any other asset will result in loss.</span>
                  </div>
                </div>

                {/* Proof of Payment */}
                <div className="bg-white p-5 rounded-[28px] border border-black/5 shadow-xs space-y-3">
                  <label className="text-[11px] font-bold text-primary/60 uppercase tracking-wider block">
                    Submit Payment Proof (TXID)
                  </label>
                  <p className="text-[11px] text-primary/50 leading-relaxed">
                    Paste the Transaction Hash (TXID) or transfer reference provided by your wallet or exchange.
                  </p>

                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste Transaction Hash (TXID)..."
                    className="w-full bg-secondary border border-black/5 rounded-2xl py-3 px-4 text-xs font-mono text-primary focus:outline-none focus:border-accent"
                  />

                  <input
                    type="text"
                    value={senderNameOrNote}
                    onChange={(e) => setSenderNameOrNote(e.target.value)}
                    placeholder="Sender wallet or transfer note (optional)"
                    className="w-full bg-secondary border border-black/5 rounded-2xl py-2.5 px-4 text-xs text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-4 px-5 bg-white border border-black/5 rounded-2xl text-xs font-bold text-primary/60 hover:text-primary transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitPaymentProof}
                    className="flex-1 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2"
                    id="confirm-payment-proof-btn"
                  >
                    {submitting ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    <span>{submitting ? 'Submitting...' : 'I Have Made Payment'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: VERIFICATION WAITING / SUCCESS / NOTIFICATION */}
            {step === 3 && (
              <motion.div 
                key="step-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 text-center"
              >
                {/* Status Indicator Card */}
                <div className="bg-white p-7 rounded-[32px] border border-black/5 shadow-sm space-y-4">
                  {orderStatus === TRANSACTION_STATUS.PAID ? (
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 size={36} />
                    </div>
                  ) : orderStatus === TRANSACTION_STATUS.FAILED ? (
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <AlertCircle size={36} />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner relative">
                      <Clock size={36} className="animate-pulse" />
                    </div>
                  )}

                  <div>
                    <h2 className="text-xl font-bold text-primary">
                      {orderStatus === TRANSACTION_STATUS.PAID 
                        ? 'Payment Verified & Released!' 
                        : orderStatus === TRANSACTION_STATUS.FAILED 
                        ? 'Payment Verification Rejected' 
                        : 'Waiting for Admin Verification'}
                    </h2>
                    <p className="text-xs text-primary/60 mt-1.5 leading-relaxed">
                      {orderStatus === TRANSACTION_STATUS.PAID
                        ? `Your ${usdtAmount.toLocaleString()} USDT has been verified and released to your destination wallet and Crypto Store!`
                        : orderStatus === TRANSACTION_STATUS.FAILED
                        ? 'The administrator was unable to confirm this transaction. Please verify your TXID or contact support.'
                        : 'Thanks for your purchase! Please wait a few minutes while our verification team confirms your transaction.'}
                    </p>
                  </div>

                  {orderStatus !== TRANSACTION_STATUS.PAID && orderStatus !== TRANSACTION_STATUS.FAILED && (
                    <div className="p-3.5 bg-secondary rounded-2xl border border-black/5 flex items-center justify-center gap-2 text-xs font-bold text-primary/60">
                      <RefreshCw size={14} className="animate-spin text-accent" />
                      <span>Live status updates automatically...</span>
                    </div>
                  )}
                </div>

                {/* Order Details Breakdown */}
                <div className="bg-white p-5 rounded-[28px] border border-black/5 shadow-xs space-y-3 text-left">
                  <span className="text-[10px] text-primary/40 font-bold uppercase tracking-wider block">
                    Order Information
                  </span>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-black/5">
                      <span className="text-primary/60">Purchased:</span>
                      <strong className="text-primary">{usdtAmount.toLocaleString()} USDT</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-black/5">
                      <span className="text-primary/60">Paid:</span>
                      <strong className="text-primary">{formatFiat(fiatTotal, currency)} ({currency})</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-black/5">
                      <span className="text-primary/60">Payment Network:</span>
                      <span className="font-bold text-primary">{selectedWallet.name}</span>
                    </div>
                    <div className="py-1">
                      <span className="text-primary/60 block mb-0.5">Your Destination Address:</span>
                      <p className="font-mono text-[11px] text-primary/80 break-all bg-secondary p-2 rounded-xl">
                        {destinationAddress}
                      </p>
                    </div>
                    {orderReleaseTx && (
                      <div className="py-1">
                        <span className="text-accent font-bold block mb-0.5">Release TXID:</span>
                        <a 
                          href={`${selectedWallet.explorer}${orderReleaseTx}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] text-blue-600 underline break-all flex items-center gap-1"
                        >
                          {orderReleaseTx}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={onGoToStore}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                    id="view-crypto-store-btn"
                  >
                    <span>View My Crypto Store</span>
                    <ChevronRight size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={onBack}
                    className="w-full py-3 text-xs font-bold text-primary/60 hover:text-primary transition-all"
                  >
                    Back to Home
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
