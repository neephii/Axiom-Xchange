import React from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';

export const Maintenance: React.FC = () => {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-24 h-24 bg-white/10 rounded-[32px] flex items-center justify-center mb-8 border border-white/10 backdrop-blur-sm"
      >
        <Lock className="text-accent" size={48} />
      </motion.div>
      
      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-white text-4xl font-display font-bold mb-4"
      >
        Portal Temporarily Disabled
      </motion.h1>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white/60 text-lg max-w-md"
      >
        Axiom Xchange is currently undergoing scheduled maintenance or has been disabled. Access to the dashboard and trading features is temporarily unavailable.
      </motion.p>
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 p-1 bg-white/5 rounded-2xl border border-white/5"
      >
        <div className="px-6 py-3 bg-white/5 rounded-xl">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">System Status</p>
          <p className="text-accent font-bold mt-1">OFFLINE</p>
        </div>
      </motion.div>
    </div>
  );
};
