'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const sym = (c: string) => ({ INR: '₹', EUR: '€', GBP: '£' }[c] || '$');

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    if ((session?.user as any)?.id) fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      const userId = (session!.user as any)!.id;
      const [analyticsRes, expensesRes, groupsRes] = await Promise.all([
        fetch(`/api/analytics?userId=${userId}`),
        fetch('/api/expenses?limit=5'),
        fetch('/api/groups'),
      ]);
      const [analyticsData, expensesData, groupsData] = await Promise.all([
        analyticsRes.json(),
        expensesRes.json(),
        groupsRes.json(),
      ]);
      setStats(analyticsData);
      setRecentExpenses(expensesData.expenses || []);
      setGroups(groupsData || []);

      // Detect currency from first expense or first group
      const firstExp = (expensesData.expenses || [])[0];
      const firstGroup = (groupsData || [])[0];
      if (firstExp?.currency) setCurrency(firstExp.currency);
      else if (firstGroup?.currency) setCurrency(firstGroup.currency);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const s = sym(currency);

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1000) return (n < 0 ? '-' : '') + s + Math.abs(n / 1000).toFixed(1) + 'K';
    return (n < 0 ? '-' : '') + s + Math.abs(n).toFixed(2);
  };

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const emojis: Record<string,string> = {
    travel:'✈️', accommodation:'🏨', food:'🍽️', transport:'🚗', conference:'📊',
    supplies:'🛒', utilities:'💡', entertainment:'🎮', health:'🏥', other:'💼'
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="card card-p animate-pulse h-24 bg-c1"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-t1">Dashboard</h1>
          <p className="text-sm text-t2 mt-0.5">Welcome back, {session?.user?.name?.split(' ')[0]} 👋</p>
        </div>
        <Link href="/expenses/new" className="btn btn-primary">
          <span>＋</span> Add Expense
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent-dim flex items-center justify-center text-xs">💰</div>
            <span className="text-[11px] text-t3 font-semibold uppercase tracking-wide">You&apos;re Owed</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-accent">{fmt(stats?.youreOwed || 0)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-red-dim flex items-center justify-center text-xs">📤</div>
            <span className="text-[11px] text-t3 font-semibold uppercase tracking-wide">You Owe</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-red">{fmt(stats?.youOwe || 0)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-dim flex items-center justify-center text-xs">⚡</div>
            <span className="text-[11px] text-t3 font-semibold uppercase tracking-wide">Net Balance</span>
          </div>
          <p className={`text-xl md:text-2xl font-bold ${(stats?.netBalance || 0) >= 0 ? 'text-accent' : 'text-red'}`}>
            {fmt(stats?.netBalance || 0)}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-dim flex items-center justify-center text-xs">📅</div>
            <span className="text-[11px] text-t3 font-semibold uppercase tracking-wide">Total Paid</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-t1">{fmt(stats?.totalPaid || 0)}</p>
        </div>
      </div>

      {/* Chart + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spending trend */}
        <div className="lg:col-span-2 card card-p">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-t1">Spending Trend</h3>
            <span className="badge b-blue">Last 6 months</span>
          </div>
          {stats?.monthlyTrend?.length > 0 ? (() => {
            const maxVal = Math.max(...stats.monthlyTrend.map((t: any) => t.total), 1);
            const maxBarPx = 100; // max bar height in pixels
            return (
              <div className="flex items-end gap-3 px-2 pt-2">
                {stats.monthlyTrend.map((m: any, i: number) => {
                  const barPx = Math.max((m.total / maxVal) * maxBarPx, 8);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-t2 font-semibold">{s}{m.total.toFixed(0)}</span>
                      <div
                        className="w-full rounded-t-md"
                        style={{
                          height: barPx,
                          background: 'linear-gradient(to top, rgba(0,210,160,0.4), var(--accent))',
                        }}
                      />
                      <span className="text-[10px] text-t3 font-medium mt-1">{monthNames[m._id?.month]}</span>
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <div className="flex items-center justify-center h-[140px] text-t3 text-sm">No spending data yet</div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="card card-p">
          <h3 className="text-sm font-bold text-t1 mb-4">By Category</h3>
          {stats?.categoryBreakdown?.length > 0 ? (
            <div className="space-y-3">
              {stats.categoryBreakdown.slice(0, 5).map((c: any) => {
                const total = stats.categoryBreakdown.reduce((sum: number, x: any) => sum + x.total, 0);
                const pct = total > 0 ? (c.total / total * 100) : 0;
                return (
                  <div key={c._id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-t2 capitalize">{emojis[c._id] || '💼'} {c._id}</span>
                      <span className="text-xs font-bold text-t1">{s}{c.total.toFixed(0)}</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill bg-accent" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-t3 text-sm text-center py-6">No expenses yet</div>
          )}
        </div>
      </div>

      {/* Recent expenses + Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent expenses */}
        <div className="card card-p">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-t1">Recent Expenses</h3>
            <Link href="/expenses" className="text-xs text-accent font-semibold hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentExpenses.length > 0 ? recentExpenses.map((exp: any) => (
              <div key={exp._id} className="flex items-center gap-3 p-3 rounded-r bg-c2/50 hover:bg-c2 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-c3 flex items-center justify-center text-base">
                  {emojis[exp.category] || '💼'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-t1 truncate">{exp.description}</p>
                  <p className="text-[11px] text-t3">
                    {exp.paidBy?.name || 'Unknown'} • {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className="text-sm font-bold text-t1">{sym(exp.currency || currency)}{exp.amount.toFixed(2)}</span>
              </div>
            )) : (
              <p className="text-sm text-t3 text-center py-6">No expenses yet. <Link href="/expenses/new" className="text-accent hover:underline">Add one →</Link></p>
            )}
          </div>
        </div>

        {/* Active groups */}
        <div className="card card-p">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-t1">Active Groups</h3>
            <Link href="/groups" className="text-xs text-accent font-semibold hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {groups.length > 0 ? groups.slice(0, 4).map((g: any) => (
              <Link
                key={g._id}
                href={`/groups/${g._id}`}
                className="flex items-center gap-3 p-3 rounded-r bg-c2/50 hover:bg-c2 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-c3 flex items-center justify-center text-lg">{g.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-t1 truncate">{g.name}</p>
                  <p className="text-[11px] text-t3">{g.members?.length || 0} members</p>
                </div>
                <span className="text-xs font-bold text-accent">{sym(g.currency || currency)}{g.totals?.totalSpent?.toFixed(0) || 0}</span>
              </Link>
            )) : (
              <p className="text-sm text-t3 text-center py-6">No groups yet. <Link href="/groups" className="text-accent hover:underline">Create one →</Link></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
