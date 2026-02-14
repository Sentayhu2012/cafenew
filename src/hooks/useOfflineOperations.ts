import { useSync } from '../contexts/SyncContext';
import { supabase } from '../lib/supabase';
import { indexedDBService } from '../lib/indexedDB';

export function useOfflineOperations() {
  const { isOnline, triggerSync } = useSync();

  const createOrder = async (orderData: any) => {
    if (isOnline) {
      const { data, error } = await supabase.from('orders').insert([orderData]).select().single();
      if (error) throw error;
      return data;
    } else {
      await indexedDBService.addPendingOperation({
        type: 'create_order',
        data: orderData,
        status: 'pending',
      });
      return orderData;
    }
  };

  const updateOrder = async (orderId: string, updates: any) => {
    if (isOnline) {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await indexedDBService.addPendingOperation({
        type: 'update_order',
        data: { id: orderId, ...updates },
        status: 'pending',
      });
      return { id: orderId, ...updates };
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (isOnline) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
    } else {
      await indexedDBService.addPendingOperation({
        type: 'delete_order',
        data: { id: orderId },
        status: 'pending',
      });
    }
  };

  const createOrderItem = async (itemData: any) => {
    if (isOnline) {
      const { data, error } = await supabase.from('order_items').insert([itemData]).select().single();
      if (error) throw error;
      return data;
    } else {
      await indexedDBService.addPendingOperation({
        type: 'create_order_item',
        data: itemData,
        status: 'pending',
      });
      return itemData;
    }
  };

  const updateOrderItem = async (itemId: string, updates: any) => {
    if (isOnline) {
      const { data, error } = await supabase
        .from('order_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await indexedDBService.addPendingOperation({
        type: 'update_order_item',
        data: { id: itemId, ...updates },
        status: 'pending',
      });
      return { id: itemId, ...updates };
    }
  };

  const deleteOrderItem = async (itemId: string) => {
    if (isOnline) {
      const { error } = await supabase.from('order_items').delete().eq('id', itemId);
      if (error) throw error;
    } else {
      await indexedDBService.addPendingOperation({
        type: 'delete_order_item',
        data: { id: itemId },
        status: 'pending',
      });
    }
  };

  const submitPayment = async (paymentData: any) => {
    if (isOnline) {
      const { data, error } = await supabase.from('payments').insert([paymentData]).select().single();
      if (error) throw error;
      return data;
    } else {
      await indexedDBService.addPendingOperation({
        type: 'submit_payment',
        data: paymentData,
        status: 'pending',
      });
      return paymentData;
    }
  };

  return {
    isOnline,
    createOrder,
    updateOrder,
    deleteOrder,
    createOrderItem,
    updateOrderItem,
    deleteOrderItem,
    submitPayment,
    triggerSync,
  };
}
