import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AnswerConversion } from '../../../../../../../core/models/answer-conversion.model';
import { Answer } from '../../../../../../../core/models/answer.model';
import { PackageUnitConversion } from '../../../../../../../core/models/package-unit-conversions.model';
import { InputUnits } from '../../../../../../../core/models/input-units.model';
import { PackageTypes } from '../../../../../../../core/models/package-types.model';
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
  readonly item = input<AnswerConversion | null>(null);
  /** Answers já filtrados por categoria 5 (vem assim do componente pai). */
  readonly answers = input<Answer[]>([]);
  readonly packageUnitConversions = input<PackageUnitConversion[]>([]);
  readonly inputUnits = input<InputUnits[]>([]);
  readonly packageTypes = input<PackageTypes[]>([]);
  readonly forms = input<Form[]>([]);
  readonly locations = input<Location[]>([]);
  readonly sections = input<Section[]>([]);

  // ───────── cascata de busca (local → seção → formulário) ─────────
  protected locationId = '';
  protected sectionId = '';
  protected formId = '';

  // ───────── valores do vínculo ─────────
  protected answerId = '';
  protected conversionId = '';

  ngOnInit(): void {
    const u = this.item();
    if (!u) return;

    this.answerId = u.answerId;
    this.conversionId = u.conversionId;

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
  }

  onSectionChange(id: string): void {
    this.sectionId = id;
    this.formId = '';
    this.answerId = '';
  }

  onFormChange(id: string): void {
    this.formId = id;
    this.answerId = '';
  }

  // ───────── listas filtradas (client-side, dados já carregados) ─────────
  filteredSections(): Section[] {
    const loc = this.locations().find((l) => l.id === this.locationId);
    return loc ? this.sections().filter((s) => s.employerId === loc.employerId) : [];
  }

  filteredForms(): Form[] {
    return this.sectionId ? this.forms().filter((f) => f.sectionId === this.sectionId) : [];
  }

  /** Answers de categoria 5 do formulário escolhido. */
  answersDoFormulario(): Answer[] {
    return this.formId ? this.answers().filter((a) => a.formId === this.formId) : [];
  }

  getConversionLabel(conv: PackageUnitConversion): string {
    const inputUnit =
      this.inputUnits().find((u) => u.id === conv.inputUnitId)?.nome ?? 'Desconhecida';
    const packageType =
      this.packageTypes().find((t) => t.id === conv.packageTypeId)?.nome ?? 'Desconhecido';
    return `${inputUnit} - ${packageType} (Ordem ${conv.ordem})`;
  }

  value() {
    return {
      answerId: this.answerId,
      conversionId: this.conversionId,
    };
  }
}
