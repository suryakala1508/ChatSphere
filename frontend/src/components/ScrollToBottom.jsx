const ScrollToBottom = ({ onClick, visible }) => {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-20 right-6 w-10 h-10 rounded-full bg-[--accent] text-white shadow-lg flex items-center justify-center hover:bg-[--accent-hover] transition-all z-10 animate-fadeIn"
      title="Scroll to bottom"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
};

export default ScrollToBottom;
