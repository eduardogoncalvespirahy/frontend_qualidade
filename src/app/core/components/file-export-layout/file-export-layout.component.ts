import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, input, viewChild } from '@angular/core';

import { FileExportService, ExportColumn, PdfOptions } from '../../services/file-export.service';

interface MetaItem {
  label: string;
  value: string;
}

/**
 * Componente de layout reutilizável para relatórios.
 * Injeta o FileExportService e expõe os botões de exportar CSV/PDF.
 *
 * Uso:
 *   <app-report-layout
 *     [title]="'Inspeções'"
 *     [subtitle]="'Resumo do período'"
 *     [filename]="'inspecoes'"
 *     [columns]="colunas"
 *     [rows]="dados" />
 *
 * Ou com layout customizado (conteúdo projetado):
 *   <app-report-layout [title]="'Meu doc'">
 *     <div>conteúdo livre aqui…</div>
 *   </app-report-layout>
 */
@Component({
  selector: 'app-file-export-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-export-layout.component.html',
  styleUrl: './file-export-layout.component.css',
})
export class FileExportLayoutComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  private readonly exporter = inject(FileExportService);
 
  readonly title = input<string>('Relatório');
  readonly subtitle = input<string>('');
  readonly filename = input<string>('relatorio');
  readonly columns = input<ExportColumn<T>[]>([]);
  readonly rows = input<T[]>([]);
  readonly meta = input<MetaItem[]>([]);
  readonly orientation = input<'portrait' | 'landscape'>('portrait');
 
  private readonly printable = viewChild.required<ElementRef<HTMLElement>>('printable');
 
  readonly emitidoEm = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
 
  cell(row: T, col: ExportColumn<T>): string {
    const raw = row[col.key];
    return col.format ? col.format(raw, row) : raw == null ? '' : String(raw);
  }
 
  exportCsv(): void {
    this.exporter.downloadCsv(this.rows(), {
      filename: this.filename(),
      columns: this.columns(),
    });
  }
 
  exportPdf(): void {
    const opts: PdfOptions = { filename: this.filename(), orientation: this.orientation() };
    this.exporter.printElement(this.printable().nativeElement, opts);
  }
}