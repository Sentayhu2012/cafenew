import { useState } from 'react';
import { Payment, Order, Profile } from '../lib/supabase';
import { CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

type PaymentWithDetails = Payment & {
  order: Order;
  waiter: Profile;
};

type PaginatedPaymentsProps = {
  payments: PaymentWithDetails[];
  type: 'pending' | 'approved' | 'declined';
  onApprove?: (paymentId: string, orderId: string) => void;
  onDecline?: (paymentId: string, orderId: string) => void;
  onViewImage?: (url: string) => void;
  onViewDetails?: (order: Order, waiter: Profile) => void;
};

export function PaginatedPayments({
  payments,
  type,
  onApprove,
  onDecline,
  onViewImage,
  onViewDetails,
}: PaginatedPaymentsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const paginatedPayments = payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (payments.length === 0) {
    const emptyMessages = {
      pending: 'No pending payments',
      approved: 'No approved payments',
      declined: 'No declined payments',
    };
    return <div className="text-center py-12 text-gray-500">{emptyMessages[type]}</div>;
  }

  return (
    <div className="space-y-4">
      {type === 'pending' && (
        <div className="space-y-4">
          {paginatedPayments.map((payment) => (
            <div key={payment.id} className="border-2 border-yellow-200 bg-yellow-50 rounded-xl p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg sm:text-xl font-bold text-gray-900">
                      Table {payment.order.table_number}
                    </span>
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
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        ${Number(payment.amount).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Tip</div>
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        ${Number(payment.tip_amount).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {payment.transfer_screenshot_url && (
                      <button
                        onClick={() => onViewImage?.(payment.transfer_screenshot_url!)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Screenshot
                      </button>
                    )}
                    {payment.receipt_url && (
                      <button
                        onClick={() => onViewImage?.(payment.receipt_url!)}
                        className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Receipt
                      </button>
                    )}
                    {onViewDetails && (
                      <button
                        onClick={() => onViewDetails(payment.order, payment.waiter)}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Order Details
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex lg:flex-col gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => onApprove?.(payment.id, payment.order_id)}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="hidden sm:inline">Approve</span>
                  </button>
                  <button
                    onClick={() => onDecline?.(payment.id, payment.order_id)}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    <XCircle className="w-5 h-5" />
                    <span className="hidden sm:inline">Decline</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'approved' && (
        <div className="space-y-3">
          {paginatedPayments.map((payment) => (
            <div key={payment.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900">Table {payment.order.table_number}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      APPROVED
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
                    <span className="text-gray-600">
                      Amount: <span className="font-bold">${Number(payment.amount).toFixed(2)}</span>
                    </span>
                    <span className="text-gray-600">
                      Tip: <span className="font-bold text-green-600">${Number(payment.tip_amount).toFixed(2)}</span>
                    </span>
                    <span className="text-gray-600">{payment.waiter.full_name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(payment.confirmed_at!).toLocaleString()}
                  </div>
                </div>
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(payment.order, payment.waiter)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition"
                  >
                    <Eye className="w-4 h-4" />
                    View Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'declined' && (
        <div className="space-y-3">
          {paginatedPayments.map((payment) => (
            <div key={payment.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900">Table {payment.order.table_number}</span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">DECLINED</span>
                  </div>
                  {payment.declined_reason && (
                    <div className="text-sm text-red-700 mb-2">
                      <span className="font-medium">Reason: </span>
                      {payment.declined_reason}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
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
    </div>
  );
}
