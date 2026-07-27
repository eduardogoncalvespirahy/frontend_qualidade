import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AnswerCalculated } from '../../../../../../../core/models/answer-calculated.model';
import { Answer } from '../../../../../../../core/models/answer.model';
import { Form } from '../../../../../../../core/models/form.model';
import { Location } from '../../../../../../../core/models/location.model';
import { Section } from '../../../../../../../core/models/section.model';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form.component.html',
  styleUrl: './form.component.css',
})
export class FormComponent implements OnInit {
  readonly mode = input<'new' | 'edit'>('new');
  readonly item = input<AnswerCalculated | null>(null);
  readonly answers = input<Answer[]>([]);
  readonly forms = input<Form[]>([]);
  readonly locations = input<Location[]>([]);
  readonly sections = input<Section[]>([]);

  // ───────── cascata de busca (local → seção → formulário) ─────────
  protected locationId = '';
  protected sectionId = '';
  protected formId = '';

  // ───────── valores do vínculo ─────────
  protected answerId = '';
  protected antesAnswerId = '';
  protected depoisAnswerId = '';

  ngOnInit(): void {
    const u = this.item();
    if (!u) return;

    this.answerId = u.answerId;
    this.antesAnswerId = u.antesAnswerId;
    this.depoisAnswerId = u.depoisAnswerId;

    // reconstrói a cascata a partir do answer já vinculado (modo edição)
    const answer = this.answers().find((a) => a.id === u.answerId);
    if (!answer) return;
    this.formId = answer.formId;

    const form = this.forms().find((f) => f.id === answer.formId);
    if (!form) return;
    this.sectionId = form.sectionId;

    const section = this.sections().find((s) => s.id === form.sectionId);
    if (!section) return;

    const location = this.locations().find((l) => l.employerId === section.employerId);
    if (location) this.locationId = location.id;
  }

  // ───────── seleção em cascata ─────────
  onLocationChange(id: string): void {
    this.locationId = id;
    this.sectionId = '';
    this.formId = '';
    this.answerId = '';
    this.antesAnswerId = '';
    this.depoisAnswerId = '';
  }

  onSectionChange(id: string): void {
    this.sectionId = id;
    this.formId = '';
    this.answerId = '';
    this.antesAnswerId = '';
    this.depoisAnswerId = '';
  }

  onFormChange(id: string): void {
    this.formId = id;
    this.answerId = '';
    this.antesAnswerId = '';
    this.depoisAnswerId = '';
  }

  // ───────── listas filtradas (client-side, dados já carregados) ─────────
  filteredSections(): Section[] {
    const loc = this.locations().find((l) => l.id === this.locationId);
    return loc ? this.sections().filter((s) => s.employerId === loc.employerId) : [];
  }

  filteredForms(): Form[] {
    return this.sectionId ? this.forms().filter((f) => f.sectionId === this.sectionId) : [];
  }

  /** Candidatos a "Total Produzido": só answers de categoria 6 do formulário escolhido. */
  categoria6Answers(): Answer[] {
    return this.formId
      ? this.answers().filter((a) => a.formId === this.formId && Number(a.categoryId) === 6)
      : [];
  }

  /** Antes/Depois: qualquer answer do mesmo formulário. */
  answersDoFormulario(): Answer[] {
    return this.formId ? this.answers().filter((a) => a.formId === this.formId) : [];
  }

  value() {
    return {
      answerId: this.answerId,
      antesAnswerId: this.antesAnswerId,
      depoisAnswerId: this.depoisAnswerId,
    };
  }
}
