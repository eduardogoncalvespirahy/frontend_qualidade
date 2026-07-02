import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  Type,
} from '@angular/core';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────
export interface ExportColumn<T = Record<string, unknown>> {
  /** Chave do dado na linha. */
  key: string;
  /** Título exibido no cabeçalho (default: a própria key). */
  label?: string;
  /** Alinhamento na tabela do PDF. */
  align?: 'left' | 'center' | 'right';
  /** Formatação do valor (ex.: datas, moeda). */
  format?: (value: unknown, row: T) => string;
}

export interface CsvOptions<T = Record<string, unknown>> {
  filename?: string;
  columns?: ExportColumn<T>[];
  /** Separador (',' padrão; use ';' para Excel pt-BR). */
  delimiter?: string;
  /** Adiciona BOM UTF-8 (default true) para acentos no Excel. */
  bom?: boolean;
}

export interface PdfOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  /** Margem da página, ex.: '16mm'. */
  margin?: string;
}

export interface PdfTableOptions extends PdfOptions {
  title?: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
}

/**
 * Serviço de geração de arquivos (CSV e PDF) sem dependências externas.
 *
 * - CSV: monta e baixa o arquivo a partir de um array de objetos.
 * - PDF: renderiza um layout (elemento/HTML ou um componente) e envia para
 *   a impressão do navegador, onde o usuário pode "Salvar como PDF".
 */
