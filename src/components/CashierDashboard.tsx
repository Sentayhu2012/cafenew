import { useState, useEffect } from 'react';
import { supabase, Payment, Order, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, X, BarChart3, Menu as MenuIcon, Users, Filter } from 'lucide-react';
import { PaymentsList } from './PaymentsList';
import { MenuManagement } from './MenuManagement';
import { OrderDetailsView } from './OrderDetailsView';
import { AllOrdersList } from './AllOrdersList';
import { PaginatedPayments } from './PaginatedPayments';
import { UserManagement } from './UserManagement';

type PaymentWithDetails = Payment & {
  order: Order;
  waiter: Profile;
};

export function CashierDashboard() {
  const { profile, signOut } = useAuth();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [orders, setOrders] = useState<(Order & { waiter: Profile })[]>([]);
  const [waiters, setWaiters] = useState<Profile[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [showMenuManagement, setShowMenuManagement] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
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
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWaiterId, setSelectedWaiterId] = useState('');

  useEffect(() => {
    loadPayments();
    loadWaiters();
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

  const loadWaiters = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'waiter')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setWaiters(data || []);
    } catch (error) {
      console.error('Error loading waiters:', error);
    }
  };

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

  const calculateTodayRevenue = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return payments
      .filter((p) => {
        if (p.status !== 'approved') return false;
        const confirmedDate = new Date(p.confirmed_at!);
        confirmedDate.setHours(0, 0, 0, 0);
        return confirmedDate.getTime() === today.getTime();
      })
      .reduce((sum, p) => sum + Number(p.amount) + Number(p.tip_amount), 0);
  };

  if (showMenuManagement) {
    return <MenuManagement onBack={() => setShowMenuManagement(false)} />;
  }

  if (showUserManagement) {
    return <UserManagement onBack={() => setShowUserManagement(false)} />;
  }

  if (showReports) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Reports</h2>
            <button
              onClick={() => setShowReports(false)}
              className="p-2 sm:p-3 hover:bg-gray-200 rounded-lg transition"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
            <PaymentsList
              payments={payments}
              onViewImage={setSelectedImage}
              onViewOrderDetails={(order, waiter) => setSelectedOrderDetails({ order, waiter })}
              isWaiter={false}
              isCashierReport={true}
            />
          </div>
        </div>

        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 sm:p-6 z-50">
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 sm:-top-12 right-0 p-2 sm:p-3 bg-white rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <img src={selectedImage} alt="Payment document" className="w-full rounded-lg shadow-2xl" />
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

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const approvedPayments = payments.filter((p) => p.status === 'approved');
  const declinedPayments = payments.filter((p) => p.status === 'declined');

  const filteredPendingPayments = pendingPayments.filter((payment) => {
    if (selectedDate) {
      const paymentDate = new Date(payment.submitted_at);
      const filterDate = new Date(selectedDate);
      paymentDate.setHours(0, 0, 0, 0);
      filterDate.setHours(0, 0, 0, 0);
      if (paymentDate.getTime() !== filterDate.getTime()) return false;
    }

    if (selectedWaiterId && payment.order.waiter_id !== selectedWaiterId) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cashier Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {profile?.full_name}</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowUserManagement(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition text-sm sm:text-base"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Users</span>
              </button>
              <button
                onClick={() => setShowMenuManagement(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition text-sm sm:text-base"
              >
                <MenuIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Menu</span>
              </button>
              <button
                onClick={() => setShowReports(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition text-sm sm:text-base"
              >
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Reports</span>
              </button>
              <button
                onClick={() => signOut()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
            <div className="text-blue-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Total Orders</div>
            <div className="text-2xl sm:text-4xl font-bold text-gray-900">{orders.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
            <div className="text-yellow-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Pending</div>
            <div className="text-2xl sm:text-4xl font-bold text-gray-900">{pendingPayments.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
            <div className="text-green-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Approved</div>
            <div className="text-2xl sm:text-4xl font-bold text-gray-900">{approvedPayments.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
            <div className="text-red-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Declined</div>
            <div className="text-2xl sm:text-4xl font-bold text-gray-900">{declinedPayments.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
            <div className="text-purple-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Today Revenue</div>
            <div className="text-xl sm:text-3xl font-bold text-gray-900">
              ${calculateTodayRevenue().toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
            <div className="text-emerald-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Total Revenue</div>
            <div className="text-xl sm:text-3xl font-bold text-gray-900">
              ${approvedPayments.reduce((sum, p) => sum + Number(p.amount) + Number(p.tip_amount), 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">All Orders</h2>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No orders yet</div>
          ) : (
            <AllOrdersList
              orders={orders}
              onViewDetails={(order, waiter) => setSelectedOrderDetails({ order, waiter })}
            />
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Pending Confirmations</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>
                {filteredPendingPayments.length} of {pendingPayments.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Waiter</label>
              <select
                value={selectedWaiterId}
                onChange={(e) => setSelectedWaiterId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="">All Waiters</option>
                {waiters.map((waiter) => (
                  <option key={waiter.id} value={waiter.id}>
                    {waiter.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedDate || selectedWaiterId ? (
            <div className="mb-4">
              <button
                onClick={() => {
                  setSelectedDate('');
                  setSelectedWaiterId('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading payments...</div>
          ) : (
            <PaginatedPayments
              payments={filteredPendingPayments}
              type="pending"
              onApprove={approvePayment}
              onDecline={(paymentId, orderId) => setDeclineModal({ paymentId, orderId })}
              onViewImage={setSelectedImage}
              onViewDetails={(order, waiter) => setSelectedOrderDetails({ order, waiter })}
            />
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Approved Payments</h2>
          <PaginatedPayments
            payments={approvedPayments}
            type="approved"
            onViewDetails={(order, waiter) => setSelectedOrderDetails({ order, waiter })}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Declined Payments</h2>
          <PaginatedPayments
            payments={declinedPayments}
            type="declined"
          />
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 sm:-top-12 right-0 p-2 sm:p-3 bg-white rounded-lg hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <img src={selectedImage} alt="Payment document" className="w-full rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

      {declineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-6 z-40">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Decline Payment</h3>
            <p className="text-gray-600 text-sm sm:text-base mb-4">Please provide a reason for declining this payment:</p>

            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter reason for decline..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none mb-4 text-sm sm:text-base"
              rows={4}
            />

            <div className="flex flex-col sm:flex-row gap-3">
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
