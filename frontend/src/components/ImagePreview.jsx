import { useState } from 'react';

const ImagePreview = ({ file, onSend, onCancel, uploading }) => {
  const [caption, setCaption] = useState('');
  const previewUrl = URL.createObjectURL(file);

  const handleSend = () => {
    if (uploading) return;
    onSend(caption);
  };

  return (
    <div className="bg-[--bg-primary] border-t border-[--border] p-4 flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <img
          src={previewUrl}
          alt="Preview"
          className="w-16 h-16 object-cover rounded-lg"
        />
        {uploading && (
          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <button
          onClick={onCancel}
          disabled={uploading}
          className="absolute -top-2 -right-2 w-5 h-5 bg-[--text-meta] text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors disabled:opacity-50"
        >
          ✕
        </button>
      </div>
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a caption..."
        className="flex-1 px-4 py-2 rounded-full bg-[--bg-secondary] text-sm text-[--text-primary] placeholder-[--text-meta] outline-none border border-[--border] focus:border-[--accent]"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !uploading) handleSend();
        }}
        autoFocus
      />
      <div className="flex items-center gap-2">
        {uploading && <span className="text-xs text-[--text-secondary]">Uploading...</span>}
        <button
          onClick={handleSend}
          disabled={uploading}
          className="bg-[--accent] text-white p-2.5 rounded-full hover:bg-[--accent-hover] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ImagePreview;
