import React from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Tags,
  LineChart,
  Bell,
  FileText,
  Users,
  Truck,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { RoleGuard } from './RoleGuard';
import { AlertBanner } from './AlertBanner';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Product } from '../../types';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Stock Movements', href: '/movements', icon: ArrowLeftRight },
      { label: 'Categories', href: '/categories', icon: Tags },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'DSS Dashboard', href: '/dss', icon: LineChart, roles: ['admin', 'manager'] },
      { label: 'Alerts Centre', href: '/alerts', icon: Bell, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Reports',
    items: [{ label: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'manager'] },
            { label: 'Suppliers', href: '/suppliers', icon: Truck, roles: ['admin', 'manager'] },

    ],
    
  },
  {
    label: 'Profile',
    items: [
      { label: 'Profile', href: '/profile', icon: Users,},
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Users', href: '/users', icon: Users, roles: ['admin'] },
      { label: 'Audit Trail', href: '/audit', icon: History, roles: ['admin'] },
      { label: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
    ],
  },
];

import { auth, signOut, db } from '../../firebase';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [dbAlertKeys, setDbAlertKeys] = React.useState<string[]>([]);
  const [derivedAlertKeys, setDerivedAlertKeys] = React.useState<string[]>([]);

  React.useEffect(() => {
    const alertsQuery = query(collection(db, 'alerts'));
    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const keys = snapshot.docs
        .map((alertDoc) => {
          const data = alertDoc.data() as any;
          const normalizedType = ['low_stock', 'slow_moving', 'out_of_stock'].includes(data.type)
            ? data.type
            : 'low_stock';
          const isAcknowledged =
            data.is_acknowledged === true || data.status === 'acknowledged' || data.status === 'resolved';

          if (isAcknowledged) return null;
          return `${normalizedType}:${data.product_id || alertDoc.id}`;
        })
        .filter(Boolean) as string[];

      setDbAlertKeys(keys);
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const productsQuery = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const keys = snapshot.docs.flatMap((productDoc) => {
        const product = { id: productDoc.id, ...productDoc.data() } as Product;
        const currentStock = Number(product.current_stock || 0);
        const reorderPoint = Number(product.reorder_point || 0);
        const nextKeys: string[] = [];

        if (currentStock <= 0) {
          nextKeys.push(`out_of_stock:${product.id}`);
        } else if (currentStock <= reorderPoint) {
          nextKeys.push(`low_stock:${product.id}`);
        }

        if (product.velocity === 'slow') {
          nextKeys.push(`slow_moving:${product.id}`);
        }

        return nextKeys;
      });

      setDerivedAlertKeys(keys);
    });

    return () => unsubscribe();
  }, []);

  const alertCount = React.useMemo(() => {
    return new Set([...derivedAlertKeys, ...dbAlertKeys]).size;
  }, [dbAlertKeys, derivedAlertKeys]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
    } catch (error) {
      console.error('Logout error:', error);
      logout(); // Still logout locally
    }
  };

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-primary-dark text-white flex flex-col transition-all duration-300 z-30',
          sidebarCollapsed ? 'w-[60px]' : 'w-[240px]'
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            {!sidebarCollapsed && <span className="font-bold text-lg tracking-tight">StockSense</span>}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 space-y-8 scrollbar-hide">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.roles || (user && item.roles.includes(user.role))
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="px-3">
                {!sidebarCollapsed && (
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 px-3">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
                        currentPath === item.href
                          ? 'bg-primary text-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-4">
          
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-danger/10 hover:text-danger transition-colors',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-neutral-100 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-700/60"
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            <div className="relative hidden md:block">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700/40"
              />
              <input
                type="text"
                placeholder="Global search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <RoleGuard roles={['admin', 'manager']}>
              <a href="/alerts" className="p-2 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-700/60 relative">
                <Bell size={20} />
                {alertCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-danger text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {alertCount > 99 ? '99+' : alertCount}
                  </span>
                )}
              </a>
            </RoleGuard>
            <div className="h-8 w-px bg-neutral-100 mx-2" />
            <a href="/profile">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-primary-dark">{user?.name}</p>
                  <p className="text-[10px] text-neutral-700/40 uppercase font-bold tracking-wider">
                    {user?.role}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {user?.name.charAt(0)}
                </div>
              </div>
            </a>
          </div>
        </header>

        {/* Global Alert Banner */}
        <RoleGuard roles={['admin', 'manager']}>
          <AlertBanner count={alertCount} onDismiss={() => {}} />
        </RoleGuard>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
