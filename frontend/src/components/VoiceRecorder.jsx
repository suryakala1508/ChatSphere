import { useState, useRef, useEffect } from 'react';

const VoiceRecorder = ({ onSend, onCancel }) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, duration);
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[--bg-primary] border-t border-[--border] p-3 flex items-center gap-3">
      {!audioUrl ? (
        <>
          {!recording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
                <path d="M17 11a5 5 0 01-10 0H5a7 7 0 0014 0h-2z" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              Start Recording
            </button>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <span className="w-2 h-2 bg-red-500 rounded-full recording-pulse" />
              <span className="text-sm font-medium text-red-500">Recording {formatTime(duration)}</span>
              <div className="flex-1" />
              <button
                onClick={stopRecording}
                className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Stop
              </button>
            </div>
          )}
          <button
            onClick={onCancel}
            className="text-[--text-meta] hover:text-[--text-primary] transition-colors p-2"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <audio src={audioUrl} controls className="flex-1 h-10" />
          <button
            onClick={handleSend}
            className="bg-[--accent] text-white p-2.5 rounded-full hover:bg-[--accent-hover] transition-colors flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
          <button
            onClick={() => { setAudioUrl(null); setAudioBlob(null); }}
            className="text-[--text-meta] hover:text-[--text-primary] transition-colors p-2"
          >
            Redo
          </button>
        </>
      )}
    </div>
  );
};

export default VoiceRecorder;
