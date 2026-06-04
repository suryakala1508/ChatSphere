import { useEffect, useRef } from 'react';

const ContextMenu = ({ x, y, options, onClose }) => {
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
      className="context-menu"
      style={{ left: x, top: y }}
    >
      {options.map((opt, i) => (
        <button
          key={i}
          className={opt.danger ? 'danger' : ''}
          onClick={() => {
            opt.action();
            onClose();
          }}
        >
          {opt.icon && <span className="mr-2">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
