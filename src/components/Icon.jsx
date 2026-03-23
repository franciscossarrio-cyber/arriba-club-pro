const Icon = ({ name, filled = false, className = "", size = 24 }) => {
  return (
    <span
      className={`material-symbols-outlined ${filled ? 'icon-filled' : ''} ${className}`}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
};

export default Icon;
