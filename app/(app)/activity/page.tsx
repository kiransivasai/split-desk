'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

const catEmoji: Record<string, string> = {
  food: '🍽️', transport: '🚗', shopping: '🛒', entertainment: '🎬',
  utilities: '⚡', health: '🏥', travel: '✈️', education: '📚',
  settlement: '💵', other: '📋',
};

export default function ActivityPage() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (myId) fetchActivity();
  }, [myId]);

  const fetchActivity = async () => {
    try {
      const res = await fetch(`/api/activity?userId=${myId}&limit=50`);
      setActivities(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) +
      ', ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="p-4 md:p-8 max-w-[600px] space-y-5">
      <h1 className="text-xl font-bold text-t1">Recent activity</h1>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => <div key={i} className="card card-p h-20 animate-pulse" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="card card-p text-center py-10">
          <p className="text-t3">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((a, i) => (
            <div key={a.id + '-' + i} className="flex gap-3 py-4 border-b border-border last:border-0">
              <div className="w-11 h-11 rounded-xl bg-c3 flex items-center justify-center text-lg relative flex-shrink-0">
                {catEmoji[a.category] || '📋'}
                {a.type === 'settlement' && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[10px]">💰</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-t1 leading-snug">{a.title}</p>
                {a.status && (
                  <p className={`text-xs font-bold mt-0.5 ${a.statusColor === 'green' ? 'text-accent' : 'text-red'}`}>{a.status}</p>
                )}
                <p className="text-[11px] text-t3 mt-0.5">{formatDate(a.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
