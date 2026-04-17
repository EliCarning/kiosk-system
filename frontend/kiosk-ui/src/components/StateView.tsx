import React from "react";

interface StateViewProps {
  variant: "loading" | "empty" | "error";
  title: string;
  message?: string;
  onRetry?: () => void;
}

const StateView: React.FC<StateViewProps> = ({
  variant,
  title,
  message,
  onRetry,
}) => {
  return (
    <div className={`state-view state-view--${variant}`}>
      {variant === "loading" && <div className="state-view__spinner" />}
      {variant === "empty" && <div className="state-view__icon">∅</div>}
      {variant === "error" && <div className="state-view__icon">!</div>}
      <div className="state-view__title">{title}</div>
      {message && <div className="state-view__message">{message}</div>}
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
};

export default StateView;
