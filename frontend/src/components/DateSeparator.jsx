import { formatDateSeparator } from '../utils/helpers';

const DateSeparator = ({ timestamp }) => {
  return (
    <div className="flex items-center justify-center my-3">
      <div className="bg-[--bg-received] dark:bg-[--bg-received] px-3 py-1 rounded-full shadow-sm" style={{
        backgroundColor: 'var(--bg-received)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
      }}>
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {formatDateSeparator(timestamp)}
        </span>
      </div>
    </div>
  );
};

export default DateSeparator;
