// DetectPanel.jsx — Core analysis panel (upload + results + visual explainability)
import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, Image as ImageIcon, CheckCircle2, XCircle, AlertTriangle,
  Eye, EyeOff, Layers, RefreshCw, Loader2, Info, File, Sparkles, Brain
} from 'lucide-react';
import FileRow from './FileRow';
import { isImage, createPreviewUrl, simulateAnalysis, getVerdictMeta } from '../utils/fileUtils';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

const VERDICT_ICON = {
  real:       <CheckCircle2 size={22} />,
  fake:       <XCircle      size={22} />,
  suspicious: <AlertTriangle size={22} />,
};

const VERDICT_COLOR = {
  real:       'var(--color-real)',
  fake:       'var(--color-fake)',
  suspicious: 'var(--color-suspicious)',
};

const VERDICT_GLOW = {
  real:       'var(--color-real-glow)',
  fake:       'var(--color-fake-glow)',
  suspicious: 'var(--color-suspicious-glow)',
};

/* ── Region Overlay ── */
function RegionOverlay({ regions, activeRegion, setActiveRegion, showHeatmap }) {
  if (!showHeatmap || !regions?.length) return null;
  return (
    <>
      {regions.map((r) => {
        const isActive = activeRegion === r.id || activeRegion === r.issueId;
        return (
          <div
            key={r.id}
            className={`region-box ${isActive ? 'highlighted' : ''}`}
            onMouseEnter={() => setActiveRegion(r.id)}
            onMouseLeave={() => setActiveRegion(null)}
            style={{
              left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%`,
              borderColor: r.color, color: r.color,
              backgroundColor: isActive ? `${r.color}20` : `${r.color}08`,
              boxShadow: isActive ? `0 0 0 2px ${r.color}, 0 0 20px ${r.color}60` : 'none',
            }}
          >
            <span className="region-label" style={{ background: r.color, color: '#000' }}>
              {r.label}
            </span>
          </div>
        );
      })}
    </>
  );
}

/* ── Scan Animation ── */
function ScanAnimation({ active }) {
  if (!active) return null;
  return (
    <div className="scan-overlay">
      <div className="scan-line" />
      {['top-left','top-right','bottom-left','bottom-right'].map((pos) => {
        const s = {
          'top-left':     { top: 12, left: 12,   borderRight: 'none', borderBottom: 'none' },
          'top-right':    { top: 12, right: 12,   borderLeft:  'none', borderBottom: 'none' },
          'bottom-left':  { bottom: 12, left: 12,  borderRight: 'none', borderTop: 'none' },
          'bottom-right': { bottom: 12, right: 12, borderLeft:  'none', borderTop: 'none' },
        };
        return <div key={pos} style={{ position: 'absolute', width: 24, height: 24, border: '2px solid var(--color-cyan)', ...s[pos] }} />;
      })}
    </div>
  );
}

/* ── Confidence Bar ── */
function ConfidenceBar({ value, verdict }) {
  const color = VERDICT_COLOR[verdict] || '#6366f1';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Confidence Score</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 700, color, textShadow: `0 0 16px ${color}80` }}>
          {value}%
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}aa, ${color})`, boxShadow: `0 0 12px ${color}60` }} />
      </div>
    </div>
  );
}

/* ── Issue List ── */
function IssueList({ issues, activeRegion, setActiveRegion }) {
  if (!issues?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-real)', fontSize: '0.875rem' }}>
        <CheckCircle2 size={28} style={{ margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 600 }}>No anomalies detected</div>
        <div style={{ color: 'var(--color-text-subtle)', fontSize: '0.78rem', marginTop: '4px' }}>All facial features appear authentic</div>
      </div>
    );
  }
  const SEV = { high: '#ef4444', medium: '#f59e0b', low: '#22d3ee' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {issues.map((issue) => {
        const isActive = activeRegion === issue.id;
        const sc = SEV[issue.severity] || '#94a3b8';
        return (
          <div
            key={issue.id}
            onMouseEnter={() => setActiveRegion(issue.id)}
            onMouseLeave={() => setActiveRegion(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: '8px',
              border: `1px solid ${isActive ? sc + '55' : 'var(--color-border-subtle)'}`,
              background: isActive ? `${sc}10` : 'var(--color-surface-subtle)',
              cursor: 'default', transition: 'all 0.2s',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 8px ${sc}`, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: 500 }}>{issue.label}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: sc, padding: '2px 8px', borderRadius: '4px', background: `${sc}18`, border: `1px solid ${sc}30` }}>
              {issue.severity}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Groq AI Explanation Panel ── */
function GroqExplanation({ explanation, verdict, isLoading }) {
  const verdictColor = VERDICT_COLOR[verdict] || '#6366f1';

  // Typing animation effect for the explanation text
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const prevExplanation           = useRef('');

  React.useEffect(() => {
    if (!explanation || explanation === prevExplanation.current) return;
    prevExplanation.current = explanation;

    // Reset and start typing animation
    setDisplayed('');
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(explanation.slice(0, i));
      if (i >= explanation.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 12); // ~12ms per char → smooth but fast

    return () => clearInterval(interval);
  }, [explanation]);

  if (isLoading) {
    return (
      <div style={{
        marginTop: '20px',
        padding: '16px',
        borderRadius: '10px',
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.18)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '8px',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={14} color="var(--color-accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
            Groq AI · Generating Explanation
          </span>
        </div>
        {/* Skeleton lines */}
        {[100, 85, 60].map((w, i) => (
          <div key={i} style={{
            height: '10px', borderRadius: '4px', marginBottom: '8px',
            width: `${w}%`,
            background: 'linear-gradient(90deg, var(--color-border) 25%, var(--color-border-strong) 50%, var(--color-border) 75%)',
            backgroundSize: '200% 100%',
            animation: `shimmer 1.4s ${i * 0.15}s ease infinite`,
          }} />
        ))}
        <style>{`
          @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <div style={{
      marginTop: '20px',
      padding: '16px',
      borderRadius: '10px',
      background: `${verdictColor}08`,
      border: `1px solid ${verdictColor}22`,
      transition: 'all 0.3s ease',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '8px',
            background: `${verdictColor}15`,
            border: `1px solid ${verdictColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={13} color={verdictColor} />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
            Groq AI · LLaMA 3.3 70B
          </span>
        </div>
        {/* Subtle "AI generated" pill */}
        <span style={{
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '2px 8px', borderRadius: '99px',
          background: `${verdictColor}12`, border: `1px solid ${verdictColor}25`,
          color: verdictColor, opacity: 0.75,
        }}>
          AI Explanation
        </span>
      </div>

      {/* Explanation text with typing cursor */}
      <p style={{
        fontSize: '0.855rem',
        lineHeight: 1.75,
        color: 'var(--color-text-muted)',
        margin: 0,
        fontStyle: 'normal',
      }}>
        {displayed}
        {isTyping && (
          <span style={{
            display: 'inline-block', width: '2px', height: '14px',
            background: verdictColor, marginLeft: '2px',
            verticalAlign: 'text-bottom',
            animation: 'blink 0.7s step-end infinite',
          }} />
        )}
      </p>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Main DetectPanel ── */
export default function DetectPanel() {
  const [files,        setFiles]        = useState([]);
  const [selectedIdx,  setSelectedIdx]  = useState(null);
  const [dragging,     setDragging]     = useState(false);
  const [showHeatmap,  setShowHeatmap]  = useState(true);
  const [showExplain,  setShowExplain]  = useState(true);
  const [activeRegion, setActiveRegion] = useState(null);
  const fileInputRef = useRef(null);

  const current     = selectedIdx !== null ? files[selectedIdx] : null;
  const isAnalyzing = current?.status === 'analyzing';
  const verdictMeta  = current?.result ? getVerdictMeta(current.result.verdict) : null;
  const verdictColor = current?.result ? VERDICT_COLOR[current.result.verdict] : '#6366f1';

  const analyzeFile = useCallback(async (file, idx) => {
    setFiles((prev) => { const c = [...prev]; if (c[idx]) c[idx] = { ...c[idx], status: 'analyzing' }; return c; });
    const result = await simulateAnalysis(file);
    setFiles((prev) => { const c = [...prev]; if (c[idx]) c[idx] = { ...c[idx], status: result.verdict, result }; return c; });
    setSelectedIdx(idx);
  }, []);

  const addFiles = useCallback((rawFiles) => {
    const valid = Array.from(rawFiles);
    if (!valid.length) return;
    const entries = valid.map((f) => ({ file: Object.assign(f, { previewUrl: createPreviewUrl(f) }), status: 'pending', result: null }));
    setFiles((prev) => {
      const updated = [...prev, ...entries];
      if (selectedIdx === null) setSelectedIdx(prev.length);
      return updated;
    });
    entries.forEach((entry, i) => analyzeFile(entry.file, files.length + i));
  }, [files, selectedIdx, analyzeFile]);

  const removeFile = useCallback((idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    if (selectedIdx === idx) setSelectedIdx(null);
    else if (selectedIdx > idx) setSelectedIdx((p) => p - 1);
  }, [selectedIdx]);

  const reScan = useCallback(() => {
    if (selectedIdx === null) return;
    setActiveRegion(null);
    analyzeFile(files[selectedIdx].file, selectedIdx);
  }, [selectedIdx, files, analyzeFile]);

  const onDrop = useCallback((e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }, [addFiles]);

  return (
    <section id="detect" className="section" style={{ position: 'relative' }}>
      <div className="orb orb-purple" style={{ width: 500, height: 500, top: -100, right: -150, position: 'absolute', opacity: 0.5 }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header">
          <div className="section-label"><Layers size={13} /> Detection Engine</div>
          <h2 className="section-title">Analyze Your Files</h2>
          <p className="section-subtitle">Upload multiple files of any format and receive a full AI-powered authenticity report with region-level visual explanation.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: current ? '1fr 1.15fr' : '1fr', gap: '24px', maxWidth: current ? '1100px' : '680px', margin: '0 auto', transition: 'all 0.4s ease' }}>

          {/* LEFT — upload + file list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Drop zone */}
            <div
              id="drop-zone"
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              style={{
                border: `2px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
                borderRadius: 'var(--radius-lg)', padding: '48px 32px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(99,102,241,0.07)' : 'var(--color-surface-subtle)',
                transition: 'all 0.25s ease',
                boxShadow: dragging ? '0 0 40px var(--color-accent-glow)' : 'none',
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(34,211,238,0.1))',
                border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                transform: dragging ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.3s',
              }}>
                <Upload size={26} color="var(--color-accent)" />
              </div>
              <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '6px', color: 'var(--color-text)' }}>
                {dragging ? 'Drop to analyze' : 'Drop files here or click to upload'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>Any format · up to 100 MB</p>
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: '4px' }}>
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </div>
                {files.map((entry, i) => (
                  <FileRow key={i} file={entry.file} status={entry.status} result={entry.result}
                    isSelected={selectedIdx === i} onSelect={() => setSelectedIdx(i)} onRemove={() => removeFile(i)} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — results */}
          {current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.5s ease' }}>

              {/* Image preview */}
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {current.file.previewUrl && isImage(current.file) ? (
                    <img src={current.file.previewUrl} alt="Preview" style={{ width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'contain', display: 'block', filter: isAnalyzing ? 'brightness(0.6)' : 'none', transition: 'filter 0.4s' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--color-text-subtle)' }}>
                      <File size={64} style={{ opacity: 0.3 }} />
                      <span style={{ fontSize: '0.9rem' }}>No preview available for this file type</span>
                    </div>
                  )}
                  <ScanAnimation active={isAnalyzing} />
                  {current.result && (
                    <RegionOverlay regions={current.result.regions} activeRegion={activeRegion} setActiveRegion={setActiveRegion} showHeatmap={showHeatmap} />
                  )}
                  {isAnalyzing && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <Loader2 size={36} color="var(--color-accent)" style={{ animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>Scanning…</span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                {current.result && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {current.result.verdict !== 'real' && (
                      <button id="toggle-heatmap" onClick={() => setShowHeatmap((p) => !p)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: showHeatmap ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-subtle)', border: `1px solid ${showHeatmap ? 'rgba(99,102,241,0.4)' : 'var(--color-border)'}`, color: showHeatmap ? 'var(--color-accent)' : 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s' }}>
                        {showHeatmap ? <Eye size={13} /> : <EyeOff size={13} />} Heatmap
                      </button>
                    )}
                    <button id="toggle-explain" onClick={() => setShowExplain((p) => !p)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: showExplain ? 'rgba(34,211,238,0.1)' : 'var(--color-surface-subtle)', border: `1px solid ${showExplain ? 'rgba(34,211,238,0.3)' : 'var(--color-border)'}`, color: showExplain ? 'var(--color-cyan)' : 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s' }}>
                      <Layers size={13} /> Explanation
                    </button>
                    <button id="btn-rescan" onClick={reScan} disabled={isAnalyzing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s', marginLeft: 'auto', opacity: isAnalyzing ? 0.5 : 1 }}>
                      <RefreshCw size={13} style={{ animation: isAnalyzing ? 'spin 0.8s linear infinite' : 'none' }} /> Re-scan
                    </button>
                  </div>
                )}
              </div>

              {/* Result card */}
              {current.result && !isAnalyzing && (
                <Card className="glass-strong glow-accent animate-fade-in" style={{ border: `1px solid ${verdictColor}44` }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Analysis Report</CardTitle>
                    <Badge variant="xero" style={{ backgroundColor: `${verdictColor}22`, color: verdictColor, borderColor: `${verdictColor}44` }}>
                      {verdictMeta?.label}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    {/* Verdict row */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: `${verdictColor}15`, color: verdictColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {current.result.verdict === 'real' ? <CheckCircle2 size={32} /> : (current.result.verdict === 'fake' ? <XCircle size={32} /> : <AlertTriangle size={32} />)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: '3px' }}>Forensic Confidence</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: verdictColor }}>{current.result.confidence}%</div>
                      </div>
                    </div>

                    <ConfidenceBar value={current.result.confidence} verdict={current.result.verdict} />

                    {showExplain && (
                      <div style={{ marginTop: '20px' }}>

                        {/* ── Forensic Artifacts ── */}
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Info size={12} /> Detected Forensic Artifacts
                          {current.result.issues?.length > 0 && (
                            <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1.5">{current.result.issues.length}</Badge>
                          )}
                        </div>
                        <IssueList issues={current.result.issues} activeRegion={activeRegion} setActiveRegion={setActiveRegion} />

                        {/* ── Groq AI Explanation ── */}
                        <GroqExplanation
                          explanation={current.result.explanation}
                          verdict={current.result.verdict}
                          isLoading={false}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Analyzing placeholder */}
              {isAnalyzing && (
                <div className="card" style={{ padding: '32px', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'pulseGlow 2s ease infinite' }}>
                    <Loader2 size={24} color="var(--color-accent)" style={{ animation: 'spin 0.8s linear infinite' }} />
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '6px' }}>Analyzing image…</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>Running neural pipeline — this takes a few seconds</p>
                  <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                    {['Face detection', 'Feature extraction', 'Frequency analysis', 'Generating report'].map((step, i) => (
                      <div key={step} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Loader2 size={12} color="var(--color-accent)" style={{ animation: `spin ${0.8 + i * 0.15}s linear infinite`, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Empty state hints */}
        {files.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '32px', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { icon: <Upload size={20} />,                                             label: 'Drag & drop files' },
                { icon: <CheckCircle2 size={20} color="var(--color-real)" />,             label: 'Instant verdict' },
                { icon: <Eye size={20} color="var(--color-cyan)" />,                      label: 'Visual heatmap' },
              ].map((hint) => (
                <div key={hint.label} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.82rem', color: 'var(--color-text-subtle)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{hint.icon}</span> {hint.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}