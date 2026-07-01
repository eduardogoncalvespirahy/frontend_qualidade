import { Injectable } from '@angular/core';

// ───────── Tipos de especificação de gráfico ─────────
export interface BarDatum {
  label: string;
  value: number;
  color: string;
}
export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}
export interface RangeDatum {
  label: string;
  min: number;
  avg: number;
  max: number;
  color: string;
}

export interface BarSpec {
  type: 'bar';
  data: BarDatum[];
  valueFormat?: (n: number) => string;
}
export interface DonutSpec {
  type: 'donut';
  data: DonutDatum[];
  centerTitle?: string;
  centerSubtitle?: string;
}
export interface RangeSpec {
  type: 'range';
  data: RangeDatum[];
  domainMin: number;
  domainMax: number;
  valueFormat?: (n: number) => string;
}
export type ChartSpec = BarSpec | DonutSpec | RangeSpec;

interface Theme {
  ink: string;
  muted: string;
  line: string;
  surface: string;
  font: string;
}

/**
 * Serviço de criação de gráficos em Canvas nativo (sem bibliotecas externas).
 * Cada `render` dimensiona o canvas conforme o DPR e desenha o `spec` informado.
 */
@Injectable({ providedIn: 'root' })
export class ChartService {
  render(canvas: HTMLCanvasElement, spec: ChartSpec): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    // Buffer em pixels reais + escala lógica (nitidez em telas retina).
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const theme = this.readTheme(canvas);

    switch (spec.type) {
      case 'bar':
        this.drawBar(ctx, w, h, spec, theme);
        break;
      case 'donut':
        this.drawDonut(ctx, w, h, spec, theme);
        break;
      case 'range':
        this.drawRange(ctx, w, h, spec, theme);
        break;
    }
  }

  // ───────── tema (lê variáveis CSS herdadas pelo canvas) ─────────
  private readTheme(canvas: HTMLElement): Theme {
    const cs = getComputedStyle(canvas);
    const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
    return {
      ink: v('--ink', '#0f172a'),
      muted: v('--muted', '#64748b'),
      line: v('--line', '#e2e8f0'),
      surface: v('--surface', '#eef2f7'),
      font: cs.fontFamily || 'system-ui, sans-serif',
    };
  }

  // ───────── barras horizontais ─────────
  private drawBar(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    spec: BarSpec,
    t: Theme,
  ): void {
    const { data } = spec;
    if (!data.length) return;
    const fmt = spec.valueFormat ?? ((n) => String(n));

    const pad = 8;
    const labelW = Math.min(150, Math.max(70, w * 0.3));
    const valueW = 60;
    const chartX = pad + labelW + 8;
    const chartW = Math.max(10, w - chartX - valueW - pad);
    const rowH = (h - pad * 2) / data.length;
    const barH = Math.min(16, rowH * 0.5);
    const max = Math.max(1, ...data.map((d) => d.value));

    ctx.textBaseline = 'middle';
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const cy = pad + rowH * i + rowH / 2;

      ctx.font = `600 12px ${t.font}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = t.ink;
      ctx.fillText(this.truncate(ctx, d.label, labelW), pad, cy);

      // trilha
      ctx.fillStyle = t.surface;
      this.roundRect(ctx, chartX, cy - barH / 2, chartW, barH, barH / 2);
      ctx.fill();

      // preenchimento
      const bw = Math.max(barH, (d.value / max) * chartW);
      ctx.fillStyle = d.color;
      this.roundRect(ctx, chartX, cy - barH / 2, bw, barH, barH / 2);
      ctx.fill();

      // valor
      ctx.font = `700 12px ${t.font}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = t.ink;
      ctx.fillText(fmt(d.value), w - pad, cy);
    }
  }

  // ───────── rosca (donut) ─────────
  private drawDonut(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    spec: DonutSpec,
    t: Theme,
  ): void {
    const { data } = spec;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 6;
    if (radius <= 0) return;
    const thickness = Math.max(14, radius * 0.4);
    const r = radius - thickness / 2;
    const total = data.reduce((a, d) => a + d.value, 0);

    ctx.lineCap = 'butt';
    ctx.lineWidth = thickness;

    // anel de fundo
    ctx.strokeStyle = t.line;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // segmentos
    let start = -Math.PI / 2;
    for (const d of data) {
      const frac = total ? d.value / total : 0;
      if (frac <= 0) continue;
      const end = start + frac * Math.PI * 2;
      ctx.strokeStyle = d.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, end);
      ctx.stroke();
      start = end;
    }

    // texto central
    ctx.textAlign = 'center';
    if (spec.centerTitle) {
      ctx.fillStyle = t.ink;
      ctx.textBaseline = 'alphabetic';
      ctx.font = `700 22px ${t.font}`;
      ctx.fillText(spec.centerTitle, cx, cy + 4);
    }
    if (spec.centerSubtitle) {
      ctx.fillStyle = t.muted;
      ctx.textBaseline = 'top';
      ctx.font = `500 11px ${t.font}`;
      ctx.fillText(spec.centerSubtitle, cx, cy + 10);
    }
  }

  // ───────── faixa (mín · média · máx) ─────────
  private drawRange(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    spec: RangeSpec,
    t: Theme,
  ): void {
    const { data } = spec;
    if (!data.length) return;
    const fmt = spec.valueFormat ?? ((n) => String(n));

    const pad = 8;
    const labelW = Math.min(130, Math.max(64, w * 0.26));
    const rightW = 110;
    const trackX = pad + labelW + 8;
    const trackW = Math.max(10, w - trackX - rightW - pad);
    const span = spec.domainMax - spec.domainMin || 1;
    const rowH = (h - pad * 2) / data.length;
    const toX = (val: number) => trackX + ((val - spec.domainMin) / span) * trackW;

    ctx.textBaseline = 'middle';
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const cy = pad + rowH * i + rowH / 2;

      ctx.font = `600 12px ${t.font}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = t.ink;
      ctx.fillText(this.truncate(ctx, d.label, labelW), pad, cy);

      // trilha base
      ctx.strokeStyle = t.surface;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(trackX, cy);
      ctx.lineTo(trackX + trackW, cy);
      ctx.stroke();

      // faixa min–max
      ctx.strokeStyle = d.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(toX(d.min), cy);
      ctx.lineTo(toX(d.max), cy);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // marcador de média
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = t.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(toX(d.avg), cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // rótulo min – max
      ctx.font = `700 11px ${t.font}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = t.muted;
      ctx.fillText(`${fmt(d.min)} – ${fmt(d.max)}`, w - pad, cy);
    }
  }

  // ───────── utilidades ─────────
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const rr = Math.max(0, Math.min(r, h / 2, w / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  private truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }
}
