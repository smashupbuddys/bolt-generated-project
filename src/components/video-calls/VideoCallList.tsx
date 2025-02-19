import React, { useState } from 'react';
import { Plus, Search, Video, Calendar, Clock, User, Phone, Trash2, AlertCircle, CheckCircle, Package, FileText, DollarSign, Loader2, Ban, UserCheck, QrCode, Box, Truck, X } from 'lucide-react';
import type { VideoCall, Customer } from '../../types';
import VideoCallForm from './VideoCallForm';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const WORKFLOW_ICONS = {
  video_call: Video,
  quotation: FileText,
  profiling: UserCheck,
  payment: DollarSign,
  qc: QrCode,
  packaging: Box,
  dispatch: Truck
};

const WORKFLOW_LABELS = {
  video_call: 'Video Call',
  quotation: 'Quotation',
  profiling: 'Profiling',
  payment: 'Payment',
  qc: 'Quality Check',
  packaging: Box,
  dispatch: Truck
};

const STATUS_STYLES = {
  pending: 'opacity-40 grayscale',
  in_progress: 'animate-pulse',
  completed: '',
  rejected: 'text-red-500'
};

const WorkflowStatus = ({ status }: { status: Record<string, string> }) => {
  return (
    <div className="flex items-center gap-2">
      {Object.entries(WORKFLOW_ICONS).map(([key, Icon]) => (
        <div key={key} className="flex flex-col items-center gap-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs text-gray-600">{key}</span>
        </div>
      ))}
    </div>
  );
};

