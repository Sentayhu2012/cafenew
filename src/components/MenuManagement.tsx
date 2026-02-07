import { useState, useEffect } from 'react';
import { supabase, Menu } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Upload } from 'lucide-react';

type MenuFormData = {
  name: string;
  price: string;
  picture?: File;
};

export function MenuManagement() {
  const [items, setItems] = useState<Menu[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MenuFormData>({ name: '', price: '' });
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error: err } = await supabase.from('menu').select('*').order('created_at', { ascending: false });
      if (err) throw err;
      setItems(data || []);
    } catch (err) {
      console.error('Error loading menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, picture: file }));
      const url = URL.createObjectURL(file);
      setPicturePreview(url);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price: '' });
    setPicturePreview(null);
    setEditingId(null);
    setError('');
  };

  const handleEdit = (item: Menu) => {
    setFormData({ name: item.name, price: item.price.toString() });
    if (item.picture_url) {
      setPicturePreview(item.picture_url);
    }
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.price.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('Price must be a valid positive number');
      return;
    }

    try {
      let pictureUrl = null;

      if (formData.picture) {
        const fileExt = formData.picture.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('menu-pictures')
          .upload(fileName, formData.picture);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('menu-pictures').getPublicUrl(fileName);
        pictureUrl = urlData.publicUrl;
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('menu')
          .update({
            name: formData.name.trim(),
            price,
            picture_url: pictureUrl || (picturePreview && !formData.picture ? picturePreview : null),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('menu').insert([
          {
            name: formData.name.trim(),
            price,
            picture_url: pictureUrl,
          },
        ]);

        if (insertError) throw insertError;
      }

      loadItems();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const { error: deleteError } = await supabase.from('menu').delete().eq('id', id);
      if (deleteError) throw deleteError;
      loadItems();
    } catch (err) {
      console.error('Error deleting menu item:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Menu Item
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded-lg">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Menu Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Iced Coffee"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price (including VAT) *</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-600">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Picture (Optional)</label>
                {picturePreview && !formData.picture ? (
                  <div className="relative">
                    <img
                      src={picturePreview}
                      alt="Menu item"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPicturePreview(null);
                        setFormData((prev) => ({ ...prev, picture: undefined }));
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : picturePreview ? (
                  <div className="relative">
                    <img
                      src={picturePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border-2 border-blue-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPicturePreview(null);
                        setFormData((prev) => ({ ...prev, picture: undefined }));
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload image</span>
                    <span className="text-xs text-gray-500">PNG, JPG up to 10MB</span>
                    <input type="file" accept="image/*" onChange={handlePictureChange} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {editingId ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading menu items...</div>
          ) : items.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">No menu items yet. Add one to get started!</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                {item.picture_url && (
                  <div className="h-40 bg-gray-200 overflow-hidden">
                    <img src={item.picture_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.name}</h3>
                  <div className="text-2xl font-bold text-blue-600 mb-4">${item.price.toFixed(2)}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
