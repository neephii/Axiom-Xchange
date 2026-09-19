import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Bell, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShieldAlert, 
  Sparkles, 
  Trash2, 
  CheckCheck, 
  ExternalLink,
  ShoppingBag,
  ArrowRight,
  Headphones,
  Check,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { AppNotification, NotificationType } from '../types';
import { 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../lib/notifications';
import { copyTextToClipboard } from '../lib/utils';

interface NotificationsProps {
  onBack: () => void;
  onNavigateToStore?: () => void;
  onNavigateToSupport?: () => void;
  onNavigateToBuy?: () => void;
}

export const Notifications: React.FC<NotificationsProps> = ({
  onBack,
  onNavigateToStore,
  onNavigateToSupport,
  onNavigateToBuy
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'deals' | 'security' | 'unread'>('all');
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Subscribe to notifications for this user
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });

      // Sort by createdAt descending
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(list);
      setLoading(false);
    }, (err) => {
      console.warn("Notifications listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleCopyTx = async (tx: string) => {
    await copyTextToClipboard(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsAsRead(unreadIds);
    }
  };

  const filteredNotifications = notifications.filter(item => {
    if (filter === 'unread') return !item.read;
    if (filter === 'deals') return ['deal_verified', 'deal_pending', 'deal_rejected'].includes(item.type);
    if (filter === 'security') return ['security', 'system'].includes(item.type);
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'deal_verified':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
            <CheckCircle2 size={20} />
          </div>
        );
      case 'deal_pending':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-xs">
            <Clock size={20} />
          </div>
        );
      case 'deal_rejected':
        return (
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 shadow-xs">
            <XCircle size={20} />
          </div>
        );
      case 'security':
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-xs">
            <ShieldAlert size={20} />
          </div>
        );
      case 'system':
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <Sparkles size={20} />
          </div>
        );
    }
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-secondary pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-30 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-secondary text-primary/70 hover:text-primary transition-colors"
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-display font-bold text-primary">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-accent text-white text-[10px] font-bold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-accent hover:text-accent/80 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-accent/5 transition-all"
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'deals', label: 'Deals & Orders' },
            { id: 'unread', label: unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread' },
            { id: 'security', label: 'System & Security' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filter === tab.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white text-primary/70 border border-black/5 hover:border-black/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-primary/50">Loading your notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-black/5 text-center space-y-3 mt-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-primary/40">
              <Bell size={24} />
            </div>
            <h3 className="text-sm font-bold text-primary">No notifications yet</h3>
            <p className="text-xs text-primary/60 leading-relaxed max-w-xs mx-auto">
              {filter === 'unread' 
                ? "You've read all your notifications!" 
                : "You'll be alerted here whenever your deals are verified, pending, or when new system updates occur."}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-xs font-bold text-accent hover:underline pt-2 block mx-auto"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white rounded-[24px] p-4 border transition-all shadow-xs relative ${
                    !notif.read 
                      ? 'border-accent/30 bg-accent/[0.015]' 
                      : 'border-black/5'
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-accent animate-pulse" />
                  )}

                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notif.type)}

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-primary/40 uppercase tracking-wider">
                          {formatTimestamp(notif.createdAt)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-primary mb-1 leading-snug">
                        {notif.title}
                      </h4>

                      <p className="text-xs text-primary/70 leading-relaxed mb-3">
                        {notif.message}
                      </p>

                      {/* On-chain Release Hash if Verified Deal */}
                      {notif.releaseTxHash && (
                        <div className="bg-secondary p-2.5 rounded-xl border border-black/5 mb-3 space-y-1">
                          <span className="text-[9px] font-bold text-primary/40 uppercase tracking-wider block">
                            On-Chain Release TXID
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] text-primary/80 font-bold truncate select-all">
                              {notif.releaseTxHash}
                            </span>
                            <button
                              onClick={() => handleCopyTx(notif.releaseTxHash!)}
                              className="text-[10px] font-bold text-accent hover:underline shrink-0 flex items-center gap-1"
                            >
                              {copiedTx === notif.releaseTxHash ? <Check size={12} /> : <Copy size={12} />}
                              <span>{copiedTx === notif.releaseTxHash ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-black/5">
                        {!notif.read && (
                          <button
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="text-[11px] font-bold text-primary/60 hover:text-primary transition-colors"
                          >
                            Mark as read
                          </button>
                        )}

                        {notif.type === 'deal_verified' && onNavigateToStore && (
                          <button
                            onClick={onNavigateToStore}
                            className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1 ml-auto"
                          >
                            <ShoppingBag size={12} />
                            <span>Crypto Store</span>
                            <ArrowRight size={12} />
                          </button>
                        )}

                        {notif.type === 'deal_pending' && onNavigateToBuy && (
                          <button
                            onClick={onNavigateToBuy}
                            className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-1 ml-auto"
                          >
                            <span>Check Order</span>
                            <ArrowRight size={12} />
                          </button>
                        )}

                        {(notif.type === 'security' || notif.type === 'deal_rejected') && onNavigateToSupport && (
                          <button
                            onClick={onNavigateToSupport}
                            className="text-[11px] font-bold text-primary/80 hover:text-primary flex items-center gap-1 ml-auto"
                          >
                            <Headphones size={12} />
                            <span>Contact Support</span>
                            <ArrowRight size={12} />
                          </button>
                        )}

                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="p-1 rounded-lg text-primary/30 hover:text-red-500 hover:bg-red-50 transition-colors ml-auto"
                          title="Delete notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
