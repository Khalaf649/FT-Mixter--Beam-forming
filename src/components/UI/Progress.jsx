function Progress({ isProcessing = false, className = "" }) {
  if (!isProcessing) return null;

  return (
    <div className={`progress-container ${className}`}>
      <div className="progress-bar">
        <div className="progress-fill indeterminate" />
      </div>
    </div>
  );
}

export default Progress;
