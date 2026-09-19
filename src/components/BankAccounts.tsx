import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Plus, 
  Building2, 
  Trash2, 
  CheckCircle2, 
  Info,
  CreditCard,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { NIGERIAN_BANKS } from '../constants';
import { cn } from '../lib/utils';

export const BankAccounts: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [banks, setBanks] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);

  // Form State
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'bank_accounts'));
    const unsub = onSnapshot(q, (snapshot) => {
      setBanks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.warn("Bank accounts fetch notice:", err));
    return () => unsub();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'bank_accounts'), {
        accountName,
        accountNumber,
        bankName,
        bankCode,
        isDefault: banks.length === 0,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteBank = async () => {
    if (!user || !deleteBankId) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'bank_accounts', deleteBankId));
      setDeleteBankId(null);
    } catch (err) {
      console.error("Error deleting bank account:", err);
    }
  };

  const resetForm = () => {
    setAccountNumber('');
    setAccountName('');
    setBankName('');
    setBankCode('');
  };

  return (
    <div className="min-h-screen bg-secondary p-6">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm text-primary">
          <ChevronLeft />
        </button>
        <h1 className="text-2xl font-display font-bold">Bank Accounts</h1>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white border border-black/5 p-4 rounded-2xl flex items-start gap-4">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
            <Info size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-primary font-bold">Payout Information</p>
            <p className="text-[10px] text-primary/60 leading-relaxed mt-1">
              Ensure your account name matches your verified identity. Mismatched accounts may cause payout delays.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {banks.map((bank) => (
            <div key={bank.id} className="card-premium flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-primary/40">
                  <Building2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary">{bank.accountName}</h4>
                  <p className="text-xs text-primary/40 leading-none">{bank.bankName} • {bank.accountNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setDeleteBankId(bank.id)}
                className="p-2 text-red-500 opacity-80 hover:opacity-100 transition-opacity"
                title="Delete account"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {banks.length === 0 && (
            <div className="text-center py-10 opacity-40">
              <CreditCard size={48} className="mx-auto mb-4" />
              <p className="text-sm font-bold">No accounts added yet</p>
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowAdd(true)}
          className="w-full py-5 border-2 border-dashed border-primary/10 rounded-3xl text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary/5 transition-all"
        >
          <Plus size={20} />
          Add New Account
        </button>
      </div>

      {/* Add Bank Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-sm bg-white rounded-t-[32px] md:rounded-[32px] p-8 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Add Bank Account</h2>
                <button onClick={() => setShowAdd(false)}><X /></button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest pl-1">Bank Name</label>
                  <select 
                    required
                    value={bankCode}
                    onChange={(e) => {
                      setBankCode(e.target.value);
                      const bank = NIGERIAN_BANKS.find(b => b.code === e.target.value);
                      if (bank) setBankName(bank.name);
                    }}
                    className="w-full bg-secondary border border-black/5 rounded-2xl p-4 outline-none focus:ring-1 ring-accent"
                  >
                    <option value="">Select Bank</option>
                    {NIGERIAN_BANKS.map(b => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest pl-1">Account Number</label>
                  <input 
                    required
                    type="text"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-secondary border border-black/5 rounded-2xl p-4 outline-none focus:ring-1 ring-accent"
                    placeholder="0123456789"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest pl-1">Account Name</label>
                  <input 
                    required
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full bg-secondary border border-black/5 rounded-2xl p-4 outline-none focus:ring-1 ring-accent"
                    placeholder="Enter Account Name"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading || !bankCode || !accountNumber || !accountName}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-bold mt-4 shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Save Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteBankId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteBankId(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center z-10"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 mx-auto flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Remove Bank Account?</h3>
                <p className="text-xs text-primary/60 mt-1">This bank account will be deleted from your saved payout methods.</p>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setDeleteBankId(null)}
                  className="flex-1 py-3 bg-secondary rounded-xl text-xs font-bold text-primary hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteBank}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-bold text-white transition-colors shadow-md shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
