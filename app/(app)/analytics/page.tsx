'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/analytics?userId=${session.user.id}`)
        .then(r => r.json())
        .then(d => { setStats(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [session]);

  const fmt = (n: number) => '$' + Math.abs(n).toFixed(2);
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const emojis: Record<string,string> = {
    travel:'✈️', accommodation:'🏨', food:'🍽️', transport:'🚗', conference:'📊',
    supplies:'🛒', utilities:'💡', entertainment:'🎮', health:'🏥', other:'💼'
  };
  const categoryColors: Record<string,string> = {
    travel: '#00D2A0', accommodation: '#60a5fa', food: '#f59e0b', transport: '#a78bfa',
    conference: '#f87171', supplies: '#34d399', utilities: '#fbbf24', entertainment: '#818cf8',
    health: '#fb923c', other: '#94a3b8',
  };

  if (loading) return (
    <div className="p-4 md:p-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="card card-p h-32 animate-pulse"></div>)}
    </div>
  );

  const totalCategorySpend = (stats?.categoryBreakdown || []).reduce((s: number, c: any) => s + c.total, 0);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold text-t1">Analytics</h1>
        <p className="text-sm text-t2 mt-0.5">Your spending insights and trends</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent-dim flex items-center justify-center text-xs">💰</div>
            <span className="text-[10px] text-t3 font-bold uppercase tracking-wide">Total Spend</span>
          </div>
          <p className="text-xl font-bold text-accent">{fmt(stats?.totalPaid || 0)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-dim flex items-center justify-center text-xs">📊</div>
            <span className="text-[10px] text-t3 font-bold uppercase tracking-wide">Categories</span>
          </div>
          <p className="text-xl font-bold text-blue">{stats?.categoryBreakdown?.length || 0}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-dim flex items-center justify-center text-xs">📅</div>
            <span className="text-[10px] text-t3 font-bold uppercase tracking-wide">Months</span>
          </div>
          <p className="text-xl font-bold text-amber">{stats?.monthlyTrend?.length || 0}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-dim flex items-center justify-center text-xs">⚡</div>
            <span className="text-[10px] text-t3 font-bold uppercase tracking-wide">Net</span>
          </div>
          <p className={`text-xl font-bold ${(stats?.netBalance || 0) >= 0 ? 'text-accent' : 'text-red'}`}>
            {(stats?.netBalance || 0) >= 0 ? '+' : '-'}{fmt(stats?.netBalance || 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <div className="card card-p">
          <h3 className="text-sm font-bold text-t1 mb-4">Spending Over Time</h3>
          {stats?.monthlyTrend?.length > 0 ? (
            <div className="chart-area" style={{ height: '160px' }}>
              {stats.monthlyTrend.map((m: any, i: number) => {
                const maxVal = Math.max(...stats.monthlyTrend.map((t: any) => t.total));
                const pct = maxVal > 0 ? (m.total / maxVal) * 100 : 0;
                return (
                  <div key={i} className="bar-col">
                    <div
                      className="bar-fill bg-gradient-to-t from-accent/50 to-accent"
                      style={{ height: `${Math.max(pct, 5)}%` }}
                      title={`$${m.total.toFixed(0)}`}
                    />
                    <span className="text-[9px] text-t3">{monthNames[m._id.month]}</span>
                    <span className="text-[9px] text-t3 font-bold">${m.total >= 1000 ? (m.total/1000).toFixed(1)+'K' : m.total.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[160px] text-t3 text-sm">No data yet</div>
          )}
        </div>

        {/* Category donut */}
        <div className="card card-p">
          <h3 className="text-sm font-bold text-t1 mb-4">By Category</h3>
          {stats?.categoryBreakdown?.length > 0 ? (
            <div className="space-y-3">
              {stats.categoryBreakdown.map((c: any) => {
                const pct = totalCategorySpend > 0 ? (c.total / totalCategorySpend * 100) : 0;
                return (
                  <div key={c._id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{emojis[c._id] || '💼'}</span>
                        <span className="text-sm text-t1 font-medium capitalize">{c._id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-t3">{pct.toFixed(0)}%</span>
                        <span className="text-sm font-bold text-t1">${c.total.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="prog-bar">
                      <div
                        className="prog-fill"
                        style={{ width: `${pct}%`, background: categoryColors[c._id] || '#94a3b8' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-t3 text-sm text-center py-8">No expenses yet</div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card card-p text-center">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-2xl font-bold text-accent">{fmt(stats?.youreOwed || 0)}</p>
          <p className="text-xs text-t3 mt-1">Total owed to you</p>
        </div>
        <div className="card card-p text-center">
          <p className="text-3xl mb-2">📤</p>
          <p className="text-2xl font-bold text-red">{fmt(stats?.youOwe || 0)}</p>
          <p className="text-xs text-t3 mt-1">Total you owe</p>
        </div>
        <div className="card card-p text-center">
          <p className="text-3xl mb-2">⚡</p>
          <p className={`text-2xl font-bold ${(stats?.netBalance || 0) >= 0 ? 'text-accent' : 'text-red'}`}>
            {(stats?.netBalance || 0) >= 0 ? '+' : ''}{fmt(stats?.netBalance || 0)}
          </p>
          <p className="text-xs text-t3 mt-1">Net balance</p>
        </div>
      </div>
    </div>
  );
}
