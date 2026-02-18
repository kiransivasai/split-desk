'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { icon: '📊', label: 'Home', href: '/dashboard' },
  { icon: '🤝', label: 'Friends', href: '/friends' },
  { icon: '✚', label: 'Add', href: '/expenses/new', isCenter: true },
  { icon: '👥', label: 'Groups', href: '/groups' },
  { icon: '🔔', label: 'Activity', href: '/activity' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-c1/95 backdrop-blur-lg border-t border-border">
      <div className="flex items-center justify-around py-1.5 px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center justify-center w-12 h-12 -mt-4 rounded-full bg-accent text-black font-bold text-xl shadow-lg shadow-accent/30"
              >
                {tab.icon}
              </Link>
            );
          }
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors
                ${isActive ? 'text-accent' : 'text-t3'}
              `}
            >
              <span className="text-[18px]">{tab.icon}</span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
