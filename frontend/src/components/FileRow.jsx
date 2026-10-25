// FileRow.jsx — Clean file entry row
import React from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Loader2, File } from 'lucide-react';
import { formatFileSize, getFileExtension, isImage } from '../utils/fileUtils';

const STATUS_META = {
  pending:    { icon: null,                        color: 'var(--color-text-subtle)', label: 'Queued' },
  analyzing:  { icon: 'spinner',                   color: 'var(--color-text-muted)', label: 'Analysing' },
  real:       { icon: <CheckCircle2 size={13} />,  color: 'var(--color-real)',        label: 'Authentic' },
  fake:       { icon: <XCircle size={13} />,       color: 'var(--color-fake)',        label: 'Deepfake' },
  suspicious: { icon: <AlertTriangle size={13} />, color: 'var(--color-suspicious)', label: 'Suspicious' },
};

export default function FileRow({ file, status, result, onSelect, onRemove, isSelected }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const ext  = getFileExtension(file.name);

  return (
    <div
      className="file-row"
      onClick={onSelect}
      style={{
        borderColor: isSelected ? 'var(--color-border-strong)' : undefined,
        background:  isSelected ? 'var(--color-surface)' : undefined,
      }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 2, background: 'var(--color-text-muted)',
          borderRadius: '2px 0 0 2px',
        }} />
      )}

      {/* Thumbnail */}
      <div style={{
        width: 40, height: 40, borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
        background: 'var(--color-surface-subtle)',
        border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {file.previewUrl && isImage(file)
          ? <img src={file.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <File size={16} color="var(--color-text-subtle)" />
        }
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.82rem',
          fontWeight: 500,
          color: 'var(--color-text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {file.name}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'var(--color-text-subtle)',
          marginTop: '2px',
        }}>
          {ext.toUpperCase()} · {formatFileSize(file.size)}
        </div>
      </div>

      {/* Status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        color: meta.color,
        fontSize: '0.72rem',
        fontWeight: 500,
        flexShrink: 0,
      }}>
        {status === 'analyzing'
          ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
          : meta.icon
        }
        {result?.confidence ? (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            background: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border)',
            padding: '1px 7px',
            borderRadius: '4px',
          }}>
            {result.confidence}%
          </span>
        ) : (
          <span>{meta.label}</span>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          width: 26, height: 26,
          borderRadius: '6px',
          background: 'transparent',
          border: '1px solid transparent',
          color: 'var(--color-text-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
          e.currentTarget.style.color = '#ef4444';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-subtle)';
        }}
        aria-label="Remove file"
      >
        <X size={12} />
      </button>
    </div>
  );
}