/**
 * Axiom Xchange System Constants
 */

export const SYSTEM_WALLETS = {
  USDT_TRC20: {
    name: "USDT (TRC-20)",
    network: "TRC20 (Tron)",
    symbol: "USDT",
    address: "TSno4GkuyLh9va5x2L8cp9af1kXEx8Cb6m",
    memoRequired: false,
    explorer: "https://tronscan.org/#/transaction/"
  },
  BTC: {
    name: "Bitcoin (BTC)",
    network: "Bitcoin Network",
    symbol: "BTC",
    address: "bc1qfyxctk0k3vz0v83elvd4yj5lvzsvczxadlff3v",
    memoRequired: false,
    explorer: "https://mempool.space/tx/"
  },
  ETH: {
    name: "Ethereum (ETH / ERC-20)",
    network: "Ethereum (ERC-20)",
    symbol: "ETH",
    address: "0xf25C8a6dB8347aBcFaaf2996dB8D1766907c8AF8",
    memoRequired: false,
    explorer: "https://etherscan.io/tx/"
  }
};

export type FiatCurrency = 'USD' | 'EUR' | 'GBP';

export interface CryptoPriceItem {
  id: string;
  name: string;
  symbol: string;
  network: string;
  priceUsd: number;
  priceEur?: number;
  priceGbp?: number;
  change24h?: number;
  isActive: boolean;
  minAmount?: number;
  unit?: string;
  updatedAt?: string;
}

export const DEFAULT_CRYPTO_PRICES: CryptoPriceItem[] = [
  {
    id: 'usdt-trc20',
    name: 'Tether USDT (TRC-20)',
    symbol: 'USDT',
    network: 'TRC20 (Tron)',
    priceUsd: 1.00,
    priceEur: 0.92,
    priceGbp: 0.78,
    change24h: 0.02,
    isActive: true,
    minAmount: 10
  },
  {
    id: 'btc',
    name: 'Bitcoin (BTC)',
    symbol: 'BTC',
    network: 'Bitcoin Mainnet',
    priceUsd: 64850.00,
    priceEur: 59662.00,
    priceGbp: 50583.00,
    change24h: 2.85,
    isActive: true,
    minAmount: 50
  },
  {
    id: 'eth',
    name: 'Ethereum (ETH)',
    symbol: 'ETH',
    network: 'Ethereum (ERC-20)',
    priceUsd: 3490.00,
    priceEur: 3210.80,
    priceGbp: 2722.20,
    change24h: 1.75,
    isActive: true,
    minAmount: 30
  },
  {
    id: 'sol',
    name: 'Solana (SOL)',
    symbol: 'SOL',
    network: 'Solana Network',
    priceUsd: 154.20,
    priceEur: 141.86,
    priceGbp: 120.28,
    change24h: 4.60,
    isActive: true,
    minAmount: 20
  },
  {
    id: 'usdt-erc20',
    name: 'Tether USDT (ERC-20)',
    symbol: 'USDT',
    network: 'Ethereum (ERC-20)',
    priceUsd: 1.00,
    priceEur: 0.92,
    priceGbp: 0.78,
    change24h: 0.01,
    isActive: true,
    minAmount: 50
  }
];

export const FIAT_RATES: Record<FiatCurrency, { symbol: string; rateToUsd: number; label: string }> = {
  USD: { symbol: '$', rateToUsd: 1.0, label: 'US Dollar' },
  EUR: { symbol: '€', rateToUsd: 0.92, label: 'Euro' },
  GBP: { symbol: '£', rateToUsd: 0.78, label: 'British Pound' }
};

export const USDT_PACKAGES = [
  { id: 'usdt-1000', amount: 1000, priceUsd: 100, label: 'Starter Tier', popular: false },
  { id: 'usdt-5000', amount: 5000, priceUsd: 505, label: 'Standard Tier', popular: true },
  { id: 'usdt-10000', amount: 10000, priceUsd: 1100, label: 'Pro Tier', popular: false },
  { id: 'usdt-50000', amount: 50000, priceUsd: 5000, label: 'Enterprise Tier', popular: false },
  { id: 'usdt-150000', amount: 150000, priceUsd: 10000, label: 'Whale Tier', popular: false }
];

/**
 * Calculates the exact price for a given USDT amount based on the official pricing tiers:
 * $100 -> 1,000 USDT ($0.1000 / USDT)
 * $505 -> 5,000 USDT ($0.1010 / USDT)
 * $1,100 -> 10,000 USDT ($0.1100 / USDT)
 * $5,000 -> 50,000 USDT ($0.1000 / USDT)
 * $10,000 -> 150,000 USDT (~$0.0667 / USDT)
 */
