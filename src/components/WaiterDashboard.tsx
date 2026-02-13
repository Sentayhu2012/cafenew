import { useState, useEffect, useMemo } from 'react';
import { supabase, Order, Payment, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, DollarSign, LogOut, BarChart3, X, Edit2, Eye, Calendar, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { CreateOrderForm } from './CreateOrderForm';
import { PaymentForm } from './PaymentForm';
import { PaymentsList } from './PaymentsList';
import { EditOrderForm } from './EditOrderForm';
import { OrderDetailsView } from './OrderDetailsView';

type PaymentWithOrder = Payment & { order: Order; waiter?: Profile };

export function WaiterDashboard() {
  const { profile, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentWithOrder[]>([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const paymentsWithOrders = await Promise.all(
        (paymentsData || []).map(async (payment) => {
          const { data: orderData } = await supabase
            .from('orders')
            .select('*')
            .eq('id', payment.order_id)
            .maybeSingle();

          if (!orderData) {
            return { ...payment, order: orderData as Order };
          }

          const { data: waiterData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', orderData.waiter_id)
            .maybeSingle();

          return { ...payment, order: orderData as Order, waiter: waiterData as Profile };
        })
      );

      setPayments(paymentsWithOrders.filter((p) => p.order) as PaymentWithOrder[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderCreated = () => {
    setShowCreateOrder(false);
    setEditingOrder(null);
    loadData();
  };

  const handlePaymentSubmitted = () => {
    setSelectedOrder(null);
    loadData();
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);

      if (error) throw error;

      loadData();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const dateMatch = !dateFilter || new Date(order.created_at).toISOString().split('T')[0] === dateFilter;
      const statusMatch = !statusFilter || order.status === statusFilter;
      return dateMatch && statusMatch;
    });
  }, [orders, dateFilter, statusFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (showCreateOrder) {
    return <CreateOrderForm onClose={() => setShowCreateOrder(false)} onSuccess={handleOrderCreated} />;
  }

  if (editingOrder) {
    return <EditOrderForm order={editingOrder} onClose={() => setEditingOrder(null)} onSuccess={handleOrderCreated} />;
  }

  if (selectedOrder) {
    return <PaymentForm order={selectedOrder} onClose={() => setSelectedOrder(null)} onSuccess={handlePaymentSubmitted} />;
  }

  if (showReports) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Payment Reports</h2>
            <button
              onClick={() => setShowReports(false)}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <PaymentsList
              payments={payments}
              onViewImage={setSelectedImage}
              onViewOrderDetails={(order, waiter) => {
                setSelectedOrderDetails(order);
                setSelectedWaiter(waiter);
              }}
              isWaiter={true}
            />
          </div>
        </div>

        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-6 z-50">
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 p-2 bg-white rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-6 h-6" />
              </button>
              <img src={selectedImage} alt="Payment document" className="w-full rounded-lg shadow-2xl" />
            </div>
          </div>
        )}

        {selectedOrderDetails && selectedWaiter && (
          <OrderDetailsView
            order={selectedOrderDetails}
            waiter={selectedWaiter}
            onClose={() => {
              setSelectedOrderDetails(null);
              setSelectedWaiter(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Waiter Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {profile?.full_name}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReports(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition"
              >
                <BarChart3 className="w-5 h-5" />
                Reports
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateOrder(true)}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 mb-6 shadow-lg"
        >
          <Plus className="w-6 h-6" />
          Create New Order
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Orders</h2>

          <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {dateFilter && (
                    <button
                      onClick={() => {
                        setDateFilter('');
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="paid">Paid</option>
                  </select>
                  {statusFilter && (
                    <button
                      onClick={() => {
                        setStatusFilter('');
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {filteredOrders.length > 0 && (
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {dateFilter ? 'No orders found for the selected date' : 'No orders yet. Create your first order!'}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">
                          Table {order.table_number}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'paid'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        ${Number(order.total_amount).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                      <button
                        onClick={() => {
                          setSelectedOrderDetails(order);
                          setSelectedWaiter(profile);
                        }}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                      >
                        <Eye className="w-5 h-5" />
                        View Details
                      </button>
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setEditingOrder(order)}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                          >
                            <Edit2 className="w-5 h-5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition font-medium"
                          >
                            <Trash2 className="w-5 h-5" />
                            Delete
                          </button>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                          >
                            <DollarSign className="w-5 h-5" />
                            Record Payment
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg font-medium transition ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedOrderDetails && selectedWaiter && (
        <OrderDetailsView
          order={selectedOrderDetails}
          waiter={selectedWaiter}
          onClose={() => {
            setSelectedOrderDetails(null);
            setSelectedWaiter(null);
          }}
        />
      )}
    </div>
  );
}
