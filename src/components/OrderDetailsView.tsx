import { useState, useEffect } from 'react';
import { supabase, Order, OrderItem as OrderItemType, Menu, Profile } from '../lib/supabase';
import { X } from 'lucide-react';

type OrderDetailsViewProps = {
  order: Order;
  waiter: Profile;
  onClose: () => void;
};

type OrderItemWithMenu = OrderItemType & { menu: Menu };

export function OrderDetailsView({ order, waiter, onClose }: OrderDetailsViewProps) {
  const [items, setItems] = useState<OrderItemWithMenu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [order.id]);

  const loadItems = async () => {
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      const itemsWithMenu = await Promise.all(
        (itemsData || []).map(async (item) => {
          const { data: menuData } = await supabase
            .from('menu')
            .select('*')
            .eq('id', item.menu_id)
            .maybeSingle();

          return { ...item, menu: menuData as Menu };
        })
      );

      setItems(itemsWithMenu);
    } catch (err) {
      console.error('Error loading order items:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Order Details</h2>
          <button onClick={onClose} className="p-2 sm:p-3 hover:bg-gray-100 rounded-lg transition flex-shrink-0">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Table Number</div>
              <div className="text-xl font-bold text-gray-900">{order.table_number}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Waiter</div>
              <div className="text-xl font-bold text-gray-900">{waiter.full_name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Date</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date(order.created_at).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className={`text-lg font-bold ${order.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                {order.status.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-900 mb-4">Items Ordered</h3>

            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No items found</div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.menu.name}</div>
                      <div className="text-sm text-gray-600">
                        ${item.price_at_purchase.toFixed(2)} × {item.quantity}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      ${(item.price_at_purchase * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total Amount:</span>
              <span className="text-3xl font-bold text-blue-600">${Number(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
