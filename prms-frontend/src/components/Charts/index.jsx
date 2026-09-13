import { useState, useEffect, useRef } from 'react';

/* --- helpers ---------------------------------------------------- */
function canvasCtx(canvas) {
  if (!canvas.getContext) throw new Error('Canvas not supported');
  return canvas.getContext('2d');
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* --- Bar Chart ------------------------------------------------- */
export function BarChart({ data = [], height = 240, colors = ['var(--status-primary, #6366f1)','var(--status-accent, #8b5cf6)','var(--status-success, #22c55e)','var(--status-warning, #f59e0b'] }) {
  const canvasRef = useRef();
  const dpr = window.devicePixelRatio || 1;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = c.clientWidth * dpr;
    c.height = height * dpr;
    const ctx = canvasCtx(c);
    ctx.clearRect(0, 0, c.width, c.height);
    if (!data.length) return;
    const max = Math.max(...data.map(d => d.value)) || 1;
    const n = data.length;
    const gap = 24;
    const paddingX = 40;
    const barW = Math.max(20, (c.clientWidth - paddingX * 2 - gap * (n + 1)) / n);
    const chartH = height - 60;
    for (let i = 0; i < n; i++) {
      const x = paddingX + gap + (barW + gap) * i;
      const barH = (data[i].value / max) * chartH;
      const y = height - 40 - barH;
      roundRect(ctx, x, y, barW, barH, 4);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      /* label */
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(data[i].label || '', x + barW / 2, height - 22);
      /* value */
      ctx.fillText(String(data[i].value), x + barW / 2, y - 6);
    }
  }, [data, height, colors]);

  return <canvas className="chart-canvas" ref={canvasRef} style={{ height, width: '100%', display: 'block' }} />;
}

/* --- Pie Chart ------------------------------------------------- */
export function PieChart({ data = [], height = 240, colors = ['var(--status-primary, #6366f1)','var(--status-accent, #8b5cf6)','var(--status-success, #22c55e)','var(--status-warning, #f59e0b)','var(--error-state, #ef4444'] }) {
  const canvasRef = useRef();
  const dpr = window.devicePixelRatio || 1;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = c.clientWidth * dpr;
    c.height = height * dpr;
    const ctx = canvasCtx(c);
    ctx.clearRect(0, 0, c.width, c.height);
    if (!data.length) return;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const cx = c.clientWidth / 2;
    const cy = height / 2;
    const r = Math.min(cx, cy) - 40;
    let start = -Math.PI / 2;
    data.forEach((d, idx) => {
      const sweep = (d.value / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + sweep);
      ctx.closePath();
      ctx.fillStyle = colors[idx % colors.length];
      ctx.fill();
      start += sweep;
    });
    /* center hole */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    data.forEach((d, idx) => {
      if (d.label) {
        ctx.fillStyle = '#1e293b'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(d.label, cx, cy - 10 + idx);
      }
    });
  }, [data, height, colors]);

  return <canvas className="chart-canvas" ref={canvasRef} style={{ height, width: '100%', display: 'block' }} />;
}