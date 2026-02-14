import { supabase } from './supabase';
import { indexedDBService, PendingOperation } from './indexedDB';

class SyncService {
  private isSyncing = false;
  private syncCallbacks: Array<(status: 'syncing' | 'synced' | 'error') => void> = [];

  async syncPendingOperations(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    this.notifyCallbacks('syncing');

    try {
      const operations = await indexedDBService.getPendingOperations();
      const pendingOps = operations.filter((op) => op.status === 'pending' || op.status === 'failed');

      if (pendingOps.length === 0) {
        this.isSyncing = false;
        return;
      }

      for (const operation of pendingOps) {
        try {
          await indexedDBService.updateOperationStatus(operation.id, 'syncing');
          await this.executeOperation(operation);
          await indexedDBService.deletePendingOperation(operation.id);
        } catch (error) {
          console.error('Failed to sync operation:', operation, error);
          await indexedDBService.updateOperationStatus(
            operation.id,
            'failed',
            operation.retryCount + 1
          );
        }
      }

      this.notifyCallbacks('synced');
    } catch (error) {
      console.error('Sync error:', error);
      this.notifyCallbacks('error');
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeOperation(operation: PendingOperation): Promise<void> {
    switch (operation.type) {
      case 'create_order':
        await this.createOrder(operation.data);
        break;
      case 'update_order':
        await this.updateOrder(operation.data);
        break;
      case 'delete_order':
        await this.deleteOrder(operation.data);
        break;
      case 'create_order_item':
        await this.createOrderItem(operation.data);
        break;
      case 'update_order_item':
        await this.updateOrderItem(operation.data);
        break;
      case 'delete_order_item':
        await this.deleteOrderItem(operation.data);
        break;
      case 'submit_payment':
        await this.submitPayment(operation.data);
        break;
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  }

  private async createOrder(data: any): Promise<void> {
    const { error } = await supabase.from('orders').insert([
      {
        id: data.id,
        table_number: data.table_number,
        waiter_id: data.waiter_id,
        status: data.status,
        total_amount: data.total_amount,
      },
    ]);

    if (error) throw error;

    if (data.items && data.items.length > 0) {
      const { error: itemsError } = await supabase.from('order_items').insert(
        data.items.map((item: any) => ({
          id: item.id,
          order_id: data.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price: item.price,
        }))
      );

      if (itemsError) throw itemsError;
    }
  }

  private async updateOrder(data: any): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        table_number: data.table_number,
        status: data.status,
        total_amount: data.total_amount,
      })
      .eq('id', data.id);

    if (error) throw error;
  }

  private async deleteOrder(data: any): Promise<void> {
    const { error } = await supabase.from('orders').delete().eq('id', data.id);
    if (error) throw error;
  }

  private async createOrderItem(data: any): Promise<void> {
    const { error } = await supabase.from('order_items').insert([
      {
        id: data.id,
        order_id: data.order_id,
        menu_item_id: data.menu_item_id,
        quantity: data.quantity,
        price: data.price,
      },
    ]);

    if (error) throw error;

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount')
      .eq('id', data.order_id)
      .maybeSingle();

    if (!orderError && orderData) {
      const newTotal = Number(orderData.total_amount || 0) + Number(data.price) * data.quantity;
      await supabase.from('orders').update({ total_amount: newTotal }).eq('id', data.order_id);
    }
  }

  private async updateOrderItem(data: any): Promise<void> {
    const { data: oldItem, error: fetchError } = await supabase
      .from('order_items')
      .select('price, quantity')
      .eq('id', data.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('order_items')
      .update({
        quantity: data.quantity,
      })
      .eq('id', data.id);

    if (error) throw error;

    if (oldItem) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, total_amount')
        .eq('id', data.order_id)
        .maybeSingle();

      if (!orderError && orderData) {
        const oldTotal = Number(oldItem.price) * oldItem.quantity;
        const newTotal = Number(oldItem.price) * data.quantity;
        const updatedTotal = Number(orderData.total_amount || 0) - oldTotal + newTotal;
        await supabase.from('orders').update({ total_amount: updatedTotal }).eq('id', data.order_id);
      }
    }
  }

  private async deleteOrderItem(data: any): Promise<void> {
    const { data: item, error: fetchError } = await supabase
      .from('order_items')
      .select('price, quantity, order_id')
      .eq('id', data.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const { error } = await supabase.from('order_items').delete().eq('id', data.id);
    if (error) throw error;

    if (item) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, total_amount')
        .eq('id', item.order_id)
        .maybeSingle();

      if (!orderError && orderData) {
        const itemTotal = Number(item.price) * item.quantity;
        const updatedTotal = Number(orderData.total_amount || 0) - itemTotal;
        await supabase.from('orders').update({ total_amount: updatedTotal }).eq('id', item.order_id);
      }
    }
  }

  private async submitPayment(data: any): Promise<void> {
    const { error } = await supabase.from('payments').insert([
      {
        id: data.id,
        order_id: data.order_id,
        amount: data.amount,
        tip_amount: data.tip_amount,
        payment_method: data.payment_method,
        status: data.status,
      },
    ]);

    if (error) throw error;
  }

  onSyncStatusChange(callback: (status: 'syncing' | 'synced' | 'error') => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter((cb) => cb !== callback);
    };
  }

  private notifyCallbacks(status: 'syncing' | 'synced' | 'error'): void {
    this.syncCallbacks.forEach((cb) => cb(status));
  }

  async hasPendingOperations(): Promise<boolean> {
    const operations = await indexedDBService.getPendingOperations();
    return operations.some((op) => op.status === 'pending' || op.status === 'failed');
  }
}

export const syncService = new SyncService();
