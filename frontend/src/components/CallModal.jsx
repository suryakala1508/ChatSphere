import { useCall } from '../context/CallContext';
import { getInitials, getAvatarColor, formatMessageTime } from '../utils/helpers';

const CallModal = () => {
  const {
    callState, callType, remoteStream, localStream, isMuted, isCameraOff,
    callPartner, callDuration, formatDuration, rejectCall, endCall,
    toggleMute, toggleCamera, acceptCall
  } = useCall();

  if (callState === 'idle') return null;

  const isAudio = callType === 'audio';

  return (
    <div className="call-overlay">
      {/* Remote video (full screen) */}
      {!isAudio && remoteStream && (
        <video
          autoPlay
          playsInline
          ref={ref => { if (ref) ref.srcObject = remoteStream; }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Local video (PIP) */}
      {!isAudio && localStream && (
        <video
          autoPlay
          playsInline
          muted
          ref={ref => { if (ref) ref.srcObject = localStream; }}
          className="absolute bottom-24 right-4 w-28 h-48 object-cover rounded-lg shadow-lg border-2 border-white/20 z-10"
        />
      )}

      {/* Audio call background */}
      {isAudio && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {callPartner && (
            <>
              {callPartner.avatar ? (
                <img src={callPartner.avatar} alt="" className="w-28 h-28 rounded-full object-cover shadow-xl mb-4" />
              ) : (
                <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${getAvatarColor(callPartner.name)} flex items-center justify-center text-white text-4xl font-bold shadow-xl mb-4`}>
                  {getInitials(callPartner.name)}
                </div>
              )}
              <h2 className="text-white text-2xl font-semibold mb-1">{callPartner.name}</h2>
              <p className="text-white/60 text-sm mb-8">
                {callState === 'ringing' ? 'Ringing...' :
                 callState === 'calling' ? 'Calling...' :
                 callState === 'connected' ? formatDuration(callDuration) : ''}
              </p>
            </>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
        {!isAudio && (
          <button
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isCameraOff ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              {isCameraOff ? (
                <>
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l3-3h6l3 3h3a2 2 0 0 1 2 2v11a2 2 0 0 1-1.9 1.99z" />
                </>
              ) : (
                <>
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </>
              )}
            </svg>
          </button>
        )}

        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {isMuted ? (
              <>
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              </>
            ) : (
              <>
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
                <path d="M17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2z" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </>
            )}
          </svg>
        </button>

        {/* End call */}
        <button
          onClick={callState === 'ringing' ? rejectCall : endCall}
          className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.5 3.5L3.5 22.5" stroke="currentColor" strokeWidth={2} />
            <path d="M23 7c0-1.1-.9-2-2-2h-1.1c-1.5 0-3 .5-4.2 1.5L14 8.1l-1.8-1.6C11 5.5 9.5 5 8 5H3c-1.1 0-2 .9-2 2v2c0 4.2 1.7 8 4.8 10.7l-.3.3c-.4.4-.4 1 0 1.4.2.2.4.3.7.3s.5-.1.7-.3l5.3-5.3c.1-.1.1-.2.1-.3 0-.1 0-.2-.1-.3l-1.5-1.5c1-1.5 2.5-2.7 4.2-3.4l1.6 1.6c.2.2.4.3.7.3s.5-.1.7-.3c.4-.4.4-1 0-1.4l-.3-.3C21.3 13 23 9.2 23 5V7z" />
          </svg>
        </button>

        {/* Accept call */}
        {callState === 'ringing' && (
          <button
            onClick={acceptCall}
            className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23 7c0-1.1-.9-2-2-2h-1.1c-1.5 0-3 .5-4.2 1.5L14 8.1l-1.8-1.6C11 5.5 9.5 5 8 5H3c-1.1 0-2 .9-2 2v2c0 4.2 1.7 8 4.8 10.7l-.3.3c-.4.4-.4 1 0 1.4.2.2.4.3.7.3s.5-.1.7-.3l5.3-5.3c.1-.1.1-.2.1-.3 0-.1 0-.2-.1-.3l-1.5-1.5c1-1.5 2.5-2.7 4.2-3.4l1.6 1.6c.2.2.4.3.7.3s.5-.1.7-.3c.4-.4.4-1 0-1.4l-.3-.3C21.3 13 23 9.2 23 5V7z" />
            </svg>
          </button>
        )}
      </div>

      {/* Call state info */}
      {isAudio && callState === 'connected' && (
        <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
          {formatDuration(callDuration)}
        </p>
      )}

      {!isAudio && remoteStream && (
        <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
          {formatDuration(callDuration)}
        </p>
      )}
    </div>
  );
};

export default CallModal;
