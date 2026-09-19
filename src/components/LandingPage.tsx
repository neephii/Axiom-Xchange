import React from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Smartphone,
  Facebook,
  Instagram,
  Twitter,
  Coins,
  ArrowRightLeft,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';

export const LandingPage: React.FC<{ onStart: (mode: 'login' | 'signup') => void }> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-secondary overflow-hidden">
      {/* Header */}
      <header className="px-6 py-6 flex justify-between items-center max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-display font-bold text-xl">A</span>
          </div>
          <span className="font-display font-bold text-xl text-primary">Axiom <span className="text-accent">Xchange</span></span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 pt-6 pb-20 max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-5xl md:text-7xl mb-4 leading-[1.1]">
              Buy your <span className="text-accent bg-accent/20 px-4 py-1 rounded-3xl inline-block -rotate-1">Crypto</span> at the best rates.
            </h1>
            <p className="text-lg text-primary/60 max-w-lg mx-auto md:mx-0">
              Secure, instant, and reliable USDT & cryptocurrency exchange platform designed for high speed and accuracy.
            </p>
          </div>

          {/* Dual Animated Crypto Images Showcase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            <motion.div 
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, 1.2, 0]
              }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
              className="relative rounded-3xl overflow-hidden shadow-xl bg-primary aspect-[4/3] group border border-black/5"
            >
              <img 
                src="https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=700&q=80" 
                alt="Digital Crypto Assets" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5">
                <span className="text-[10px] uppercase font-bold text-accent tracking-widest">Multi-Asset Trading</span>
                <p className="text-white font-bold text-base">USDT & Cryptocurrencies</p>
                <p className="text-white/70 text-xs mt-0.5">Automated multi-network dispatch & guaranteed rates</p>
              </div>
            </motion.div>

            <motion.div 
              animate={{ 
                y: [0, 8, 0],
                rotate: [0, -1.2, 0]
              }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.4 }}
              className="relative rounded-3xl overflow-hidden shadow-xl bg-primary aspect-[4/3] group border border-black/5"
            >
              <img 
                src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=700&q=80" 
                alt="Decentralized Blockchain Settlement" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">Real-time Settlement</span>
                <p className="text-white font-bold text-base">On-Chain Verification</p>
                <p className="text-white/70 text-xs mt-0.5">Instant transaction confirmation & direct wallet delivery</p>
              </div>
            </motion.div>
          </div>

          {/* Animated App Description Banner */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-black/5 mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Fast • Secure • Automated</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-primary mb-3">
              Next-Generation Crypto Exchange Platform
            </h3>
            <p className="text-sm md:text-base text-primary/70 leading-relaxed mb-6">
              Axiom Xchange is engineered for rapid crypto acquisitions and seamless liquidity settlement. Experience transparent pricing across USD, EUR, and GBP with real-time on-chain confirmation, dynamic receiving wallet management, and automated deal notifications delivered straight to your account.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-black/5">
              <div className="flex flex-col items-center sm:items-start p-3 rounded-2xl bg-secondary/70">
                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center text-accent mb-2">
                  <Coins size={16} />
                </div>
                <p className="text-xs font-bold text-primary">Multi-Chain</p>
                <p className="text-[10px] text-primary/50 text-center sm:text-left">TRC20, ERC20 & BTC</p>
              </div>
              <div className="flex flex-col items-center sm:items-start p-3 rounded-2xl bg-secondary/70">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 mb-2">
                  <ArrowRightLeft size={16} />
                </div>
                <p className="text-xs font-bold text-primary">Instant Confirm</p>
                <p className="text-[10px] text-primary/50 text-center sm:text-left">Live Explorer Feed</p>
              </div>
              <div className="flex flex-col items-center sm:items-start p-3 rounded-2xl bg-secondary/70">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Lock size={16} />
                </div>
                <p className="text-xs font-bold text-primary">Protected</p>
                <p className="text-[10px] text-primary/50 text-center sm:text-left">Zero Slippage Trades</p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={() => onStart('signup')}
              className="w-full bg-primary hover:bg-primary/90 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group transition-all active:scale-98"
            >
              Create an Account
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => onStart('login')}
              className="w-full py-5 rounded-2xl font-bold text-lg text-primary hover:bg-black/5 transition-all active:scale-98"
            >
              Login
            </button>
          </div>
        </motion.div>

        {/* Features */}
        <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, title: "Secure Transactions", desc: "Your assets are protected with industry-leading encryption and verified on-chain." },
            { icon: Zap, title: "Instant Payouts", desc: "Experience lightning-fast verification and automated asset processing." },
            { icon: Smartphone, title: "Mobile Optimized", desc: "Trade on the go with our sleek, high-efficiency mobile design." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="card-premium"
            >
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-accent">
                <feature.icon />
              </div>
              <h3 className="text-xl mb-2 font-bold">{feature.title}</h3>
              <p className="text-primary/60 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-secondary py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">A</span>
                </div>
                <span className="font-display font-bold text-xl">Axiom <span className="text-accent">Xchange</span></span>
              </div>
              <p className="text-secondary/60 text-sm max-w-xs">
                Premier high-speed platform for instant crypto and USDT exchange.
              </p>
            </div>
            <div className="flex gap-6">
              <a href="https://instagram.com/axiomxchange" className="hover:text-accent transition-colors"><Instagram /></a>
              <a href="https://x.com/AxiomXchange" className="hover:text-accent transition-colors"><Twitter /></a>
              <a href="#" className="hover:text-accent transition-colors"><Facebook /></a>
            </div>
          </div>
          <div className="pt-8 border-t border-secondary/10 text-center text-sm text-secondary/40">
            © 2025 Axiom Xchange. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
