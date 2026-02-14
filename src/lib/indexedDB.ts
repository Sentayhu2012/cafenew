const DB_NAME = 'restaurant_offline_db';
const DB_VERSION = 1;
const STORES = {
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  MENU_ITEMS: 'menu_items',
  PENDING_OPERATIONS: 'pending_operations',
};

export type PendingOperation = {
  id: string;
  type: 'create_order' | 'update_order' | 'delete_order' | 'create_order_item' | 'update_order_item' | 'delete_order_item' | 'submit_payment';
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
};

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.ORDER_ITEMS)) {
          const orderItemsStore = db.createObjectStore(STORES.ORDER_ITEMS, { keyPath: 'id' });
          orderItemsStore.createIndex('order_id', 'order_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.MENU_ITEMS)) {
          db.createObjectStore(STORES.MENU_ITEMS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
          const opsStore = db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: 'id' });
          opsStore.createIndex('timestamp', 'timestamp', { unique: false });
          opsStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const op: PendingOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.PENDING_OPERATIONS, 'readwrite');
      const request = store.add(op);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.PENDING_OPERATIONS);
      const index = store.index('timestamp');
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateOperationStatus(id: string, status: PendingOperation['status'], retryCount?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.PENDING_OPERATIONS, 'readwrite');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.status = status;
          if (retryCount !== undefined) {
            operation.retryCount = retryCount;
          }
          const updateRequest = store.put(operation);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deletePendingOperation(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.PENDING_OPERATIONS, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveOrders(orders: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.ORDERS, 'readwrite');
      const promises = orders.map((order) => {
        return new Promise<void>((res, rej) => {
          const request = store.put(order);
          request.onsuccess = () => res();
          request.onerror = () => rej(request.error);
        });
      });
      Promise.all(promises).then(() => resolve()).catch(reject);
    });
  }

  async getOrders(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.ORDERS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveMenuItems(items: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.MENU_ITEMS, 'readwrite');
      const promises = items.map((item) => {
        return new Promise<void>((res, rej) => {
          const request = store.put(item);
          request.onsuccess = () => res();
          request.onerror = () => rej(request.error);
        });
      });
      Promise.all(promises).then(() => resolve()).catch(reject);
    });
  }

  async getMenuItems(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.MENU_ITEMS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDBService = new IndexedDBService();