@Injectable({ providedIn: 'root' })
export class FileExportService {
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);

  // ===================================================================
  // CSV
  // ===================================================================
  toCsv<T extends Record<string, unknown>>(rows: T[], options: CsvOptions<T> = {}): string {
    const delimiter = options.delimiter ?? ',';
    const cols = options.columns ?? this.inferColumns(rows);

    const header = cols.map((c) => this.escapeCsv(c.label ?? c.key, delimiter)).join(delimiter);
    const body = rows.map((row) =>
      cols
        .map((c) => {
          const raw = row[c.key];
          const value = c.format ? c.format(raw, row) : raw;
          return this.escapeCsv(value, delimiter);
        })
        .join(delimiter),
    );

    return [header, ...body].join('\r\n');
  }

  downloadCsv<T extends Record<string, unknown>>(rows: T[], options: CsvOptions<T> = {}): void {
    const bom = options.bom === false ? '' : '\uFEFF';
    const content = bom + this.toCsv(rows, options);
    const filename = this.ensureExt(options.filename ?? 'dados', 'csv');
    this.download(new Blob([content], { type: 'text/csv;charset=utf-8;' }), filename);
  }

  private inferColumns<T extends Record<string, unknown>>(rows: T[]): ExportColumn<T>[] {
    const first = rows[0] ?? ({} as T);
    return Object.keys(first).map((k) => ({ key: k, label: k }));
  }

  private escapeCsv(value: unknown, delimiter: string): string {
    const s = value == null ? '' : String(value);
    const mustQuote = s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r');
    const escaped = s.replace(/"/g, '""');
    return mustQuote ? `"${escaped}"` : escaped;
  }

  // ===================================================================
  // Download genérico
  // ===================================================================
  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private ensureExt(name: string, ext: string): string {
    return name.toLowerCase().endsWith(`.${ext}`) ? name : `${name}.${ext}`;
  }

  // ===================================================================
  // PDF via impressão do navegador
  // ===================================================================
  /** Envia um elemento já renderizado na página para impressão/PDF. */
  printElement(element: HTMLElement, options: PdfOptions = {}): void {
    this.printHtml(element.outerHTML, options);
  }

  /** Monta um documento com o HTML informado e abre a impressão. */
  printHtml(bodyHtml: string, options: PdfOptions = {}): void {
    const orientation = options.orientation ?? 'portrait';
    const margin = options.margin ?? '16mm';
    const title = options.filename ?? 'documento';

    // Reaproveita os estilos da página (inclui o CSS encapsulado do Angular).
    // Links com href ABSOLUTO para não resolverem contra a URL da rota atual.
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((n) => {
        if (n.tagName === 'LINK') {
          const href = (n as HTMLLinkElement).href; // já resolvido para absoluto
          return `<link rel="stylesheet" href="${href}">`;
        }
        return n.outerHTML;
      })
      .join('\n');

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(
      `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">` +
        `<base href="${document.baseURI}">` +
        `<title>${title}</title>` +
        styles +
        `<style>` +
        `@page{size:${orientation};margin:${margin};}` +
        `html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}` +
        `.no-print{display:none !important;}` +
        `</style></head><body>${bodyHtml}</body></html>`,
    );
    doc.close();

    const cleanup = () => iframe.parentNode?.removeChild(iframe);

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      win.onafterprint = () => setTimeout(cleanup, 300);
      // pequeno atraso para fontes/imagens carregarem
      setTimeout(() => {
        win.focus();
        win.print();
      }, 250);
      // fallback de limpeza
      setTimeout(cleanup, 60000);
    };
  }

  // ===================================================================
  // PDF de TABELA a partir de dados (sem depender de componentes)
  // ===================================================================
  /**
   * Gera um relatório em PDF (via impressão) a partir de colunas + linhas.
   * Não instancia componentes — o layout é montado com HTML/estilos embutidos.
   */
  printTable<T extends Record<string, unknown>>(
    columns: ExportColumn<T>[],
    rows: T[],
    options: PdfTableOptions = {},
  ): void {
    this.printHtml(this.buildTableHtml(columns, rows, options), options);
  }

  private buildTableHtml<T extends Record<string, unknown>>(
    columns: ExportColumn<T>[],
    rows: T[],
    options: PdfTableOptions,
  ): string {
    const esc = (v: unknown) =>
      (v == null ? '' : String(v))
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const emitido = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date());

    const head = columns
      .map(
        (c) =>
          `<th style="text-align:${c.align ?? 'left'};padding:9px 10px;border-bottom:1px solid #e2e8f0;` +
          `background:#f8fafc;text-transform:uppercase;font-size:11px;letter-spacing:.04em;color:#64748b;">` +
          `${esc(c.label ?? c.key)}</th>`,
      )
      .join('');

    const body = rows.length
      ? rows
          .map(
            (row) =>
              `<tr>` +
              columns
                .map((c) => {
                  const raw = row[c.key];
                  const val = c.format ? c.format(raw, row) : raw;
                  return `<td style="text-align:${c.align ?? 'left'};padding:9px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;">${esc(val)}</td>`;
                })
                .join('') +
              `</tr>`,
          )
          .join('')
      : `<tr><td colspan="${columns.length}" style="padding:20px;text-align:center;color:#64748b;">Sem dados.</td></tr>`;

    const metaHtml = (options.meta ?? []).length
      ? `<div style="display:flex;flex-wrap:wrap;gap:10px 26px;margin:0 0 18px;">` +
        (options.meta ?? [])
          .map(
            (m) =>
              `<div style="display:flex;flex-direction:column;font-size:13px;">` +
              `<span style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">${esc(m.label)}</span>` +
              `<strong>${esc(m.value)}</strong></div>`,
          )
          .join('') +
        `</div>`
      : '';

    const subtitle = options.subtitle
      ? `<p style="margin:4px 0 0;color:#64748b;font-size:14px;">${esc(options.subtitle)}</p>`
      : '';

    return (
      `<div style="font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a;">` +
      `<header style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;` +
      `padding-bottom:16px;border-bottom:2px solid #e2e8f0;margin-bottom:18px;">` +
      `<div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-.02em;">${esc(options.title ?? 'Relatório')}</h1>${subtitle}</div>` +
      `<div style="font-size:12px;color:#64748b;white-space:nowrap;">Emitido em ${esc(emitido)}</div>` +
      `</header>` +
      metaHtml +
      `<table style="width:100%;border-collapse:collapse;">` +
      `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` +
      `</div>`
    );
  }

  // ===================================================================
  // PDF a partir de um COMPONENTE de layout (instanciado dinamicamente)
  // ===================================================================
  /**
   * Cria um componente fora da tela, aplica os `inputs` (via setInput, compatível
   * com signal inputs), aguarda a renderização e envia o resultado para
   * impressão/PDF. Ideal para gerar o PDF a partir de um componente de layout.
   */
  async pdfFromComponent<T>(
    component: Type<T>,
    inputs: Record<string, unknown> = {},
    options: PdfOptions = {},
  ): Promise<void> {
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0', width: '210mm' });
    document.body.appendChild(host);

    const ref = createComponent(component, {
      environmentInjector: this.envInjector,
      hostElement: host,
    });

    // aplica os @Input()/input() do componente (funciona com signal inputs)
    for (const [key, value] of Object.entries(inputs)) {
      try {
        ref.setInput(key, value);
      } catch {
        /* ignora inputs inexistentes */
      }
    }
    this.appRef.attachView(ref.hostView);

    // aguarda dois frames para o Angular pintar o conteúdo
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    // Clona o host (preserva os atributos de encapsulamento do Angular, então
    // o CSS do componente continua válido) e remove o posicionamento off-screen.
    // Imprime o host INTEIRO — a barra de ações some pelo .no-print e o .doc aparece.
    const clone = host.cloneNode(true) as HTMLElement;
    clone.removeAttribute('style');
    this.printHtml(clone.outerHTML, options);

    // limpa após enviar para impressão
    setTimeout(() => {
      this.appRef.detachView(ref.hostView);
      ref.destroy();
      host.remove();
    }, 1500);
  }
}