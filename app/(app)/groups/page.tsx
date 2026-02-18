'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { computeGroupBalances, minimizeTransactions } from '@/lib/splitCalculator';

function sym(c: string) {
  if (c === 'INR') return '₹';
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  return '$';
}

export default function GroupsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const myId = (session?.user as any)?.id;
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('💼');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('team');
  const [creating, setCreating] = useState(false);
  const [groupBalances, setGroupBalances] = useState<Record<string, any>>({});

  useEffect(() => { fetchGroups(); }, []);
  useEffect(() => { if (groups.length && myId) computeBalances(); }, [groups, myId]);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      setGroups(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const computeBalances = async () => {
    const balances: Record<string, any> = {};
    for (const g of groups) {
      try {
        const res = await fetch(`/api/groups/${g._id}`);
        const data = await res.json();
        
        // Use shared logic for consistent balances
        const rawBalances = computeGroupBalances(data.expenses || [], data.settlements || []);
        const netBalance = rawBalances[myId] || 0;
        
        // Compute simplified debts for display
        const transactions = minimizeTransactions(rawBalances);
        const debts: any[] = [];
        
        // People who owe me (to === myId) -> Positive
        transactions.filter(t => t.to === myId).forEach(t => {
          // Find user name
          const member = g.members.find((m: any) => (m.userId._id || m.userId) === t.from);
          const name = member?.userId?.name || 'Unknown';
          debts.push({ id: t.from, name, amount: t.amount });
        });

        // People I owe (from === myId) -> Negative
        transactions.filter(t => t.from === myId).forEach(t => {
          // Find user name
          const member = g.members.find((m: any) => (m.userId._id || m.userId) === t.to);
          const name = member?.userId?.name || 'Unknown';
          debts.push({ id: t.to, name, amount: -t.amount });
        });

        // Sort: Owed first, then Owe
        debts.sort((a, b) => b.amount - a.amount);

        balances[g._id] = { netBalance, debts };
      } catch (err) { /* skip */ }
    }
    setGroupBalances(balances);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !session?.user?.id) return;
    setCreating(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, emoji: newEmoji, type: newType, createdBy: session.user.id }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName(''); setNewDesc(''); setNewEmoji('💼');
        fetchGroups();
      }
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !myId) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode.trim(), userId: myId }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowJoin(false);
        setJoinCode('');
        router.push(`/groups/${data.groupId}`);
      } else {
        setJoinError(data.error || 'Failed to join');
      }
    } catch (err) { setJoinError('Network error'); }
    finally { setJoining(false); }
  };

  const overallBalance = Object.values(groupBalances).reduce((s: number, b: any) => s + (b?.netBalance || 0), 0);
  const emojis = ['💼', '🏢', '🍕', '✈️', '🎮', '🏠', '💡', '🎉', '🗽', '⚽', '🎵', '📚', '🇩🇪', '🛒'];

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-[1200px]">
      {/* Overall balance */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-t1">Groups</h1>
          {!loading && Object.keys(groupBalances).length > 0 && (
            <p className="text-sm font-bold mt-0.5">
              Overall, {overallBalance >= 0 ? (
                <span>you are owed <span className="text-accent">₹{Math.abs(overallBalance).toFixed(2)}</span></span>
              ) : (
                <span>you owe <span className="text-red">₹{Math.abs(overallBalance).toFixed(2)}</span></span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)} className="btn btn-secondary text-sm">🔗 Join Group</button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">＋ Create Group</button>
        </div>
      </div>

      {/* Join Group Modal */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setShowJoin(false)}>
          <div className="card card-p w-full max-w-sm animate-fade-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-t1 mb-4">Join a Group</h3>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="label">Invite Code</label>
                <input type="text" className="input font-mono text-center text-lg tracking-[0.3em] uppercase" placeholder="ABC123" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} required autoFocus />
              </div>
              {joinError && <p className="text-xs text-red font-semibold">{joinError}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowJoin(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={joining} className="btn btn-primary disabled:opacity-50">
                  {joining ? 'Joining...' : 'Join Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="card card-p w-full max-w-md animate-fade-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-t1 mb-4">Create New Group</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {emojis.map(e => (
                    <button key={e} type="button" onClick={() => setNewEmoji(e)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all
                        ${newEmoji === e ? 'bg-accent-dim border-2 border-accent/30 scale-110' : 'bg-c2 border border-border hover:border-border-hi'}`}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Group Name</label>
                <input type="text" className="input" placeholder="e.g., Berlin Trip 2025" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Description</label>
                <input type="text" className="input" placeholder="What's this group for?" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={newType} onChange={e => setNewType(e.target.value)}>
                  <option value="team">🏢 Team</option>
                  <option value="trip">✈️ Trip</option>
                  <option value="home">🏠 Home</option>
                  <option value="event">🎉 Event</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn btn-primary disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Groups grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card card-p h-48 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g: any) => {
            const bal = groupBalances[g._id];
            return (
              <Link key={g._id} href={`/groups/${g._id}`} className="card card-p hover:border-accent/20 transition-all group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-c3 flex items-center justify-center text-2xl">{g.emoji}</div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-t1 group-hover:text-accent transition-colors">{g.name}</p>
                    {bal ? (
                      bal.netBalance === 0 ? (
                        <p className="text-xs text-t3 mt-0.5">settled up</p>
                      ) : bal.netBalance > 0 ? (
                        <p className="text-xs text-accent font-semibold mt-0.5">you are owed ₹{Math.abs(bal.netBalance).toFixed(2)}</p>
                      ) : (
                        <p className="text-xs text-red font-semibold mt-0.5">you owe ₹{Math.abs(bal.netBalance).toFixed(2)}</p>
                      )
                    ) : (
                      <p className="text-[11px] text-t3 mt-0.5">{g.description || g.type}</p>
                    )}
                  </div>
                </div>

                {/* Per-person breakdown */}
                {bal && bal.debts.length > 0 && (
                  <div className="mb-3 space-y-0.5 pl-1">
                    {bal.debts.slice(0, 3).map((d: any) => (
                      <p key={d.id} className={`text-[11px] ${d.amount > 0 ? 'text-accent' : 'text-red'}`}>
                        {d.amount > 0 ? `${d.name} owes you ₹${d.amount.toFixed(2)}` : `You owe ${d.name} ₹${Math.abs(d.amount).toFixed(2)}`}
                      </p>
                    ))}
                    {bal.debts.length > 3 && (
                      <p className="text-[10px] text-t3">+{bal.debts.length - 3} more</p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex -space-x-2">
                    {(g.members || []).slice(0, 4).map((m: any, i: number) => {
                      const colors = ['av-accent', 'av-blue', 'av-violet', 'av-amber', 'av-red'];
                      const user = m.userId || {};
                      return (
                        <div key={i} className={`av av-xs ${colors[i % colors.length]} ring-2 ring-c1`}>
                          {(user.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                      );
                    })}
                    {(g.members?.length || 0) > 4 && (
                      <div className="av av-xs bg-c3 text-t3 ring-2 ring-c1">+{g.members.length - 4}</div>
                    )}
                  </div>
                  <span className="text-[11px] text-t3">{g.members?.length || 0} members</span>
                </div>
              </Link>
            );
          })}

          <button onClick={() => setShowCreate(true)}
            className="card card-p border-dashed flex flex-col items-center justify-center gap-3 min-h-[180px] text-t3 hover:text-accent hover:border-accent/20 transition-all">
            <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center text-2xl">＋</div>
            <p className="text-sm font-semibold">Create New Group</p>
          </button>
        </div>
      )}
    </div>
  );
}
