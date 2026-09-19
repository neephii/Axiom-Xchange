import React, { useState } from 'react';
import { 
  DollarSign, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles,
  Radio,
  ArrowUpDown,
  RefreshCw,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CryptoPriceItem, DEFAULT_CRYPTO_PRICES, USDT_PACKAGES, calculateUsdtFiatPrice } from '../../constants';
import { cn, formatFiat } from '../../lib/utils';

interface AdminPricingTabProps {
  cryptoList: CryptoPriceItem[];
  setCryptoList: React.Dispatch<React.SetStateAction<CryptoPriceItem[]>>;
  pricingConfig: {
    usdRate: number;
    eurRate: number;
    gbpRate: number;
    bonusPercent: number;
    note: string;
  };
  setPricingConfig: React.Dispatch<React.SetStateAction<any>>;
  onSave: (customList?: CryptoPriceItem[], customConfig?: any) => Promise<void>;
  isSaving: boolean;
  saveSuccess: boolean;
}

export const AdminPricingTab: React.FC<AdminPricingTabProps> = ({
  cryptoList,
  setCryptoList,
  pricingConfig,
  setPricingConfig,
  onSave,
  isSaving,
  saveSuccess
}) => {
  const [editingCryptoId, setEditingCryptoId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CryptoPriceItem>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCrypto, setNewCrypto] = useState<Partial<CryptoPriceItem>>({
    name: '',
    symbol: '',
    network: 'TRC20 (Tron)',
    priceUsd: 1.0,
    change24h: 0.0,
    isActive: true,
    minAmount: 10
  });

  // Handle inline price change
  const handlePriceChange = (id: string, newPriceUsd: number) => {
    setCryptoList(prev => prev.map(item => {
      if (item.id === id) {
        const eur = Number((newPriceUsd * (pricingConfig.eurRate / pricingConfig.usdRate || 0.92)).toFixed(2));
        const gbp = Number((newPriceUsd * (pricingConfig.gbpRate / pricingConfig.usdRate || 0.78)).toFixed(2));
        return {
          ...item,
          priceUsd: newPriceUsd,
          priceEur: eur,
          priceGbp: gbp,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    }));
  };

  // Toggle active status
  const handleToggleActive = (id: string) => {
    setCryptoList(prev => prev.map(item => 
      item.id === id ? { ...item, isActive: !item.isActive } : item
    ));
  };

  // Delete crypto
  const handleDeleteCrypto = (id: string) => {
    if (cryptoList.length <= 1) {
      alert("At least one cryptocurrency must remain in the price list.");
      return;
    }
    setCryptoList(prev => prev.filter(c => c.id !== id));
  };

  // Open Edit / Replace Modal
  const startEditing = (crypto: CryptoPriceItem) => {
    setEditingCryptoId(crypto.id);
    setEditFormData({ ...crypto });
  };

  // Save Edit / Replace
  const saveEditing = () => {
    if (!editingCryptoId) return;
    setCryptoList(prev => prev.map(item => {
      if (item.id === editingCryptoId) {
        const pUsd = Number(editFormData.priceUsd) || item.priceUsd;
        const pEur = editFormData.priceEur ? Number(editFormData.priceEur) : Number((pUsd * (pricingConfig.eurRate || 0.92)).toFixed(2));
        const pGbp = editFormData.priceGbp ? Number(editFormData.priceGbp) : Number((pUsd * (pricingConfig.gbpRate || 0.78)).toFixed(2));

        return {
          ...item,
          name: editFormData.name?.trim() || item.name,
          symbol: editFormData.symbol?.trim().toUpperCase() || item.symbol,
          network: editFormData.network?.trim() || item.network,
          priceUsd: pUsd,
          priceEur: pEur,
          priceGbp: pGbp,
          change24h: typeof editFormData.change24h === 'number' ? editFormData.change24h : (parseFloat(String(editFormData.change24h)) || 0),
          isActive: editFormData.isActive !== undefined ? editFormData.isActive : item.isActive,
          minAmount: Number(editFormData.minAmount) || item.minAmount || 10,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    }));
    setEditingCryptoId(null);
  };

  // Add new cryptocurrency to list
  const handleAddCrypto = () => {
    if (!newCrypto.name?.trim() || !newCrypto.symbol?.trim()) {
      alert("Please provide both a coin name and symbol.");
      return;
    }

    const id = `${newCrypto.symbol.toLowerCase().trim()}-${Date.now().toString().slice(-4)}`;
    const pUsd = Number(newCrypto.priceUsd) || 1.0;
    const pEur = Number((pUsd * (pricingConfig.eurRate || 0.92)).toFixed(2));
    const pGbp = Number((pUsd * (pricingConfig.gbpRate || 0.78)).toFixed(2));

    const itemToAdd: CryptoPriceItem = {
      id,
      name: newCrypto.name.trim(),
      symbol: newCrypto.symbol.trim().toUpperCase(),
      network: newCrypto.network?.trim() || 'Mainnet',
      priceUsd: pUsd,
      priceEur: pEur,
      priceGbp: pGbp,
      change24h: Number(newCrypto.change24h) || 0,
      isActive: true,
      minAmount: Number(newCrypto.minAmount) || 10,
      updatedAt: new Date().toISOString()
    };

    setCryptoList(prev => [...prev, itemToAdd]);
    setShowAddModal(false);
    setNewCrypto({
      name: '',
      symbol: '',
      network: 'TRC20 (Tron)',
      priceUsd: 1.0,
      change24h: 0.0,
      isActive: true,
      minAmount: 10
    });
  };

  // Reset to default preset
  const handleResetDefaults = () => {
    if (window.confirm("Reset all cryptocurrency prices to system defaults?")) {
      setCryptoList(DEFAULT_CRYPTO_PRICES);
      setPricingConfig({
        usdRate: 1.0,
        eurRate: 0.92,
        gbpRate: 0.78,
        bonusPercent: 0,
        note: 'Default System Rates'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Real-time Status Card */}
      <div className="bg-white p-4.5 rounded-3xl border border-black/5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            <h3 className="text-xs font-bold text-primary">Live Crypto Pricing Engine</h3>
          </div>
          <p className="text-[11px] text-primary/50 font-medium mt-0.5">
            Every price edit saved here updates instantaneously for all active users.
          </p>
        </div>

        {saveSuccess ? (
          <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-xs">
            <Check size={12} />
            <span>Live Broadcasted</span>
          </span>
        ) : (
          <button
            disabled={isSaving}
            onClick={() => onSave()}
            className="px-3.5 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save & Broadcast'}</span>
          </button>
        )}
      </div>

      {/* Fiat Currency Multipliers */}
      <div className="bg-white p-4.5 rounded-3xl border border-black/5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-accent" />
            <h4 className="text-xs font-bold text-primary">Global Currency Multipliers (1 USDT Peg)</h4>
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary/40">FIAT RATIOS</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-secondary p-2.5 rounded-2xl border border-black/5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-primary/40 block mb-1">
              USD ($)
            </label>
            <input 
              type="number" 
              step="0.01"
              value={pricingConfig.usdRate}
              onChange={(e) => setPricingConfig({ ...pricingConfig, usdRate: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white border border-black/5 rounded-xl py-1.5 px-2.5 text-xs font-bold text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="bg-secondary p-2.5 rounded-2xl border border-black/5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-primary/40 block mb-1">
              EUR (€)
            </label>
            <input 
              type="number" 
              step="0.01"
              value={pricingConfig.eurRate}
              onChange={(e) => setPricingConfig({ ...pricingConfig, eurRate: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white border border-black/5 rounded-xl py-1.5 px-2.5 text-xs font-bold text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="bg-secondary p-2.5 rounded-2xl border border-black/5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-primary/40 block mb-1">
              GBP (£)
            </label>
            <input 
              type="number" 
              step="0.01"
              value={pricingConfig.gbpRate}
              onChange={(e) => setPricingConfig({ ...pricingConfig, gbpRate: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white border border-black/5 rounded-xl py-1.5 px-2.5 text-xs font-bold text-primary outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* Official USDT Pricing Tiers Reference & Real-Time Preview */}
      <div className="bg-white p-4.5 rounded-3xl border border-black/5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-accent" />
            <h4 className="text-xs font-bold text-primary">Official USDT System Pricing Tiers</h4>
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            Active System Prices
          </span>
        </div>

        <p className="text-[11px] text-primary/60">
          The main app calculates prices according to these benchmark tiers and converts dynamically to USD, EUR, and GBP:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
          {USDT_PACKAGES.map((tier) => {
            const usdCost = calculateUsdtFiatPrice(tier.amount, 'USD', {
              USD: pricingConfig.usdRate || 1.0,
              EUR: pricingConfig.eurRate || 0.92,
              GBP: pricingConfig.gbpRate || 0.78,
            });
            const eurCost = calculateUsdtFiatPrice(tier.amount, 'EUR', {
              USD: pricingConfig.usdRate || 1.0,
              EUR: pricingConfig.eurRate || 0.92,
              GBP: pricingConfig.gbpRate || 0.78,
            });
            const gbpCost = calculateUsdtFiatPrice(tier.amount, 'GBP', {
              USD: pricingConfig.usdRate || 1.0,
              EUR: pricingConfig.eurRate || 0.92,
              GBP: pricingConfig.gbpRate || 0.78,
            });

            return (
              <div key={tier.id} className="p-3 bg-secondary/70 rounded-2xl border border-black/5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-primary">
                    {tier.amount.toLocaleString()} USDT
                  </span>
                  <span className="text-[9px] font-semibold text-primary/50">
                    Base: ${tier.priceUsd.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-0.5 text-[10px] text-primary/70 font-medium">
                  <div className="flex justify-between">
                    <span>USD:</span>
                    <strong className="text-primary">{formatFiat(usdCost, 'USD')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>EUR:</span>
                    <strong className="text-primary">{formatFiat(eurCost, 'EUR')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>GBP:</span>
                    <strong className="text-primary">{formatFiat(gbpCost, 'GBP')}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cryptocurrency Price List */}
      <div className="bg-white p-4.5 rounded-3xl border border-black/5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-accent" />
              <h4 className="text-xs font-bold text-primary">Cryptocurrency Rates Catalog</h4>
            </div>
            <p className="text-[10px] text-primary/40 font-medium mt-0.5">
              Admin sees all current prices. Edit, replace, or add cryptos below.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs active:scale-95 transition-all"
          >
            <Plus size={12} />
            <span>Add Crypto</span>
          </button>
        </div>

        {/* Crypto Items */}
        <div className="space-y-3">
          {cryptoList.map((crypto) => {
            const isEditingThis = editingCryptoId === crypto.id;

            return (
              <div 
                key={crypto.id}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all space-y-2.5",
                  crypto.isActive 
                    ? "bg-secondary/40 border-black/5 hover:border-black/10" 
                    : "bg-red-50/30 border-red-200/60 opacity-70"
                )}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-black/5 flex items-center justify-center font-bold text-xs text-primary shadow-2xs shrink-0">
                      {crypto.symbol?.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-primary truncate">{crypto.name}</span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-black/5 text-primary/60">
                          {crypto.symbol}
                        </span>
                      </div>
                      <p className="text-[10px] text-primary/40 font-medium truncate">{crypto.network}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleActive(crypto.id)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all",
                        crypto.isActive 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      )}
                      title="Toggle Active/Paused"
                    >
                      {crypto.isActive ? 'Active' : 'Paused'}
                    </button>

                    <button
                      onClick={() => startEditing(crypto)}
                      className="w-7 h-7 bg-white hover:bg-black/5 text-primary/70 rounded-lg border border-black/5 flex items-center justify-center transition-all"
                      title="Edit or Replace this Crypto"
                    >
                      <Edit3 size={12} />
                    </button>

                    <button
                      onClick={() => handleDeleteCrypto(crypto.id)}
                      className="w-7 h-7 bg-white hover:bg-red-50 text-red-500 rounded-lg border border-red-100 flex items-center justify-center transition-all"
                      title="Delete Crypto"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Pricing & Value Grid */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/5">
                  <div>
                    <label className="text-[8px] font-bold uppercase tracking-widest text-primary/40 block mb-0.5">
                      Price (USD)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[10px] font-bold text-primary/40">$</span>
                      <input 
                        type="number"
                        step="any"
                        value={crypto.priceUsd}
                        onChange={(e) => handlePriceChange(crypto.id, parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-black/5 rounded-lg py-1 pl-5 pr-2 text-xs font-bold text-primary outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-bold uppercase tracking-widest text-primary/40 block mb-0.5">
                      Price (EUR)
                    </label>
                    <div className="py-1 px-2 bg-white/70 border border-black/5 rounded-lg text-xs font-bold text-primary/80">
                      €{(crypto.priceEur || crypto.priceUsd * (pricingConfig.eurRate || 0.92)).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-bold uppercase tracking-widest text-primary/40 block mb-0.5">
                      Price (GBP)
                    </label>
                    <div className="py-1 px-2 bg-white/70 border border-black/5 rounded-lg text-xs font-bold text-primary/80">
                      £{(crypto.priceGbp || crypto.priceUsd * (pricingConfig.gbpRate || 0.78)).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-primary/40 font-medium px-0.5">
                  <span>24h Trend: <strong className={cn((crypto.change24h || 0) >= 0 ? "text-green-600" : "text-red-500")}>{(crypto.change24h || 0) >= 0 ? `+${crypto.change24h}%` : `${crypto.change24h}%`}</strong></span>
                  <span>Min Order: ${crypto.minAmount || 10}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Save & Reset Actions */}
        <div className="pt-2 flex gap-2">
          <button
            disabled={isSaving}
            onClick={() => onSave()}
            className="flex-1 bg-accent hover:bg-accent/90 text-white py-3 rounded-2xl text-xs font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Save size={15} />
            <span>{isSaving ? 'Broadcasting Changes...' : 'Save Changes for All Users'}</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="px-4 py-3 bg-secondary text-primary/60 hover:text-primary rounded-2xl text-xs font-bold border border-black/5 flex items-center gap-1 hover:bg-black/5 transition-all"
            title="Reset to default system cryptocurrencies"
          >
            <RotateCcw size={14} />
            <span>Defaults</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: EDIT / REPLACE CRYPTO */}
      <AnimatePresence>
        {editingCryptoId && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[28px] p-5 shadow-2xl border border-black/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-primary">Edit / Replace Crypto</h3>
                  <p className="text-[10px] text-primary/40 font-medium">Modify name, symbol, network or price.</p>
                </div>
                <button 
                  onClick={() => setEditingCryptoId(null)}
                  className="w-7 h-7 rounded-full bg-secondary text-primary/60 flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                    Crypto Name
                  </label>
                  <input 
                    type="text" 
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="e.g. Bitcoin (BTC)"
                    className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                      Symbol
                    </label>
                    <input 
                      type="text" 
                      value={editFormData.symbol || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, symbol: e.target.value.toUpperCase() })}
                      placeholder="e.g. BTC"
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                      Network
                    </label>
                    <input 
                      type="text" 
                      value={editFormData.network || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, network: e.target.value })}
                      placeholder="e.g. TRC20, ERC20"
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                      Price in USD ($)
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      value={editFormData.priceUsd || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, priceUsd: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                      24h Change (%)
                    </label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={editFormData.change24h || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, change24h: parseFloat(e.target.value) || 0 })}
                      placeholder="0.0"
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between bg-secondary p-3 rounded-xl">
                  <span className="text-xs font-bold text-primary">Availability Status</span>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, isActive: !editFormData.isActive })}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                      editFormData.isActive 
                        ? "bg-accent text-white" 
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {editFormData.isActive ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCryptoId(null)}
                  className="flex-1 py-2.5 bg-secondary hover:bg-black/5 text-primary/70 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditing}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  Apply Edits
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD NEW CRYPTO */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[28px] p-5 shadow-2xl border border-black/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-primary">Add New Cryptocurrency</h3>
                  <p className="text-[10px] text-primary/40 font-medium">Add any token with instant live pricing.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="w-7 h-7 rounded-full bg-secondary text-primary/60 flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                    Token Name *
                  </label>
                  <input 
                    type="text" 
                    value={newCrypto.name || ''}
                    onChange={(e) => setNewCrypto({ ...newCrypto, name: e.target.value })}
                    placeholder="e.g. Binance Coin"
                    className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                      Symbol *
                    </label>
                    <input 
                      type="text" 
                      value={newCrypto.symbol || ''}
                      onChange={(e) => setNewCrypto({ ...newCrypto, symbol: e.target.value.toUpperCase() })}
                      placeholder="e.g. BNB"
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                      Network
                    </label>
                    <input 
                      type="text" 
                      value={newCrypto.network || ''}
                      onChange={(e) => setNewCrypto({ ...newCrypto, network: e.target.value })}
                      placeholder="e.g. BSC (BEP-20)"
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                      Initial Price USD ($) *
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      value={newCrypto.priceUsd || 0}
                      onChange={(e) => setNewCrypto({ ...newCrypto, priceUsd: parseFloat(e.target.value) || 0 })}
                      placeholder="1.00"
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary/50 block mb-1">
                      24h Trend (%)
                    </label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={newCrypto.change24h || 0}
                      onChange={(e) => setNewCrypto({ ...newCrypto, change24h: parseFloat(e.target.value) || 0 })}
                      placeholder="0.0"
                      className="w-full bg-secondary border border-black/5 rounded-xl py-2 px-3 text-xs font-bold text-primary outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-secondary hover:bg-black/5 text-primary/70 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCrypto}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  Add to Catalog
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
