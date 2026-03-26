import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/auth.store';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductFormPage from './pages/ProductFormPage';
import StockMovementsPage from './pages/StockMovementsPage';
import DSSDashboardPage from './pages/DSSDashboardPage';
import AlertsCentrePage from './pages/AlertsCentrePage';
import ReportsPage from './pages/ReportsPage';
import UserManagementPage from './pages/UserManagementPage';
import AuditTrailPage from './pages/AuditTrailPage';
import SupplierManagementPage from './pages/SupplierManagementPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import { AppShell } from './components/ui/AppShell';

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Simple router based on pathname
  const [path, setPath] = React.useState(typeof window !== 'undefined' ? window.location.pathname : '/');

  React.useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    
    // Handle link clicks
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
        e.preventDefault();
        window.history.pushState({}, '', anchor.href);
        handleLocationChange();
      }
    };
    document.addEventListener('click', handleLinkClick);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  // Basic routing logic
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" />
      </>
    );
  }

  const renderContent = () => {
    // Match dynamic routes
    const productDetailMatch = path.match(/^\/products\/(\d+)$/);
    const productEditMatch = path.match(/^\/products\/(\d+)\/edit$/);

    if (productDetailMatch) return <ProductDetailPage id={productDetailMatch[1]} />;
    if (productEditMatch) return <ProductFormPage id={productEditMatch[1]} />;

    switch (path) {
      case '/dashboard':
      case '/login':
      case '/':
        return <DashboardPage />;
      case '/products':
        return <ProductListPage />;
      case '/products/new':
        return <ProductFormPage />;
      case '/movements':
        return <StockMovementsPage />;
      case '/dss':
        return <DSSDashboardPage />;
      case '/alerts':
        return <AlertsCentrePage />;
      case '/reports':
        return <ReportsPage />;
      case '/users':
        return <UserManagementPage />;
      case '/audit':
        return <AuditTrailPage />;
      case '/suppliers':
        return <SupplierManagementPage />;
      case '/categories':
        return <CategoryManagementPage />;
      case '/settings':
        return <SettingsPage />;
      case '/profile':
        return <ProfilePage />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <h1 className="text-4xl font-bold text-primary-dark mb-4">404</h1>
            <p className="text-neutral-700/60 mb-8">This page is under construction or doesn't exist.</p>
            <a href="/dashboard" className="px-6 py-2 bg-primary text-white rounded-lg font-bold">
              Back to Dashboard
            </a>
          </div>
        );
    }
  };

  return (
    <>
      <AppShell>
        {renderContent()}
      </AppShell>
      <Toaster position="top-right" />
    </>
  );
}




