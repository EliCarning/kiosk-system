import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Notification,
  useNotifications,
} from "../../context/NotificationsContext";

const formatRelative = (ts: number): string => {
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `${min}m ago`;
};

const NotificationsHost: React.FC = () => {
  const { notifications, dismiss } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n: Notification) => {
    if (n.machineName) {
      navigate(`/machines/${encodeURIComponent(n.machineName)}`);
    }
    dismiss(n.id);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notifications-host" role="region" aria-label="Notifications">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`notification notification--${n.variant}`}
          role="status"
          onClick={() => handleClick(n)}
        >
          <div className="notification__head">
            <span className="notification__title">{n.title}</span>
            <button
              type="button"
              className="notification__close"
              aria-label="Dismiss notification"
              onClick={(e) => {
                e.stopPropagation();
                dismiss(n.id);
              }}
            >
              ✕
            </button>
          </div>
          <div className="notification__message">{n.message}</div>
          <div className="notification__meta">
            {n.machineName && (
              <span className="notification__machine">{n.machineName}</span>
            )}
            <span className="notification__time">
              {formatRelative(n.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationsHost;
