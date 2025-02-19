import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Shield } from 'lucide-react';
import type { MarkupSetting } from '../../types';
import { supabase } from '../../lib/supabase';

const MarkupSettings = () => {
  const [settings, setSettings] = useState<MarkupSetting[]>([]);
  const [newSetting, setNewSetting] = useState<Partial<MarkupSetting>>({
    type: 'manufacturer',
    name: '',
    markup: 0.2
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('markup_settings')
        .select('*')
        .order('type, name');

      if (error) {
        setError(error.message);
        console.error('Error fetching markup settings:', error);
      } else {
        setSettings(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newSetting.name) return;

    try {
      const { data, error } = await supabase
        .from('markup_settings')
        .insert([
          {
            type: newSetting.type,
            name: newSetting.name,
            markup: newSetting.markup,
          }
        ])
        .select()
        .single();

      if (error) {
        setError(error.message);
        console.error('Error adding markup setting:', error);
      } else {
        setSettings(prev => [...prev, data]);
        setNewSetting({ type: 'manufacturer', name: '', markup: 0.2 });
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while adding the setting.');
      console.error('Unexpected error adding markup setting:', error);
    }
  };

  const handleSettingChange = async (id: string, field: keyof MarkupSetting, value: string | number) => {
    try {
      const newValue = field === 'markup' ? Number(value) / 100 : value;
      const { data, error } = await supabase
        .from('markup_settings')
        .update({ [field]: newValue })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        console.error('Error updating markup setting:', error);
      } else {
        setSettings(prev => prev.map(setting => (setting.id === id ? data : setting)));
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while updating the setting.');
      console.error('Unexpected error updating markup setting:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('markup_settings')
        .delete()
        .eq('id', id);

      if (error) {
        setError(error.message);
        console.error('Error deleting markup setting:', error);
      } else {
        setSettings(prev => prev.filter(setting => setting.id !== id));
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while deleting the setting.');
      console.error('Unexpected error deleting markup setting:', error);
    }
  };

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Markup Settings</h2>
        <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="text-center py-8">Loading settings...</div>
        ) : error ? (
          <div className="text-red-600 py-4">{error}</div>
        ) : (
          <>
            {/* Add New Setting */}
            <div className="flex gap-4 items-end border-b pb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="input"
                  value={newSetting.type}
                  onChange={e => setNewSetting(prev => ({ ...prev, type: e.target.value as 'manufacturer' | 'category' }))}
                >
                  <option value="manufacturer">Manufacturer</option>
                  <option value="category">Category</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="input"
                  value={newSetting.name}
                  onChange={e => setNewSetting(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={newSetting.type === 'manufacturer' ? 'e.g., Cartier' : 'e.g., Rings'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Markup %</label>
                <input
                  type="number"
                  className="input"
                  value={newSetting.markup ? (newSetting.markup * 100) : ''}
                  onChange={e => setNewSetting(prev => ({ ...prev, markup: Number(e.target.value) / 100 }))}
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
              <button
                onClick={handleAdd}
                className="btn btn-primary h-10"
                disabled={!newSetting.name}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Manufacturer Settings */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold mb-4">Manufacturer Markups</h4>
              <div className="grid gap-4">
                {settings
                  .filter(setting => setting.type === 'manufacturer')
                  .map(setting => (
                    <div key={setting.id} className="flex gap-4 items-center">
                      <input
                        type="text"
                        className="input flex-1"
                        value={setting.name}
                        onChange={e => handleSettingChange(setting.id, 'name', e.target.value)}
                      />
                      <div className="w-32">
                        <input
                          type="number"
                          className="input"
                          value={Math.round(setting.markup * 100)}
                          onChange={e => handleSettingChange(setting.id, 'markup', e.target.value)}
                          min="0"
                          max="100"
                          step="1"
                        />
                      </div>
                      <button
                        onClick={() => handleDelete(setting.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Category Settings */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold mb-4">Category Markups</h4>
              <div className="grid gap-4">
                {settings
                  .filter(setting => setting.type === 'category')
                  .map(setting => (
                    <div key={setting.id} className="flex gap-4 items-center">
                      <input
                        type="text"
                        className="input flex-1"
                        value={setting.name}
                        onChange={e => handleSettingChange(setting.id, 'name', e.target.value)}
                      />
                      <div className="w-32">
                        <input
                          type="number"
                          className="input"
                          value={Math.round(setting.markup * 100)}
                          onChange={e => handleSettingChange(setting.id, 'markup', e.target.value)}
                          min="0"
                          max="100"
                          step="1"
                        />
                      </div>
                      <button
                        onClick={() => handleDelete(setting.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarkupSettings;
