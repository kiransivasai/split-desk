'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function FriendsPage() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [overallBalance, setOverallBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/friends').then(r => r.json()),
      fetch('/api/friends/requests').then(r => r.json())
    ]).then(([friendsData, requestsData]) => {
      setFriends(friendsData.friends || []);
      setOverallBalance(friendsData.overallBalance || 0);
      setRequests(requestsData || []);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const colors = ['av-accent', 'av-blue', 'av-violet', 'av-amber', 'av-red'];

  const FriendRow = ({ f, i }: { f: any, i: number }) => {
    const initials = (f.name || 'U').split(' ').map((n: string) => n[0]).join('');
    let statusText = '';
    let statusColor = '';
    if (!f.hasExpenses) {
      statusText = 'no expenses';
      statusColor = 'text-t3';
    } else if (f.balance === 0) {
      statusText = 'settled up';
      statusColor = 'text-t3';
    } else if (f.balance > 0) {
      statusText = `owes you`;
      statusColor = 'text-accent';
    } else {
      statusText = `you owe`;
      statusColor = 'text-red';
    }
    return (
      <div className="flex items-center gap-3 py-3 border-b border-border last:border-0 group">
        <div className={`av av-md ${colors[i % colors.length]}`}>{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-t1 group-hover:text-accent transition-colors">{f.name}</p>
          <p className="text-[10px] text-t3 truncate">{f.email}</p>
        </div>
        <div className="text-right">
          {f.hasExpenses && f.balance !== 0 ? (
            <>
              <p className={`text-[11px] font-semibold ${statusColor}`}>{statusText}</p>
              <p className={`text-sm font-bold ${statusColor}`}>₹{Math.abs(f.balance).toFixed(2)}</p>
            </>
          ) : (
            <p className={`text-xs ${statusColor}`}>{statusText}</p>
          )}
        </div>
      </div>
    );
  };

  if (loading && !friends.length && !requests.length) {
    return (
      <div className="p-4 md:p-8 max-w-[600px] space-y-3">
        {[1,2,3,4,5].map(i => <div key={i} className="card card-p h-16 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[600px] space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-t1 mb-1">Friends</h1>
        <p className="text-sm font-bold">
          Overall, {overallBalance >= 0 ? (
            <span>you are owed <span className="text-accent">₹{Math.abs(overallBalance).toFixed(2)}</span></span>
          ) : (
            <span>you owe <span className="text-red">₹{Math.abs(overallBalance).toFixed(2)}</span></span>
          )}
        </p>
      </div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-t3 uppercase tracking-wider">Pending Requests ({requests.length})</h3>
          <div className="space-y-2">
            {requests.map((r, i) => (
              <div key={r._id} className="card p-3 flex items-center gap-3 bg-accent/5 border-accent/20">
                <div className="av av-sm av-accent">{(r.requester?.name || 'U')[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-t1 truncate">{r.requester?.name}</p>
                  <p className="text-[10px] text-t3 truncate">{r.requester?.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRequest(r._id, 'accepted')} className="btn btn-primary px-3 py-1.5 h-auto text-[11px]">Accept</button>
                  <button onClick={() => handleRequest(r._id, 'rejected')} className="btn btn-secondary px-3 py-1.5 h-auto text-[11px]">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friend list */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-t3 uppercase tracking-wider">Your Friends</h3>
        <div className="card card-p divide-y divide-border/50">
          {friends.length > 0 ? friends.map((f, i) => (
            <FriendRow key={f._id} f={f} i={i} />
          )) : (
            <div className="py-12 text-center bg-c2/30 rounded-xl border border-dashed border-border">
              <p className="text-3xl mb-3">👋</p>
              <p className="text-sm text-t2 font-medium">No friends yet.</p>
              <p className="text-xs text-t3 mt-1">Add friends from the members list of your groups!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
