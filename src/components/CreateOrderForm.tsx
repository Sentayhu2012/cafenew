import { useState, useEffect } from 'react';
import { supabase, Menu } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineOperations } from '../hooks/useOfflineOperations';
import { indexedDBService } from '../lib/indexedDB';
import { X, Save, Plus, Trash2 } from 'lucide-react';

type OrderItem = {
  menu_id: string;
  quantity: number;
  menu: Menu;
};

type CreateOrderFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function CreateOrderForm({ onClose, onSuccess }: CreateOrderFormProps) {
  const { user } = useAuth();
  const { isOnline, createOrder } = useOfflineOperations();
  const [menuItems, setMenuItems] = useState<Menu[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      if (isOnline) {
        const { data, error: err } = await supabase.from('menu').select('*').order('created_at', { ascending: false });
        if (err) throw err;
        setMenuItems(data || []);
        await indexedDBService.saveMenuItems(data || []);
      } else {
        const cachedMenu = await indexedDBService.getMenuItems();
        setMenuItems(cachedMenu);
      }
    } catch (err) {
      console.error('Error loading menu items:', err);
      const cachedMenu = await indexedDBService.getMenuItems();
      if (cachedMenu.length > 0) {
        setMenuItems(cachedMenu);
      } else {
        setError('Failed to load menu items');
      }
    } finally {
      setMenuLoading(false);
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
      setSelectedItems([...selectedItems, { menu_id: menu.id, quantity: 1, menu }]);
    }
  };

  const removeItem = (menu_id: string) => {
    setSelectedItems(selectedItems.filter((item) => item.menu_id !== menu_id));
  };

  const updateQuantity = (menu_id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menu_id);
    } else {
      setSelectedItems(
        selectedItems.map((item) => (item.menu_id === menu_id ? { ...item, quantity } : item))
      );
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + item.menu.price * item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!tableNumber.trim()) {
        throw new Error('Please enter a table number');
      }

      if (selectedItems.length === 0) {
        throw new Error('Please add at least one item to the order');
      }

      const total = calculateTotal();

      const orderData = {
        waiter_id: user?.id,
        table_number: tableNumber,
        total_amount: total,
        status: 'pending',
        items: selectedItems.map((item) => ({
          menu_item_id: item.menu_id,
          quantity: item.quantity,
          price: item.menu.price,
        })),
      };

      await createOrder(orderData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  if (menuLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading menu items...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Menu Items</h2>

              {menuLoading ? (
                <div className="text-center py-8 text-gray-500">Loading menu...</div>
              ) : menuItems.length === 0 ? (
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Table Number</label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., A1"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                  {selectedItems.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No items added yet</div>
                  ) : (
                    <div className="space-y-3">
                      {selectedItems.map((item) => (
                        <div key={item.menu_id} className="bg-white rounded p-3 border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm">{item.menu.name}</div>
                              <div className="text-blue-600 font-bold text-sm">${item.menu.price.toFixed(2)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.menu_id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.menu_id, item.quantity - 1)}
                              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
                            >
                              -
                            </button>
                            <span className="px-3 font-semibold text-gray-900">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.menu_id, item.quantity + 1)}
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
                    disabled={loading || selectedItems.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Creating...' : 'Create Order'}
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
