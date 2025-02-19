import React from 'react';

interface VideoCallStepProps {
  step: string;
}

const VideoCallStep: React.FC<VideoCallStepProps> = ({ step }) => {
  return (
    <div>
      <h2>{step}</h2>
      <p>Content for {step} step</p>
    </div>
  );
};

export default VideoCallStep;
