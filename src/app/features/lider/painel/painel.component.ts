import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { Answer } from '../../../core/models/answer.model';
import { Category } from '../../../core/models/category-answer.model';
import { AnswerResult } from '../../../core/models/answer-result.model';
import { AnswerService } from '../../../core/services/answer.service';
import { CategoryService } from '../../../core/services/category-answer.service';
import { AnswerResultService } from '../../../core/services/answer-result.service';

type Metric = 'avg' | 'max' | 'min';

interface CatStat {
  id: string;
  nome: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
}

interface DonutSeg {
  nome: string;
  count: number;
  pct: number;
  color: string;
  dash: string;
  offset: number;
}

@Component({
  selector: 'app-painel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './painel.component.html',
  styleUrl: './painel.component.css',
})
export class PainelComponent implements OnInit {
  private readonly answerService = inject(AnswerService);
  private readonly categoryService = inject(CategoryService);
  private readonly resultService = inject(AnswerResultService);

  readonly answers = signal<Answer[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly results = signal<AnswerResult[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly metric = signal<Metric>('avg');

  private readonly palette = [
    '#0d6efd',
    '#16a34a',
    '#f59e0b',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
    '#db2777',
    '#65a30d',
    '#ea580c',
    '#2563eb',
  ];

  // ───────── agregação por categoria ─────────
  readonly stats = computed<CatStat[]>(() => {
    const ansById = new Map(this.answers().map((a) => [a.id, a]));
    const catById = new Map(this.categories().map((c) => [String(c.id), c]));

    const groups = new Map<string, { nome: string; values: number[] }>();
    for (const r of this.results()) {
      const ans = ansById.get(r.AnswerId);
      const key = ans ? String(ans.categoryId) : '__none__';
      const nome = ans
        ? (catById.get(String(ans.categoryId))?.nome ?? `Categoria ${ans.categoryId}`)
        : 'Sem categoria';
      const num = Number(String(r.resposta).replace(',', '.'));
      if (!Number.isFinite(num)) continue;
      let g = groups.get(key);
      if (!g) {
        g = { nome, values: [] };
        groups.set(key, g);
      }
      g.values.push(num);
    }

    const out: CatStat[] = [];
    for (const [id, g] of groups) {
      if (!g.values.length) continue;
      const sum = g.values.reduce((a, b) => a + b, 0);
      out.push({
        id,
        nome: g.nome,
        count: g.values.length,
        min: Math.min(...g.values),
        max: Math.max(...g.values),
        avg: sum / g.values.length,
        sum,
      });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome));
  });

  readonly overall = computed(() => {
    const s = this.stats();
    if (!s.length) return { count: 0, min: 0, max: 0, avg: 0, categorias: 0 };
    const count = s.reduce((a, c) => a + c.count, 0);
    const sum = s.reduce((a, c) => a + c.sum, 0);
    return {
      count,
      min: Math.min(...s.map((c) => c.min)),
      max: Math.max(...s.map((c) => c.max)),
      avg: count ? sum / count : 0,
      categorias: s.length,
    };
  });

  readonly hasData = computed(() => this.stats().length > 0);

  // ───────── gráfico de barras (métrica selecionada) ─────────
  metricValue(c: CatStat): number {
    const m = this.metric();
    return m === 'avg' ? c.avg : m === 'max' ? c.max : c.min;
  }
  readonly metricMax = computed(() => Math.max(1, ...this.stats().map((c) => this.metricValue(c))));
  barPct(c: CatStat): number {
    return Math.max(2, (this.metricValue(c) / this.metricMax()) * 100);
  }
  colorAt(i: number): string {
    return this.palette[i % this.palette.length];
  }

  // ───────── faixa mín–máx ─────────
  rangeLeft(c: CatStat): number {
    const o = this.overall();
    const span = o.max - o.min || 1;
    return ((c.min - o.min) / span) * 100;
  }
  rangeWidth(c: CatStat): number {
    const o = this.overall();
    const span = o.max - o.min || 1;
    return Math.max(1, ((c.max - c.min) / span) * 100);
  }
  avgLeft(c: CatStat): number {
    const o = this.overall();
    const span = o.max - o.min || 1;
    return ((c.avg - o.min) / span) * 100;
  }

  // ───────── rosca (distribuição de respostas) ─────────
  readonly donut = computed<DonutSeg[]>(() => {
    const s = this.stats();
    const total = s.reduce((a, c) => a + c.count, 0);
    const C = 2 * Math.PI * 60;
    let acc = 0;
    return s.map((c, i) => {
      const f = total ? c.count / total : 0;
      const seg: DonutSeg = {
        nome: c.nome,
        count: c.count,
        pct: f * 100,
        color: this.colorAt(i),
        dash: `${f * C} ${C - f * C}`,
        offset: -acc * C,
      };
      acc += f;
      return seg;
    });
  });

  fmt(n: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n ?? 0);
  }

  ngOnInit(): void {
    this.reload();
  }

  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r?.['data'] ?? r?.['items'] ?? r?.['results'] ?? []) as T[];
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      categories: this.categoryService.getAll(1000, 1),
      answers: this.answerService.getAll(1000, 1),
      results: this.resultService.getAll(1000, 1),
    }).subscribe({
      next: ({ categories, answers, results }) => {
        this.categories.set(this.unwrap<Category>(categories));
        this.answers.set(this.unwrap<Answer>(answers));
        this.results.set(this.unwrap<AnswerResult>(results));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar os dados do painel.');
      },
    });
  }
}
