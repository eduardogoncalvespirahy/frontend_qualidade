import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Answer } from '../../../core/models/answer.model';
import { Form } from '../../../core/models/form.model';
import { Section } from '../../../core/models/section.model';
import { Location } from '../../../core/models/location.model';
import { CategorieAnswer } from '../../../core/models/categorieAnswer.model';
import { AnswerResult } from '../../../core/models/answer-result.model';

import { AnswerService } from '../../../core/services/answer.service';
import { FormService } from '../../../core/services/form.service';
import { SectionService } from '../../../core/services/section.service';
import { LocationService } from '../../../core/services/location.service';
import { CategorieAnswerService } from '../../../core/services/categorieAnswer.service';
import { AnswerResultService } from '../../../core/services/answer-result.service';
import { AuthService } from '../../../core/services/auth.service';

import { BarSpec, DonutSpec, RangeSpec } from '../../../core/services/chart.service';
import { ChartComponent } from '../../../core/modals/chart/chart.component';

import { FileExportService, ExportColumn } from '../../../core/services/file-export.service';
import { FileExportLayoutComponent } from '../../../core/components/file-export-layout/file-export-layout.component';


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

@Component({
  selector: 'app-painel',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartComponent],
  templateUrl: './painel.component.html',
  styleUrl: './painel.component.css',
})
export class PainelComponent implements OnInit {
  private readonly answerService = inject(AnswerService);
  private readonly categorieAnswerService = inject(CategorieAnswerService);
  private readonly resultService = inject(AnswerResultService);
  private readonly formService = inject(FormService);
  private readonly sectionService = inject(SectionService);
  private readonly locationService = inject(LocationService);
  private readonly auth = inject(AuthService);

