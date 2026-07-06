import React, { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import BillForm from './components/BillForm';
import ImageUploader from './components/ImageUploader';

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [scannedBillData, setScannedBillData] = useState(null);
  const [template, setTemplate] = useState('default');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleImageScanned = (data) => {
    setScannedBillData(data);
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
      <header className="header">
        <h1>Auto Bill Scanner</h1>
        <p>Intelligent scanning, auto-fill, and smart calculation.</p>
      </header>

      <div className="main-content">
        <div className="sidebar">
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: 'var(--text-main)' }}>
              <Palette size={18} /> Choose Template
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

        <div className="main-form">
          <BillForm billData={scannedBillData} template={template} />
        </div>
      </div>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Created by <a href="https://kaifcoder.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>Kaifcoder.in</a>
      </footer>
    </div>
  );
}

export default App;
