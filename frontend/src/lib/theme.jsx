// frontend/src/lib/theme.js
export const COLORS = {
  void: '#0A1310',
  panel: '#101C17',
  panel2: '#16241D',
  border: '#223129',
  borderStrong: '#324A3D',
  text: '#EAF3EE',
  muted: '#7E9389',
  dim: '#4B5D53',
  stream: '#2FE0A0',
  streamDim: '#1A5C42',
  earned: '#F0B94A',
  earnedDim: '#5C4A1E',
  employer: '#7B93AE',
  employerDim: '#2E3B48',
  danger: '#E2604A',
  dangerDim: '#4A2A21',
};

export const inputStyle = {
  width: '100%',
  background: COLORS.panel2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: '8px 10px',
  color: COLORS.text,
  fontSize: 14,
  fontFamily: "'IBM Plex Mono', monospace",
  boxSizing: 'border-box',
};

export const pillButton = {
  border: '1px solid',
  borderRadius: 999,
  padding: '5px 12px',
  fontSize: 12,
  background: 'transparent',
  cursor: 'pointer',
};

export const primaryButton = {
  width: '100%',
  border: 'none',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  cursor: 'pointer',
};

export const ghostButton = {
  border: 'none',
  background: 'transparent',
  color: COLORS.dim,
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
};

export function Panel({ children }) {
  return (
    <div className="dashboard-panel" style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}` }}>
      {children}
    </div>
  );
}

export function PanelHeader({ icon, title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color }}>
      {icon}
      <span className="sp-display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{title}</span>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: COLORS.muted }}>{label}</div>
      <div className="sp-mono" style={{ fontSize: 18, color: accent || COLORS.text, marginTop: 2 }}>{value}</div>
      {sub && <div className="sp-mono" style={{ fontSize: 11, color: COLORS.dim }}>{sub}</div>}
    </div>
  );
}
