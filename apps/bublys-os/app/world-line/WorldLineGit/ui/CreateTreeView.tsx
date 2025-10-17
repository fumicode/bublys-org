import React from 'react';
import { World } from '../domain/World';

interface CreateTreeViewProps {
  creates: World[];
  currentCreateId: string | null;
  onCreateSelect: (createId: string) => void;
  createTree: { [createId: string]: string[] };
}

export function CreateTreeView({ 
  creates, 
  currentCreateId, 
  onCreateSelect, 
  createTree 
}: CreateTreeViewProps) {
  const renderCreateNode = (create: World, level: number = 0) => {
    const isCurrent = create.worldId === currentCreateId;
    const children = createTree[create.worldId] || [];
    
    return (
      <div key={create.worldId} style={{ marginLeft: `${level * 20}px` }}>
        <div
          onClick={() => onCreateSelect(create.worldId)}
          style={{
            padding: '0.5rem',
            margin: '0.25rem 0',
            backgroundColor: isCurrent ? '#e3f2fd' : '#f5f5f5',
            border: isCurrent ? '2px solid #2196f3' : '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <div style={{ fontWeight: 'bold' }}>
            {create.worldId.substring(0, 8)}...
          </div>
          <div style={{ color: '#666', fontSize: '0.8rem' }}>
            Counters: {Array.from(create.worldObject.counters.entries())
              .map(([id, counter]) => `${id}: ${counter.value}`)
              .join(', ')}
          </div>
          <div style={{ color: '#999', fontSize: '0.7rem' }}>
            WorldLine: {create.currentWorldLineId.substring(0, 8)}...
          </div>
        </div>
        
        {children.map(childId => {
          const childCreate = creates.find(c => c.worldId === childId);
          return childCreate ? renderCreateNode(childCreate, level + 1) : null;
        })}
      </div>
    );
  };

  // ルート作成を探す
  const rootCreates = creates.filter(create => !create.parentWorldId);
  
  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '1rem', 
      borderRadius: '8px',
      margin: '1rem 0',
      border: '1px solid #ddd'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
        🌳 世界ツリー
      </h3>
      
      {rootCreates.length === 0 ? (
        <div style={{ color: '#666', fontStyle: 'italic' }}>
          世界がありません
        </div>
      ) : (
        rootCreates.map(rootCreate => renderCreateNode(rootCreate))
      )}
    </div>
  );
}
