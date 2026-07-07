import React, { useState, useEffect } from 'react';
import { Palette, Sun, Moon, Download, X } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import BillForm from './components/BillForm';
import ImageUploader from './components/ImageUploader';

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [scannedBillData, setScannedBillData] = useState(null);
  const [template, setTemplate] = useState('default');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Intro timer
  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Register service worker & capture install prompt
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (localStorage.getItem('hideInstallBanner') !== 'true') {
        setShowInstallBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleImageScanned = (data) => {
    setScannedBillData(data);
    setIsApplying(true);
    setTimeout(() => setIsApplying(false), 2500); // Effect lasts 2.5 seconds
  };

  if (showIntro) {
    return (
      <div className="intro-screen">
        <h1 className="intro-title">Auto Bill Scanner</h1>
        <p className="intro-subtitle">Made By <span className="intro-highlight">kaifcoder.in</span></p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Toaster position="top-right" toastOptions={{ 
        style: { background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }
      }} />
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <div className="header-brand">
            <span className="brand-dot" />
            <h1>Auto Bill Scanner</h1>
          </div>
          <div className="header-actions">
            {installPrompt && (
              <button className="icon-btn install-btn" onClick={handleInstall} title="Install App">
                <Download size={16} />
                Install
              </button>
            )}
            <button className="icon-btn" onClick={toggleTheme} title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
        <p className="header-subtitle">Intelligent scanning, auto-fill, and smart calculation.</p>
      </header>

      {/* Install Banner (Mobile) */}
      <div className={`install-banner ${showInstallBanner ? 'show' : ''}`}>
        <div className="install-banner-text">
          <strong>📲 Install App</strong> — Use this app offline like a native app!
        </div>
        <button className="install-banner-btn" onClick={handleInstall}>Install</button>
        <button type="button" className="install-banner-close" onClick={(e) => {
          e.stopPropagation();
          setShowInstallBanner(false);
          localStorage.setItem('hideInstallBanner', 'true');
        }}>
          <X size={16} />
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="sidebar">
          <div className="glass-panel" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem 0', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>
              <Palette size={16} /> Choose Template
            </h3>
            <div className="template-selector">
              <button className={`template-btn ${template === 'default' ? 'active' : ''}`} onClick={() => setTemplate('default')}>Default</button>
              <button className={`template-btn ${template === 'dark' ? 'active' : ''}`} onClick={() => setTemplate('dark')}>Dark Minimal</button>
              <button className={`template-btn ${template === 'classic' ? 'active' : ''}`} onClick={() => setTemplate('classic')}>Classic</button>
              <button className={`template-btn ${template === 'ocean' ? 'active' : ''}`} onClick={() => setTemplate('ocean')}>Ocean Wave</button>
              <button className={`template-btn ${template === 'sunset' ? 'active' : ''}`} onClick={() => setTemplate('sunset')}>Sunset Glow</button>
              <button className={`template-btn ${template === 'emerald' ? 'active' : ''}`} onClick={() => setTemplate('emerald')}>Emerald Luxury</button>
            </div>
          </div>

          <ImageUploader onImageScanned={handleImageScanned} />
        </div>

        <div className={`main-form ${isApplying ? 'siri-effect' : ''}`}>
          <BillForm billData={scannedBillData} template={template} />
        </div>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        Created by <a href="https://kaifcoder.in" target="_blank" rel="noopener noreferrer">Kaifcoder.in</a>
      </footer>
    </div>
  );
}

export default App;
