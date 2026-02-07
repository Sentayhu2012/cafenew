import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { WaiterDashboard } from './components/WaiterDashboard';
import { CashierDashboard } from './components/CashierDashboard';

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

  if (profile.role === 'waiter') {
    return <WaiterDashboard />;
  }

  if (profile.role === 'cashier') {
    return <CashierDashboard />;
  }

  return null;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
