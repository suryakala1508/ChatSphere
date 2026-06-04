import { useState, useRef, useEffect } from 'react';

const REACTIONS = ['❤️', '👍', '😂', '😍', '😢'];

const ReactionPicker = ({ onReact, onClose, position }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-[--bg-primary] rounded-full shadow-lg border border-[--border] p-1.5 flex gap-1"
      style={{
        bottom: position?.bottom || '100%',
        left: position?.left || '50%',
        transform: 'translateX(-50%)',
        marginBottom: 8,
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border)',
        boxShadow: '0 2px 12px var(--shadow)'
      }}
    >
      {REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="w-9 h-9 flex items-center justify-center text-xl hover:scale-125 transition-transform rounded-full hover:bg-[--bg-secondary]"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionPicker;
