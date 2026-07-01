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
    const mustQuote =
      s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r');
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
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((n) => n.outerHTML)
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
      `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>${title}</title>` +
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

    const target = (host.firstElementChild as HTMLElement) ?? host;
    this.printElement(target, options);

    // limpa após enviar para impressão
    setTimeout(() => {
      this.appRef.detachView(ref.hostView);
      ref.destroy();
      host.remove();
    }, 1500);
  }
}
