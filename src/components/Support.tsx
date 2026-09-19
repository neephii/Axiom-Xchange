import React from 'react';
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  ShieldCheck, 
  HelpCircle, 
  ExternalLink, 
  Clock, 
  Sparkles,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { SUPPORT_CONFIG } from '../constants';
import { cn } from '../lib/utils';

interface SupportProps {
  onBack: () => void;
  onGoToBuy?: () => void;
}

export const Support: React.FC<SupportProps> = ({ onBack, onGoToBuy }) => {

  const APP_TIPS = [
    {
      title: "1. TRC-20 Network Accuracy",
      desc: "When buying USDT, ensure your destination address starts with 'T' (Tron TRC-20). Cross-chain transfers to other networks cannot be processed.",
      icon: ShieldCheck,
      color: "text-emerald-700 bg-emerald-50 border-emerald-100"
    },
    {
      title: "2. Submit Your Payment TXID",
      desc: "After transferring funds to our official wallet, copy the transaction hash (TXID) from your wallet/exchange and paste it on the confirmation page.",
      icon: CheckCircle2,
      color: "text-blue-700 bg-blue-50 border-blue-100"
    },
    {
      title: "3. Fast Verification Window",
      desc: "Once payment proof is submitted, our automated desk verifies the on-chain confirmation within 5 to 15 minutes and releases your USDT directly.",
      icon: Clock,
      color: "text-amber-700 bg-amber-50 border-amber-100"
    },
    {
      title: "4. Access Your Crypto Store",
      desc: "All confirmed orders appear in your 'Crypto Store' tab with transparent blockchain explorer receipt links and live portfolio valuation.",
      icon: Sparkles,
      color: "text-purple-700 bg-purple-50 border-purple-100"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-secondary flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-secondary relative flex flex-col pb-12">
        {/* Top Header */}
        <header className="px-5 pt-6 pb-4 flex items-center justify-between bg-secondary/90 backdrop-blur-md sticky top-0 z-40 border-b border-black/5">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-primary/70 hover:text-primary transition-colors bg-white shadow-xs border border-black/5"
              aria-label="Go Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-primary leading-tight">Help & Support</h1>
              <p className="text-[10px] text-accent font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Verified Customer Assistance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Desk Online</span>
          </div>
        </header>

        <main className="flex-1 px-5 pt-4 pb-8 space-y-5">
          {/* Trust Banner */}
          <div className="bg-gradient-to-br from-[#003D29] to-[#026C4A] rounded-3xl p-5 text-white shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Official Helpdesk</span>
              </div>
              <h2 className="text-xl font-display font-bold leading-snug">
                We're Here to Help You Trade Securely
              </h2>
              <p className="text-xs text-white/75 leading-relaxed">
                Review the quick tips below to learn how the platform works, or contact our dedicated support team directly using either of our two official channels.
              </p>
            </div>
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-accent/20 rounded-full blur-2xl"></div>
          </div>

          {/* Quick Platform Tips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle size={14} className="text-accent" />
                <span>Tips on How to Use the App</span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {APP_TIPS.map((tip, idx) => (
                <div 
                  key={idx}
                  className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs flex items-start gap-3"
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border", tip.color)}>
                    <tip.icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary mb-1">{tip.title}</h4>
                    <p className="text-[11px] text-primary/60 leading-relaxed font-medium">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Support Options */}
          <div className="space-y-3 pt-1">
            <div className="px-1">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Two Official Support Channels
              </h3>
              <p className="text-[11px] text-primary/40 font-medium">
                Choose either option to speak with our support personnel.
              </p>
            </div>

            {/* Support Option 1: Official Email */}
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Mail size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-accent uppercase tracking-wider block">Option 1</span>
                    <h4 className="text-xs font-bold text-primary">Official Email Support</h4>
                    <p className="text-[11px] text-primary/50 font-medium">Direct Inquiries & Order Verification</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-primary/40 bg-secondary px-2 py-0.5 rounded-full">
                  &lt; 15 mins
                </span>
              </div>

              <a
                href={`mailto:${SUPPORT_CONFIG.email}?subject=Axiom%20Xchange%20Support%20Inquiry`}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
              >
                <Mail size={15} />
                <span>Send Email</span>
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Support Option 2: Direct Phone & WhatsApp */}
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Phone size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-accent uppercase tracking-wider block">Option 2</span>
                    <h4 className="text-xs font-bold text-primary">Instant Messaging & Hotline</h4>
                    <p className="text-[11px] text-primary/50 font-medium">Direct Live Desk</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Instant
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={SUPPORT_CONFIG.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98"
                >
                  <MessageCircle size={15} fill="currentColor" />
                  <span>WhatsApp Chat</span>
                </a>

                <a
                  href={`tel:${SUPPORT_CONFIG.phoneRaw}`}
                  className="bg-primary hover:bg-primary/90 text-white py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98"
                >
                  <Phone size={15} />
                  <span>Call Direct</span>
                </a>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <AlertTriangle size={15} />
              <span>Official Verification Alert</span>
            </div>
            <p className="text-[11px] text-amber-800/80 leading-relaxed font-medium">
              We will never ask for your private recovery keys, passwords, or personal credentials. Only transact using the wallet addresses shown directly inside this application.
            </p>
          </div>

          {/* Action to Buy or Return */}
          <div className="pt-2">
            <button
              onClick={onBack}
              className="w-full py-3.5 bg-white border border-black/5 rounded-2xl text-xs font-bold text-primary shadow-xs hover:border-black/10 transition-all text-center block"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
