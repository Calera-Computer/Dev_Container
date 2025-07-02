import React, { useState, useEffect } from 'react';

export default function App() {
  const [message, setMessage] = useState('');
  const [containers, setContainers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('containers');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [selectedContainers, setSelectedContainers] = useState(new Set());
  const [showLogs, setShowLogs] = useState({});
  const [containerLogs, setContainerLogs] = useState({});
  const [containerDetails, setContainerDetails] = useState({});
  const [showDetails, setShowDetails] = useState({});
  const [bulkAction, setBulkAction] = useState('');

  // Fetch containers and templates on component mount and periodically
  useEffect(() => {
    fetchContainers();
    fetchTemplates();
    const interval = setInterval(fetchContainers, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchContainers = async () => {
    try {
      const res = await fetch('/api/containers');
      const data = await res.json();
      setContainers(data.containers || []);
    } catch (error) {
      console.error('Failed to fetch containers:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
      // Set default template to first one
      if (data.templates && data.templates.length > 0) {
        setSelectedTemplate(data.templates[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const launchContainer = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/launch', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template: selectedTemplate })
      });
      const data = await res.json();
      setMessage(data.message);
      if (res.ok) {
        // Refresh container list after successful launch
        setTimeout(fetchContainers, 1000);
      }
    } catch (error) {
      setMessage('Failed to launch container');
    } finally {
      setLoading(false);
    }
  };

  const deleteContainer = async (containerID) => {
    if (!confirm('Are you sure you want to delete this container?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/launch/${containerID}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(`Container ${containerID.substring(0, 12)} deleted successfully`);
        fetchContainers(); // Refresh the list
      } else {
        setMessage(`Failed to delete container: ${data.error}`);
      }
    } catch (error) {
      setMessage('Failed to delete container');
    }
  };

  const controlContainer = async (containerID, action) => {
    try {
      const res = await fetch(`/api/containers/${containerID}/${action}`, { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(`Container ${action}ed successfully`);
        fetchContainers();
      } else {
        setMessage(`Failed to ${action} container: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Failed to ${action} container`);
    }
  };

  const fetchContainerLogs = async (containerID) => {
    try {
      const res = await fetch(`/api/containers/${containerID}/logs`);
      const data = await res.json();
      
      if (res.ok) {
        setContainerLogs(prev => ({ ...prev, [containerID]: data.logs }));
      } else {
        setContainerLogs(prev => ({ ...prev, [containerID]: `Error: ${data.error}` }));
      }
    } catch (error) {
      setContainerLogs(prev => ({ ...prev, [containerID]: 'Failed to fetch logs' }));
    }
  };

  const fetchContainerDetails = async (containerID) => {
    try {
      const res = await fetch(`/api/containers/${containerID}/inspect`);
      const data = await res.json();
      
      if (res.ok) {
        setContainerDetails(prev => ({ ...prev, [containerID]: data.details }));
      } else {
        setContainerDetails(prev => ({ ...prev, [containerID]: { error: data.error } }));
      }
    } catch (error) {
      setContainerDetails(prev => ({ ...prev, [containerID]: { error: 'Failed to fetch details' } }));
    }
  };

  const toggleLogs = (containerID) => {
    const newShowLogs = { ...showLogs, [containerID]: !showLogs[containerID] };
    setShowLogs(newShowLogs);
    
    if (newShowLogs[containerID] && !containerLogs[containerID]) {
      fetchContainerLogs(containerID);
    }
  };

  const toggleDetails = (containerID) => {
    const newShowDetails = { ...showDetails, [containerID]: !showDetails[containerID] };
    setShowDetails(newShowDetails);
    
    if (newShowDetails[containerID] && !containerDetails[containerID]) {
      fetchContainerDetails(containerID);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedContainers.size === 0) return;
    
    if (!confirm(`Are you sure you want to ${bulkAction} ${selectedContainers.size} containers?`)) {
      return;
    }

    const promises = Array.from(selectedContainers).map(containerID => {
      if (bulkAction === 'delete') {
        return fetch(`/api/launch/${containerID}`, { method: 'DELETE' });
      } else {
        return fetch(`/api/containers/${containerID}/${bulkAction}`, { method: 'POST' });
      }
    });

    try {
      await Promise.all(promises);
      setMessage(`Bulk ${bulkAction} completed for ${selectedContainers.size} containers`);
      setSelectedContainers(new Set());
      setBulkAction('');
      fetchContainers();
    } catch (error) {
      setMessage(`Failed to complete bulk ${bulkAction}`);
    }
  };

  const toggleContainerSelection = (containerID) => {
    const newSelected = new Set(selectedContainers);
    if (newSelected.has(containerID)) {
      newSelected.delete(containerID);
    } else {
      newSelected.add(containerID);
    }
    setSelectedContainers(newSelected);
  };

  const selectAllContainers = () => {
    if (selectedContainers.size === filteredContainers.length) {
      setSelectedContainers(new Set());
    } else {
      setSelectedContainers(new Set(filteredContainers.map(c => c.full_id)));
    }
  };

  const getStatusColor = (state) => {
    switch (state) {
      case 'running': return '#4CAF50';
      case 'exited': return '#f44336';
      case 'created': return '#ff9800';
      case 'paused': return '#9c27b0';
      case 'restarting': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  const getTemplateIcon = (templateId) => {
    switch (templateId) {
      case 'app_template': return '🚀';
      case 'note_template': return '📝';
      default: return '📦';
    }
  };

  // Filter containers based on search and filters
  const filteredContainers = containers.filter(container => {
    const matchesSearch = searchTerm === '' || 
      container.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      container.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      container.tenant_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || container.state === statusFilter;
    const matchesTemplate = templateFilter === 'all' || container.template_id === templateFilter;
    
    return matchesSearch && matchesStatus && matchesTemplate;
  });

  const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);

  const TabButton = ({ id, label, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '12px 20px',
        fontSize: 16,
        backgroundColor: activeTab === id ? '#2196F3' : '#f5f5f5',
        color: activeTab === id ? 'white' : '#333',
        border: 'none',
        borderRadius: '4px 4px 0 0',
        cursor: 'pointer',
        marginRight: 4,
        transition: 'all 0.3s'
      }}
    >
      {label} {count !== undefined && `(${count})`}
    </button>
  );

  return (
    <div style={{ padding: 40, fontFamily: 'Arial, sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ color: '#333', marginBottom: 30 }}>🐳 Docker Container Orchestrator</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: 20, borderBottom: '2px solid #ddd' }}>
        <TabButton id="containers" label="Containers" count={containers.length} />
        <TabButton id="launch" label="Launch" />
        <TabButton id="templates" label="Templates" count={templates.length} />
      </div>

      {/* Message Display */}
      {message && (
        <div style={{ 
          marginBottom: 20,
          padding: 12, 
          backgroundColor: message.includes('successfully') || message.includes('launched') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('successfully') || message.includes('launched') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: 4,
          color: message.includes('successfully') || message.includes('launched') ? '#155724' : '#721c24'
        }}>
          <strong>{message.includes('successfully') || message.includes('launched') ? '✅' : '❌'}</strong> {message}
          <button
            onClick={() => setMessage('')}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Containers Tab */}
      {activeTab === 'containers' && (
        <div>
          {/* Filters and Controls */}
          <div style={{ 
            marginBottom: 20, 
            padding: 20, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 15
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>🔍 Search:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search containers..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>📊 Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14
                }}
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="exited">Stopped</option>
                <option value="paused">Paused</option>
                <option value="created">Created</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>📋 Template:</label>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14
                }}
              >
                <option value="all">All Templates</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {getTemplateIcon(template.id)} {template.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>🔄 Auto-refresh:</label>
              <button 
                onClick={fetchContainers}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Refresh Now
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedContainers.size > 0 && (
            <div style={{
              marginBottom: 20,
              padding: 15,
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 15
            }}>
              <span style={{ fontWeight: 'bold' }}>
                {selectedContainers.size} containers selected
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #ddd',
                  borderRadius: 4
                }}
              >
                <option value="">Choose action...</option>
                <option value="start">Start All</option>
                <option value="stop">Stop All</option>
                <option value="restart">Restart All</option>
                <option value="delete">Delete All</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                style={{
                  padding: '6px 16px',
                  backgroundColor: !bulkAction ? '#ccc' : '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: !bulkAction ? 'not-allowed' : 'pointer'
                }}
              >
                Execute
              </button>
              <button
                onClick={() => setSelectedContainers(new Set())}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Container List Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, color: '#555' }}>
              Containers ({filteredContainers.length}/{containers.length})
            </h2>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={selectAllContainers}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {selectedContainers.size === filteredContainers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {filteredContainers.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 40, 
              color: '#666', 
              backgroundColor: '#f8f9fa',
              borderRadius: 8,
              border: '2px dashed #ddd'
            }}>
              {containers.length === 0 ? (
                <>
                  <h3>🐳 No containers found</h3>
                  <p>Launch your first container using the Launch tab!</p>
                </>
              ) : (
                <>
                  <h3>🔍 No containers match your filters</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {filteredContainers.map((container) => (
                <div 
                  key={container.full_id}
                  style={{
                    border: selectedContainers.has(container.full_id) ? '2px solid #2196f3' : '1px solid #ddd',
                    borderRadius: 8,
                    padding: 20,
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                        <input
                          type="checkbox"
                          checked={selectedContainers.has(container.full_id)}
                          onChange={() => toggleContainerSelection(container.full_id)}
                          style={{ marginRight: 12, transform: 'scale(1.2)' }}
                        />
                        <h3 style={{ margin: 0, marginRight: 12, color: '#333' }}>
                          {getTemplateIcon(container.template_id)} Container {container.id}
                        </h3>
                        <span 
                          style={{
                            padding: '4px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: getStatusColor(container.state)
                          }}
                        >
                          {container.state}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 15 }}>
                        <div><strong>Template:</strong> {container.template_name || 'Unknown'}</div>
                        <div><strong>Image:</strong> {container.image}</div>
                        <div><strong>Status:</strong> {container.status}</div>
                        {container.tenant_id && (
                          <div><strong>Tenant ID:</strong> {container.tenant_id}</div>
                        )}
                      </div>

                      {container.url && (
                        <div style={{ marginBottom: 15 }}>
                          <strong>URL:</strong>{' '}
                          <a 
                            href={container.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#2196F3', textDecoration: 'none' }}
                          >
                            {container.url}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Container Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {container.url && (
                          <a
                            href={container.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              textDecoration: 'none',
                              borderRadius: 4,
                              fontSize: 12,
                              textAlign: 'center'
                            }}
                          >
                            🌐 Visit
                          </a>
                        )}
                        <button
                          onClick={() => deleteContainer(container.full_id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        {container.state === 'running' ? (
                          <>
                            <button
                              onClick={() => controlContainer(container.full_id, 'stop')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#ff9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 12
                              }}
                            >
                              ⏹️ Stop
                            </button>
                            <button
                              onClick={() => controlContainer(container.full_id, 'restart')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 12
                              }}
                            >
                              🔄 Restart
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => controlContainer(container.full_id, 'start')}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                          >
                            ▶️ Start
                          </button>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => toggleLogs(container.full_id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          📋 {showLogs[container.full_id] ? 'Hide' : 'Show'} Logs
                        </button>
                        <button
                          onClick={() => toggleDetails(container.full_id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          🔍 {showDetails[container.full_id] ? 'Hide' : 'Show'} Details
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Container Logs */}
                  {showLogs[container.full_id] && (
                    <div style={{ marginTop: 15, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <strong>📋 Container Logs:</strong>
                        <button
                          onClick={() => fetchContainerLogs(container.full_id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 12,
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer'
                          }}
                        >
                          🔄 Refresh
                        </button>
                      </div>
                      <pre style={{
                        backgroundColor: '#000',
                        color: '#00ff00',
                        padding: 10,
                        borderRadius: 4,
                        fontSize: 12,
                        maxHeight: 200,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {containerLogs[container.full_id] || 'Loading logs...'}
                      </pre>
                    </div>
                  )}

                  {/* Container Details */}
                  {showDetails[container.full_id] && (
                    <div style={{ marginTop: 15, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <strong>🔍 Container Details:</strong>
                        <button
                          onClick={() => fetchContainerDetails(container.full_id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 12,
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer'
                          }}
                        >
                          🔄 Refresh
                        </button>
                      </div>
                      <pre style={{
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        padding: 10,
                        borderRadius: 4,
                        fontSize: 11,
                        maxHeight: 300,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {containerDetails[container.full_id] 
                          ? JSON.stringify(containerDetails[container.full_id], null, 2)
                          : 'Loading details...'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Launch Tab */}
      {activeTab === 'launch' && (
        <div style={{ padding: 20, border: '1px solid #ddd', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
          <h2 style={{ marginTop: 0, color: '#555' }}>🚀 Launch New Container</h2>
          
          {/* Template Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#333' }}>
              Select Template:
            </label>
            <select 
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              style={{
                padding: '10px 15px',
                fontSize: 16,
                border: '1px solid #ddd',
                borderRadius: 4,
                backgroundColor: 'white',
                minWidth: 250,
                cursor: 'pointer'
              }}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {getTemplateIcon(template.id)} {template.name}
                </option>
              ))}
            </select>
            
            {/* Template Description */}
            {selectedTemplateObj && (
              <div style={{
                marginTop: 10,
                padding: 15,
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                borderRadius: 8,
                fontSize: 14,
                color: '#1976d2'
              }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{getTemplateIcon(selectedTemplateObj.id)} {selectedTemplateObj.name}</h4>
                <p style={{ margin: '0 0 8px 0' }}>{selectedTemplateObj.description}</p>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  <strong>Image:</strong> {selectedTemplateObj.image} | 
                  <strong> Port:</strong> {selectedTemplateObj.port}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={launchContainer}
            disabled={loading || !selectedTemplate}
            style={{
              padding: '15px 30px',
              fontSize: 18,
              backgroundColor: loading || !selectedTemplate ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: loading || !selectedTemplate ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: loading || !selectedTemplate ? 'none' : '0 4px 8px rgba(33, 150, 243, 0.3)'
            }}
          >
            {loading ? '🔄 Launching...' : `🚀 Launch ${selectedTemplateObj?.name || 'Container'}`}
          </button>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <h2 style={{ color: '#555', marginBottom: 20 }}>📋 Available Templates</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {templates.map((template) => (
              <div
                key={template.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  padding: 20,
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
                      {getTemplateIcon(template.id)} {template.name}
                    </h3>
                    <p style={{ margin: '0 0 12px 0', color: '#666' }}>{template.description}</p>
                    <div style={{ fontSize: 14, color: '#888' }}>
                      <strong>Image:</strong> {template.image} | <strong>Port:</strong> {template.port}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setActiveTab('launch');
                    }}
                    style={{
                      padding: '10px 20px',
                      fontSize: 14,
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    🚀 Launch This Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 