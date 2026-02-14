import { useState } from 'react';
import { supabase, Order } from '../lib/supabase';
import { useOfflineOperations } from '../hooks/useOfflineOperations';
import { X, Save, Camera } from 'lucide-react';

type PaymentFormProps = {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
};

export function PaymentForm({ order, onClose, onSuccess }: PaymentFormProps) {
  const { isOnline, submitPayment } = useOfflineOperations();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [tipAmount, setTipAmount] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const url = URL.createObjectURL(file);
      setScreenshotPreview(url);
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceipt(file);
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isOnline && paymentMethod === 'bank_transfer') {
        throw new Error('Bank transfer payments require an internet connection to upload screenshots. Please wait until you are online.');
      }

      let screenshotUrl = null;
      let receiptUrl = null;

      if (paymentMethod === 'bank_transfer' && isOnline) {
        if (!screenshot) throw new Error('Transfer screenshot is required');

        const screenshotExt = screenshot.name.split('.').pop();
        const screenshotFileName = `${order.id}_screenshot_${Date.now()}.${screenshotExt}`;

        const { error: screenshotUploadError } = await supabase.storage
          .from('transfer-screenshots')
          .upload(screenshotFileName, screenshot);

        if (screenshotUploadError) throw screenshotUploadError;

        const { data: screenshotData } = supabase.storage
          .from('transfer-screenshots')
          .getPublicUrl(screenshotFileName);

        screenshotUrl = screenshotData.publicUrl;

        if (receipt) {
          const receiptExt = receipt.name.split('.').pop();
          const receiptFileName = `${order.id}_receipt_${Date.now()}.${receiptExt}`;

          const { error: receiptUploadError } = await supabase.storage
            .from('transfer-screenshots')
            .upload(receiptFileName, receipt);

          if (receiptUploadError) throw receiptUploadError;

          const { data: receiptData } = supabase.storage
            .from('transfer-screenshots')
            .getPublicUrl(receiptFileName);

          receiptUrl = receiptData.publicUrl;
        }
      }

      const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await submitPayment({
        id: paymentId,
        order_id: order.id,
        payment_method: paymentMethod,
        amount: order.total_amount,
        tip_amount: tipAmount ? parseFloat(tipAmount) : 0,
        transfer_screenshot_url: screenshotUrl,
        receipt_url: receiptUrl,
        status: 'pending',
      });

      if (isOnline) {
        await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Record Payment</h2>
              <p className="text-gray-600 mt-1">
                Table {order.table_number} - ${Number(order.total_amount).toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 border-2 rounded-lg transition ${
                    paymentMethod === 'cash'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-3xl mb-2">💵</div>
                  <div className="font-medium">Cash</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`p-4 border-2 rounded-lg transition ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-3xl mb-2">🏦</div>
                  <div className="font-medium">Bank Transfer</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tip Amount ($) - Optional
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="0.00"
              />
            </div>

            {paymentMethod === 'bank_transfer' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Transfer Screenshot
                  </label>
                  {screenshotPreview ? (
                    <div className="relative">
                      <img
                        src={screenshotPreview}
                        alt="Transfer screenshot"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshot(null);
                          setScreenshotPreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                      <Camera className="w-10 h-10 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 mb-1">Upload transfer screenshot</span>
                      <span className="text-xs text-gray-500">PNG, JPG up to 10MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        className="hidden"
                        required={paymentMethod === 'bank_transfer'}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Receipt (Optional)
                  </label>
                  {receiptPreview ? (
                    <div className="relative">
                      <img
                        src={receiptPreview}
                        alt="Receipt"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setReceipt(null);
                          setReceiptPreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                      <Camera className="w-10 h-10 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 mb-1">Upload receipt (Optional)</span>
                      <span className="text-xs text-gray-500">PNG, JPG up to 10MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
