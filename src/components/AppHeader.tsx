import { LogOut } from 'lucide-react';
import type { UserProfile } from '../types';

export type AdminTab = 'requests' | 'workers' | 'report' | 'settings';

interface AppHeaderProps {
  user: UserProfile | null;
  activeTab?: AdminTab;
  onSelectTab?: (tab: AdminTab) => void;
  onSignOut: () => void;
}

const ADMIN_NAV_ITEMS: { id: AdminTab; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'workers', label: 'Workers' },
  { id: 'report', label: 'Report' },
  { id: 'settings', label: 'Settings' },
];

export function AppHeader({ user, activeTab, onSelectTab, onSignOut }: AppHeaderProps) {
  const isAdminActive = user?.role === 'admin' && activeTab && onSelectTab;

  return (
    <div className="no-print sticky top-0 z-30">
      <header className="bg-[#1B2023] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 sm:gap-8">
          <span className="font-condensed text-2xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
            Site Requests
          </span>

          {isAdminActive ? (
            <nav
              aria-label="Admin sections"
              className="hidden md:flex items-center gap-6"
            >
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`min-h-[44px] px-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'text-[#F2C200] border-[#F2C200]'
                        : 'text-[#C5CCD1] border-transparent hover:text-white hover:border-[#6A737A]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          ) : (
            <div className="hidden md:block flex-1" />
          )}

          {user ? (
            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:inline-block text-xs text-[#C5CCD1] truncate max-w-[180px]">
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="min-h-[44px] px-3 py-2 text-xs font-semibold text-white bg-[#2A3136] hover:bg-[#384147] border border-[#454F56] rounded-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="shrink-0" />
          )}
        </div>

        {isAdminActive && (
          <nav
            aria-label="Admin sections mobile"
            className="md:hidden border-t border-[#2E353A] bg-[#1B2023]"
          >
            <div className="max-w-7xl mx-auto px-2 grid grid-cols-4">
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`min-h-[44px] px-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'text-[#F2C200] border-[#F2C200]'
                        : 'text-[#C5CCD1] border-transparent hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </header>
      <div className="hazard-stripe" aria-hidden="true" />
    </div>
  );
}
