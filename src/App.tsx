import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './components/auth/LoginPage';
import RequireAuth from './components/auth/RequireAuth';
import InventoryList from './components/inventory/InventoryList';
import MarkupSettings from './components/settings/MarkupSettings';
import QuickQuotation from './components/pos/QuickQuotation';
import SalesAnalytics from './components/dashboard/SalesAnalytics';
import CustomerList from './components/customers/CustomerList';
import VideoCallList from './components/video-calls/VideoCallList';
import VideoCallPage from './components/video-calls/VideoCallPage';
import VideoCallStep from './components/video-calls/VideoCallStep';
import { supabase } from './lib/supabase';

const UnauthorizedContent = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Unauthorized</h1>
      <p className="text-gray-600">You don't have permission to access this page.</p>
    </div>
  </div>
);

function App() {
  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const prevSessionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      prevSessionIdRef.current = session?.user?.id || null;
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentSessionId = session?.user?.id || null;
      if (currentSessionId !== prevSessionIdRef.current) {
        setSession(session);
        prevSessionIdRef.current = currentSessionId;
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage />
            )
          } 
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={
            <RequireAuth permissions={['view_analytics']} fallback={<UnauthorizedContent />}>
              <SalesAnalytics />
            </RequireAuth>
          } />
          <Route path="inventory" element={
            <RequireAuth permissions={['view_inventory']} fallback={<UnauthorizedContent />}>
              <InventoryList />
            </RequireAuth>
          } />
          <Route path="pos" element={
            <RequireAuth permissions={['manage_quotations']} fallback={<UnauthorizedContent />}>
              <QuickQuotation />
            </RequireAuth>
          } />
          <Route path="settings" element={
            <RequireAuth permissions={['manage_settings']} fallback={<UnauthorizedContent />}>
              <MarkupSettings />
            </RequireAuth>
          } />
          <Route path="customers" element={
            <RequireAuth permissions={['manage_customers']} fallback={<UnauthorizedContent />}>
              <CustomerList />
            </RequireAuth>
          } />
          <Route path="video-calls" element={
            <RequireAuth permissions={['manage_video_calls']} fallback={<UnauthorizedContent />}>
              <VideoCallList />
            </RequireAuth>
          } />
          <Route path="video-calls/:callId" element={
             <RequireAuth permissions={['manage_video_calls']} fallback={<UnauthorizedContent />}>
              <VideoCallPage />
            </RequireAuth>
          }>
            <Route path="video" element={<VideoCallStep step="Video Call" />} />
            <Route path="quotation" element={<VideoCallStep step="Quotation" />} />
            <Route path="profiling" element={<VideoCallStep step="Profiling" />} />
            <Route path="payment" element={<VideoCallStep step="Payment" />} />
            <Route path="qc" element={<VideoCallStep step="QC" />} />
            <Route path="packaging" element={<VideoCallStep step="Packaging" />} />
            <Route path="dispatch" element={<VideoCallStep step="Dispatch" />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