const VideoCallList = () => {
  const [calls, setCalls] = React.useState<VideoCall[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [editingCall, setEditingCall] = React.useState<VideoCall | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = React.useState<VideoCall | undefined>();
  const [quotationUrl, setQuotationUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCalls();
    fetchCustomers();
  }, []);

  const fetchCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('video_calls')
        .select(`
          *,
          customers (
            name,
            email,
            phone,
            type
          )
        `)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching video calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .in('id', (qb) => {
          qb.from('video_calls')
            .select('customer_id')
            .eq('status', 'completed')
        })
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCall = async (callData: any) => {
    try {
      const { data, error } = await supabase
        .from('video_calls')
        .insert([{
          customer_id: callData.customerId,
          staff_id: callData.staffId,
          scheduled_at: callData.scheduledAt,
          status: 'scheduled',
          notes: callData.notes,
          quotation_required: callData.quotationRequired,
          payment_status: 'pending',
          payment_due_date: callData.quotationRequired ? callData.paymentDueDate : null,
          workflow_status: {
            video_call: 'pending',
            quotation: 'pending',
            profiling: 'pending',
            payment: 'pending',
            qc: 'pending',
            packaging: 'pending',
            dispatch: 'pending'
          }
        }])
        .select()
        .single();

      if (error) throw error;
      setCalls(prev => [data, ...prev]);
      setShowForm(false);
    } catch (error) {
      console.error('Error adding video call:', error);
      alert('Error scheduling video call. Please try again.');
    }
  };

  const handleUpdateCall = async (callData: any) => {
    if (!editingCall) return;
    
    try {
      const { data, error } = await supabase
        .from('video_calls')
        .update({
          customer_id: callData.customerId,
          staff_id: callData.staffId,
          scheduled_at: callData.scheduledAt,
          notes: callData.notes,
          quotation_required: callData.quotationRequired,
          payment_status: callData.paymentDueDate ? callData.paymentDueDate : null
        })
        .eq('id', editingCall.id)
        .select()
        .single();

      if (error) throw error;
      setCalls(prev => prev.map(call => call.id === editingCall.id ? data : call));
      setEditingCall(undefined);
      setShowForm(false);
    } catch (error) {
      console.error('Error updating video call:', error);
      alert('Error updating video call. Please try again.');
    }
  };

  const handleDeleteCall = async (callId: string) => {
    if (!window.confirm('Are you sure you want to delete this video call?')) return;

    try {
      // First, get all quotations associated with this video call
      const { data: quotations, error: quotationError } = await supabase
        .from('quotations')
        .select('id')
        .eq('customer_id', callId);

      if (quotationError) throw quotationError;

      // If there are quotations, delete them
      if (quotations && quotations.length > 0) {
        const quotationIds = quotations.map(q => q.id);
        const { error: deleteQuotationsError } = await supabase
          .from('quotations')
          .delete()
          .in('id', quotationIds);

        if (deleteQuotationsError) throw deleteQuotationsError;
      }

      // Now, delete the video call
      const { error: deleteCallError } = await supabase
        .from('video_calls')
        .delete()
        .eq('id', callId);

      if (deleteCallError) throw deleteCallError;

      setCalls(prev => prev.filter(call => call.id !== callId));
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting video call:', error);
      alert(`Error deleting video call: ${error.message}. Please try again.`);
    }
  };

  const handleStartCall = async (call: VideoCall) => {
    setShowConfirmationModal(call);
  };

  const handleConfirmCall = async (call: VideoCall, completed: boolean) => {
    try {
      let workflowUpdate = {};
      if (completed) {
        workflowUpdate = {
          video_call: 'completed'
        };
      }

      const { error: updateError } = await supabase
        .from('video_calls')
        .update({
          workflow_status: {
            ...call.workflow_status,
            ...workflowUpdate
          }
        })
        .eq('id', call.id);

      if (updateError) throw updateError;

      // Open video call window
      window.open(`/video-call/${call.id}`, '_blank');
      
      // If quotation is required, redirect to quick quotation
      if (call.quotation_required) {
        window.location.href = `/pos?customer=${call.customer_id}&call=${call.id}`;
      }

      fetchCalls(); // Refresh the list
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Error starting video call. Please try again.');
    } finally {
      setShowConfirmationModal(null);
    }
  };

  const handleReschedule = (call: VideoCall) => {
    setEditingCall(call);
    setShowForm(true);
    setShowConfirmationModal(null);
  };

  const filteredCalls = calls.filter(call => {
    const searchString = searchTerm.toLowerCase();
    const customerName = call.customers?.name.toLowerCase() || '';
    const customerEmail = call.customers?.email?.toLowerCase() || '';
    const customerPhone = call.customers?.phone.toLowerCase() || '';
    
    return customerName.includes(searchString) ||
           customerEmail.includes(searchString) ||
           customerPhone.includes(searchString);
  });

  const handleGenerateQRCode = (call: VideoCall) => {
    // In a real application, you would generate a URL that points to a page
    // displaying the quotation details. For this example, I'll just use the call ID.
    const quotationDetailsURL = `/quotation/${call.id}`;
    setQuotationUrl(quotationDetailsURL);
  };

  const handleCloseQRCode = () => {
    setQuotationUrl(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <div className="flex-1 max-w-md relative mb-2 sm:mb-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search video calls..."
            className="input pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Schedule Call
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCalls.map((call) => (
          <div 
            key={call.id} 
            className="bg-white rounded-lg shadow p-3 flex flex-col sm:flex-row items-center justify-between" style={{ minWidth: '600px' }}
          >
            <div className="flex items-center mb-2 sm:mb-0">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              <div className="text-sm">
                <div className="font-medium">{call.customers?.name}</div>
                <div className="text-gray-500">
                  {format(new Date(call.scheduled_at), 'MMM d, h:mm a')}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <WorkflowStatus status={call.workflow_status || {}} />
              <div className="flex gap-2">
                {call.status === 'scheduled' && (
                  <button
                    onClick={() => handleStartCall(call)}
                    className="text-blue-600 hover:text-blue-900 ml-4"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                )}
                {call.workflow_status?.quotation === 'completed' && (
                  <button
                    onClick={() => handleGenerateQRCode(call)}
                    className="text-green-600 hover:text-green-900 ml-4"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                )}
                {showDeleteConfirm === call.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteCall(call.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(call.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCalls.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <Calendar className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No video calls found</h3>
          <p className="mt-1 text-gray-500">
            Get started by scheduling a new video call.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 btn btn-primary"
          >
            Schedule Call
          </button>
        </div>
      )}

      {(showForm || editingCall) && (
        <VideoCallForm
          call={editingCall}
          customers={customers}
          onClose={() => {
            setShowForm(false);
            setEditingCall(undefined);
          }}
          onSubmit={editingCall ? handleUpdateCall : handleAddCall}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <ConfirmationModal
          call={showConfirmationModal}
          onConfirm={handleConfirmCall}
          onReschedule={handleReschedule}
          onClose={() => setShowConfirmationModal(null)}
        />
      )}

      {/* QR Code Modal */}
      {quotationUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4">
            <div className="flex justify-end">
              <button onClick={handleCloseQRCode} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col items-center">
              <QRCodeSVG value={quotationUrl} size={256} />
              <p className="mt-2 text-sm text-gray-600">Scan this QR code to view quotation details</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ConfirmationModalProps {
  call: VideoCall;
  onConfirm: (call: VideoCall, completed: boolean) => void;
  onReschedule: (call: VideoCall) => void;
  onClose: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ call, onConfirm, onReschedule, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Confirm Video Call</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-700 mb-4">
          Did the video call with {call.customers?.name} complete successfully?
        </p>
        <div className="flex justify-end gap-4">
          <button onClick={() => onConfirm(call, true)} className="btn btn-primary">
            Yes, Complete
          </button>
          <button onClick={() => onReschedule(call)} className="btn btn-secondary">
            Reschedule
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallList;
