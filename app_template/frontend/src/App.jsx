import React, { useState, useEffect } from 'react';

export default function App() {
  const [appInfo, setAppInfo] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch app info and health status
    const fetchData = async () => {
      try {
        const [infoRes, healthRes] = await Promise.all([
          fetch('/api/info'),
          fetch('/api/health')
        ]);
        
        const infoData = await infoRes.json();
        const healthData = await healthRes.json();
        
        setAppInfo(infoData);
        setHealth(healthData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 40, 
      fontFamily: 'Arial, sans-serif',
      maxWidth: 800,
      margin: '0 auto',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 30,
        borderRadius: 10,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h1 style={{ marginTop: 0, marginBottom: 20 }}>
          🚀 {appInfo?.app || 'Containerized App'}
        </h1>
        
        <div style={{ marginBottom: 30 }}>
          <h2 style={{ color: '#ffeb3b' }}>📊 Status</h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10
          }}>
            <span style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: health?.status === 'ok' ? '#4caf50' : '#f44336',
              display: 'inline-block'
            }}></span>
            <strong>Health:</strong> {health?.status || 'Unknown'}
          </div>
          <p><strong>Version:</strong> {appInfo?.version || 'Unknown'}</p>
        </div>

        <div style={{ marginBottom: 30 }}>
          <h2 style={{ color: '#ffeb3b' }}>💡 Welcome Message</h2>
          <p style={{ 
            fontSize: 18, 
            lineHeight: 1.6,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: 15,
            borderRadius: 5,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {appInfo?.message || 'This is your own isolated instance.'}
          </p>
        </div>

        <div style={{ marginBottom: 30 }}>
          <h2 style={{ color: '#ffeb3b' }}>🔗 API Endpoints</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: 10,
              borderRadius: 5,
              fontFamily: 'monospace'
            }}>
              <strong>GET /api/health</strong> - Health check
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: 10,
              borderRadius: 5,
              fontFamily: 'monospace'
            }}>
              <strong>GET /api/info</strong> - Application information
            </div>
          </div>
        </div>

        <div>
          <h2 style={{ color: '#ffeb3b' }}>🏗️ Architecture</h2>
          <p>This container includes:</p>
          <ul style={{ lineHeight: 1.8 }}>
            <li><strong>Go Fiber Backend</strong> - Serving API endpoints on port 8081</li>
            <li><strong>React Frontend</strong> - Built with Vite and served as static files</li>
            <li><strong>Isolated Environment</strong> - Each container has its own data volume</li>
            <li><strong>Traefik Integration</strong> - Automatic reverse proxy routing</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 