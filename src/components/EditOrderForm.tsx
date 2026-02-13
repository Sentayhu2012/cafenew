import { useState, useEffect } from 'react';
import { supabase, Menu, Order, OrderItem as OrderItemType } from '../lib/supabase';
import { X, Save, Trash2 } from 'lucide-react';

type OrderItem = {
  id: string;
  menu_id: string;
  quantity: number;
  menu: Menu;
  existing?: boolean;
};

type EditOrderFormProps = {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditOrderForm({ order, onClose, onSuccess }: EditOrderFormProps) {
  const [menuItems, setMenuItems] = useState<Menu[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [order.id]);

  const loadData = async () => {
    try {
      const [menuRes, itemsRes] = await Promise.all([
        supabase.from('menu').select('*').order('created_at', { ascending: false }),
        supabase.from('order_items').select('*').eq('order_id', order.id),
      ]);

      if (menuRes.error) throw menuRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setMenuItems(menuRes.data || []);

      const itemsWithMenu = await Promise.all(
        (itemsRes.data || []).map(async (item) => {
          const menu = (menuRes.data || []).find((m) => m.id === item.menu_id);
          return {
            ...item,
            menu: menu as Menu,
            existing: true,
          };
        })
      );

      setSelectedItems(itemsWithMenu);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load order data');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (menu: Menu) => {
    const existingItem = selectedItems.find((item) => item.menu_id === menu.id);
    if (existingItem) {
      setSelectedItems(
        selectedItems.map((item) =>
          item.menu_id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: `temp_${Date.now()}_${Math.random()}`,
          menu_id: menu.id,
          quantity: 1,
          menu,
        },
      ]);
    }
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
    } else {
      setSelectedItems(
        selectedItems.map((item) => (item.id === itemId ? { ...item, quantity } : item))
      );
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + item.menu.price * item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (selectedItems.length === 0) {
        throw new Error('Please add at least one item to the order');
      }

      const existingItems = selectedItems.filter((item) => item.existing);
      const newItems = selectedItems.filter((item) => !item.existing);

      if (existingItems.length > 0) {
        for (const item of existingItems) {
          const { error: updateError } = await supabase
            .from('order_items')
            .update({ quantity: item.quantity })
            .eq('id', item.id);

          if (updateError) throw updateError;
        }
      }

      if (newItems.length > 0) {
        const itemsToInsert = newItems.map((item) => ({
          order_id: order.id,
          menu_id: item.menu_id,
          quantity: item.quantity,
          price_at_purchase: item.menu.price,
        }));

        const { error: insertError } = await supabase.from('order_items').insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      const allCurrentItems = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', order.id);

      const existingItemIds = selectedItems.filter((s) => s.existing).map((s) => s.id);
      const itemsToDelete = allCurrentItems.data?.filter((item) => !existingItemIds.includes(item.id));

      if (itemsToDelete && itemsToDelete.length > 0) {
        const idsToDelete = itemsToDelete.map((item) => item.id);
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }

      const total = calculateTotal();
      const { error: orderError } = await supabase
        .from('orders')
        .update({ total_amount: total })
        .eq('id', order.id);

      if (orderError) throw orderError;

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading order...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Order - Table {order.table_number}</h1>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Menu Items</h2>

              {menuItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No menu items available</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addItem(item)}
                      className="text-left border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      {item.picture_url && (
                        <div className="h-32 bg-gray-200 rounded mb-2 overflow-hidden">
                          <img src={item.picture_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-blue-600 font-bold">${item.price.toFixed(2)}</div>
                      <div className="text-sm text-gray-500 mt-1">Click to add</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>

                <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                  {selectedItems.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No items added yet</div>
                  ) : (
                    <div className="space-y-3">
                      {selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded p-3 border ${
                            item.existing ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm">{item.menu.name}</div>
                              <div className="text-blue-600 font-bold text-sm">${item.menu.price.toFixed(2)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
                            >
                              -
                            </button>
                            <span className="px-3 font-semibold text-gray-900">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
                            >
                              +
                            </button>
                            <span className="ml-auto font-bold text-gray-900">
                              ${(item.menu.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-gray-200 pt-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || selectedItems.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
