'use client';

import React, { useState } from 'react';

export default function SaveScenarioModal({ isOpen, onClose, onSave, defaultName = '' }) {
  const [name, setName] = useState(defaultName || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(name.trim() || 'Untitled');
    setName('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'linear-gradient(135deg, rgba(15,15,25,0.98) 0%, rgba(20,20,35,0.95) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(99,102,241,0.3)',
          padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h3 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
          Save Scenario
        </h3>

        <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: '500' }}>
          Scenario Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Q1 2025 Pipeline"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '10px',
            border: '1px solid rgba(99,102,241,0.3)',
            background: 'rgba(15,15,25,0.8)', color: '#f8fafc',
            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
            marginBottom: '20px',
          }}
        />

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: '8px',
              border: '1px solid rgba(99,102,241,0.2)',
              background: 'transparent', color: '#94a3b8',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              boxShadow: '0 0 20px rgba(99,102,241,0.3)',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
