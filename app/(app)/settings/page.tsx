'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(session?.user?.name || '');
  const [currency, setCurrency] = useState(session?.user?.defaultCurrency || 'USD'); // Assuming session has this, if not default
  const [timezone, setTimezone] = useState(session?.user?.timezone || 'America/New_York');
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState(session?.user?.notifications || {
    newExpense: true,
    paymentReceived: true,
    weeklyDigest: true,
    overdueReminder: false,
    recurringAlert: true,
  });

  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, defaultCurrency: currency, timezone }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        await update({ name, defaultCurrency: currency, timezone });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleNotif = async (key: string) => {
    const updated = { ...notifications, [key]: !notifications[key as keyof typeof notifications] };
    setNotifications(updated);
    
    // Auto-save notifications
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: updated }),
      });
      await update({ notifications: updated });
    } catch (err) {
      console.error(err);
      // Revert on failure? For now just log
    }
  };

  const initials = session?.user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="p-4 md:p-8 max-w-[900px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t1">Settings</h1>
        <p className="text-sm text-t2 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {['profile', 'notifications', 'workspace', 'billing'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-item capitalize whitespace-nowrap ${activeTab === tab ? 'on' : ''}`}
          >{tab}</button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="card card-p">
            <div className="flex items-center gap-4 mb-6">
              <div className="av av-xl av-accent">{initials}</div>
              <div>
                <p className="text-lg font-bold text-t1">{session?.user?.name}</p>
                <p className="text-sm text-t2">{session?.user?.email}</p>
                <button className="text-xs text-accent hover:underline mt-1">Change avatar</button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input opacity-50" value={session?.user?.email || ''} disabled />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Default Currency</label>
                  <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="USD">🇺🇸 USD — US Dollar</option>
                    <option value="EUR">🇪🇺 EUR — Euro</option>
                    <option value="GBP">🇬🇧 GBP — British Pound</option>
                    <option value="INR">🇮🇳 INR — Indian Rupee</option>
                    <option value="CAD">🇨🇦 CAD — Canadian Dollar</option>
                  </select>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select className="input" value={timezone} onChange={e => setTimezone(e.target.value)}>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end mt-6">
              {saved && <span className="text-xs text-accent font-semibold animate-fade-in">✓ Saved</span>}
              <button onClick={handleSaveProfile} className="btn btn-primary">Save Changes</button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="card card-p border-red/20">
            <h3 className="text-sm font-bold text-red mb-3">Danger Zone</h3>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-t1 font-medium">Delete Account</p>
                <p className="text-[11px] text-t3">Permanently delete your account and all data</p>
              </div>
              <button className="btn btn-danger text-xs">Delete Account</button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="card card-p space-y-4">
          <h3 className="text-sm font-bold text-t1 mb-2">Notification Preferences</h3>
          {[
            { key: 'newExpense', label: 'New Expense', desc: 'When someone adds an expense that involves you' },
            { key: 'paymentReceived', label: 'Payment Received', desc: 'When someone records a payment to you' },
            { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of your weekly expenses and balances' },
            { key: 'overdueReminder', label: 'Overdue Reminders', desc: 'Reminders for unresolved balances' },
            { key: 'recurringAlert', label: 'Recurring Alerts', desc: 'Notifications for upcoming recurring expenses' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-r bg-c2/50">
              <div>
                <p className="text-sm font-semibold text-t1">{item.label}</p>
                <p className="text-[11px] text-t3">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(item.key)}
                className={`toggle ${notifications[item.key as keyof typeof notifications] ? 'on' : ''}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Workspace */}
      {activeTab === 'workspace' && (
        <div className="card card-p">
          <h3 className="text-sm font-bold text-t1 mb-4">Workspace Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Workspace Name</label>
              <input type="text" className="input" defaultValue="SplitDesk Team" />
            </div>
            <div>
              <label className="label">Default Currency</label>
              <select className="input">
                <option>🇺🇸 USD — US Dollar</option>
                <option>🇪🇺 EUR — Euro</option>
                <option>🇬🇧 GBP — British Pound</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button className="btn btn-primary">Save Workspace</button>
            </div>
          </div>
        </div>
      )}

      {/* Billing */}
      {activeTab === 'billing' && (
        <div className="card card-p text-center py-10">
          <p className="text-4xl mb-3">🆓</p>
          <p className="text-lg font-bold text-t1 mb-1">Free Plan</p>
          <p className="text-sm text-t2 mb-4">You're currently on the free plan with unlimited features</p>
          <button className="btn btn-secondary">View Plans</button>
        </div>
      )}
    </div>
  );
}
