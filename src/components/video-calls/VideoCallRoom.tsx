import React from 'react';
import { Camera, Mic, PhoneOff, Settings, MessageSquare, FileText, AlertTriangle } from 'lucide-react';
import type { VideoCall, Customer } from '../../types';
import { supabase } from '../../lib/supabase';

interface VideoCallRoomProps {
  call: VideoCall;
  customer: Customer;
  onEnd: () => void;
}

const VideoCallRoom: React.FC<VideoCallRoomProps> = ({ call, customer, onEnd }) => {
  const [deviceStatus, setDeviceStatus] = React.useState({
    camera: false,
    microphone: false,
    speaker: false
  });
  const [notes, setNotes] = React.useState('');
  const [showChat, setShowChat] = React.useState(false);
  const [messages, setMessages] = React.useState<Array<{
    sender: string;
    message: string;
    timestamp: Date;
  }>>([]);
  const [recording, setRecording] = React.useState(false);
  const [systemChecks, setSystemChecks] = React.useState({
    browser: false,
    connection: false,
    permissions: false
  });

  React.useEffect(() => {
    checkSystemRequirements();
  }, []);

  const checkSystemRequirements = async () => {
    // Check browser compatibility
    const isCompatible = 'mediaDevices' in navigator;
    
    // Check internet connection
    const connection = navigator.onLine;
    
    // Check device permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      setDeviceStatus({
        camera: true,
        microphone: true,
        speaker: 'setSinkId' in HTMLAudioElement.prototype
      });
      setSystemChecks({
        browser: isCompatible,
        connection,
        permissions: true
      });
    } catch (error) {
      console.error('Error checking device permissions:', error);
      setSystemChecks(prev => ({
        ...prev,
        permissions: false
      }));
    }
  };

  const handleEndCall = async () => {
    try {
      // Save call notes
      const { error: notesError } = await supabase
        .from('video_calls')
        .update({
          notes,
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', call.id);

      if (notesError) throw notesError;

      // If quotation is required, create a draft quotation
      if (call.quotation_required) {
        const { error: quotationError } = await supabase
          .from('quotations')
          .insert([{
            customer_id: call.customer_id,
            video_call_id: call.id,
            status: 'draft',
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }]);

        if (quotationError) throw quotationError;
      }

      onEnd();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const handleSendMessage = (message: string) => {
    setMessages(prev => [...prev, {
      sender: 'Staff',
      message,
      timestamp: new Date()
    }]);
  };

  if (!systemChecks.browser || !systemChecks.connection || !systemChecks.permissions) {
    return (
      <div className="fixed inset-0 bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-md p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-4">System Check Failed</h2>
          <ul className="space-y-2 text-left mb-6">
            <li className={`flex items-center ${systemChecks.browser ? 'text-green-500' : 'text-red-500'}`}>
              • Browser Compatibility: {systemChecks.browser ? 'OK' : 'Failed'}
            </li>
            <li className={`flex items-center ${systemChecks.connection ? 'text-green-500' : 'text-red-500'}`}>
              • Internet Connection: {systemChecks.connection ? 'OK' : 'Failed'}
            </li>
            <li className={`flex items-center ${systemChecks.permissions ? 'text-green-500' : 'text-red-500'}`}>
              • Device Permissions: {systemChecks.permissions ? 'OK' : 'Failed'}
            </li>
          </ul>
          <button
            onClick={checkSystemRequirements}
            className="btn btn-primary"
          >
            Retry System Check
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 text-white">
      {/* Video Area */}
      <div className="h-full flex flex-col">
        <div className="flex-1 relative">
          {/* Main video container */}
          <div id="remote-video" className="absolute inset-0">
            {/* Remote video will be inserted here by Jitsi */}
          </div>
          
          {/* Local video preview */}
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden">
            <div id="local-video">
              {/* Local video will be inserted here by Jitsi */}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="h-20 bg-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDeviceStatus(prev => ({ ...prev, camera: !prev.camera }))}
              className={`p-3 rounded-full ${deviceStatus.camera ? 'bg-blue-600' : 'bg-red-600'}`}
            >
              <Camera className="h-6 w-6" />
            </button>
            <button
              onClick={() => setDeviceStatus(prev => ({ ...prev, microphone: !prev.microphone }))}
              className={`p-3 rounded-full ${deviceStatus.microphone ? 'bg-blue-600' : 'bg-red-600'}`}
            >
              <Mic className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
            >
              <MessageSquare className="h-6 w-6" />
            </button>
            <button
              onClick={() => setRecording(!recording)}
              className={`p-3 rounded-full ${recording ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              <FileText className="h-6 w-6" />
            </button>
            <button
              onClick={() => {/* Open settings modal */}}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
            >
              <Settings className="h-6 w-6" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat/Notes Sidebar */}
      {showChat && (
        <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 border-l border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold">Call Notes</h3>
          </div>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-48 bg-gray-900 text-white rounded p-2 mb-4"
              placeholder="Take notes during the call..."
            />
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className="bg-gray-900 rounded p-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{msg.sender}</span>
                    <span>{msg.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <p>{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCallRoom;
