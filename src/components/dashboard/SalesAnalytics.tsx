import React from 'react';
import { TrendingUp, Package, DollarSign, Users, Video, Clock, AlertTriangle, Truck, CheckCircle } from 'lucide-react';
import type { Product, VideoCall, Quotation } from '../../types';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const SalesAnalytics = () => {
  const [pendingCalls, setPendingCalls] = React.useState<VideoCall[]>([]);
  const [pendingBilling, setPendingBilling] = React.useState<VideoCall[]>([]);
  const [overdueBilling, setOverdueBilling] = React.useState<VideoCall[]>([]);
  const [pendingDispatches, setPendingDispatches] = React.useState<Quotation[]>([]);
  const [totalSales, setTotalSales] = React.useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    total: 0
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch pending video calls
      const { data: callsData } = await supabase
        .from('video_calls')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true });

      // Fetch calls pending billing
      const { data: billingData } = await supabase
        .from('video_calls')
        .select('*')
        .eq('quotation_required', true)
        .eq('bill_status', 'pending')
        .order('scheduled_at', { ascending: true });

      // Fetch overdue payments
      const { data: overdueData } = await supabase
        .from('video_calls')
        .select('*')
        .eq('payment_status', 'overdue')
        .order('payment_due_date', { ascending: true });

      // Fetch pending dispatches (accepted quotations awaiting delivery)
      const { data: dispatchData } = await supabase
        .from('quotations')
        .select('*')
        .eq('status', 'accepted')
        .order('created_at', { ascending: true });

      // Fetch total sales from accepted quotations
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: salesData } = await supabase
        .from('quotations')
        .select('total_amount, created_at')
        .eq('status', 'accepted');

      // Calculate sales totals
      const sales = {
        daily: 0,
        weekly: 0,
        monthly: 0,
        total: 0
      };

      salesData?.forEach(quotation => {
        const amount = Number(quotation.total_amount);
        const date = new Date(quotation.created_at);
        
        // Add to total sales
        sales.total += amount;

        // Check if within current day/week/month
        if (date >= new Date(startOfDay)) {
          sales.daily += amount;
        }
        if (date >= new Date(startOfWeek)) {
          sales.weekly += amount;
        }
        if (date >= new Date(startOfMonth)) {
          sales.monthly += amount;
        }
      });

      setPendingCalls(callsData || []);
      setPendingBilling(billingData || []);
      setOverdueBilling(overdueData || []);
      setPendingDispatches(dispatchData || []);
      setTotalSales(sales);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sales Overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Sales Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { 
              label: 'Today\'s Sales', 
              value: totalSales.daily,
              color: 'text-green-600'
            },
            { 
              label: 'This Week', 
              value: totalSales.weekly,
              color: 'text-blue-600'
            },
            { 
              label: 'This Month', 
              value: totalSales.monthly,
              color: 'text-purple-600'
            },
            { 
              label: 'Total Sales', 
              value: totalSales.total,
              color: 'text-indigo-600'
            }
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>
                ₹{value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            icon: Video, 
            label: 'Pending Calls', 
            value: pendingCalls.length, 
            link: '/video-calls',
            color: 'text-blue-600 bg-blue-50' 
          },
          { 
            icon: DollarSign, 
            label: 'Pending Billing', 
            value: pendingBilling.length,
            link: '/pos',
            color: 'text-yellow-600 bg-yellow-50'
          },
          { 
            icon: AlertTriangle, 
            label: 'Overdue Payments', 
            value: overdueBilling.length,
            link: '/video-calls',
            color: 'text-red-600 bg-red-50'
          },
          { 
            icon: Truck, 
            label: 'Pending Dispatches', 
            value: pendingDispatches.length,
            link: '/orders',
            color: 'text-green-600 bg-green-50'
          }
        ].map(({ icon: Icon, label, value, link, color }) => (
          <Link 
            key={label} 
            to={link}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pending Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Video Calls */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Upcoming Video Calls</h2>
              <Link to="/video-calls" className="text-blue-600 hover:text-blue-800 text-sm">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {pendingCalls.slice(0, 5).map(call => (
                <div key={call.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{format(new Date(call.scheduled_at), 'PPp')}</p>
                    <p className="text-sm text-gray-500">Customer ID: {call.customer_id}</p>
                  </div>
                  <Link
                    to={`/video-calls?id=${call.id}`}
                    className="btn btn-secondary"
                  >
                    View Details
                  </Link>
                </div>
              ))}
              {pendingCalls.length === 0 && (
                <p className="text-gray-500 text-center py-4">No pending video calls</p>
              )}
            </div>
          </div>
        </div>

        {/* Pending Billing */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pending Billing</h2>
              <Link to="/pos" className="text-blue-600 hover:text-blue-800 text-sm">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {pendingBilling.slice(0, 5).map(call => (
                <div key={call.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      Amount: ₹{call.bill_amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {format(new Date(call.payment_due_date!), 'PP')}
                    </p>
                  </div>
                  <Link
                    to={`/pos?call=${call.id}`}
                    className="btn btn-primary"
                  >
                    Generate Bill
                  </Link>
                </div>
              ))}
              {pendingBilling.length === 0 && (
                <p className="text-gray-500 text-center py-4">No pending bills</p>
              )}
            </div>
          </div>
        </div>

        {/* Overdue Payments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-red-600">Overdue Payments</h2>
              <span className="text-sm text-red-600">
                {overdueBilling.length} overdue
              </span>
            </div>
            <div className="space-y-4">
              {overdueBilling.slice(0, 5).map(call => (
                <div key={call.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium">Amount: ₹{call.bill_amount.toLocaleString()}</p>
                    <p className="text-sm text-red-600">
                      Overdue since {format(new Date(call.payment_due_date!), 'PP')}
                    </p>
                  </div>
                  <Link
                    to={`/video-calls?id=${call.id}`}
                    className="btn btn-secondary"
                  >
                    View Details
                  </Link>
                </div>
              ))}
              {overdueBilling.length === 0 && (
                <p className="text-gray-500 text-center py-4">No overdue payments</p>
              )}
            </div>
          </div>
        </div>

        {/* Pending Dispatches */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pending Dispatches</h2>
              <Link to="/orders" className="text-blue-600 hover:text-blue-800 text-sm">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {pendingDispatches.slice(0, 5).map(quotation => (
                <div key={quotation.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      Order Total: ₹{quotation.total_amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Accepted on {format(new Date(quotation.updated_at), 'PP')}
                    </p>
                  </div>
                  <Link
                    to={`/orders?id=${quotation.id}`}
                    className="btn btn-secondary"
                  >
                    Process Order
                  </Link>
                </div>
              ))}
              {pendingDispatches.length === 0 && (
                <p className="text-gray-500 text-center py-4">No pending dispatches</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;
