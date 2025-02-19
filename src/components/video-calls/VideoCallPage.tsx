import React from 'react';
import { useParams, Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const VideoCallPage = () => {
  const { callId } = useParams();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/video-calls" className="text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4" />
          Back to Video Calls
        </Link>
      </div>

      <h2 className="text-2xl font-bold">Video Call Details</h2>
      <p>Video Call ID: {callId}</p>

      <nav className="flex space-x-4">
        <Link to={`/video-calls/${callId}/video`} className="btn btn-secondary">
          Video Call
        </Link>
        <Link to={`/video-calls/${callId}/quotation`} className="btn btn-secondary">
          Quotation
        </Link>
        <Link to={`/video-calls/${callId}/profiling`} className="btn btn-secondary">
          Profiling
        </Link>
        <Link to={`/video-calls/${callId}/payment`} className="btn btn-secondary">
          Payment
        </Link>
        <Link to={`/video-calls/${callId}/qc`} className="btn btn-secondary">
          QC
        </Link>
        <Link to={`/video-calls/${callId}/packaging`} className="btn btn-secondary">
          Packaging
        </Link>
        <Link to={`/video-calls/${callId}/dispatch`} className="btn btn-secondary">
          Dispatch
        </Link>
      </nav>

      <Outlet />
    </div>
  );
};

export default VideoCallPage;
