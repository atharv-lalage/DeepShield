// FileRow.jsx — Single file entry in the upload list
import React from 'react';
import { Image, X, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { formatFileSize, getFileExtension } from '../utils/fileUtils';

const STATUS_META = {
  pending:    { icon: null,                          color: 'var(--color-text-muted)',    label: 'Queued' },
  analyzing:  { icon: 'spinner',                     color: 'var(--color-accent)',        label: 'Analyzing…' },
  real:       { icon: <CheckCircle2 size={15} />,    color: 'var(--color-real)',          label: 'Authentic' },
  fake:       { icon: <XCircle size={15} />,         color: 'var(--color-fake)',          label: 'Deepfake' },
  suspicious: { icon: <AlertTriangle size={15} />,   color: 'var(--color-suspicious)',    label: 'Suspicious' },
};

export default function FileRow({ file, status, result, onSelect, onRemove, isSelected }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const ext  = getFileExtension(file.name);

  return (
    <div
      id={`file-row-${file.name.replace(/\W/g, '-')}`}
      className="file-row"
      onClick={onSelect}
      style={{
        borderColor: isSelected ? 'rgba(99,102,241,0.5)' : undefined,
        background:  isSelected ? 'rgba(99,102,241,0.08)' : undefined,
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 44, height: 44, borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {file.previewUrl
          ? <img src={file.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Image size={18} color="var(--color-text-subtle)" />
        }
      </div>

      {/* Name + size */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file.name}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
          {ext} · {formatFileSize(file.size)}
        </div>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: meta.color, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
        {status === 'analyzing'
          ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
          : meta.icon
        }
        {result?.confidence ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${meta.color}44` }}>
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
          width: 28, height: 28, borderRadius: '6px', background: 'transparent',
          border: '1px solid transparent', color: 'var(--color-text-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#ef4444'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-subtle)'; }}
        aria-label="Remove file"
      >
        <X size={13} />
      </button>
    </div>
  );
}
