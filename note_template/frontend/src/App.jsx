import React, { useState, useEffect } from 'react';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [appInfo, setAppInfo] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({ title: '', content: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notesRes, infoRes, healthRes] = await Promise.all([
        fetch('/api/notes'),
        fetch('/api/info'),
        fetch('/api/health')
      ]);
      
      const notesData = await notesRes.json();
      const infoData = await infoRes.json();
      const healthData = await healthRes.json();
      
      setNotes(notesData.notes || []);
      setAppInfo(infoData);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!newNote.title.trim()) return;
    
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });
      
      if (res.ok) {
        setNewNote({ title: '', content: '' });
        setIsCreating(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const updateNote = async (id, updatedNote) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedNote)
      });
      
      if (res.ok) {
        setEditingNote(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const deleteNote = async (id) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

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
      maxWidth: 1000,
      margin: '0 auto',
      background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 20,
        borderRadius: 10,
        marginBottom: 30,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h1 style={{ margin: 0, marginBottom: 10 }}>
          📝 {appInfo?.app || 'Notes App'}
        </h1>
        <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
          <span>
            <strong>Status:</strong> 
            <span style={{ 
              color: health?.status === 'ok' ? '#00b894' : '#e17055',
              marginLeft: 5 
            }}>
              {health?.status || 'Unknown'}
            </span>
          </span>
          <span><strong>Total Notes:</strong> {notes.length}</span>
        </div>
      </div>

      {/* Create Note Button */}
      <div style={{ marginBottom: 20 }}>
        <button 
          onClick={() => setIsCreating(true)}
          style={{
            padding: '12px 20px',
            backgroundColor: '#00b894',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold'
          }}
        >
          ➕ Create New Note
        </button>
      </div>

      {/* Create Note Form */}
      {isCreating && (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          padding: 20,
          borderRadius: 10,
          marginBottom: 20,
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <h3 style={{ marginTop: 0 }}>Create New Note</h3>
          <input
            type="text"
            placeholder="Note title..."
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            style={{
              width: '100%',
              padding: 10,
              marginBottom: 10,
              border: 'none',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <textarea
            placeholder="Note content..."
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            rows={4}
            style={{
              width: '100%',
              padding: 10,
              marginBottom: 15,
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              onClick={createNote}
              disabled={!newNote.title.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: newNote.title.trim() ? '#00b894' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: newNote.title.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Save Note
            </button>
            <button 
              onClick={() => {
                setIsCreating(false);
                setNewNote({ title: '', content: '' });
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#636e72',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 40,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3>No notes yet!</h3>
          <p>Create your first note to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 15 }}>
          {notes.map((note) => (
            <div 
              key={note.id}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                padding: 20,
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(5px)'
              }}
            >
              {editingNote?.id === note.id ? (
                // Edit Mode
                <div>
                  <input
                    type="text"
                    value={editingNote.title}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 10,
                      marginBottom: 10,
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 18,
                      fontWeight: 'bold'
                    }}
                  />
                  <textarea
                    value={editingNote.content}
                    onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: 10,
                      marginBottom: 15,
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 14,
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button 
                      onClick={() => updateNote(note.id, editingNote)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#00b894',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setEditingNote(null)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#636e72',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, color: '#fff' }}>{note.title}</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => setEditingNote(note)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#fdcb6e',
                          color: 'black',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => deleteNote(note.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#e17055',
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
                  </div>
                  {note.content && (
                    <p style={{ 
                      margin: '0 0 10px 0',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {note.content}
                    </p>
                  )}
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    <div>Created: {formatDate(note.created_at)}</div>
                    {note.updated_at !== note.created_at && (
                      <div>Updated: {formatDate(note.updated_at)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 