import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AnswerCalculated } from '../../../../../core/models/answer-calculated.model';
import { Answer } from '../../../../../core/models/answer.model';
import { Form } from '../../../../../core/models/form.model';
import { Location } from '../../../../../core/models/location.model';
import { Section } from '../../../../../core/models/section.model';
import { AnswerCalculatedService } from '../../../../../core/services/answer-calculated.service';
import { AnswerService } from '../../../../../core/services/answer.service';
import { FormService } from '../../../../../core/services/form.service';
import { LocationService } from '../../../../../core/services/location.service';
import { SectionService } from '../../../../../core/services/section.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';
import { FormComponent } from './modals/form/form.component';

interface Filters {
  formId: string;
  answerId: string;
}

@Component({
  selector: 'app-answer-calculated',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  templateUrl: './answer-calculated.component.html',
  styleUrl: './answer-calculated.component.css',
})
export class AnswerCalculatedComponent {
  private readonly service = inject(AnswerCalculatedService);
  private readonly answerService = inject(AnswerService);
  private readonly formService = inject(FormService);
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly modalService = inject(ModalService);

  readonly items = signal<AnswerCalculated[]>([]);
  readonly answers = signal<Answer[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly locations = signal<Location[]>([]);
  readonly sections = signal<Section[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // ───────── filtros ─────────
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = { formId: '', answerId: '' };
  readonly filters = signal<Filters>({ ...this.emptyFilters });

  updateFilter<K extends keyof Filters>(key: K, value: Filters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }

  readonly activeFilterCount = computed(
    () => Object.values(this.filters()).filter((v) => v !== '').length,
  );
  readonly hasFilter = computed(() => this.activeFilterCount() > 0);

  readonly filtered = computed(() => {
    const f = this.filters();
    return this.items().filter((item) => {
      const answerFormId = this.answers().find((a) => a.id === item.answerId)?.formId;
      return (
        (!f.formId || answerFormId === f.formId) && (!f.answerId || item.answerId === f.answerId)
      );
    });
  });

  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
  }

  ngOnInit(): void {
    this.load();
    this.loadAnswers();
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
    this.service.getAll(1000, 1).subscribe({
      next: (res) => {
        this.items.set(this.unwrap<AnswerCalculated>(res));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erro ao carregar parâmetros calculados');
        this.loading.set(false);
      },
    });
  }

  private loadAnswers(): void {
    this.answerService.getAll(1000, 1).subscribe({
      next: (res) => this.answers.set(this.unwrap<Answer>(res)),
      error: () => this.answers.set([]),
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

  getAnswerName(id: string): string {
    return this.answers().find((a) => a.id === id)?.nome ?? `ID: ${id}`;
  }

  getFormName(formId: string): string {
    return this.forms().find((f) => f.id === formId)?.nome ?? `ID: ${formId}`;
  }

  getAnswerFormName(answerId: string): string {
    const formId = this.answers().find((a) => a.id === answerId)?.formId;
    return formId ? this.getFormName(formId) : '';
  }

  trackById(_: number, item: AnswerCalculated): string {
    return item.answerId;
  }

  async novo(): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Novo Parâmetro Calculado',
      size: 'lg',
      backdrop: 'static',
      inputs: {
        mode: 'new',
        answers: this.answers(),
        forms: this.forms(),
        locations: this.locations(),
        sections: this.sections(),
      },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Criar', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = (ref.instance as any).value();
    this.service
      .create({
        answerId: v.answerId,
        antesAnswerId: v.antesAnswerId,
        depoisAnswerId: v.depoisAnswerId,
      })
      .subscribe({
        next: () => {
          this.success.set('Parâmetro calculado criado com sucesso.');
          this.load();
        },
        error: (err: any) => this.error.set(`Erro ao criar. (${err.error?.message})`),
      });
  }

  async editar(item: AnswerCalculated): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Editar Parâmetro Calculado',
      size: 'lg',
      backdrop: 'static',
      inputs: {
        mode: 'edit',
        item,
        answers: this.answers(),
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
    this.service
      .update(item.answerId, {
        antesAnswerId: v.antesAnswerId,
        depoisAnswerId: v.depoisAnswerId,
      })
      .subscribe({
        next: () => {
          this.success.set('Parâmetro calculado atualizado com sucesso.');
          this.load();
        },
        error: (err: any) => this.error.set(`Erro ao atualizar. (${err.error?.message})`),
      });
  }

  async excluir(item: AnswerCalculated): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Excluir Parâmetro Calculado',
      body: `Deseja realmente excluir este vínculo?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Excluir', variant: 'danger', value: true },
      ],
    });
    if (!(await ref.result)) return;

    this.service.delete(item.answerId).subscribe({
      next: () => {
        this.success.set('Parâmetro calculado excluído.');
        this.load();
      },
      error: (err: any) => this.error.set(`Erro ao excluir. (${err.error?.message})`),
    });
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
