import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PackageUnitConversionService } from '../../../../../core/services/package-unit-conversion.service';
import { InputUnitService } from '../../../../../core/services/input-unit.service';
import { PackageTypesService } from '../../../../../core/services/package-types.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';
import { FormComponent } from './modals/form/form.component';
import { PackageUnitConversion } from '../../../../../core/models/package-unit-conversions.model';
import { InputUnits } from '../../../../../core/models/input-units.model';
import { PackageTypes } from '../../../../../core/models/package-types.model';

interface Filters {
  inputUnitId: string;
  packageTypeId: string;
  ordem: string;
  status: 'all' | 'active' | 'inactive';
}

@Component({
  selector: 'app-package-unit-conversions',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  templateUrl: './package-unit-conversions.component.html',
  styleUrl: './package-unit-conversions.component.css',
})
export class PackageUnitConversionsComponent {
  // ───────── Injeções ─────────
  private readonly packageUnitConversionService = inject(PackageUnitConversionService);
  private readonly packageTypesService = inject(PackageTypesService);
  private readonly inputUnitService = inject(InputUnitService);

  // ───────── coleções ─────────
  readonly items = signal<PackageUnitConversion[]>([]);
  readonly inputUnits = signal<InputUnits[]>([]);
  readonly packageTypes = signal<PackageTypes[]>([]);

  // ───────── feedback ─────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // ───────── filtros ─────────
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = {
    inputUnitId: '',
    packageTypeId: '',
    ordem: '',
    status: 'all',
  };
  readonly filters = signal<Filters>({ ...this.emptyFilters });

  updateFilter<K extends keyof Filters>(key: K, value: Filters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }

  readonly activeFilterCount = computed(() => {
    const f = this.filters();
    let n = f.status !== 'all' ? 1 : 0;
    for (const [k, v] of Object.entries(f)) if (k !== 'status' && v !== '') n++;
    return n;
  });
  readonly hasFilter = computed(() => this.activeFilterCount() > 0);

  private textMatch(value: string | null | undefined, term: string): boolean {
    if (!term.trim()) return true;
    return (value ?? '').toLowerCase().includes(term.trim().toLowerCase());
  }

  private statusMatch(status: number, f: Filters['status']): boolean {
    if (f === 'all') return true;
    return f === 'active' ? status === 1 : status !== 1;
  }

  readonly filtered = computed(() => {
    const f = this.filters();
    return this.items().filter(
      (item) =>
        (!f.inputUnitId || item.inputUnitId === f.inputUnitId) &&
        (!f.packageTypeId || item.packageTypeId === f.packageTypeId) &&
        (!f.ordem || String(item.ordem) === f.ordem) &&
        this.statusMatch(item.status, f.status),
    );
  });

  ngOnInit(): void {
    this.load();
    this.loadInputUnits();
    this.loadPackageTypes();
  }

  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r['result'] as T[]) || (r['data'] as T[]) || [];
  }

  private load(): void {
    this.loading.set(true);
    this.packageUnitConversionService.getAll(1000, 1).subscribe({
      next: (res) => {
        this.items.set(this.unwrap<PackageUnitConversion>(res));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erro ao carregar conversões');
        this.loading.set(false);
      },
    });
  }

  private loadInputUnits(): void {
    this.inputUnitService.getAll(1000, 1).subscribe({
      next: (res) => this.inputUnits.set(this.unwrap<InputUnits>(res)),
      error: () => this.inputUnits.set([]),
    });
  }

  private loadPackageTypes(): void {
    this.packageTypesService.getAll(1000, 1).subscribe({
      next: (res) => this.packageTypes.set(this.unwrap<PackageTypes>(res)),
      error: () => this.packageTypes.set([]),
    });
  }

  getInputUnitName(id: string): string {
    return this.inputUnits().find((u) => u.id === id)?.nome ?? id;
  }

  getPackageTypeName(id: string): string {
    return this.packageTypes().find((t) => t.id === id)?.nome ?? id;
  }

  async novo(): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Nova Conversão de Unidade',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new', inputUnits: this.inputUnits(), packageTypes: this.packageTypes() },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Criar', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = (ref.instance as any).value();
    this.packageUnitConversionService
      .create({
        inputUnitId: v.inputUnitId,
        packageTypeId: v.packageTypeId,
        ordem: v.ordem,
        quantidadePorSaco: v.quantidadePorSaco,
        status: v.status,
      })
      .subscribe({
        next: () => {
          this.success.set('Conversão criada com sucesso.');
          this.load();
        },
        error: (err: any) => this.error.set(`Erro ao criar. (${(err as any).error?.message})`),
      });
  }

  async editar(item: PackageUnitConversion): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Editar Conversão',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'edit', item, inputUnits: this.inputUnits(), packageTypes: this.packageTypes() },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Salvar', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = (ref.instance as any).value();
    this.packageUnitConversionService
      .update(item.id, {
        inputUnitId: v.inputUnitId,
        packageTypeId: v.packageTypeId,
        ordem: v.ordem,
        quantidadePorSaco: v.quantidadePorSaco,
        status: v.status,
      })
      .subscribe({
        next: () => {
          this.success.set('Conversão atualizada com sucesso.');
          this.load();
        },
        error: (err: any) => this.error.set(`Erro ao atualizar. (${(err as any).error?.message})`),
      });
  }

  async excluir(item: PackageUnitConversion): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Excluir Conversão',
      body: `Deseja realmente excluir esta conversão?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Excluir', variant: 'danger', value: true },
      ],
    });
    if (!(await ref.result)) return;

    this.packageUnitConversionService.delete(item.id).subscribe({
      next: () => {
        this.success.set('Conversão excluída.');
        this.load();
      },
      error: (err: any) => this.error.set(`Erro ao excluir. (${(err as any).error?.message})`),
    });
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }

  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
  }

  trackById(_: number, item: PackageUnitConversion): string {
    return item.id;
  }

  private readonly modalService = inject(ModalService);
}
