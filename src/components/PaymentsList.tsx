import { useState, useMemo } from 'react';
import { Eye, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

type Payment = {
  id: string;
  order_id: string;
  payment_method: string;
  amount: number;
  tip_amount: number;
  transfer_screenshot_url: string | null;
  receipt_url: string | null;
  status: 'pending' | 'approved' | 'declined';
  submitted_at: string;
  confirmed_at: string | null;
  declined_reason: string | null;
};

type Order = {
  id: string;
  table_number: string;
  waiter_id?: string;
};

type Waiter = {
  id: string;
  full_name: string;
  active?: boolean;
};

type PaymentsListProps = {
  payments: (Payment & { order: Order; waiter?: Waiter })[];
  onViewImage: (url: string) => void;
  onViewOrderDetails?: (order: Order, waiter: Waiter) => void;
  isWaiter?: boolean;
  isCashierReport?: boolean;
};

export function PaymentsList({ payments, onViewImage, onViewOrderDetails, isWaiter = false, isCashierReport = false }: PaymentsListProps) {
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');
  const [waiterFilter, setWaiterFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const uniqueWaiters = useMemo(() => {
    const waiters = new Map<string, Waiter>();
    payments.forEach((p) => {
      if (p.waiter && !waiters.has(p.waiter.id)) {
        if (!isCashierReport || p.waiter.active !== false) {
          waiters.set(p.waiter.id, p.waiter);
        }
      }
    });
    return Array.from(waiters.values());
  }, [payments, isCashierReport]);

  const filteredPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.submitted_at).toISOString().split('T')[0];
    const matchesDate = !dateFilter || paymentDate === dateFilter;
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesWaiter = waiterFilter === 'all' || (payment.waiter?.id === waiterFilter);
    return matchesDate && matchesStatus && matchesWaiter;
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalTip = filteredPayments.reduce((sum, p) => sum + Number(p.tip_amount), 0);
  const totalSum = totalAmount + totalTip;

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-col lg:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          {isCashierReport && uniqueWaiters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Waiter</label>
              <select
                value={waiterFilter}
                onChange={(e) => {
                  setWaiterFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Waiters</option>
                {uniqueWaiters.map((waiter) => (
                  <option key={waiter.id} value={waiter.id}>
                    {waiter.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredPayments.length > 0 && (
          <>
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total Amount</div>
                <div className="text-xl font-bold text-gray-900">${totalAmount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total Tips</div>
                <div className="text-xl font-bold text-green-600">${totalTip.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Grand Total</div>
                <div className="text-xl font-bold text-emerald-600">${totalSum.toFixed(2)}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {filteredPayments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No payments found</div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedPayments.map((payment) => (
            <div
              key={payment.id}
              className={`border-l-4 rounded-lg p-4 ${
                payment.status === 'approved'
                  ? 'border-green-500 bg-green-50'
                  : payment.status === 'declined'
                  ? 'border-red-500 bg-red-50'
                  : 'border-yellow-500 bg-yellow-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg font-semibold text-gray-900">
                      Table {payment.order.table_number}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="text-sm text-gray-600">Amount: </span>
                      <span className="font-bold text-gray-900">${Number(payment.amount).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Tip: </span>
                      <span className="font-bold text-green-600">${Number(payment.tip_amount).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Method: </span>
                      <span className="font-semibold text-gray-900">
                        {payment.payment_method === 'cash' ? '💵 Cash' : '🏦 Bank Transfer'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Date: </span>
                      <span className="font-semibold text-gray-900">
                        {new Date(payment.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {payment.status === 'declined' && payment.declined_reason && (
                    <div className="bg-red-100 border border-red-300 text-red-800 px-3 py-2 rounded text-sm mb-3">
                      <span className="font-medium">Reason: </span>
                      {payment.declined_reason}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {payment.transfer_screenshot_url && (
                      <button
                        onClick={() => onViewImage(payment.transfer_screenshot_url!)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Screenshot
                      </button>
                    )}
                    {payment.receipt_url && (
                      <button
                        onClick={() => onViewImage(payment.receipt_url!)}
                        className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Receipt
                      </button>
                    )}
                    {onViewOrderDetails && payment.waiter && (
                      <button
                        onClick={() => onViewOrderDetails(payment.order, payment.waiter!)}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Order Details
                      </button>
                    )}
                  </div>
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
  );
}
