'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { computeGroupBalances, minimizeTransactions } from '@/lib/splitCalculator';

const sym = (c: string) => ({ USD: '$', EUR: '€', GBP: '£', INR: '₹' }[c] || c + ' ');

export default function GroupDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleStep, setSettleStep] = useState(1);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('bank_transfer');
  const [settleNote, setSettleNote] = useState('');
  const [settling, setSettling] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch(`/api/groups/${params.id}`).then(r => r.json()),
      fetch('/api/friends').then(r => r.json()),
      fetch('/api/friends/requests?type=incoming').then(r => r.json()),
      fetch('/api/friends/requests?type=outgoing').then(r => r.json())
    ]).then(([d, f, ri, ro]) => {
      setData(d);
      setFriendships(f.friends || []);
      setRequests([...(ri || []), ...(ro || [])]);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleSendRequest = async (recipientId: string) => {
    try {
      const res = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId })
      });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  if (loading) return (
    <div className="p-4 md:p-8">
      <div className="card card-p h-40 animate-pulse mb-4"></div>
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card card-p h-16 animate-pulse"></div>)}</div>
    </div>
  );

  if (!data?.group) return (
    <div className="p-8 text-center">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-t1 font-semibold">Group not found</p>
      <Link href="/groups" className="text-accent hover:underline text-sm mt-2 inline-block">← Back to Groups</Link>
    </div>
  );

  const { group, expenses, settlements } = data;
  const balances = computeGroupBalances(expenses || [], settlements || []);
  const transactions = minimizeTransactions(balances);
  const myId = session?.user?.id;

  const memberMap: Record<string, any> = {};
  (group.members || []).forEach((m: any) => {
    const u = m.userId || {};
    const id = u._id || m.userId;
    memberMap[id] = u;
  });

  const emojis: Record<string,string> = {
    travel:'✈️', accommodation:'🏨', food:'🍽️', transport:'🚗', conference:'📊',
    supplies:'🛒', utilities:'💡', entertainment:'🎮', health:'🏥', other:'💼'
  };
  const colors = ['av-accent', 'av-blue', 'av-violet', 'av-amber', 'av-red'];
  const totalExpenses = (expenses || []).reduce((s: number, e: any) => s + e.amount, 0);

  // Compute my balance details
  const myBalance = myId ? (balances[myId] || 0) : 0;
  // Who I owe and who owes me (from transactions)
  const iOwe = transactions.filter(t => t.from === myId);
  const owedToMe = transactions.filter(t => t.to === myId);

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !settleAmount || parseFloat(settleAmount) <= 0) return;
    setSettling(true);
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUser: myId,
          toUser: selectedPerson._id,
          groupId: group._id,
          amount: parseFloat(settleAmount),
          currency: group.currency || 'INR',
          paymentMethod: settleMethod,
          note: settleNote,
        }),
      });
      if (res.ok) {
        setSettleModalOpen(false);
        setSettleStep(1);
        setSelectedPerson(null);
        setSettleAmount('');
        setSettleNote('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettling(false);
    }
  };

  // Group expenses by month
  const expensesByMonth: Record<string, any[]> = {};
  (expenses || []).forEach((exp: any) => {
    const d = new Date(exp.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!expensesByMonth[key]) expensesByMonth[key] = [];
    expensesByMonth[key].push(exp);
  });
  const sortedMonths = Object.keys(expensesByMonth).sort((a, b) => b.localeCompare(a));
  const monthLabel = (key: string) => {
    const [y, m] = key.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] space-y-6">
      {/* Settle Up Modal */}
      {settleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSettleModalOpen(false)}>
          <div className="card card-p w-full max-w-md animate-fade-up shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-t1">Settle Up</h3>
              <button onClick={() => setSettleModalOpen(false)} className="text-t3 hover:text-t1 transition-colors">✕</button>
            </div>

            {settleStep === 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-t2">Who would you like to pay?</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {iOwe.length > 0 ? iOwe.map((t, idx) => {
                    const person = memberMap[t.to];
                    const pIdx = Object.keys(memberMap).indexOf(t.to);
                    return (
                      <button
                        key={t.to}
                        onClick={() => {
                          setSelectedPerson(person);
                          setSettleAmount(t.amount.toString());
                          setSettleStep(2);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-c2/50 hover:bg-c2 transition-all text-left border border-border/50 hover:border-accent/30 group"
                      >
                        <div className={`av av-sm ${colors[pIdx % colors.length]}`}>
                          {(person?.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-t1 group-hover:text-accent transition-colors">{person?.name}</p>
                          <p className="text-[10px] text-t3">You owe ₹{t.amount.toFixed(2)}</p>
                        </div>
                        <span className="text-t3 font-bold group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    );
                  }) : (
                    <div className="text-center py-6 bg-c2/30 rounded-xl">
                      <p className="text-2xl mb-2">🎉</p>
                      <p className="text-sm text-t2 font-medium">You don&apos;t owe anyone in this group!</p>
                      <button onClick={() => setSettleModalOpen(false)} className="btn btn-secondary text-xs mt-3">Close</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSettleSubmit} className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-accent/10 mb-2">
                  <button type="button" onClick={() => setSettleStep(1)} className="text-accent hover:underline text-xs">← Back</button>
                  <div className="av av-xs av-accent">{(selectedPerson?.name || 'U')[0]}</div>
                  <p className="text-sm text-t1 font-semibold">Paying <span className="text-accent">{selectedPerson?.name}</span></p>
                </div>

                <div>
                  <label className="label">Amount (₹)</label>
                  <input
                    type="number" onWheel={e => (e.target as HTMLInputElement).blur()}
                    step="0.01" min="0.01" className="input text-xl font-bold"
                    value={settleAmount} onChange={e => setSettleAmount(e.target.value)}
                    placeholder="0.00" required
                  />
                </div>

                <div>
                  <label className="label">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'bank_transfer', label: '💳 Bank', icon: '🏦' },
                      { id: 'cash', label: '💵 Cash', icon: '💵' },
                      { id: 'upi', label: '📱 UPI', icon: '📱' },
                      { id: 'other', label: '📋 Other', icon: '📋' }
                    ].map(m => (
                      <button
                        key={m.id} type="button"
                        onClick={() => setSettleMethod(m.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold border transition-all ${
                          settleMethod === m.id ? 'bg-accent border-accent text-white shadow-sm' : 'bg-c2 border-border text-t2 hover:border-accent/40'
                        }`}
                      >
                        <span>{m.icon}</span> {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Note (optional)</label>
                  <input
                    type="text" className="input"
                    value={settleNote} onChange={e => setSettleNote(e.target.value)}
                    placeholder="What's this payment for?"
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={settling} className="btn btn-primary w-full justify-center py-3 text-sm">
                    {settling ? 'Recording...' : `✓ Record Payment of ₹${parseFloat(settleAmount || '0').toFixed(2)}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="card card-p">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-xl bg-c3 flex items-center justify-center text-3xl">{group.emoji}</div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl font-bold text-t1">{group.name}</h1>
            <p className="text-sm text-t2 mt-0.5">{group.description || group.type}</p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="text-xs text-t3">👥 {group.members?.length || 0} members</span>
              <span className="text-xs text-t3">💰 ₹{totalExpenses.toFixed(0)} total</span>
              <span className={`badge text-[10px] ${group.status === 'active' ? 'b-green' : 'b-blue'}`}>{group.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/groups/${group._id}/settings`} className="w-9 h-9 rounded-lg bg-c2 flex items-center justify-center text-t2 hover:text-accent transition-colors">⚙️</Link>
            <Link href={`/expenses/new?groupId=${group._id}`} className="btn btn-primary text-sm">＋ Add Expense</Link>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-border flex-wrap">
          <button
            onClick={() => {
              setSettleModalOpen(true);
              setSettleStep(1);
            }}
            className="btn btn-primary bg-orange-500 hover:bg-orange-600 border-none text-white text-sm font-bold shadow-sm"
          >
            💸 Settle up
          </button>
          <Link href={`/groups/${group._id}/charts`} className="btn btn-secondary text-sm">📊 Charts</Link>
          <button onClick={() => setActiveTab('balances')} className="btn btn-secondary text-sm">💰 Balances</button>
        </div>
      </div>

      {/* My Balance Summary */}
      {myId && (
        <div className="space-y-3">
          {/* Overall balance card */}
          <div className="card card-p">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="text-sm font-bold text-t1">Your Balance in this Group</h3>
              <span className={`text-lg font-bold ${myBalance >= 0 ? 'text-accent' : 'text-red'}`}>
                {myBalance >= 0 ? '+' : '-'}₹{Math.abs(myBalance).toFixed(2)}
              </span>
            </div>

            {/* Who I owe */}
            {iOwe.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-t3 font-bold uppercase tracking-wider mb-2">💸 You Owe</p>
                <div className="space-y-2">
                  {iOwe.map((t, i) => {
                    const to = memberMap[t.to];
                    const toIdx = Object.keys(memberMap).indexOf(t.to);
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedPerson(to);
                          setSettleAmount(t.amount.toString());
                          setSettleStep(2);
                          setSettleModalOpen(true);
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-r bg-red/5 border border-red/10 cursor-pointer hover:bg-red/10 transition-colors group"
                      >
                        <div className={`av av-sm ${colors[toIdx % colors.length]}`}>
                          {(to?.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-t1 group-hover:text-red transition-colors">{to?.name || 'User'}</p>
                          <p className="text-[11px] text-t3">{to?.email || ''}</p>
                        </div>
                        <span className="text-sm font-bold text-red">-₹{t.amount.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Who owes me */}
            {owedToMe.length > 0 && (
              <div>
                <p className="text-[11px] text-t3 font-bold uppercase tracking-wider mb-2">💰 Owed to You</p>
                <div className="space-y-2">
                  {owedToMe.map((t, i) => {
                    const from = memberMap[t.from];
                    const fromIdx = Object.keys(memberMap).indexOf(t.from);
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-r bg-accent/5 border border-accent/10">
                        <div className={`av av-sm ${colors[fromIdx % colors.length]}`}>
                          {(from?.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-t1">{from?.name || 'User'}</p>
                          <p className="text-[11px] text-t3">{from?.email || ''}</p>
                        </div>
                        <span className="text-sm font-bold text-accent">+₹{t.amount.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {iOwe.length === 0 && owedToMe.length === 0 && (
              <div className="alert alert-success">
                <span>✅</span>
                <span>All settled up! No outstanding balances.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {['expenses', 'balances', 'members', 'activity'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-item capitalize whitespace-nowrap ${activeTab === tab ? 'on' : ''}`}
          >{tab}</button>
        ))}
      </div>

      {/* Expenses Tab — grouped by month */}
      {activeTab === 'expenses' && (
        <div className="space-y-5">
          {sortedMonths.length > 0 ? sortedMonths.map(monthKey => {
            const monthExps = expensesByMonth[monthKey];
            const monthTotal = monthExps.reduce((s: number, e: any) => s + e.amount, 0);
            return (
              <div key={monthKey}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h4 className="text-xs font-bold text-t2 uppercase tracking-wider">{monthLabel(monthKey)}</h4>
                  <span className="text-xs font-bold text-t3">₹{monthTotal.toFixed(0)}</span>
                </div>
                <div className="space-y-2">
                  {monthExps.map((exp: any) => {
                    const paidById = exp.paidBy?._id || exp.paidBy;
                    const mySplit = (exp.splits || []).find((s: any) => (s.userId?._id || s.userId) === myId);
                    const iPaid = paidById === myId;
                    // Calculate personal status
                    let statusText = '';
                    let statusColor = '';
                    if (!mySplit) {
                      statusText = 'Not involved';
                      statusColor = 'text-t3';
                    } else if (iPaid) {
                      // I paid, so I lent (total - my share)
                      const lent = exp.amount - mySplit.amount;
                      statusText = lent > 0 ? `you lent ₹${lent.toFixed(2)}` : 'you paid your share';
                      statusColor = lent > 0 ? 'text-accent' : 'text-t3';
                    } else {
                      // I didn't pay, so I owe my split amount
                      statusText = `you owe ₹${mySplit.amount.toFixed(2)}`;
                      statusColor = 'text-red';
                    }
                    return (
                      <div key={exp._id} className="card card-p">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-c3 flex items-center justify-center text-lg">{emojis[exp.category] || '💼'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-t1">{exp.description}</p>
                                <p className="text-[11px] text-t3 mt-0.5">
                                  {exp.paidBy?.name || 'Unknown'} paid {sym(exp.currency)}{exp.amount.toFixed(2)}
                                  {' • '}{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-xs font-bold ${statusColor}`}>{statusText}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="badge b-gray text-[10px] capitalize">{exp.category}</span>
                              <Link href={`/expenses/${exp._id}/edit`} className="ml-auto text-[11px] text-accent font-semibold hover:underline">✏️ Edit</Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }) : (
            <div className="card card-p text-center py-8">
              <p className="text-t3">No expenses in this group yet</p>
            </div>
          )}
        </div>
      )}

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card card-p">
            <h3 className="text-sm font-bold text-t1 mb-3">Member Balances</h3>
            <div className="space-y-2">
              {Object.entries(balances).map(([uid, bal], i) => {
                const user = memberMap[uid];
                return (
                  <div key={uid} className="flex items-center gap-3 p-2 rounded-r bg-c2/50">
                    <div className={`av av-sm ${colors[i % colors.length]}`}>
                      {(user?.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <span className="text-sm text-t1 flex-1">{user?.name || 'User'}</span>
                    <span className={`text-sm font-bold ${bal >= 0 ? 'text-accent' : 'text-red'}`}>
                      {bal >= 0 ? '+' : '-'}₹{Math.abs(bal).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card-p">
            <h3 className="text-sm font-bold text-t1 mb-3">Suggested Settlements</h3>
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((t, i) => {
                  const from = memberMap[t.from];
                  const to = memberMap[t.to];
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (from?._id === myId) {
                          setSelectedPerson(to);
                          setSettleAmount(t.amount.toString());
                          setSettleStep(2);
                          setSettleModalOpen(true);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-r bg-c2/50 transition-all ${from?._id === myId ? 'cursor-pointer hover:bg-accent/10 border-l-2 border-accent' : ''}`}
                    >
                      <div className={`av av-xs ${from?._id === myId ? 'av-red' : 'av-accent'}`}>
                        {(from?.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <span className="text-xs text-t2">{from?.name || 'User'}</span>
                      <span className="text-xs text-t3">→</span>
                      <div className={`av av-xs ${to?._id === myId ? 'av-red' : 'av-accent'}`}>
                        {(to?.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <span className="text-xs text-t2">{to?.name || 'User'}</span>
                      <span className={`text-sm font-bold ml-auto ${from?._id === myId ? 'text-accent' : 'text-t1'}`}>₹{t.amount.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="alert alert-success">
                <span>✅</span>
                <span>All settled up! No outstanding balances.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="card card-p">
          <div className="space-y-4">
            {(group.members || []).map((m: any, i: number) => {
              const user = m.userId || {};
              const uid = user._id || m.userId;
              const isMe = uid === myId;
              const isFriend = friendships.some((f: any) => f._id === uid);
              const pendingRequest = requests.find((r: any) => 
                (r.requester?._id || r.requester) === uid || 
                (r.recipient?._id || r.recipient) === uid
              );
              
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-c2/30 border border-border/50 hover:bg-c2 transition-colors group">
                  <div className={`av av-md ${colors[i % colors.length]}`}>
                    {(user.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-t1">{user.name || 'User'} {isMe && <span className="text-[10px] text-t3 font-normal">(you)</span>}</p>
                    <p className="text-[11px] text-t3">{user.email || ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge text-[10px] ${m.role === 'admin' ? 'b-amber' : 'b-gray'}`}>{m.role}</span>
                    
                    {!isMe && !isFriend && !pendingRequest && (
                      <button 
                        onClick={() => handleSendRequest(uid)}
                        className="btn btn-secondary px-3 py-1.5 h-auto text-[10px] font-bold border-accent/20 hover:border-accent/40 text-accent"
                      >
                        ＋ Add Friend
                      </button>
                    )}

                    {!isMe && !isFriend && pendingRequest && (
                      <span className="text-[10px] font-bold text-t3 bg-c3/50 px-2 py-1 rounded-full flex items-center gap-1">
                        <span>⏳</span> Pending
                      </span>
                    )}
                    
                    {isFriend && (
                      <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-1 rounded-full flex items-center gap-1">
                        <span>✓</span> Friend
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="card card-p">
          {(settlements || []).length > 0 || (expenses || []).length > 0 ? (
            <div className="space-y-3">
              {[
                ...(expenses || []).map((e: any) => ({ type: 'expense', data: e, date: new Date(e.createdAt) })),
                ...(settlements || []).map((s: any) => ({ type: 'settlement', data: s, date: new Date(s.createdAt) })),
              ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 15).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.type === 'expense' ? 'bg-accent' : 'bg-blue'}`} />
                  <div>
                    <p className="text-sm text-t1">
                      {item.type === 'expense'
                        ? `${item.data.paidBy?.name || 'Someone'} added "${item.data.description}" — ₹${item.data.amount.toFixed(2)}`
                        : `${item.data.fromUser?.name || 'Someone'} paid ${item.data.toUser?.name || 'someone'} ₹${item.data.amount.toFixed(2)}`
                      }
                    </p>
                    <p className="text-[11px] text-t3 mt-0.5">
                      {item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-t3 text-center py-6">No activity yet</p>
          )}
        </div>
      )}
    </div>
  );
}
