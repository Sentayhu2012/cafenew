import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { indexedDBService } from '../lib/indexedDB';
import { syncService } from '../lib/syncService';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

type SyncContextType = {
  isOnline: boolean;
  syncStatus: SyncStatus;
  hasPendingChanges: boolean;
  triggerSync: () => Promise<void>;
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  useEffect(() => {
    indexedDBService.init().catch(console.error);

    const handleOnline = async () => {
      setIsOnline(true);
      await triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncService.onSyncStatusChange((status) => {
      if (status === 'syncing') {
        setSyncStatus('syncing');
      } else if (status === 'synced') {
        setSyncStatus('synced');
        setHasPendingChanges(false);
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else if (status === 'error') {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 5000);
      }
    });

    checkPendingOperations();

    const intervalId = setInterval(checkPendingOperations, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const checkPendingOperations = async () => {
    const hasPending = await syncService.hasPendingOperations();
    setHasPendingChanges(hasPending);
  };

  const triggerSync = async () => {
    if (!isOnline) return;
    try {
      await syncService.syncPendingOperations();
      await checkPendingOperations();
    } catch (error) {
      console.error('Sync trigger error:', error);
    }
  };

  return (
    <SyncContext.Provider value={{ isOnline, syncStatus, hasPendingChanges, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
