import React, { useState, useEffect } from 'react';
import { X, Video, FileText, UserCheck, DollarSign, QrCode, Box, Truck } from 'lucide-react';
import type { VideoCall, Customer } from '../../types';
import { supabase } from '../../lib/supabase';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { nanoid } from 'nanoid';

interface VideoCallFormProps {
  call?: VideoCall;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const WORKFLOW_STEPS = [
  { key: 'video_call', Icon: Video, label: 'Video Call' },
  { key: 'quotation', Icon: FileText, label: 'Quotation' },
  { key: 'profiling', Icon: UserCheck, label: 'Profiling' },
  { key: 'payment', Icon: DollarSign, label: 'Payment' },
  { key: 'qc', Icon: QrCode, label: 'QC' },
  { key: 'packaging', Icon: Box, label: 'Packaging' },
  { key: 'dispatch', Icon: Truck, label: 'Dispatch' }
];

const COUNTRY_CODES = [
  { code: '+1', country: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: '+44', country: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: '+91', country: 'India', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: '+61', country: 'Australia', flag: '\u{1F1E6}\u{1F1FA}' },
  { code: '+86', country: 'China', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: '+971', country: 'United Arab Emirates', flag: '\u{1F1E6}\u{1F1EA}' },
  { code: '+33', country: 'France', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: '+49', country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: '+81', country: 'Japan', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: '+7', country: 'Russia', flag: '\u{1F1F7}\u{1F1FA}' },
  { code: '+55', country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: '+39', country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: '+1', country: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: '+52', country: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}' },
  { code: '+34', country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: '+41', country: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}' },
  { code: '+46', country: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: '+7', country: 'Kazakhstan', flag: '\u{1F1F0}\u{1F1FF}' },
  { code: '+90', country: 'Turkey', flag: '\u{1F1F9}\u{1F1F7}' },
  { code: '+62', country: 'Indonesia', flag: '\u{1F1EE}\u{1F1E9}' },
  { code: '+63', country: 'Philippines', flag: '\u{1F1F5}\u{1F1ED}' },
  { code: '+66', country: 'Thailand', flag: '\u{1F1F9}\u{1F1ED}' },
  { code: '+27', country: 'South Africa', flag: '\u{1F1FF}\u{1F1E6}' },
  { code: '+20', country: 'Egypt', flag: '\u{1F1EA}\u{1F1EC}' },
  { code: '+966', country: 'Saudi Arabia', flag: '\u{1F1F8}\u{1F1E6}' },
  { code: '+972', country: 'Israel', flag: '\u{1F1EE}\u{1F1F1}' },
  { code: '+353', country: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}' },
  { code: '+31', country: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: '+47', country: 'Norway', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: '+45', country: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: '+358', country: 'Finland', flag: '\u{1F1EB}\u{1F1EE}' },
  { code: '+351', country: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: '+82', country: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: '+852', country: 'Hong Kong', flag: '\u{1F1ED}\u{1F1F0}' },
  { code: '+65', country: 'Singapore', flag: '\u{1F1F8}\u{1F1EC}' },
];

const VideoCallForm: React.FC<VideoCallFormProps> = ({ 
  call, 
  customers, 
  onClose, 
  onSubmit 
}) => {
  const [formData, setFormData] = React.useState({
    customerId: call?.customer_id || '',
    staffId: call?.staff_id || 'current-user',
    scheduledAt: call?.scheduled_at ? new Date(call.scheduled_at) : new Date(),
    status: call?.status || 'scheduled',
    notes: call?.notes || '',
    quotationRequired: call?.quotation_required || false,
    paymentDueDate: call?.payment_due_date ? new Date(call.payment_due_date) : null,
    newCustomerName: '',
    newCustomerPhone: '',
    countryCode: '+1'
  });

  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    // Set timer notification 5 minutes before scheduled time
    const now = new Date();
    const scheduledTime = new Date(formData.scheduledAt);
    const timeDiff = scheduledTime.getTime() - now.getTime();

    if (timeDiff > 0) {
      const timerId = setTimeout(() => {
        alert(`Video call with ${customers.find(c => c.id === formData.customerId)?.name} is starting in 5 minutes!`);
      }, timeDiff - (5 * 60 * 1000));

      return () => clearTimeout(timerId);
    }

    fetchStaff();
  }, [formData.scheduledAt, formData.customerId, customers]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name');

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate new customer info if provided
    if (formData.newCustomerName && !formData.newCustomerPhone) {
      setError('Please enter a phone number for the new customer.');
      return;
    }

