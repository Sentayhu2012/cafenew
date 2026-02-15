import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

type Bank = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  active: boolean;
};

type BankManagementProps = {
  onBack: () => void;
};

export function BankManagement({ onBack }: BankManagementProps) {
  const { profile } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('active', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setBanks(data || []);
    } catch (err) {
      console.error('Error loading banks:', err);
      setError('Failed to load banks');
    } finally {
      setLoading(false);
    }
  };

  const addBank = async () => {
    if (!newBankName.trim()) return;

    setError('');
    try {
      const { error } = await supabase
        .from('banks')
        .insert([
          {
            name: newBankName.trim(),
            created_by: profile?.id,
            active: true,
          },
        ]);

      if (error) throw error;

      setNewBankName('');
      loadBanks();
    } catch (err) {
      console.error('Error adding bank:', err);
      setError('Failed to add bank');
    }
  };

  const updateBank = async (bankId: string) => {
    if (!editName.trim()) return;

    setError('');
    try {
      const { error } = await supabase
        .from('banks')
        .update({ name: editName.trim() })
        .eq('id', bankId);

      if (error) throw error;

      setEditingId(null);
      setEditName('');
      loadBanks();
    } catch (err) {
      console.error('Error updating bank:', err);
      setError('Failed to update bank');
    }
  };

  const toggleBankStatus = async (bankId: string, currentStatus: boolean) => {
    setError('');
    try {
      const { error } = await supabase
        .from('banks')
        .update({ active: !currentStatus })
        .eq('id', bankId);

      if (error) throw error;
      loadBanks();
    } catch (err) {
      console.error('Error toggling bank status:', err);
      setError('Failed to update bank status');
    }
  };

  const deleteBank = async (bankId: string) => {
    if (!confirm('Are you sure you want to delete this bank? This action cannot be undone.')) {
      return;
    }

    setError('');
    try {
      const { error } = await supabase.from('banks').delete().eq('id', bankId);

      if (error) throw error;
      loadBanks();
    } catch (err) {
      console.error('Error deleting bank:', err);
      setError('Failed to delete bank. It may be in use by existing payments.');
    }
  };

  const startEdit = (bank: Bank) => {
    setEditingId(bank.id);
    setEditName(bank.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Bank Management</h2>
                <p className="text-gray-600 mt-1">Manage bank accounts for payments</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Bank</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBank()}
                placeholder="Enter bank name..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={addBank}
                disabled={!newBankName.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Add Bank
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Banks List</h3>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading banks...</div>
            ) : banks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No banks yet. Add your first bank above.
              </div>
            ) : (
              <div className="space-y-3">
                {banks.map((bank) => (
                  <div
                    key={bank.id}
                    className={`border rounded-lg p-4 ${
                      bank.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    {editingId === bank.id ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && updateBank(bank.id)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => updateBank(bank.id)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-lg font-semibold ${
                              bank.active ? 'text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            {bank.name}
                          </span>
                          {!bank.active && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleBankStatus(bank.id, bank.active)}
                            className={`px-3 py-1.5 rounded-lg transition text-sm font-medium ${
                              bank.active
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {bank.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => startEdit(bank)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteBank(bank.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
