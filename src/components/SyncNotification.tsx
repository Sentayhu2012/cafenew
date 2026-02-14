import { useEffect, useState } from 'react';
import { useSync } from '../contexts/SyncContext';
import { WifiOff, Wifi, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export function SyncNotification() {
  const { isOnline, syncStatus, hasPendingChanges } = useSync();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (syncStatus === 'synced') {
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  if (!isOnline) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-orange-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down">
        <WifiOff className="w-5 h-5" />
        <span className="font-medium">Offline Mode</span>
        {hasPendingChanges && (
          <span className="text-sm opacity-90">(Changes will sync when online)</span>
        )}
      </div>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="font-medium">Syncing...</span>
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">Sync Error - Will retry</span>
      </div>
    );
  }

  if (showNotification && syncStatus === 'synced') {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down">
        <CheckCircle className="w-5 h-5" />
        <span className="font-medium">Synced!</span>
      </div>
    );
  }

  if (hasPendingChanges && isOnline) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-yellow-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
        <Wifi className="w-4 h-4" />
        <span>Pending changes</span>
      </div>
    );
  }

  return null;
}