export function calculateUsdtPriceInUsd(usdtAmount: number): number {
  if (usdtAmount <= 0) return 0;
  
  // Exact tier match check
  const exactTier = USDT_PACKAGES.find(p => p.amount === usdtAmount);
  if (exactTier) return exactTier.priceUsd;

  // Tiered calculation for custom amounts
  if (usdtAmount <= 1000) {
    return Number(((usdtAmount / 1000) * 100).toFixed(2));
  } else if (usdtAmount <= 5000) {
    const fraction = (usdtAmount - 1000) / (5000 - 1000);
    return Number((100 + fraction * (505 - 100)).toFixed(2));
  } else if (usdtAmount <= 10000) {
    const fraction = (usdtAmount - 5000) / (10000 - 5000);
    return Number((505 + fraction * (1100 - 505)).toFixed(2));
  } else if (usdtAmount <= 50000) {
    const fraction = (usdtAmount - 10000) / (50000 - 10000);
    return Number((1100 + fraction * (5000 - 1100)).toFixed(2));
  } else if (usdtAmount <= 150000) {
    const fraction = (usdtAmount - 50000) / (150000 - 50000);
    return Number((5000 + fraction * (10000 - 5000)).toFixed(2));
  } else {
    // Over 150,000 USDT: keep the best tier unit rate ($10,000 / 150,000 USDT = $0.06667/USDT)
    const ratePerUsdt = 10000 / 150000;
    return Number((usdtAmount * ratePerUsdt).toFixed(2));
  }
}

/**
 * Calculates the fiat price (USD, EUR, GBP) for a given USDT amount using dynamic fiat ratios
 */
export function calculateUsdtFiatPrice(
  usdtAmount: number, 
  currency: FiatCurrency, 
  fiatRates: { USD: number; EUR: number; GBP: number }
): number {
  const priceUsd = calculateUsdtPriceInUsd(usdtAmount);
  const usdRate = fiatRates.USD || 1.0;
  const targetRate = fiatRates[currency] || (currency === 'EUR' ? 0.92 : currency === 'GBP' ? 0.78 : 1.0);
  
  // Convert from USD to target fiat currency using the real ratio
  const converted = priceUsd * (targetRate / (usdRate || 1.0));
  return Number(converted.toFixed(2));
}

export const SUPPORT_CONFIG = {
  email: "neephi8@gmail.com",
  phone: "+234 912 661 9921",
  phoneRaw: "+2349126619921",
  whatsappUrl: "https://wa.me/2349126619921",
  businessHours: "24/7 Priority Support",
  averageResponseTime: "< 5 minutes"
};

export const SETTLEMENT_ACCOUNT = {
  accountNumber: "1963718221",
  bankName: "Access Bank",
  accountName: "Jesse Anietimfon Nicholas",
  description: "Official settlement account."
};


export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  AWAITING_PAYMENT: 'awaiting_payment',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed'
};

export const TRANSACTION_TYPES = {
  BUY_USDT: 'buy_usdt',
  SELL_CRYPTO: 'sell_crypto',
  SELL_GIFTCARD: 'sell_giftcard',
  BUY_CRYPTO: 'buy_crypto',
  BUY_GIFTCARD: 'buy_giftcard',
  WITHDRAWAL: 'withdrawal',
  DEPOSIT: 'deposit'
};

export const RATE_LOCK_TIME = 15 * 60; // 15 minutes in seconds

export const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Access Bank (Diamond)", code: "063" },
  { name: "ALAT by WEMA", code: "035A" },
  { name: "ASO Savings and Loans", code: "401" },
  { name: "Bowen Microfinance Bank", code: "50931" },
  { name: "Carbon", code: "565" },
  { name: "CEMCS Microfinance Bank", code: "50823" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Ekondo Microfinance Bank", code: "562" },
  { name: "Eyowo", code: "50126" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank", code: "214" },
  { name: "Globus Bank", code: "00103" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Hasal Microfinance Bank", code: "50383" },
  { name: "Heritage Bank", code: "030" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Lagos Building Investment Company PLC", code: "090271" },
  { name: "Mayfair Microfinance Bank", code: "50563" },
  { name: "Mint MFB", code: "50304" },
  { name: "Opay", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Parallex Bank", code: "526" },
  { name: "Parkway - ReadyCash", code: "311" },
  { name: "Paycom", code: "305" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Rubies MFB", code: "125" },
  { name: "Sparkle Microfinance Bank", code: "51310" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered Bank", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "Suntrust Bank", code: "100" },
  { name: "TAJ Bank", code: "302" },
  { name: "TCF MFB", code: "51211" },
  { name: "Titan Bank", code: "102" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank For Africa", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "VFD Microfinance Bank Limited", code: "566" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" }
];
