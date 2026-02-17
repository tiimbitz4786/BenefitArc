'use client';

import React, { useState } from 'react';
import SaveScenarioModal from './SaveScenarioModal';

export default function ScenarioSelector({
  scenarios,
  activeId,
  loading,
  onSave,
  onLoad,
  onDelete,
  getDataToSave,
}) {
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSave = (name) => {
    const data = getDataToSave();
    onSave(name, data);
  };

  const handleLoad = async (id) => {
    await onLoad(id);
    setExpanded(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved scenario?')) {
      await onDelete(id);
    }
  };

  const savedScenarios = scenarios.filter(s => !s.is_auto_save);

  return (
    <div className="no-print" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '6px 14px', borderRadius: '8px',
            border: '1px solid rgba(16,185,129,0.3)',
            background: 'rgba(16,185,129,0.1)',
            color: '#6ee7b7', fontSize: '11px', fontWeight: '500', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          Save
        </button>

        {savedScenarios.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.1)',
              color: '#a5b4fc', fontSize: '11px', fontWeight: '500', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            Load ({savedScenarios.length})
          </button>
        )}
      </div>

      {expanded && savedScenarios.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '6px',
          width: '280px', maxHeight: '300px', overflowY: 'auto',
          background: 'rgba(15,15,25,0.98)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '10px', padding: '6px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 100,
        }}>
          {savedScenarios.map(s => (
            <div
              key={s.id}
              onClick={() => handleLoad(s.id)}
              style={{
                padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: s.id === activeId ? 'rgba(99,102,241,0.15)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (s.id !== activeId) e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
              onMouseLeave={e => { if (s.id !== activeId) e.currentTarget.style.background = 'transparent'; }}
            >
              <div>
                <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '500' }}>
                  {s.scenario_name}
                </div>
                <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                  {new Date(s.updated_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={e => handleDelete(s.id, e)}
                style={{
                  background: 'none', border: 'none', color: '#64748b',
                  fontSize: '14px', cursor: 'pointer', padding: '4px',
                  lineHeight: 1,
                }}
                title="Delete"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <SaveScenarioModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </div>
  );
}
