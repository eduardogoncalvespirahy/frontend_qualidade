import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { Employer } from '../../../../../core/models/employer.model';
import { Location } from '../../../../../core/models/location.model';
import { Section } from '../../../../../core/models/section.model';
import { Form } from '../../../../../core/models/form.model';
import { Machine } from '../../../../../core/models/machine.model';
import { PaginatedResult } from '../../../../../core/models/paginated.model';

import { EmployerService } from '../../../../../core/services/employer.service';
import { LocationService } from '../../../../../core/services/location.service';
import { SectionService } from '../../../../../core/services/section.service';
import { FormService } from '../../../../../core/services/form.service';
import { MachineService } from '../../../../../core/services/machine.service';
import { ModalService } from '../../../../../core/services/modal.service';

@Component({
  selector: 'app-machine',
  standalone: true,
  imports: [],
  templateUrl: './machine.component.html',
  styleUrl: './machine.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineComponent {
  private readonly employerService = inject(EmployerService);
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly formService = inject(FormService);
  private readonly machineService = inject(MachineService);
  private readonly modalService = inject(ModalService);

  protected readonly query = signal('');

  protected readonly employersResource = rxResource<PaginatedResult<Employer>, void>({
    stream: () => this.employerService.getAll(),
  });

  protected readonly locationsResource = rxResource<PaginatedResult<Location>, void>({
    stream: () => this.locationService.getAll(),
  });

  protected readonly sectionsResource = rxResource<PaginatedResult<Section>, void>({
    stream: () => this.sectionService.getAll(),
  });

  protected readonly formsResource = rxResource<PaginatedResult<Form>, void>({
    stream: () => this.formService.getAll(),
  });

  protected readonly machinesResource = rxResource<PaginatedResult<Machine>, void>({
    stream: () => this.machineService.getAll(),
  });

  protected readonly locations = computed(() => this.locationsResource.value()?.data ?? []);
  protected readonly sections = computed(() => this.sectionsResource.value()?.data ?? []);
  protected readonly forms = computed(() => this.formsResource.value()?.data ?? []);
  protected readonly machines = computed(() => this.machinesResource.value()?.data ?? []);

  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) return this.machines();
    return this.machines().filter(
      (m) =>
        m.nome.toLowerCase().includes(term) ||
        (m.descricao ?? '').toLowerCase().includes(term),
    );
  });

  protected readonly grouped = computed(() => {
    const locations = this.locations();
    const sections = this.sections();
    const forms = this.forms();
    const machines = this.filtered();

    return locations.map((location) => {
      const employerSections = sections.filter((s) => s.employerId === location.employerId);
      const sectionIds = new Set(employerSections.map((s) => s.id));

      const employerForms = forms.filter((f) => sectionIds.has(f.sectionId));
      const formIds = new Set(employerForms.map((f) => f.id));

      const locationMachines = machines
        .filter((m) => formIds.has(m.formId))
        .map((m) => {
          const form = employerForms.find((f) => f.id === m.formId) ?? null;
          const section = form ? employerSections.find((s) => s.id === form.sectionId) ?? null : null;
          return { machine: m, form, section };
        });

      return { location, machines: locationMachines };
    });
  });

  protected readonly loading = computed(
    () =>
      this.locationsResource.isLoading() ||
      this.sectionsResource.isLoading() ||
      this.formsResource.isLoading() ||
      this.machinesResource.isLoading(),
  );

  protected readonly hasError = computed(
    () =>
      !!this.locationsResource.error() ||
      !!this.sectionsResource.error() ||
      !!this.formsResource.error() ||
      !!this.machinesResource.error(),
  );

  protected onSearch(value: string): void {
    this.query.set(value);
  }

  protected reload(): void {
    this.employersResource.reload();
    this.locationsResource.reload();
    this.sectionsResource.reload();
    this.formsResource.reload();
    this.machinesResource.reload();
  }

  protected statusLabel(status: number): string {
    return status === 1 ? 'Ativo' : 'Inativo';
  }

  protected openNew(): void {
    // const ref = this.modalService.open({
    //   title: 'Nova Máquina',
    //   component: NewMachineComponent,
    //   size: 'lg',
    //   data: {
    //     locations: this.locations(),
    //     sections: this.sections(),
    //     forms: this.forms(),
    //   },
    // });

    // ref.result.then((created) => {
    //   if (created) this.machinesResource.reload();
    // });
  }

  protected openEdit(machine: Machine, form: Form | null, section: Section | null): void {
    // const ref = this.modalService.open({
    //   title: 'Editar Máquina',
    //   component: EditMachineComponent,
    //   size: 'lg',
    //   data: { machine, form, section },
    // });

    // ref.result.then((result: EditMachineResult | undefined) => {
    //   if (result) this.machinesResource.reload();
    // });
  }
}
