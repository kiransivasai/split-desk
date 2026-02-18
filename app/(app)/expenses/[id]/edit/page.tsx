'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { calculateSplits } from '@/lib/splitCalculator';

const sym = (c: string) => ({ USD: '$', EUR: '€', GBP: '£', INR: '₹' }[c] || c + ' ');

export default function EditExpensePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('other');
  // const [date, setDate] = useState(''); // Removed date state
  const [groupId, setGroupId] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'percentage' | 'exact' | 'shares'>('equal');
  const [participants, setParticipants] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/expenses/${params.id}`).then(r => r.json()),
      fetch('/api/groups').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([expense, g, u]) => {
      setGroups(g || []);
      setUsers(u || []);
      if (expense && !expense.error) {
        setDescription(expense.description || '');
        setAmount(String(expense.amount || ''));
        setCurrency(expense.currency || 'USD');
        setCategory(expense.category || 'other');
        setGroupId(expense.groupId?._id || expense.groupId || '');
        setPaidBy(expense.paidBy?._id || expense.paidBy || '');
        setSplitMethod(expense.splitMethod || 'equal');
        setNotes(expense.notes || '');
        setIsRecurring(expense.isRecurring || false);

        if (expense.splits?.length) {
          setParticipants(expense.splits.map((s: any) => ({
            userId: s.userId?._id || s.userId,
            name: s.userId?.name || 'User',
            selected: true,
            percentage: s.percentage || (100 / expense.splits.length),
            exactAmount: s.amount || 0,
            shares: s.shares || 1,
          })));
        }
      } else {
        setError('Expense not found');
      }
      setLoading(false);
    }).catch(() => { setError('Failed to load expense'); setLoading(false); });
  }, [params.id]);

  // Refresh participants when group changes
  useEffect(() => {
    if (!loading && groupId && groups.length) {
      const group = groups.find((g: any) => g._id === groupId);
      if (group) {
        setParticipants(prev => {
          const existingIds = new Set(prev.map(p => p.userId));
          const groupMemberIds = new Set(group.members.map((m: any) => m.userId?._id || m.userId));
          // Only reset if group membership changed
          if (existingIds.size !== groupMemberIds.size || Array.from(existingIds).some(id => !groupMemberIds.has(id))) {
            return group.members.map((m: any) => ({
              userId: m.userId?._id || m.userId,
              name: m.userId?.name || 'User',
              selected: true,
              percentage: 100 / group.members.length,
              exactAmount: 0,
              shares: 1,
            }));
          }
          return prev;
        });
      }
    }
  }, [groupId, groups, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !paidBy || !groupId) return;
    setSaving(true);
    setError('');

    const parsedAmount = parseFloat(amount);
    const splits = calculateSplits(parsedAmount, splitMethod, participants.filter(p => p.selected !== false));

    try {
      const res = await fetch(`/api/expenses/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: parsedAmount,
          currency,
          category,
          paidBy,
          groupId,
          splitMethod,
          splits: splits.map(s => ({ ...s, isPaid: false })),
          notes: notes || undefined,
          isRecurring,
        }),
      });

      if (res.ok) {
        router.push('/expenses');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

   const splitPreview = amount 
      ? calculateSplits(
          parseFloat(amount) || 0, 
          splitMethod, 
          participants.filter(p => p.selected !== false)
        ) 
      : [];

  if (loading) return (
    <div className="p-4 md:p-8 max-w-[800px]">
      <div className="card card-p h-32 animate-pulse mb-4"></div>
      <div className="card card-p h-48 animate-pulse"></div>
    </div>
  );

  if (error && !description) return (
    <div className="p-8 text-center">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-t1 font-semibold">{error}</p>
      <button onClick={() => router.back()} className="text-accent hover:underline text-sm mt-2">← Go back</button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-[800px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-t1">Edit Expense</h1>
        <p className="text-sm text-t2 mt-0.5">Update expense details — any group member can edit</p>
      </div>

      {error && (
        <div className="alert alert-warn mb-4">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount hero */}
        <div className="card card-p text-center">
          <label className="label text-center">Amount</label>
          <div className="flex items-center justify-center gap-2 mt-2">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="input w-20 text-center text-lg font-bold">
              <option value="USD">$</option>
              <option value="EUR">€</option>
              <option value="GBP">£</option>
              <option value="INR">₹</option>
            </select>
            <input
              type="number" onWheel={e => (e.target as HTMLInputElement).blur()} step="0.01" min="0.01"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="input text-center text-3xl font-bold w-48 bg-transparent border-none focus:ring-0"
              required
            />
          </div>
        </div>

        {/* Details */}
        <div className="card card-p space-y-4">
          <div>
            <label className="label">Description</label>
            <input type="text" className="input" placeholder="What was this expense for?" value={description} onChange={e => setDescription(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="travel">✈️ Travel & Flights</option>
                <option value="accommodation">🏨 Accommodation</option>
                <option value="food">🍽️ Food & Dining</option>
                <option value="transport">🚗 Transport</option>
                <option value="conference">📊 Conferences</option>
                <option value="supplies">🛒 Supplies</option>
                <option value="utilities">💡 Utilities</option>
                <option value="entertainment">🎮 Entertainment</option>
                <option value="health">🏥 Health</option>
                <option value="other">💼 Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Group <span className="text-red">*</span></label>
              <select className="input" value={groupId} onChange={e => setGroupId(e.target.value)} required>
                <option value="">Select a group...</option>
                {groups.map((g: any) => (
                  <option key={g._id} value={g._id}>{g.emoji} {g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Paid By</label>
              <select className="input" value={paidBy} onChange={e => setPaidBy(e.target.value)} required>
                <option value="">Select...</option>
                {users.map((u: any) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Split method */}
        <div className="card card-p">
          <label className="label mb-3">Split Method</label>
          <div className="flex bg-c2 p-1 rounded-xl gap-1 mb-4">
            {(['equal', 'percentage', 'exact', 'shares'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setSplitMethod(m)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold capitalize transition-all ${
                  splitMethod === m 
                    ? 'bg-accent text-white shadow-sm' 
                    : 'text-t2 hover:bg-c3 hover:text-t1'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {participants.length > 0 && amount && (
            <div className="space-y-2 mt-4">
              <p className="text-[11px] text-t3 font-bold uppercase tracking-wider flex justify-between items-center px-1">
                <span>Split Preview</span>
                <button 
                  type="button"
                  onClick={() => {
                    const allSelected = participants.every(p => p.selected !== false);
                    setParticipants(participants.map(p => ({ ...p, selected: !allSelected })));
                  }}
                  className="text-accent hover:underline lowercase bg-accent/10 px-2 py-0.5 rounded cursor-pointer"
                >
                  {participants.every(p => p.selected !== false) ? 'Deselect all' : 'Select all'}
                </button>
              </p>
              {participants.map((p, i) => {
                const isSelected = p.selected !== false;
                return (
                  <div key={p.userId} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isSelected ? 'bg-c3/50' : 'opacity-40 grayscale'}`}>
                    {/* Custom Professional Checkbox */}
                    <div 
                      onClick={() => {
                        const newP = [...participants];
                        newP[i].selected = !isSelected;
                        setParticipants(newP);
                      }}
                      className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors border-2 ${isSelected ? 'bg-accent border-accent text-white' : 'border-t3 bg-transparent'}`}
                    >
                      {isSelected && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    
                    <div className="av av-xs av-accent">{p.name?.split(' ').map((n: string) => n[0]).join('') || '?'}</div>
                    <span className="text-sm text-t1 flex-1">{p.name}</span>
                    
                    {isSelected && (
                      <>
                        {splitMethod === 'percentage' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" onWheel={e => (e.target as HTMLInputElement).blur()}
                              className="input w-16 text-xs text-center p-1"
                              value={p.percentage?.toFixed(0)}
                              onChange={e => {
                                const newP = [...participants];
                                newP[i].percentage = parseFloat(e.target.value) || 0;
                                setParticipants(newP);
                              }}
                            />
                            <span className="text-xs text-t3">%</span>
                          </div>
                        )}
                        {splitMethod === 'exact' && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-t3">{sym(currency)}</span>
                            <input
                              type="number" onWheel={e => (e.target as HTMLInputElement).blur()}
                              step="0.01"
                              className="input w-20 text-xs text-center p-1"
                              value={p.exactAmount || ''}
                              onChange={e => {
                                const newP = [...participants];
                                newP[i].exactAmount = parseFloat(e.target.value) || 0;
                                setParticipants(newP);
                              }}
                            />
                          </div>
                        )}
                        {splitMethod === 'shares' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" onWheel={e => (e.target as HTMLInputElement).blur()}
                              min="0"
                              className="input w-14 text-xs text-center p-1"
                              value={p.shares || 1}
                              onChange={e => {
                                const newP = [...participants];
                                newP[i].shares = parseInt(e.target.value) || 0;
                                setParticipants(newP);
                              }}
                            />
                            <span className="text-xs text-t3">shares</span>
                          </div>
                        )}
                      </>
                    )}

                    <span className={`text-sm font-bold text-right ${isSelected ? 'text-accent' : 'text-t3'}`}>
                      {isSelected ? (
                        splitMethod === 'equal' ? (
                          <span className="opacity-0">—</span>
                        ) : (
                          sym(currency) + (splitPreview.find(s => s.userId === p.userId)?.amount.toFixed(2) || '0.00')
                        )
                      ) : '-'}
                    </span>
                  </div>
                );
              })}

              {splitMethod === 'equal' && participants.filter(p => p.selected !== false).length > 0 && (
                <div className="mt-4 pt-4 border-t border-c2 flex items-center justify-between px-1">
                  <div className="text-sm text-t2">
                    <span className="font-bold text-t1">~{sym(currency)}{((parseFloat(amount) || 0) / participants.filter(p => p.selected !== false).length).toFixed(2)}</span>
                    <span className="ml-1">/person</span>
                  </div>
                  <div className="text-[10px] text-t3 font-bold uppercase">
                    ({participants.filter(p => p.selected !== false).length} people)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes & recurring */}
        <div className="card card-p space-y-4">
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-t1">Recurring Expense</p>
              <p className="text-[11px] text-t3">Automatically repeat this expense</p>
            </div>
            <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={`toggle ${isRecurring ? 'on' : ''}`} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : '✓ Update Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
