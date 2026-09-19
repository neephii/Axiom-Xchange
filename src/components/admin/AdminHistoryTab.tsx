import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Copy, 
  ExternalLink, 
  User, 
  ArrowUpRight, 
  ShieldCheck, 
  ShieldAlert, 
  DollarSign, 
  Calendar,
  Layers,
  ArrowUpDown,
  History,
  Check,
  Ban,
  Wallet,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from '../../constants';
import { formatFiat, cn, copyTextToClipboard } from '../../lib/utils';

interface AdminHistoryTabProps {
  transactions: any[];
  users: any[];
  auditLogs: any[];
  onSelectTx: (tx: any) => void;
}

export const AdminHistoryTab: React.FC<AdminHistoryTabProps> = ({
  transactions,
  users,
  auditLogs,
  onSelectTx
}) => {
  const [historySubTab, setHistorySubTab] = useState<'all' | 'verified' | 'rejected' | 'users_transfers' | 'audit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy helper
  const handleCopy = async (text: string, id: string) => {
    await copyTextToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Compute stats
  const verifiedTxs = transactions.filter(t => t.status === TRANSACTION_STATUS.PAID || t.verifiedAt);
  const rejectedTxs = transactions.filter(t => t.status === TRANSACTION_STATUS.FAILED || t.rejectionReason);
  const pendingTxs = transactions.filter(t => t.status === TRANSACTION_STATUS.PENDING || t.status === TRANSACTION_STATUS.PROCESSING);

  const totalVerifiedVolumeUsd = verifiedTxs.reduce((sum, tx) => {
    return sum + (Number(tx.usdtAmount) || Number(tx.amount) || (Number(tx.fiatAmount) && tx.fiatCurrency === 'USD' ? Number(tx.fiatAmount) : 0) || 0);
  }, 0);

  // Aggregate user transfer summaries
  const userTransferMap = new Map<string, {
    userId: string;
    email: string;
    username: string;
    totalOrders: number;
    verifiedOrders: number;
    rejectedOrders: number;
    pendingOrders: number;
    totalVolumeUsd: number;
    lastDate: any;
    isSuspended: boolean;
  }>();

  transactions.forEach(tx => {
    const uId = tx.userId || 'unknown';
    const existing = userTransferMap.get(uId) || {
      userId: uId,
      email: tx.userEmail || (users.find(u => u.id === uId)?.email) || 'Unknown User',
      username: tx.username || (users.find(u => u.id === uId)?.username) || 'User',
      totalOrders: 0,
      verifiedOrders: 0,
      rejectedOrders: 0,
      pendingOrders: 0,
      totalVolumeUsd: 0,
      lastDate: tx.createdAt,
      isSuspended: !!(users.find(u => u.id === uId)?.suspended)
    };

    existing.totalOrders += 1;
    if (tx.status === TRANSACTION_STATUS.PAID || tx.verifiedAt) {
      existing.verifiedOrders += 1;
      existing.totalVolumeUsd += (Number(tx.usdtAmount) || Number(tx.amount) || 0);
    } else if (tx.status === TRANSACTION_STATUS.FAILED || tx.rejectionReason) {
      existing.rejectedOrders += 1;
    } else {
      existing.pendingOrders += 1;
    }

    if (tx.createdAt?.seconds && (!existing.lastDate?.seconds || tx.createdAt.seconds > existing.lastDate.seconds)) {
      existing.lastDate = tx.createdAt;
    }

    userTransferMap.set(uId, existing);
  });

  const transferringUsersList = Array.from(userTransferMap.values()).sort((a, b) => b.totalVolumeUsd - a.totalVolumeUsd);

  // Filtered transactions based on active subtab & search
  const filteredTransactions = transactions.filter(tx => {
    // User filter (if user was clicked in users tab)
    if (selectedUserFilter && tx.userId !== selectedUserFilter) return false;

    // Subtab filter
    if (historySubTab === 'verified') {
      if (tx.status !== TRANSACTION_STATUS.PAID && !tx.verifiedAt) return false;
    } else if (historySubTab === 'rejected') {
      if (tx.status !== TRANSACTION_STATUS.FAILED && !tx.rejectionReason) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchEmail = (tx.userEmail || '').toLowerCase().includes(q);
      const matchUsername = (tx.username || '').toLowerCase().includes(q);
      const matchId = (tx.id || '').toLowerCase().includes(q);
      const matchHash = (tx.txHash || tx.releaseTxHash || '').toLowerCase().includes(q);
      const matchAsset = (tx.paymentAsset || tx.assetName || '').toLowerCase().includes(q);
      return matchEmail || matchUsername || matchId || matchHash || matchAsset;
    }

    return true;
  });

  // Filtered transfer users for users_transfers subtab
  const filteredTransferUsers = transferringUsersList.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q);
  });

  // Filtered audit logs for audit subtab
  const filteredAuditLogs = auditLogs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (log.details || '').toLowerCase().includes(q) || 
           (log.action || '').toLowerCase().includes(q) || 
           (log.adminEmail || '').toLowerCase().includes(q) || 
           (log.targetUser || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-black/5 shadow-xs">
          <div className="flex items-center justify-between text-primary/40 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider">All Transfers</span>
            <Layers size={13} />
          </div>
          <p className="text-xl font-bold font-display text-primary">{transactions.length}</p>
          <p className="text-[10px] text-primary/50 font-medium mt-0.5">{transferringUsersList.length} Active Users</p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider">Verified Orders</span>
            <CheckCircle2 size={13} />
          </div>
          <p className="text-xl font-bold font-display text-emerald-900">{verifiedTxs.length}</p>
          <p className="text-[10px] text-emerald-700 font-bold mt-0.5">${totalVerifiedVolumeUsd.toLocaleString()} USD</p>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-red-800 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider">Rejected</span>
            <XCircle size={13} />
          </div>
          <p className="text-xl font-bold font-display text-red-900">{rejectedTxs.length}</p>
          <p className="text-[10px] text-red-700 font-medium mt-0.5">With Stated Reason</p>
        </div>

        <div className="bg-[#003D29] text-white p-3 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-white/60 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider">Transferring Users</span>
            <User size={13} />
          </div>
          <p className="text-xl font-bold font-display text-white">{transferringUsersList.length}</p>
          <p className="text-[10px] text-white/70 font-medium mt-0.5">Tracked Accounts</p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Transfers', count: transactions.length },
          { id: 'verified', label: 'Verified History', count: verifiedTxs.length },
          { id: 'rejected', label: 'Rejected History', count: rejectedTxs.length },
          { id: 'users_transfers', label: 'Users with Transfers', count: transferringUsersList.length },
          { id: 'audit', label: 'Admin Actions Done', count: auditLogs.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setHistorySubTab(tab.id as any);
              setSelectedUserFilter(null);
            }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap flex items-center gap-1.5",
              historySubTab === tab.id
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-white text-primary/60 border-black/5 hover:border-black/10"
            )}
          >
            <span>{tab.label}</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[8px] font-extrabold",
              historySubTab === tab.id ? "bg-white/20 text-white" : "bg-black/5 text-primary/60"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar & User Filter Banner */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/40" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              historySubTab === 'users_transfers' 
                ? "Search users who made transfers by email or username..." 
                : historySubTab === 'audit'
                ? "Search admin action history and audit notes..."
                : "Search history by email, user, tx ID, payment hash, coin..."
            }
            className="w-full bg-white border border-black/5 rounded-2xl py-2.5 pl-9 pr-4 text-xs font-medium text-primary shadow-xs outline-none focus:border-accent"
          />
        </div>

        {selectedUserFilter && (
          <div className="bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-medium text-primary">
            <span>Filtering transactions for user: <strong>{selectedUserFilter}</strong></span>
            <button 
              onClick={() => setSelectedUserFilter(null)}
              className="text-accent hover:underline font-bold text-[10px]"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: TRANSACTIONS (All, Verified, Rejected) */}
      {(historySubTab === 'all' || historySubTab === 'verified' || historySubTab === 'rejected') && (
        <div className="space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-black/5">
              <Clock size={32} className="mx-auto text-primary/20 mb-2" />
              <h4 className="text-xs font-bold text-primary">No History Records Found</h4>
              <p className="text-[11px] text-primary/40 font-medium mt-0.5">
                {searchQuery ? "Try refining your search terms." : "No transactions match this category yet."}
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isPaid = tx.status === TRANSACTION_STATUS.PAID || tx.verifiedAt;
              const isFailed = tx.status === TRANSACTION_STATUS.FAILED || tx.rejectionReason;
              const isPending = !isPaid && !isFailed;
              const amountLabel = tx.usdtAmount 
                ? `${Number(tx.usdtAmount).toLocaleString()} USDT` 
                : `${tx.amount || 0} ${tx.paymentAsset || tx.assetName || 'USDT'}`;
              
              const dateString = tx.createdAt?.seconds 
                ? new Date(tx.createdAt.seconds * 1000).toLocaleString(undefined, { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                  }) 
                : 'Recent';

              return (
                <div
                  key={tx.id}
                  className={cn(
                    "bg-white p-4 rounded-2xl border shadow-xs transition-all space-y-2.5",
                    isPaid ? "border-emerald-200 hover:border-emerald-300" :
                    isFailed ? "border-red-200 hover:border-red-300" :
                    "border-black/5 hover:border-accent/30"
                  )}
                >
                  {/* Row 1: Status & Amount */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1",
                        isPaid ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                        isFailed ? "bg-red-100 text-red-800 border border-red-300" :
                        "bg-amber-100 text-amber-800 border border-amber-300"
                      )}>
                        {isPaid ? <CheckCircle2 size={10} /> : isFailed ? <XCircle size={10} /> : <Clock size={10} />}
                        <span>{isPaid ? 'VERIFIED' : isFailed ? 'REJECTED' : 'PENDING'}</span>
                      </span>

                      <span className="text-[10px] text-primary/40 font-mono font-medium">
                        ID: {tx.id.slice(0, 8)}...
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-primary block">{amountLabel}</span>
                      {tx.fiatAmount && (
                        <span className="text-[10px] text-primary/40 font-medium">
                          ≈ {formatFiat(tx.fiatAmount, tx.fiatCurrency || 'USD')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: User & Network Details */}
                  <div className="flex items-start justify-between gap-2 text-xs border-t border-black/5 pt-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-primary font-bold text-[11px] truncate">
                        <User size={12} className="text-accent shrink-0" />
                        <span>{tx.username || 'User'}</span>
                        <span className="text-[10px] font-normal text-primary/50 truncate">({tx.userEmail})</span>
                      </div>
                      <p className="text-[10px] text-primary/40 font-medium mt-0.5">
                        {tx.paymentNetwork || tx.paymentAsset || 'Crypto Transfer'} • {dateString}
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectTx(tx)}
                      className="px-2.5 py-1 bg-secondary hover:bg-black/5 text-primary rounded-lg text-[10px] font-bold shrink-0 transition-colors"
                    >
                      Inspect
                    </button>
                  </div>

                  {/* Row 3: Verification or Rejection Audit Trail */}
                  {isPaid && (
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 text-[10px] text-emerald-900 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-emerald-800">
                          <ShieldCheck size={12} />
                          <span>Admin Verified & Released</span>
                        </span>
                        {tx.verifiedAt?.seconds && (
                          <span className="text-emerald-700/80 font-medium">
                            {new Date(tx.verifiedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between font-mono text-[9px] text-emerald-700">
                        <span className="truncate max-w-[200px]">Release Hash: {tx.releaseTxHash || 'VERIFIED-RELEASE'}</span>
                        {tx.releaseTxHash && (
                          <button 
                            onClick={() => handleCopy(tx.releaseTxHash, `rel-${tx.id}`)}
                            className="hover:underline flex items-center gap-0.5 ml-1"
                          >
                            {copiedId === `rel-${tx.id}` ? 'Copied' : 'Copy'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {isFailed && (
                    <div className="bg-red-50 border border-red-200/80 rounded-xl p-2.5 text-[10px] text-red-900 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-red-800">
                          <ShieldAlert size={12} />
                          <span>Admin Rejected Transfer</span>
                        </span>
                        {tx.rejectedAt?.seconds && (
                          <span className="text-red-700/80 font-medium">
                            {new Date(tx.rejectedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-red-700 text-[10px] font-medium leading-tight">
                        Reason: {tx.rejectionReason || 'Transfer proof could not be verified on-chain.'}
                      </p>
                    </div>
                  )}

                  {/* Payment proof / Hash */}
                  {tx.txHash && (
                    <div className="flex items-center justify-between text-[10px] text-primary/50 font-mono bg-secondary/50 px-2 py-1 rounded-lg">
                      <span className="truncate max-w-[220px]">Proof TX: {tx.txHash}</span>
                      <button
                        onClick={() => handleCopy(tx.txHash, `tx-${tx.id}`)}
                        className="text-accent hover:underline font-bold text-[9px]"
                      >
                        {copiedId === `tx-${tx.id}` ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: USERS WHO MADE TRANSFERS */}
      {historySubTab === 'users_transfers' && (
        <div className="space-y-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-black/5 text-[11px] text-primary/60 font-medium flex items-center justify-between">
            <span>Showing all <strong>{filteredTransferUsers.length}</strong> users who have initiated transfers</span>
            <span className="text-[10px] text-primary/40 font-bold uppercase">SORTED BY VOLUME</span>
          </div>

          {filteredTransferUsers.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-black/5">
              <User size={32} className="mx-auto text-primary/20 mb-2" />
              <h4 className="text-xs font-bold text-primary">No Transferring Users Found</h4>
            </div>
          ) : (
            filteredTransferUsers.map((u) => {
              const lastTransferDateStr = u.lastDate?.seconds 
                ? new Date(u.lastDate.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Recent';

              return (
                <div 
                  key={u.userId}
                  className="bg-white p-4 rounded-2xl border border-black/5 shadow-xs hover:border-accent/30 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-secondary text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {u.username?.slice(0, 2).toUpperCase() || 'US'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-primary truncate">{u.username}</h4>
                            <span className={cn(
                              "text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-full",
                              u.isSuspended ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"
                            )}>
                              {u.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                            </span>
                          </div>
                          <p className="text-[11px] text-primary/50 font-medium truncate mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedUserFilter(u.userId);
                        setHistorySubTab('all');
                      }}
                      className="px-3 py-1.5 bg-secondary hover:bg-black/5 text-accent rounded-xl text-[10px] font-bold shrink-0 transition-all flex items-center gap-1"
                    >
                      <span>View Orders</span>
                      <ArrowUpRight size={12} />
                    </button>
                  </div>

                  {/* Transfer Stats Bar */}
                  <div className="grid grid-cols-4 gap-2 bg-secondary/50 p-2.5 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-[8px] font-bold uppercase text-primary/40 block">Total Deals</span>
                      <strong className="text-xs font-bold text-primary">{u.totalOrders}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase text-emerald-600 block">Verified</span>
                      <strong className="text-xs font-bold text-emerald-700">{u.verifiedOrders}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase text-red-500 block">Rejected</span>
                      <strong className="text-xs font-bold text-red-600">{u.rejectedOrders}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase text-accent block">Volume (USD)</span>
                      <strong className="text-xs font-bold text-primary">${u.totalVolumeUsd.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-primary/40 font-medium pt-0.5">
                    <span>Last Transfer: {lastTransferDateStr}</span>
                    <span className="font-mono text-[9px]">UID: {u.userId.slice(0, 10)}...</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 3: ADMIN ACTION AUDIT LOGS */}
      {historySubTab === 'audit' && (
        <div className="space-y-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-black/5 text-[11px] text-primary/60 font-medium flex items-center justify-between">
            <span>Admin action history & system activity trail</span>
            <span className="text-[10px] text-primary/40 font-bold uppercase">LIVE AUDIT LOG</span>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-black/5">
              <Activity size={32} className="mx-auto text-primary/20 mb-2" />
              <h4 className="text-xs font-bold text-primary">No Admin Activity Logs Yet</h4>
              <p className="text-[11px] text-primary/40 font-medium mt-0.5">
                Actions such as order verifications, rejections, user suspensions, and price changes will appear here.
              </p>
            </div>
          ) : (
            filteredAuditLogs.map((log) => {
              const dateStr = log.createdAt?.seconds 
                ? new Date(log.createdAt.seconds * 1000).toLocaleString() 
                : log.timestamp || 'Recent';

              const isVerify = log.action === 'ORDER_VERIFIED';
              const isReject = log.action === 'ORDER_REJECTED';
              const isSuspend = log.action === 'USER_SUSPENDED';

              return (
                <div 
                  key={log.id}
                  className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider",
                      isVerify ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                      isReject ? "bg-red-50 text-red-800 border border-red-200" :
                      isSuspend ? "bg-amber-50 text-amber-800 border border-amber-200" :
                      "bg-blue-50 text-blue-800 border border-blue-200"
                    )}>
                      {log.action?.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-primary/40 font-medium">{dateStr}</span>
                  </div>

                  <p className="text-xs font-medium text-primary leading-relaxed">{log.details}</p>

                  <div className="flex items-center justify-between text-[10px] text-primary/40 font-medium pt-1 border-t border-black/5">
                    <span>Admin: <strong>{log.adminEmail || 'admin'}</strong></span>
                    {log.targetUser && <span>User: {log.targetUser}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
