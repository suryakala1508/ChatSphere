const LoadingSkeleton = ({ type = 'user' }) => {
  if (type === 'user') {
    return (
      <div className="flex items-center px-4 py-3 gap-3">
        <div className="w-12 h-12 rounded-full skeleton flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/5 skeleton" />
          <div className="h-3 w-2/5 skeleton" />
        </div>
      </div>
    );
  }

  if (type === 'message') {
    return (
      <div className="space-y-3 px-4 py-2">
        {[70, 45, 60, 35, 55, 65].map((w, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`h-10 skeleton rounded-lg`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default LoadingSkeleton;
