import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AnswerConversion } from '../../../../../core/models/answer-conversion.model';
import { Answer } from '../../../../../core/models/answer.model';
import { PackageUnitConversion } from '../../../../../core/models/package-unit-conversions.model';
import { InputUnits } from '../../../../../core/models/input-units.model';
import { PackageTypes } from '../../../../../core/models/package-types.model';
import { AnswerConversionService } from '../../../../../core/services/answer-conversion.service';
import { AnswerService } from '../../../../../core/services/answer.service';
import { PackageUnitConversionService } from '../../../../../core/services/package-unit-conversion.service';
import { InputUnitService } from '../../../../../core/services/input-unit.service';
import { PackageTypesService } from '../../../../../core/services/package-types.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';
import { FormComponent } from './modals/form/form.component';
import { FormService } from '../../../../../core/services/form.service';
import { Form } from '../../../../../core/models/form.model';
import { Location } from '../../../../../core/models/location.model';
import { Section } from '../../../../../core/models/section.model';
import { LocationService } from '../../../../../core/services/location.service';
import { SectionService } from '../../../../../core/services/section.service';

interface Filters {
  formId: string; // ← adicionar
  answerId: string;
  conversionId: string;
  status: 'all' | 'active' | 'inactive';
}

@Component({
  selector: 'app-answer-conversions',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  templateUrl: './answer-conversions.component.html',
  styleUrl: './answer-conversions.component.css',
})
export class AnswerConversionsComponent implements OnInit {
  // ───────── Injeções ─────────
  private readonly answerConversionService = inject(AnswerConversionService);
  private readonly answerService = inject(AnswerService);
  private readonly packageUnitConversionService = inject(PackageUnitConversionService);
  private readonly inputUnitService = inject(InputUnitService);
  private readonly packageTypesService = inject(PackageTypesService);
  private readonly modalService = inject(ModalService);
  private readonly formService = inject(FormService);
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);

  // ───────── coleções ─────────
  readonly items = signal<AnswerConversion[]>([]);
  readonly answers = signal<Answer[]>([]);
  readonly packageUnitConversions = signal<PackageUnitConversion[]>([]);
  readonly inputUnits = signal<InputUnits[]>([]);
  readonly packageTypes = signal<PackageTypes[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly locations = signal<Location[]>([]);
  readonly sections = signal<Section[]>([]);

  // ───────── feedback ─────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // ───────── filtros ─────────
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = {
    formId: '',
    answerId: '',
    conversionId: '',
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

  private statusMatch(status: number, f: Filters['status']): boolean {
    if (f === 'all') return true;
    return f === 'active' ? status === 1 : status !== 1;
  }

  readonly filtered = computed(() => {
    const f = this.filters();
    return this.items().filter(
      (item) =>
        (!f.answerId || item.answerId === f.answerId) &&
        (!f.conversionId || item.conversionId === f.conversionId) &&
        this.statusMatch(1, f.status), // AnswerConversion não tem status direto
    );
  });

  /** Apenas os parâmetros elegíveis pra conversão (categoria 5). */
  readonly category5Answers = computed<Answer[]>(() =>
    this.answers().filter((a) => Number(a.categoryId) === 5),
  );

  ngOnInit(): void {
    this.load();
    this.loadAnswers();
    this.loadPackageUnitConversions();
    this.loadInputUnits();
    this.loadPackageTypes();
    this.loadForms();
    this.loadLocations();
    this.loadSections();
  }

  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r['result'] as T[]) || (r['data'] as T[]) || [];
  }

  private load(): void {
    this.loading.set(true);
    this.answerConversionService.getAll(1000, 1).subscribe({
      next: (res) => {
        this.items.set(this.unwrap<AnswerConversion>(res));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erro ao carregar conversões de parâmetros');
        this.loading.set(false);
      },
    });
  }

  private loadForms(): void {
    this.formService.getAll(1000, 1).subscribe({
      next: (res) => this.forms.set(this.unwrap<Form>(res)),
      error: () => this.forms.set([]),
    });
  }

  private loadLocations(): void {
    this.locationService.getAll(1000, 1).subscribe({
      next: (res) => this.locations.set(this.unwrap<Location>(res)),
      error: () => this.locations.set([]),
    });
  }

  private loadSections(): void {
    this.sectionService.getAll(1000, 1).subscribe({
      next: (res) => this.sections.set(this.unwrap<Section>(res)),
      error: () => this.sections.set([]),
    });
  }

  private loadAnswers(): void {
    this.answerService.getAll(1000, 1).subscribe({
      next: (res) => this.answers.set(this.unwrap<Answer>(res)),
      error: () => this.answers.set([]),
    });
  }

  private loadPackageUnitConversions(): void {
    this.packageUnitConversionService.getAll(1000, 1).subscribe({
      next: (res) => this.packageUnitConversions.set(this.unwrap<PackageUnitConversion>(res)),
      error: () => this.packageUnitConversions.set([]),
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

  getAnswerName(id: string): string {
    return this.answers().find((a) => a.id === id)?.nome ?? `ID: ${id}`;
  }
  getAnswerFormName(answerId: string): string {
    const formId = this.answers().find((a) => a.id === answerId)?.formId;
    return formId ? this.getFormName(formId) : '';
  }

  getFormName(formId: string): string {
    return this.forms().find((f) => f.id === formId)?.nome ?? `ID: ${formId}`;
  }

  getConversionLabel(id: string): string {
    const conv = this.packageUnitConversions().find((c) => c.id === id);
    if (!conv) return `ID: ${id}`;
    const inputUnit =
      this.inputUnits().find((u) => u.id === conv.inputUnitId)?.nome ?? 'Desconhecida';
    const packageType =
      this.packageTypes().find((t) => t.id === conv.packageTypeId)?.nome ?? 'Desconhecido';
    return `${inputUnit} - ${packageType}`;
  }

  async novo(): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Vincular Parâmetro à Conversão',
      size: 'lg',
      backdrop: 'static',
      inputs: {
        mode: 'new',
        answers: this.category5Answers(),
        packageUnitConversions: this.packageUnitConversions(),
        inputUnits: this.inputUnits(),
        packageTypes: this.packageTypes(),
        forms: this.forms(),
        locations: this.locations(),
        sections: this.sections(),
      },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Vincular', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = (ref.instance as any).value();
    this.answerConversionService
      .create({ answerId: v.answerId, conversionId: v.conversionId })
      .subscribe({
        next: () => {
          this.success.set('Vínculo criado com sucesso.');
          this.load();
        },
        error: (err: any) => this.error.set(`Erro ao criar. (${(err as any).error?.message})`),
      });
  }

  async editar(item: AnswerConversion): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Editar Vínculo',
      size: 'lg',
      backdrop: 'static',
      inputs: {
        mode: 'edit',
        item,
        answers: this.category5Answers(),
        packageUnitConversions: this.packageUnitConversions(),
        inputUnits: this.inputUnits(),
        packageTypes: this.packageTypes(),
        forms: this.forms(),
        locations: this.locations(),
        sections: this.sections(),
      },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Salvar', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = (ref.instance as any).value();
    this.answerConversionService.update(item.answerId, { conversionId: v.conversionId }).subscribe({
      next: () => {
        this.success.set('Vínculo atualizado com sucesso.');
        this.load();
      },
      error: (err: any) => this.error.set(`Erro ao atualizar. (${(err as any).error?.message})`),
    });
  }

  async excluir(item: AnswerConversion): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Excluir Vínculo',
      body: `Deseja realmente excluir este vínculo?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Excluir', variant: 'danger', value: true },
      ],
    });
    if (!(await ref.result)) return;

    this.answerConversionService.delete(item.answerId).subscribe({
      next: () => {
        this.success.set('Vínculo excluído.');
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

  trackById(_: number, item: AnswerConversion): string {
    return item.answerId;
  }
}
