import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * BillPreviewWrapper
 * 
 * Wraps the A4 bill in a responsive preview container that scales
 * the bill visually using CSS transform: scale() — like a PDF viewer.
 * 
 * - The actual A4 bill dimensions stay untouched (min-width: 700px).
 * - On desktop (>= 768px), the bill renders at 100% scale.
 * - On tablet/mobile, the bill is scaled down to fit the viewport width.
 * - transform-origin: top center keeps alignment clean.
 * - The wrapper height adjusts dynamically to avoid layout collapse.
 * - Print styles are not affected — the bill prints at its native A4 size.
 */
export default function BillPreviewWrapper({ children, billWidth = 700, padding = 16 }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const calculateScale = useCallback(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
    const availableWidth = containerWidth - (padding * 2);

    if (availableWidth >= billWidth) {
      // Desktop: no scaling needed
      setScale(1);
    } else {
      // Mobile/tablet: scale down to fit
      const newScale = availableWidth / billWidth;
      setScale(Math.min(newScale, 1));
    }
  }, [billWidth, padding]);

  useEffect(() => {
    calculateScale();

    const handleResize = () => {
      requestAnimationFrame(calculateScale);
    };

    window.addEventListener('resize', handleResize);
    // Also observe container size changes
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [calculateScale]);

  // The wrapper needs an explicit height because transform: scale()
  // does NOT affect layout flow. Without this, the parent collapses.
  const scaledHeight = containerRef.current
    ? containerRef.current.scrollHeight * scale
    : 'auto';

  return (
    <div
      className="bill-preview-outer"
      style={{
        width: '100%',
        overflowX: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        padding: `${padding}px`,
      }}
    >
      <div
        style={{
          height: scaledHeight,
          width: '100%',
          maxWidth: `${billWidth}px`,
          position: 'relative',
        }}
      >
        <div
          ref={containerRef}
          className="bill-preview-inner"
          style={{
            width: `${billWidth}px`,
            transformOrigin: 'top center',
            transform: `scale(${scale})`,
            position: 'absolute',
            top: 0,
            left: '50%',
            marginLeft: `${-(billWidth / 2)}px`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
