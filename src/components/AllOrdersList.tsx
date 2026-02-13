import { useState, useMemo } from 'react';
import { Order, Profile } from '../lib/supabase';
import { Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

type OrderWithWaiter = Order & { waiter: Profile };

type AllOrdersListProps = {
  orders: OrderWithWaiter[];
  onViewDetails: (order: Order, waiter: Profile) => void;
};

export function AllOrdersList({ orders, onViewDetails }: AllOrdersListProps) {
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'confirmed'>('all');
  const [waiterFilter, setWaiterFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const uniqueWaiters = useMemo(() => {
    const waiters = new Map<string, Profile>();
    orders.forEach((o) => {
      if (o.waiter && !waiters.has(o.waiter.id)) {
        waiters.set(o.waiter.id, o.waiter);
      }
    });
    return Array.from(waiters.values());
  }, [orders]);

  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
    const matchesDate = !dateFilter || orderDate === dateFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesWaiter = waiterFilter === 'all' || order.waiter.id === waiterFilter;
    return matchesDate && matchesStatus && matchesWaiter;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>

          {uniqueWaiters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Waiter</label>
              <select
                value={waiterFilter}
                onChange={(e) => {
                  setWaiterFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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

        {filteredOrders.length > 0 && (
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No orders found</div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedOrders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">Table {order.table_number}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
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
                    <div className="text-sm text-gray-600">{order.waiter.full_name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => onViewDetails(order, order.waiter)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
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
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
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
