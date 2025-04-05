import React, { useState, useEffect } from 'react';

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    ttfb: 0,
    renderTime: 0
  });

  useEffect(() => {
    const calculatePerformance = () => {
      const { loadEventEnd, navigationStart, responseStart } = performance.timing;
      
      setMetrics({
        loadTime: loadEventEnd - navigationStart,
        ttfb: responseStart - navigationStart,
        renderTime: performance.now()
      });
    };

    window.addEventListener('load', calculatePerformance);
    return () => window.removeEventListener('load', calculatePerformance);
  }, []);

  return process.env.NODE_ENV === 'development' ? (
    <div className="fixed bottom-4 right-4 bg-black/70 text-white p-4 rounded">
      <h3>Performance Metrics</h3>
      <p>Load Time: {metrics.loadTime}ms</p>
      <p>Time to First Byte: {metrics.ttfb}ms</p>
      <p>Render Time: {metrics.renderTime.toFixed(2)}ms</p>
    </div>
  ) : null;
};

export default PerformanceMonitor;