import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * OfflinePage
 * 
 * Shows a premium offline screen when the user loses internet connection.
 * Listens to online/offline browser events and auto-dismisses when back online.
 */
export default function OfflinePage() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        setIsOffline(false);
      }
      setIsRetrying(false);
    }, 1500);
  };

  if (!isOffline) return null;

  return (
    <div className="offline-overlay">
      <div className="offline-card">
        {/* Animated wifi icon */}
        <div className="offline-icon-wrapper">
          <div className="offline-pulse-ring" />
          <div className="offline-pulse-ring offline-pulse-ring-2" />
          <WifiOff size={48} className="offline-icon" />
        </div>

        <h2 className="offline-title">You're Offline</h2>
        <p className="offline-subtitle">
          No internet connection detected.<br />
          Please check your network and try again.
        </p>

        <button 
          className="offline-retry-btn" 
          onClick={handleRetry}
          disabled={isRetrying}
        >
          <RefreshCw size={18} className={isRetrying ? 'offline-spin' : ''} />
          {isRetrying ? 'Checking...' : 'Try Again'}
        </button>

        <div className="offline-hint">
          <span className="offline-hint-dot" />
          The app will reconnect automatically when network is available.
        </div>
      </div>
    </div>
  );
}
