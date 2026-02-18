'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SettlePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [payTo, setPayTo] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payNote, setPayNote] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (session?.user?.id) fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      const [analyticsRes, settleRes, usersRes] = await Promise.all([
        fetch(`/api/analytics?userId=${session!.user!.id}`),
        fetch(`/api/settlements?userId=${session!.user!.id}`),
        fetch('/api/users'),
      ]);
      setStats(await analyticsRes.json());
      setSettlements(await settleRes.json());
      setUsers(await usersRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTo || !payAmount) return;
    setPaying(true);
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUser: session?.user?.id,
          toUser: payTo,
          amount: parseFloat(payAmount),
          currency: 'USD',
          paymentMethod: payMethod,
          note: payNote,
        }),
      });
      if (res.ok) {
        setShowPay(false);
        setPayTo(''); setPayAmount(''); setPayNote('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  const fmt = (n: number) => '$' + Math.abs(n).toFixed(2);

  if (loading) return (
    <div className="p-4 md:p-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="card card-p h-24 animate-pulse"></div>)}
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1000px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-t1">Settle Up</h1>
          <p className="text-sm text-t2 mt-0.5">Manage and record payments</p>
        </div>
        <button onClick={() => setShowPay(true)} className="btn btn-primary">💳 Record Payment</button>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <p className="text-[11px] text-t3 font-bold uppercase tracking-wide mb-1">Owed to You</p>
          <p className="text-2xl font-bold text-accent">{fmt(stats?.youreOwed || 0)}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-[11px] text-t3 font-bold uppercase tracking-wide mb-1">You Owe</p>
          <p className="text-2xl font-bold text-red">{fmt(stats?.youOwe || 0)}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-[11px] text-t3 font-bold uppercase tracking-wide mb-1">Net Balance</p>
          <p className={`text-2xl font-bold ${(stats?.netBalance || 0) >= 0 ? 'text-accent' : 'text-red'}`}>
            {(stats?.netBalance || 0) >= 0 ? '+' : '-'}{fmt(stats?.netBalance || 0)}
          </p>
        </div>
      </div>

      {/* Record payment modal */}
      {showPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setShowPay(false)}>
          <div className="card card-p w-full max-w-md animate-fade-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-t1 mb-4">Record Payment</h3>
            <form onSubmit={handleSettle} className="space-y-4">
              <div>
                <label className="label">Pay To</label>
                <select className="input" value={payTo} onChange={e => setPayTo(e.target.value)} required>
                  <option value="">Select person...</option>
                  {users.filter(u => u._id !== session?.user?.id).map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount</label>
                <input type="number" step="0.01" min="0.01" className="input" value={payAmount} onChange={e => setPayAmount(e.target.value)} required placeholder="0.00" />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="bank_transfer">💳 Bank Transfer</option>
                  <option value="venmo">📱 Venmo</option>
                  <option value="paypal">🅿️ PayPal</option>
                  <option value="cash">💵 Cash</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input type="text" className="input" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="What's this payment for?" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowPay(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={paying} className="btn btn-primary disabled:opacity-50">
                  {paying ? 'Recording...' : '✓ Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement history */}
      <div className="card card-p">
        <h3 className="text-sm font-bold text-t1 mb-4">Payment History</h3>
        {settlements.length > 0 ? (
          <div className="space-y-2">
            {settlements.map((s: any) => {
              const isFrom = (s.fromUser?._id || s.fromUser) === session?.user?.id;
              return (
                <div key={s._id} className="flex items-center gap-3 p-3 rounded-r bg-c2/50">
                  <div className={`av av-sm ${isFrom ? 'av-red' : 'av-accent'}`}>
                    {isFrom ? '↑' : '↓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-t1">
                      {isFrom
                        ? `You paid ${s.toUser?.name || 'someone'}`
                        : `${s.fromUser?.name || 'Someone'} paid you`
                      }
                    </p>
                    <p className="text-[11px] text-t3">
                      {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {s.paymentMethod && ` • ${s.paymentMethod.replace('_', ' ')}`}
                      {s.note && ` • ${s.note}`}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${isFrom ? 'text-red' : 'text-accent'}`}>
                    {isFrom ? '-' : '+'}{fmt(s.amount)}
                  </span>
                  <span className={`badge text-[10px] ${s.status === 'confirmed' ? 'b-green' : s.status === 'pending' ? 'b-amber' : 'b-red'}`}>
                    {s.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">🤝</p>
            <p className="text-t1 font-semibold mb-1">No settlements yet</p>
            <p className="text-sm text-t3">Record your first payment to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