    if (!formData.newCustomerName && formData.newCustomerPhone) {
      setError('Please enter a name for the new customer.');
      return;
    }

    try {
      let customerId = formData.customerId;

      // Create new customer if name and phone are provided
      if (formData.newCustomerName && formData.newCustomerPhone) {
        // Generate a unique placeholder email
        const placeholderEmail = `temp-${nanoid()}@example.com`;

        const { data: newCustomer, error: newCustomerError } = await supabase
          .from('customers')
          .insert([{
            name: formData.newCustomerName,
            phone: formData.countryCode + formData.newCustomerPhone,
            email: placeholderEmail,
            type: 'retailer', // Default type
            address: '',
            city: '',
            state: '',
            pincode: '',
            preferences: {}
          }])
          .select()
          .single();

        if (newCustomerError) throw newCustomerError;
        customerId = newCustomer.id;
      }

      // Calculate payment due date if quotation is required
      const paymentDueDate = formData.quotationRequired 
        ? new Date(formData.scheduledAt.getTime() + (48 * 60 * 60 * 1000)) // 48 hours after scheduled time
        : null;

      onSubmit({
        customerId: customerId,
        staffId: formData.staffId,
        scheduledAt: formData.scheduledAt.toISOString(),
        notes: formData.notes,
        quotationRequired: formData.quotationRequired,
        paymentDueDate: paymentDueDate?.toISOString()
      });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setError(error.message || 'An error occurred. Please try again.');
    }
  };

  const handleChange = (date: Date) => {
    setFormData(prev => ({ ...prev, scheduledAt: date }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            {call ? 'Edit Video Call' : 'Schedule New Video Call'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer
              </label>
              <select
                name="customerId"
                required
                className="input"
                value={formData.customerId}
                onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value, newCustomerName: '', newCustomerPhone: '' }))}
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
                <option value="new">Add New Customer</option>
              </select>
            </div>

            {formData.customerId === 'new' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Customer Name
                  </label>
                  <input
                    type="text"
                    name="newCustomerName"
                    className="input"
                    value={formData.newCustomerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, newCustomerName: e.target.value }))}
                  />
                </div>
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-gray-700 mb-1 w-24">
                    Country Code
                  </label>
                  <select
                    name="countryCode"
                    className="input w-24 mr-2"
                    value={formData.countryCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                  >
                    {COUNTRY_CODES.map(code => (
                      <option key={code.code} value={code.code}>
                        {code.flag} {code.code} ({code.country})
                      </option>
                    ))}
                  </select>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Customer Phone
                  </label>
                  <input
                    type="tel"
                    name="newCustomerPhone"
                    className="input"
                    value={formData.newCustomerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, newCustomerPhone: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Staff
              </label>
              <select
                name="staffId"
                required
                className="input"
                value={formData.staffId}
                onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
              >
                <option value="current-user">Current User</option>
                {staff.map(staffMember => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.name} ({staffMember.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Date & Time
              </label>
              <DatePicker
                selected={formData.scheduledAt}
                onChange={handleChange}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
                timeFormat="h:mm aa"
                className="input"
                placeholderText="Select date and time"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={4}
                className="input"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about the video call..."
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="quotationRequired"
                  checked={formData.quotationRequired}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    quotationRequired: e.target.checked 
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Quotation Required
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                If checked, payment will be required within 48 hours
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {call ? 'Update Call' : 'Schedule Call'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VideoCallForm;
