import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/auth.store';
import { auth, onAuthStateChanged, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
import { RoleGuard } from './components/ui/RoleGuard';
import { logAuditEvent } from './lib/audit';

export default function App() {
  const { isAuthenticated, setUser, logout, user: currentUser } = useAuthStore();
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  
  // Simple router based on pathname
  const [path, setPath] = React.useState(typeof window !== 'undefined' ? window.location.pathname : '/');

  React.useEffect(() => {
    // Sync with Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUser(userData as any, await firebaseUser.getIdToken());
          } else {
            // New user - bootstrap with staff role
            const newUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'New User',
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'philipojedokun942@gmail.com' ? 'admin' : 'staff',
              status: 'active',
              last_login_at: new Date().toISOString(),
            };
            await setDoc(userRef, newUser);
            await logAuditEvent({
              userId: firebaseUser.uid,
              action: 'CREATE',
              entityType: 'User',
              entityId: firebaseUser.uid,
              details: `Auto-created user profile for ${newUser.email}`,
            });
            setUser(newUser as any, await firebaseUser.getIdToken());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          logout();
        }
      } else {
        logout();
      }
      setIsAuthReady(true);
    });

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
      unsubscribe();
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  // Basic routing logic
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-700/60 font-medium">Initializing StockSense...</p>
        </div>
      </div>
    );
  }

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
    const productDetailMatch = path.match(/^\/products\/([^/]+)$/);
    const productEditMatch = path.match(/^\/products\/([^/]+)\/edit$/);

    if (productDetailMatch && !['new'].includes(productDetailMatch[1])) return <ProductDetailPage id={productDetailMatch[1]} />;
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
        return <RoleGuard roles={['admin']}><UserManagementPage /></RoleGuard>;
      case '/audit':
        return <RoleGuard roles={['admin']}><AuditTrailPage /></RoleGuard>;
      case '/suppliers':
        return <RoleGuard roles={['admin', 'manager']}><SupplierManagementPage /></RoleGuard>;
      case '/categories':
        return <RoleGuard roles={['admin', 'manager']}><CategoryManagementPage /></RoleGuard>;
      // case '/settings':
      //   return <RoleGuard roles={['admin']}><SettingsPage /></RoleGuard>;
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




