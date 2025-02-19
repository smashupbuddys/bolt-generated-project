import React from 'react';
import { Plus, Search, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import type { Customer } from '../../types';
import CustomerForm from './CustomerForm';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

const CustomerList = () => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (customerData: any) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;
      setCustomers(prev => [data, ...prev]);
      setShowForm(false);
      fetchCustomers(); // Refresh the customer list
    } catch (error: any) {
      console.error('Error adding customer:', error);
      alert(error.message || 'Error adding customer. Please try again.');
    }
  };

  const handleEditCustomer = async (customerData: any) => {
    if (!editingCustomer) return;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', editingCustomer.id)
        .select()
        .single();

      if (error) throw error;
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? data : c));
      setEditingCustomer(undefined);
      setShowForm(false);
      fetchCustomers(); // Refresh the customer list
    } catch (error: any) {
      console.error('Error updating customer:', error);
      alert(error.message || 'Error updating customer. Please try again.');
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      // First, get all video calls associated with this customer
      const { data: videoCalls, error: videoCallError } = await supabase
        .from('video_calls')
        .select('id')
        .eq('customer_id', customerId);

      if (videoCallError) throw videoCallError;

      // If there are video calls, delete their workflow assignments first
      if (videoCalls && videoCalls.length > 0) {
        const videoCallIds = videoCalls.map(vc => vc.id);

        const { error: deleteAssignmentsError } = await supabase
          .from('workflow_assignments')
          .delete()
          .in('video_call_id', videoCallIds);

        if (deleteAssignmentsError) throw deleteAssignmentsError;

        // Then, delete the video calls
        const { error: deleteVideoCallsError } = await supabase
          .from('video_calls')
          .delete()
          .in('id', videoCallIds);

        if (deleteVideoCallsError) throw deleteVideoCallsError;
      }

      // Now, delete the customer
      const { error: deleteCustomerError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (deleteCustomerError) throw deleteCustomerError;

      setCustomers(prev => prev.filter(c => c.id !== customerId));
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      alert(error.message || 'Error deleting customer. Please try again.');
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search customers..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Customer
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchases</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">
                        Customer since {formatDate(customer.created_at)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    {customer.email && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-4 w-4 mr-2" />
                        {customer.email}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="h-4 w-4 mr-2" />
                      {customer.phone}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    customer.type === 'wholesaler' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {customer.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{customer.city || 'N/A'}</div>
                  <div className="text-sm text-gray-500">{customer.state || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">₹{customer.total_purchases?.toLocaleString() || '0'}</div>
                  {customer.last_purchase_date && (
                    <div className="text-sm text-gray-500">
                      Last: {formatDate(customer.last_purchase_date)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center space-x-3">
                    <button
                      onClick={() => setEditingCustomer(customer)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(customer.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
            <p className="text-gray-700 mb-4">Are you sure you want to delete this customer?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCustomer(showDeleteConfirm)}
                className="btn btn-primary bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {(showForm || editingCustomer) && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(undefined);
          }}
          onSubmit={editingCustomer ? handleEditCustomer : handleAddCustomer}
        />
      )}
    </div>
  );
};

export default CustomerList;
