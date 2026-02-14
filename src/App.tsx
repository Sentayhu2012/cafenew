import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SyncProvider, useSync } from './contexts/SyncContext';
import { AuthForm } from './components/AuthForm';
import { WaiterDashboard } from './components/WaiterDashboard';
import { CashierDashboard } from './components/CashierDashboard';
import { SyncNotification } from './components/SyncNotification';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-2xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthForm />;
  }

  return (
    <>
      <SyncNotification />
      {profile.role === 'waiter' && <WaiterDashboard />}
      {profile.role === 'cashier' && <CashierDashboard />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <AppContent />
      </SyncProvider>
    </AuthProvider>
  );
}

export default App;