  readonly answers = signal<Answer[]>([]);
  readonly categories = signal<CategorieAnswer[]>([]);
  readonly results = signal<AnswerResult[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly locations = signal<Location[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly metric = signal<Metric>('avg');

  /** Filtro por local escolhido pelo usuário ('' = todos os permitidos). */
  readonly locationFilter = signal<string>('');

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

  private readonly nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  fmt = (n: number): string => this.nf.format(n ?? 0);

  // ───────── permissões de local (credentialLocation) ─────────
  /** Nomes dos locais liberados para a credencial logada. */
  readonly allowedLocations = computed(() => this.auth.locations());

  private isLocationAllowed(loc: Location | null | undefined): boolean {
    if (!loc) return false;
    const allowed = this.allowedLocations();
    if (allowed.length === 0) return true; // sem restrição
    return allowed.includes(loc.nome) || allowed.includes(loc.id);
  }

  /**
   * Conjunto de formIds cujo local a credencial pode ver.
   * Location(permitida) → employerId → Section → Form.
   * null = sem restrição (liberar todos).
   */
  readonly permittedFormIds = computed<Set<string> | null>(() => {
    const allowed = this.allowedLocations();
    if (allowed.length === 0) return null;

    const employerIds = new Set(
      this.locations()
        .filter((l) => this.isLocationAllowed(l))
        .map((l) => l.employerId),
    );
    const sectionIds = new Set(
      this.sections()
        .filter((s) => employerIds.has(s.employerId))
        .map((s) => s.id),
    );
    return new Set(
      this.forms()
        .filter((f) => sectionIds.has(f.sectionId))
        .map((f) => f.id),
    );
  });

  /** Respostas restritas aos formulários de locais permitidos + filtro por local. */
  readonly scopedResults = computed<AnswerResult[]>(() => {
    const p = this.permittedFormIds();
    const locId = this.locationFilter();

    // Sem restrição de permissão e sem filtro de local → comportamento original.
    if (!p && !locId) return this.results();

    const ansById = new Map(this.answers().map((a) => [a.id, a]));
    const formEmp = this.formEmployerById();
    const selEmp = locId ? (this.locationEmployerById().get(locId) ?? '__none__') : null;

    return this.results().filter((r) => {
      const ans = ansById.get(r.AnswerId);
      if (!ans) return false;
      if (p && !p.has(ans.formId)) return false; // permissão
      if (selEmp !== null && formEmp.get(ans.formId) !== selEmp) return false; // filtro de local
      return true;
    });
  });

  // ───────── mapas / opções para o filtro por local ─────────
  /** formId → employerId (via section.employerId). */
  private readonly formEmployerById = computed(() => {
    const secEmp = new Map(this.sections().map((s) => [s.id, s.employerId]));
    const m = new Map<string, string>();
    for (const f of this.forms()) m.set(f.id, secEmp.get(f.sectionId) ?? '');
    return m;
  });

  /** locationId → employerId. */
  private readonly locationEmployerById = computed(
    () => new Map(this.locations().map((l) => [l.id, l.employerId])),
  );

  /** Opções de local para o filtro — só os permitidos pela credencial. */
  readonly locationOptions = computed(() =>
    this.locations()
      .filter((l) => this.isLocationAllowed(l))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((l) => ({ value: l.id, label: l.nome })),
  );

  // ───────── agregação por categoria ─────────
  readonly stats = computed<CatStat[]>(() => {
    const ansById = new Map(this.answers().map((a) => [a.id, a]));
    const catById = new Map(this.categories().map((c) => [String(c.id), c]));

    const groups = new Map<string, { nome: string; values: number[] }>();
    for (const r of this.scopedResults()) {
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

  private metricValue(c: CatStat): number {
    const m = this.metric();
    return m === 'avg' ? c.avg : m === 'max' ? c.max : c.min;
  }
  private colorAt(i: number): string {
    return this.palette[i % this.palette.length];
  }

  // ───────── specs dos gráficos (Canvas) ─────────
  readonly barSpec = computed<BarSpec>(() => ({
    type: 'bar',
    valueFormat: this.fmt,
    data: this.stats().map((c, i) => ({
      label: c.nome,
      value: this.metricValue(c),
      color: this.colorAt(i),
    })),
  }));

  readonly rangeSpec = computed<RangeSpec>(() => {
    const o = this.overall();
    return {
      type: 'range',
      domainMin: o.min,
      domainMax: o.max,
      valueFormat: this.fmt,
      data: this.stats().map((c, i) => ({
        label: c.nome,
        min: c.min,
        avg: c.avg,
        max: c.max,
        color: this.colorAt(i),
      })),
    };
  });

  readonly donutSpec = computed<DonutSpec>(() => ({
    type: 'donut',
    centerTitle: this.fmt(this.overall().count),
    centerSubtitle: 'respostas',
    data: this.stats().map((c, i) => ({
      label: c.nome,
      value: c.count,
      color: this.colorAt(i),
    })),
  }));

  /** Legenda (HTML) da rosca. */
  readonly donutLegend = computed(() => {
    const total = this.overall().count || 1;
    return this.stats().map((c, i) => ({
      nome: c.nome,
      count: c.count,
      pct: (c.count / total) * 100,
      color: this.colorAt(i),
    }));
  });

  /** Altura (px) dos boxes de gráfico com base no nº de categorias. */
  readonly barBoxHeight = computed(() => Math.max(120, this.stats().length * 38 + 16));
  readonly rangeBoxHeight = computed(() => Math.max(120, this.stats().length * 40 + 16));

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
      categories: this.categorieAnswerService.getAll(1000, 1),
      answers: this.answerService.getAll(1000, 1),
      results: this.resultService.getAll(1000, 1),
      forms: this.formService.getAll(1000, 1),
      sections: this.sectionService.getAll(1000, 1),
      locations: this.locationService.getAll(1000, 1),
    }).subscribe({
      next: ({ categories, answers, results, forms, sections, locations }) => {
        this.categories.set(this.unwrap<CategorieAnswer>(categories));
        this.answers.set(this.unwrap<Answer>(answers));
        this.results.set(this.unwrap<AnswerResult>(results));
        this.forms.set(this.unwrap<Form>(forms));
        this.sections.set(this.unwrap<Section>(sections));
        this.locations.set(this.unwrap<Location>(locations));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar os dados do painel.');
      },
    });
  }

  // expostos ao template
  readonly colorFor = (i: number) => this.colorAt(i);

  // ============================================================
  //  EXPORTAÇÃO (CSV / PDF)
  // ============================================================

  private readonly exporter = inject(FileExportService);

  /** Monta título/colunas/linhas do detalhamento por categoria. */
  private buildExport(): {
    title: string;
    subtitle: string;
    filename: string;
    columns: ExportColumn[];
    rows: Record<string, unknown>[];
    meta: { label: string; value: string }[];
  } {
    const o = this.overall();
    return {
      title: 'Resultados por categoria',
      subtitle: 'Altas, baixas e médias das respostas registradas',
      filename: 'relatorio-categorias',
      meta: [
        { label: 'Resultados', value: this.fmt(o.count) },
        { label: 'Categorias', value: this.fmt(o.categorias) },
        { label: 'Média geral', value: this.fmt(o.avg) },
        { label: 'Maior (alta)', value: this.fmt(o.max) },
        { label: 'Menor (baixa)', value: this.fmt(o.min) },
      ],
      columns: [
        { key: 'categoria', label: 'Categoria' },
        { key: 'respostas', label: 'Respostas', align: 'right' },
        { key: 'baixa', label: 'Baixa', align: 'right' },
        { key: 'media', label: 'Média', align: 'right' },
        { key: 'alta', label: 'Alta', align: 'right' },
      ],
      rows: this.stats().map((c) => ({
        categoria: c.nome,
        respostas: this.fmt(c.count),
        baixa: this.fmt(c.min),
        media: this.fmt(c.avg),
        alta: this.fmt(c.max),
      })),
    };
  }

  /** Baixa o detalhamento em CSV (delimitador ';' p/ Excel pt-BR). */
  exportCsv(): void {
    const cfg = this.buildExport();
    this.exporter.downloadCsv(cfg.rows, {
      filename: cfg.filename,
      columns: cfg.columns,
      delimiter: ';',
    });
  }

  /** Gera um PDF (via FileExportLayoutComponent) do detalhamento. */
  exportPdf(): void {
    const cfg = this.buildExport();
    this.exporter.pdfFromComponent(
      FileExportLayoutComponent,
      {
        title: cfg.title,
        subtitle: cfg.subtitle,
        filename: cfg.filename,
        columns: cfg.columns,
        rows: cfg.rows,
        meta: cfg.meta,
        orientation: 'portrait',
      },
      { filename: cfg.filename, orientation: 'portrait' },
    );
  }
}
