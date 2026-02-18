'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GroupSettingsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const myId = (session?.user as any)?.id;

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [copied, setCopied] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchGroup(); }, [groupId]);

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      setGroup(data.group);
      setNewName(data.group.name);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    setAllUsers(await res.json());
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateGroupName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await fetch(`/api/groups/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setGroup((g: any) => ({ ...g, name: newName.trim() }));
    setEditingName(false);
    setSaving(false);
  };

  const toggleSimplifyDebts = async () => {
    const newVal = !group.simplifyDebts;
    await fetch(`/api/groups/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simplifyDebts: newVal }),
    });
    setGroup((g: any) => ({ ...g, simplifyDebts: newVal }));
  };

  const addMember = async (userId: string) => {
    await fetch(`/api/groups/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        $push: { members: { userId, role: 'member', joinedAt: new Date(), isActive: true } }
      }),
    });
    setShowAddMember(false);
    fetchGroup();
  };

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member from the group?')) return;
    const updatedMembers = group.members
      .map((m: any) => (m.userId?._id || m.userId) === userId ? { ...m, isActive: false } : m);
    await fetch(`/api/groups/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members: updatedMembers }),
    });
    fetchGroup();
  };

  const leaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    await removeMember(myId);
    router.push('/groups');
  };

  const deleteGroup = async () => {
    if (!confirm('Delete this group and all its expenses? This cannot be undone.')) return;
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    router.push('/groups');
  };

  const memberIds = new Set((group?.members || []).map((m: any) => (m.userId?._id || m.userId)));
  const nonMembers = allUsers.filter(u => !memberIds.has(u._id));

  if (loading) return (
    <div className="p-4 md:p-8 max-w-[600px] space-y-4">
      {[1,2,3].map(i => <div key={i} className="card card-p h-20 animate-pulse" />)}
    </div>
  );

  if (!group) return <div className="p-8 text-center text-t3">Group not found</div>;

  const isAdmin = group.createdBy?._id === myId || 
    group.members.some((m: any) => (m.userId?._id || m.userId) === myId && m.role === 'admin');

  return (
    <div className="p-4 md:p-8 max-w-[600px] space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/groups/${groupId}`} className="w-9 h-9 rounded-lg bg-c2 flex items-center justify-center text-t2 hover:text-t1 transition-colors">←</Link>
        <h1 className="text-xl font-bold text-t1">Group settings</h1>
      </div>

      {/* Group Name + Emoji */}
      <div className="card card-p">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-c3 flex items-center justify-center text-2xl">{group.emoji}</div>
          <div className="flex-1">
            {editingName ? (
              <div className="flex gap-2">
                <input className="input flex-1" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                <button onClick={updateGroupName} disabled={saving} className="btn btn-primary text-xs">Save</button>
                <button onClick={() => { setEditingName(false); setNewName(group.name); }} className="btn btn-secondary text-xs">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-t1">{group.name}</p>
                <button onClick={() => setEditingName(true)} className="text-t3 hover:text-accent text-sm">✏️</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Code */}
      <div className="card card-p">
        <h3 className="text-sm font-bold text-t2 mb-3">Invite Code</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-c2 rounded-lg px-4 py-3 font-mono text-lg font-bold text-accent tracking-[0.3em] text-center">
            {group.inviteCode || 'N/A'}
          </div>
          <button onClick={copyInviteCode} className="btn btn-primary text-xs whitespace-nowrap">
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <p className="text-[11px] text-t3 mt-2">Share this code with others so they can join your group</p>
      </div>

      {/* Simplify Debts */}
      <div className="card card-p">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-c3 flex items-center justify-center text-lg">⚡</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-t1">Simplify group debts</p>
              <button
                onClick={toggleSimplifyDebts}
                className={`w-12 h-7 rounded-full transition-colors relative ${group.simplifyDebts ? 'bg-accent' : 'bg-c3'}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${group.simplifyDebts ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <p className="text-[11px] text-t3 mt-1">
              Automatically combines debts to reduce the total number of repayments between group members.
            </p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="card card-p">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-t2">Group members ({group.members?.filter((m: any) => m.isActive !== false).length})</h3>
          <button onClick={() => { setShowAddMember(true); fetchUsers(); }} className="text-xs text-accent font-semibold hover:underline">+ Add people</button>
        </div>

        <div className="space-y-3">
          {(group.members || []).filter((m: any) => m.isActive !== false).map((m: any) => {
            const user = m.userId || {};
            const isMe = (user._id || m.userId) === myId;
            const colors = ['av-accent', 'av-blue', 'av-violet', 'av-amber', 'av-red'];
            const initials = (user.name || 'U').split(' ').map((n: string) => n[0]).join('');
            return (
              <div key={user._id || m.userId} className="flex items-center gap-3 py-1">
                <div className={`av av-sm ${colors[Math.floor(Math.random() * 5)]}`}>{initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-t1">
                    {user.name || 'Unknown'}{isMe ? ' (you)' : ''}
                  </p>
                  <p className="text-[11px] text-t3 truncate">{user.email}</p>
                </div>
                <span className="text-[10px] badge b-gray capitalize">{m.role}</span>
                {isAdmin && !isMe && (
                  <button onClick={() => removeMember(user._id)} className="text-[11px] text-red hover:underline">Remove</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowAddMember(false)}>
          <div className="card card-p w-full max-w-sm animate-fade-up max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-t1 mb-4">Add people to group</h3>
            {nonMembers.length === 0 ? (
              <p className="text-sm text-t3">All users are already members</p>
            ) : (
              <div className="space-y-2">
                {nonMembers.map(u => (
                  <button key={u._id} onClick={() => addMember(u._id)} className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-c2 transition-colors text-left">
                    <div className="av av-sm av-accent">{(u.name || 'U').split(' ').map((n: string) => n[0]).join('')}</div>
                    <div>
                      <p className="text-sm font-semibold text-t1">{u.name}</p>
                      <p className="text-[11px] text-t3">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave / Delete */}
      <div className="space-y-3">
        <button onClick={leaveGroup} className="card card-p w-full flex items-center gap-3 hover:border-amber/30 transition-colors text-left">
          <span className="text-lg">🚪</span>
          <div>
            <p className="text-sm font-bold text-t1">Leave group</p>
            <p className="text-[11px] text-t3">You will no longer see this group's expenses</p>
          </div>
        </button>

        {isAdmin && (
          <button onClick={deleteGroup} className="card card-p w-full flex items-center gap-3 hover:border-red/30 transition-colors text-left">
            <span className="text-lg">🗑️</span>
            <div>
              <p className="text-sm font-bold text-red">Delete group</p>
              <p className="text-[11px] text-t3">Permanently delete this group and all expenses</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
