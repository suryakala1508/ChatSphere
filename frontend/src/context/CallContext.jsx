import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from './SocketContext';

const CallContext = createContext();
const API_URL = 'https://chatsphere-m9gn.onrender.com/api';

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callPartner, setCallPartner] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnection = useRef(null);
  const localStreamRef = useRef(null);
  const durationInterval = useRef(null);
  const pendingCandidates = useRef([]);
  const pendingOffer = useRef(null);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const startDuration = useCallback(() => {
    const start = Date.now();
    durationInterval.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }, []);

  const stopDuration = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  }, []);

  const formatDuration = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const cleanupCall = useCallback(() => {
    stopDuration();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallType(null);
    setCallPartner(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    pendingCandidates.current = [];
    pendingOffer.current = null;
  }, [stopDuration]);

  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection(configuration);

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('iceCandidate', { userId: callPartner?._id, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        handleEndCall();
      }
    };

    peerConnection.current = pc;
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callPartner]);

  const initiateCall = useCallback(async (partner, type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallType(type);
      setCallPartner(partner);
      setCallState('calling');

      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('callUser', { receiverId: partner._id, type, offer });
    } catch (err) {
      console.error('Error initiating call:', err);
      setCallState('idle');
      cleanupCall();
    }
  }, [socket, createPeerConnection, cleanupCall]);

  const acceptCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(stream);

      if (pendingOffer.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answerCall', { callerId: callPartner._id, answer });
        setCallState('connected');
        startDuration();

        for (const candidate of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current = [];
      }
    } catch (err) {
      console.error('Error accepting call:', err);
    }
  }, [callType, createPeerConnection, startDuration, socket, callPartner]);

  const rejectCall = useCallback(() => {
    if (socket && callPartner) {
      socket.emit('endCall', { userId: callPartner._id, type: callType, duration: 0 });
    }
    cleanupCall();
    setCallState('idle');
  }, [socket, callPartner, callType, cleanupCall]);

  const handleEndCall = useCallback(() => {
    if (socket && callPartner) {
      socket.emit('endCall', { userId: callPartner._id, type: callType, duration: callDuration });
    }
    cleanupCall();
    setCallState('idle');
  }, [socket, callPartner, callType, callDuration, cleanupCall]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
    if (socket && callPartner) {
      socket.emit(isMuted ? 'unmuteCall' : 'muteCall', { userId: callPartner._id });
    }
  }, [socket, callPartner, isMuted]);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
    if (socket && callPartner) {
      socket.emit('toggleCamera', { userId: callPartner._id, isCameraOff: !isCameraOff });
    }
  }, [socket, callPartner, isCameraOff]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = async ({ callerId, type, offer }) => {
      pendingOffer.current = offer;
      setCallType(type);
      setCallState('ringing');
      try {
        const res = await axios.get(`${API_URL}/users/${callerId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setCallPartner(res.data);
      } catch (e) {
        console.error('Error fetching caller:', e);
      }
    };

    const handleCallAnswered = async ({ answer }) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallState('connected');
          startDuration();
          for (const candidate of pendingCandidates.current) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidates.current = [];
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // Ignore ICE errors
        }
      } else {
        pendingCandidates.current.push(candidate);
      }
    };

    const handleCallEnded = () => {
      cleanupCall();
      setCallState('idle');
    };

    socket.on('incomingCall', handleIncomingCall);
    socket.on('callAnswered', handleCallAnswered);
    socket.on('iceCandidate', handleIceCandidate);
    socket.on('callEnded', handleCallEnded);

    return () => {
      socket.off('incomingCall', handleIncomingCall);
      socket.off('callAnswered', handleCallAnswered);
      socket.off('iceCandidate', handleIceCandidate);
      socket.off('callEnded', handleCallEnded);
    };
  }, [socket, startDuration, cleanupCall]);

  return (
    <CallContext.Provider value={{
      callState,
      callType,
      remoteStream,
      localStream,
      isMuted,
      isCameraOff,
      callPartner,
      callDuration,
      formatDuration,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall: handleEndCall,
      toggleMute,
      toggleCamera,
      setCallState,
      setCallType,
      setCallPartner
    }}>
      {children}
    </CallContext.Provider>
  );
};
