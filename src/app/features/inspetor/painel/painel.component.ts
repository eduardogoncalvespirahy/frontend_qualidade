import {
  Component,
  inject,
  signal,
  computed
} from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { Location } from '../../../core/models/location.model';
import { Section } from '../../../core/models/section.model';
import { Form } from '../../../core/models/form.model';
import { Answer } from '../../../core/models/answer.model';

import { AnswerService } from '../../../core/services/answer.service';
import { FormService } from '../../../core/services/form.service';
import { LocationService } from '../../../core/services/location.service';
import { SectionService } from '../../../core/services/section.service';

@Component({
  selector: 'app-painel',
  standalone: true,
  imports: [],
  templateUrl: './painel.component.html',
  styleUrl: './painel.component.css',
})
export class PainelComponent {

  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly formService = inject(FormService);
  private readonly answerService = inject(AnswerService);

  readonly loading = signal(false);

  readonly locations = signal<Location[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly answers = signal<Answer[]>([]);

  readonly selectedLocation = signal<Location | null>(null);
  readonly selectedSection = signal<Section | null>(null);
  readonly selectedForm = signal<Form | null>(null);

  constructor() {
    this.loadLocations();
  }

  async loadLocations() {

    this.loading.set(true);

    const result = await firstValueFrom(
      this.locationService.getAll(500,1)
    );

    this.locations.set(result.data);

    this.loading.set(false);

  }

  async selectLocation(location: Location) {

    this.selectedLocation.set(location);

    this.selectedSection.set(null);
    this.selectedForm.set(null);

    this.answers.set([]);

    const result = await firstValueFrom(
      this.sectionService.getAll(500,1)
    );

    this.sections.set(
      result.data.filter(x=>x.employerId===location.employerId)
    );

  }

  async selectSection(section: Section){

    this.selectedSection.set(section);

    this.selectedForm.set(null);

    this.answers.set([]);

    const result = await firstValueFrom(
      this.formService.getAll(500,1)
    );

    this.forms.set(
      result.data.filter(x=>x.sectionId===section.id)
    );

  }

  async selectForm(form: Form){

    this.selectedForm.set(form);

    const result = await firstValueFrom(
      this.answerService.getAll(500,1)
    );

    this.answers.set(
      result.data.filter(x=>x.formId===form.id)
    );

  }

}