'use client';
import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const sym = (c: string) => ({ INR: '₹', EUR: '€', GBP: '£' }[c] || '$');

const COLORS = ['#1a56db', '#7c3aed', '#0891b2', '#d97706', '#dc2626', '#059669', '#e11d48', '#4f46e5'];
const BG_COLORS = ['#eff4ff', '#f5f3ff', '#ecfeff', '#fffbeb', '#fef2f2', '#ecfdf5', '#fff1f2', '#eef2ff'];

export default function GroupChartsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const groupId = params.id as string;
  const myId = (session?.user as any)?.id;

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [animated, setAnimated] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, [groupId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      setGroup(data.group);
      setExpenses(data.expenses || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Trigger bar animations after render
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setAnimated(true), 150);
      return () => clearTimeout(t);
    }
  }, [loading, selectedMonth]);

  if (loading) return (
    <div className="p-4 md:p-8 max-w-[520px] mx-auto space-y-4">
      <div className="h-12 bg-c2 rounded-xl animate-pulse" />
      <div className="h-24 bg-c2 rounded-xl animate-pulse" />
      <div className="h-40 bg-c2 rounded-xl animate-pulse" />
      <div className="h-48 bg-c2 rounded-xl animate-pulse" />
    </div>
  );

  if (!group) return <div className="p-8 text-center text-t3">Group not found</div>;

  const currency = group.currency || expenses[0]?.currency || 'INR';
  const s = sym(currency);

  // Filter expenses by month
  const months = Array.from(new Set(expenses.map(e => {
    const d = new Date(e.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))).sort((a, b) => b.localeCompare(a));

  const filtered = selectedMonth === 'all'
    ? expenses
    : expenses.filter(e => {
        const d = new Date(e.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
      });

  const totalSpent = filtered.reduce((sum: number, e: any) => sum + e.amount, 0);
  const myShare = filtered.reduce((sum: number, e: any) => {
    const mySplit = (e.splits || []).find((sp: any) => (sp.userId?._id || sp.userId) === myId);
    return sum + (mySplit?.amount || 0);
  }, 0);
  const myPct = totalSpent > 0 ? Math.round((myShare / totalSpent) * 100) : 0;

  // Per-member spending
  const memberMap: Record<string, { name: string; total: number }> = {};
  const members = (group.members || []) as any[];
  members.forEach((m: any) => {
    const uid = m.userId?._id || m.userId;
    const name = m.userId?.name || 'User';
    memberMap[uid] = { name, total: 0 };
  });
  filtered.forEach((e: any) => {
    (e.splits || []).forEach((sp: any) => {
      const uid = sp.userId?._id || sp.userId;
      if (memberMap[uid]) memberMap[uid].total += sp.amount || 0;
    });
  });
  const memberList = Object.entries(memberMap)
    .map(([id, data]) => ({ id, ...data, pct: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-');
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${names[parseInt(m) - 1]} ${y}`;
  };

  // Donut chart math
  const R = 48;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = memberList.map((m, i) => {
    const len = (m.pct / 100) * C;
    const seg = { len, offset: -offset, color: COLORS[i % COLORS.length] };
    offset += len + 1; // +1 for gap
    return seg;
  });

  return (
    <div className="p-4 md:p-8 max-w-[520px] mx-auto">
      <div className="bg-c1 border border-c3 rounded-2xl overflow-hidden shadow-lg" style={{ animation: 'fadeUp 0.4s ease both' }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-c3">
          <Link
            href={`/groups/${groupId}`}
            className="w-8 h-8 rounded-lg bg-c2 border border-c3 flex items-center justify-center text-t2 hover:text-accent hover:border-accent/40 transition-all shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-t1 truncate">{group.emoji} {group.name}</p>
            <p className="text-[11px] text-t3">Spending breakdown · {members.length} members</p>
          </div>
          <select
            className="bg-c2 border border-c3 rounded-lg text-t2 text-[11px] font-medium py-1.5 pl-2.5 pr-6 outline-none cursor-pointer appearance-none"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 6px center',
            }}
            value={selectedMonth}
            onChange={e => { setSelectedMonth(e.target.value); setAnimated(false); }}
          >
            <option value="all">All time</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>

        {/* ── Summary Strip ── */}
        <div className="grid grid-cols-2 border-b border-c3">
          <div className="p-5 border-r border-c3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-t3 mb-1.5">Total Spent</p>
            <p className="text-2xl font-bold text-t1 tracking-tight">{s}{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Split among {memberList.length}
            </span>
          </div>
          <div className="p-5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-t3 mb-1.5">Your Share</p>
            <p className="text-2xl font-bold text-accent tracking-tight">{s}{myShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {myPct}% of total
            </span>
          </div>
        </div>

        {/* ── Donut Chart + Legend ── */}
        <div className="flex items-center gap-6 p-5 border-b border-c3">
          {/* Donut */}
          <div className="relative shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={R} fill="none" stroke="var(--c3)" strokeWidth="11" />
              {segments.map((seg, i) => (
                <circle
                  key={i}
                  cx="60" cy="60" r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="11"
                  strokeDasharray={`${seg.len} ${C}`}
                  strokeDashoffset={seg.offset}
                  strokeLinecap="butt"
                  transform="rotate(-90 60 60)"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ${0.2 + i * 0.1}s` }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[9px] font-medium uppercase tracking-wider text-t3">Total</p>
              <p className="text-base font-bold text-t1 tracking-tight">{s}{Math.round(totalSpent).toLocaleString()}</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 min-w-0">
            {memberList.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2.5 py-2 border-b border-c3/40 last:border-b-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 text-xs font-medium text-t2 truncate">
                  {m.id === myId ? 'You' : m.name.split(' ')[0]}
                  <span className="text-t3 font-normal ml-1 text-[11px]">{Math.round(m.pct)}%</span>
                </span>
                <span className="text-xs font-mono font-medium text-t1">{s}{m.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Members Detailed Breakdown ── */}
        <div className="px-5 pb-2" ref={barsRef}>
          <div className="flex items-center justify-between py-3.5 border-b border-c3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-t3">Members</p>
            <span className="text-[10px] text-t3 bg-c2 border border-c3 rounded-full px-2 py-0.5 font-medium">{memberList.length} people</span>
          </div>

          {memberList.map((m, i) => {
            const color = COLORS[i % COLORS.length];
            const bg = BG_COLORS[i % BG_COLORS.length];
            const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            const isMe = m.id === myId;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 py-3 border-b border-c3/30 last:border-b-0"
                style={{ animation: `fadeUp 0.4s ease both`, animationDelay: `${0.1 + i * 0.05}s` }}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                  style={{ background: bg, color }}
                >
                  {initials}
                </div>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-t1 truncate">{m.name}</span>
                    {isMe && (
                      <span
                        className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: bg, color }}
                      >
                        You
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 bg-c3 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: color,
                        width: animated ? `${Math.round(m.pct)}%` : '0%',
                        transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)',
                      }}
                    />
                  </div>
                </div>

                {/* Amount + % */}
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-mono font-medium text-t1">{s}{m.total.toFixed(2)}</p>
                  <p className="text-[10px] text-t3 mt-0.5">{Math.round(m.pct)}%</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="bg-c2 border-t border-c3 px-5 py-3.5 flex items-center justify-between">
          <p className="text-xs text-t3">
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
          </p>
          <Link
            href={`/groups/${groupId}`}
            className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-all shadow-sm"
          >
            Back to Group
          </Link>
        </div>

      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
