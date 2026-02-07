import { useState, useEffect } from 'react';
import { supabase, Payment, Order, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, LogOut, Eye, X, XCircle, BarChart3, Menu } from 'lucide-react';
import { PaymentsList } from './PaymentsList';
import { MenuManagement } from './MenuManagement';
import { OrderDetailsView } from './OrderDetailsView';

type PaymentWithDetails = Payment & {
  order: Order;
  waiter: Profile;
};

export function CashierDashboard() {
  const { profile, signOut } = useAuth();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [orders, setOrders] = useState<(Order & { waiter: Profile })[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [showMenuManagement, setShowMenuManagement] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<{
    order: Order;
    waiter: Profile;
  } | null>(null);
  const [declineModal, setDeclineModal] = useState<{
    paymentId: string;
    orderId: string;
  } | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
    const subscription = supabase
      .channel('payments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        loadPayments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadPayments = async () => {
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const paymentsWithDetails = await Promise.all(
        (paymentsData || []).map(async (payment) => {
          const { data: orderData } = await supabase
            .from('orders')
            .select('*')
            .eq('id', payment.order_id)
            .maybeSingle();

          const { data: waiterData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', orderData?.waiter_id)
            .maybeSingle();

          return {
            ...payment,
            order: orderData as Order,
            waiter: waiterData as Profile,
          };
        })
      );

      setPayments(paymentsWithDetails.filter((p) => p.order && p.waiter));

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const ordersWithWaiters = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: waiterData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', order.waiter_id)
            .maybeSingle();

          return {
            ...order,
            waiter: waiterData as Profile,
          };
        })
      );

      setOrders(ordersWithWaiters.filter((o) => o.waiter));
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const approvePayment = async (paymentId: string, orderId: string) => {
    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'approved',
          confirmed_at: new Date().toISOString(),
          confirmed_by: profile?.id,
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      loadPayments();
    } catch (error) {
      console.error('Error approving payment:', error);
    }
  };

  const declinePayment = async () => {
    if (!declineModal || !declineReason.trim()) return;

    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          declined_reason: declineReason,
          confirmed_by: profile?.id,
        })
        .eq('id', declineModal.paymentId);

      if (paymentError) throw paymentError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', declineModal.orderId);

      if (orderError) throw orderError;

      setDeclineModal(null);
      setDeclineReason('');
      loadPayments();
    } catch (error) {
      console.error('Error declining payment:', error);
    }
  };

  if (showMenuManagement) {
    return <MenuManagement />;
  }

  if (showReports) {
    const reportPayments = payments;

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 p-6">
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
              payments={reportPayments}
              onViewImage={setSelectedImage}
              isWaiter={false}
              isCashierReport={true}
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
      </div>
    );
  }

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const approvedPayments = payments.filter((p) => p.status === 'approved');
  const declinedPayments = payments.filter((p) => p.status === 'declined');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cashier Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {profile?.full_name}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMenuManagement(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition"
              >
                <Menu className="w-5 h-5" />
                Menu
              </button>
              <button
                onClick={() => setShowReports(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition"
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-blue-600 text-sm font-medium mb-2">Total Orders</div>
            <div className="text-4xl font-bold text-gray-900">{orders.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-yellow-600 text-sm font-medium mb-2">Pending Payments</div>
            <div className="text-4xl font-bold text-gray-900">{pendingPayments.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-green-600 text-sm font-medium mb-2">Approved</div>
            <div className="text-4xl font-bold text-gray-900">{approvedPayments.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-red-600 text-sm font-medium mb-2">Declined</div>
            <div className="text-4xl font-bold text-gray-900">{declinedPayments.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-emerald-600 text-sm font-medium mb-2">Total Revenue</div>
            <div className="text-4xl font-bold text-gray-900">
              ${approvedPayments.reduce((sum, p) => sum + Number(p.amount) + Number(p.tip_amount), 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Orders</h2>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No orders yet</div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">Table {order.table_number}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'paid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{order.waiter.full_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</div>
                      <button
                        onClick={() => setSelectedOrderDetails({ order, waiter: order.waiter })}
                        className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Confirmations</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading payments...</div>
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No pending payments</div>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="border-2 border-yellow-200 bg-yellow-50 rounded-xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl font-bold text-gray-900">Table {payment.order.table_number}</span>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          PENDING
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-600">Waiter</div>
                          <div className="font-semibold text-gray-900">{payment.waiter.full_name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Payment Method</div>
                          <div className="font-semibold text-gray-900">
                            {payment.payment_method === 'cash' ? '💵 Cash' : '🏦 Bank Transfer'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Amount</div>
                          <div className="text-2xl font-bold text-gray-900">${Number(payment.amount).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Tip</div>
                          <div className="text-2xl font-bold text-green-600">${Number(payment.tip_amount).toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {payment.transfer_screenshot_url && (
                          <button
                            onClick={() => setSelectedImage(payment.transfer_screenshot_url!)}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Screenshot
                          </button>
                        )}
                        {payment.receipt_url && (
                          <button
                            onClick={() => setSelectedImage(payment.receipt_url!)}
                            className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-col">
                      <button
                        onClick={() => approvePayment(payment.id, payment.order_id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve
                      </button>
                      <button
                        onClick={() => setDeclineModal({ paymentId: payment.id, orderId: payment.order_id })}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        <XCircle className="w-5 h-5" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Approved Payments</h2>

          {approvedPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No approved payments</div>
          ) : (
            <div className="space-y-3">
              {approvedPayments.map((payment) => (
                <div key={payment.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">Table {payment.order.table_number}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          APPROVED
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="text-gray-600">
                          Amount: <span className="font-bold">${Number(payment.amount).toFixed(2)}</span>
                        </span>
                        <span className="text-gray-600">
                          Tip: <span className="font-bold text-green-600">${Number(payment.tip_amount).toFixed(2)}</span>
                        </span>
                        <span className="text-gray-600">{payment.waiter.full_name}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(payment.confirmed_at!).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Declined Payments</h2>

          {declinedPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No declined payments</div>
          ) : (
            <div className="space-y-3">
              {declinedPayments.map((payment) => (
                <div key={payment.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">Table {payment.order.table_number}</span>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                          DECLINED
                        </span>
                      </div>
                      {payment.declined_reason && (
                        <div className="text-sm text-red-700 mb-2">
                          <span className="font-medium">Reason: </span>
                          {payment.declined_reason}
                        </div>
                      )}
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-600">
                          Amount: <span className="font-bold">${Number(payment.amount).toFixed(2)}</span>
                        </span>
                        <span className="text-gray-600">{payment.waiter.full_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {declineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Decline Payment</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for declining this payment:</p>

            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter reason for decline..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none mb-4"
              rows={4}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeclineModal(null);
                  setDeclineReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={declinePayment}
                disabled={!declineReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrderDetails && (
        <OrderDetailsView
          order={selectedOrderDetails.order}
          waiter={selectedOrderDetails.waiter}
          onClose={() => setSelectedOrderDetails(null)}
        />
      )}
    </div>
  );
}
