import { useState, useCallback, useEffect } from 'react';

type DeviceType = 'ios' | 'android' | 'desktop';

export const useMapRouter = () => {
  const [showModal, setShowModal] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceType>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDevice('ios');
    } else if (/android/.test(ua)) {
      setDevice('android');
    } else {
      setDevice('desktop');
    }
  }, []);

  const openGoogleMaps = useCallback((query: string) => {
    // 1. Check preference
    const pref = localStorage.getItem('preferGoogleMapsApp');

    if (device === 'desktop') {
      // Desktop always opens web version
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
      return;
    }

    if (pref === 'true') {
      // Silent execution
      executeDeepLink(query, device);
    } else if (pref === 'false') {
      // User explicitly wants web version
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    } else {
      // First time on mobile -> Show modal
      setPendingQuery(query);
      setShowModal(true);
    }
  }, [device]);

  const executeDeepLink = (query: string, currentDevice: DeviceType) => {
    const encodedQuery = encodeURIComponent(query);
    const start = Date.now();
    const TIMEOUT_MS = 800; // Extreme fast fallback
    
    // Deep links
    const iosUrl = `comgooglemaps://?q=${encodedQuery}`;
    const androidUrl = `intent://maps.google.com/maps?q=${encodedQuery}#Intent;scheme=http;package=com.google.android.apps.maps;end`;
    const iosStoreUrl = 'https://apps.apple.com/app/google-maps/id585027354';
    const androidStoreUrl = 'market://details?id=com.google.android.apps.maps';

    let hasResponded = false;

    // Detect if app went to background (meaning App was successfully opened)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hasResponded = true;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (!hasResponded) {
        // If elapsed time is significantly longer than timeout, it might mean the OS paused the JS thread to open the app
        // So we only fallback if it fired relatively on time.
        const elapsed = Date.now() - start;
        if (elapsed < TIMEOUT_MS + 200) {
          // Fallback to Store
          if (currentDevice === 'ios') {
            window.location.href = iosStoreUrl;
          } else {
            // Android market link or web fallback
            window.location.href = androidStoreUrl;
          }
        }
      }
    }, TIMEOUT_MS);

    // Trigger the intent
    if (currentDevice === 'ios') {
      window.location.href = iosUrl;
    } else {
      window.location.href = androidUrl;
    }
  };

  const handleModalChoice = (choice: 'app' | 'web' | 'cancel', remember: boolean) => {
    setShowModal(false);
    
    if (choice === 'cancel') {
      setPendingQuery(null);
      return;
    }

    const useApp = choice === 'app';
    if (remember) {
      localStorage.setItem('preferGoogleMapsApp', useApp ? 'true' : 'false');
    }
    
    if (pendingQuery) {
      if (useApp) {
        executeDeepLink(pendingQuery, device);
      } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pendingQuery)}`, '_blank');
      }
    }
    setPendingQuery(null);
  };

  return {
    openGoogleMaps,
    showMapModal: showModal,
    handleMapModalChoice: handleModalChoice
  };
};
