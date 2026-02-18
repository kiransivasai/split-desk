'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const navItems = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard' },
  { icon: '💸', label: 'Expenses', href: '/expenses' },
  { icon: '👥', label: 'Groups', href: '/groups' },
  { icon: '🤝', label: 'Friends', href: '/friends' },
  { icon: '🔔', label: 'Activity', href: '/activity' },
  { icon: '📈', label: 'Analytics', href: '/analytics' },
  { icon: '⚙️', label: 'Settings', href: '/settings' },
];

export default function Sidebar({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const initials = session?.user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <aside className="w-[240px] h-full bg-c1 border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-bold text-sm">S</span>
          </div>
          <span className="text-lg font-bold glow-text">SplitDesk</span>
        </Link>
        <button onClick={onClose} className="md:hidden btn-ghost p-1">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Quick Add */}
      <div className="px-4 mb-4">
        <Link
          href="/expenses/new"
          onClick={onClose}
          className="btn btn-primary w-full justify-center py-2.5 text-sm"
        >
          <span>＋</span> Add Expense
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-bold text-t3 uppercase tracking-widest">Navigation</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-r text-[13px] font-medium transition-all
                ${isActive
                  ? 'bg-accent-dim text-accent border-l-2 border-accent'
                  : 'text-t2 hover:bg-c2 hover:text-t1'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="av av-sm av-accent">{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-t1 truncate">{session?.user?.name || 'User'}</p>
            <p className="text-[11px] text-t3 truncate">{session?.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn-ghost p-1.5 text-t3 hover:text-red"
            title="Sign out"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
