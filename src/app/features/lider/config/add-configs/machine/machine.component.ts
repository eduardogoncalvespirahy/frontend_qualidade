import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
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
import { FormComponent } from './modals/form/form.component';
import { DetailComponent } from './modals/detail/detail.component';

import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';

@Component({
  selector: 'app-machine',
  standalone: true,
  imports: [ScrollTopComponent],
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

  protected readonly filterMachine = signal('');
  protected readonly filterLocation = signal('');
  protected readonly filterSection = signal('');
  protected readonly filterForm = signal('');
  protected readonly filterStatus = signal<string>('');
  protected readonly filterCreatedStart = signal('');
  protected readonly filterCreatedEnd = signal('');
  protected readonly filterUpdatedStart = signal('');
  protected readonly filterUpdatedEnd = signal('');

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
    const machineTerm = this.filterMachine().trim().toLowerCase();
    const locationId = this.filterLocation();
    const sectionId = this.filterSection();
    const formId = this.filterForm();
    const status = this.filterStatus();

    const createdStart = this.filterCreatedStart();
    const createdEnd = this.filterCreatedEnd();

    const updatedStart = this.filterUpdatedStart();
    const updatedEnd = this.filterUpdatedEnd();

    return this.machineView().filter((item) => {
      const machine = item.machine;

      if (
        machineTerm &&
        !machine.nome.toLowerCase().includes(machineTerm) &&
        !(machine.descricao ?? '').toLowerCase().includes(machineTerm)
      ) {
        return false;
      }

      if (locationId && item.location?.id !== locationId) {
        return false;
      }

      if (sectionId && item.section?.id !== sectionId) {
        return false;
      }

      if (formId && item.form?.id !== formId) {
        return false;
      }

      if (status !== '') {
        if (machine.status !== Number(status)) {
          return false;
        }
      }

      const createdDate = new Date(machine.dataCriacao);
      const updatedDate = new Date(machine.dataAlteracao);

      if (createdStart) {
        if (createdDate < new Date(createdStart)) {
          return false;
        }
      }

      if (createdEnd) {
        const end = new Date(createdEnd);
        end.setHours(23, 59, 59, 999);

        if (createdDate > end) {
          return false;
        }
      }

      if (updatedStart) {
        if (updatedDate < new Date(updatedStart)) {
          return false;
        }
      }

      if (updatedEnd) {
        const end = new Date(updatedEnd);
        end.setHours(23, 59, 59, 999);

        if (updatedDate > end) {
          return false;
        }
      }

      return true;
    });
  });

  protected readonly grouped = computed(() => {
    const locations = this.locations();
    const filtered = this.filtered();

    return locations
      .map((location) => ({
        location,
        machines: filtered.filter((item) => item.location?.id === location.id),
      }))
      .filter(
        (group) =>
          group.machines.length > 0 ||
          (!this.filterMachine() &&
            !this.filterLocation() &&
            !this.filterSection() &&
            !this.filterForm() &&
            !this.filterStatus()),
      );
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

  protected readonly machineView = computed(() => {
    const locations = this.locations();
    const sections = this.sections();
    const forms = this.forms();
    const machines = this.machines();

    return machines.map((machine) => {
      const form = forms.find((f) => f.id === machine.formId) ?? null;

      const section = form ? (sections.find((s) => s.id === form.sectionId) ?? null) : null;

      const location = section
        ? (locations.find((l) => l.employerId === section.employerId) ?? null)
        : null;

      return {
        machine,
        form,
        section,
        location,
      };
    });
  });

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

  async novo(): Promise<void> {
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Nova maquina',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new' },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Criar', variant: 'primary', value: true, submit: true },
      ],
    });

    const confirmed = await ref.result;

    if (!confirmed) {
      return;
    }

    const value = ref.instance.value();

    this.machineService
      .create({
        formId: value.formId,
        nome: value.nome,
        descricao: value.descricao,
        status: value.status,
      })
      .subscribe({
        next: () => {
          this.handleMachineChange(true);
        },
      });
  }

  async detalhar(machine: Machine): Promise<void> {
    const ref = this.modalService.openComponent(DetailComponent, {
      title: `Detalhe`,
      size: 'lg',
      inputs: { machine },
      outputs: {
        reload_return: (value: unknown) => {
          if (typeof value === 'boolean') {
            if (value) {
              ref.close();
            }
            this.handleMachineChange(value);
          }
        },
      },
      buttons: [{ text: 'Fechar', variant: 'secondary', value: true }],
    });

    const confirmed = await ref.result.then(() => undefined);

    return confirmed;
  }

  handleMachineChange(result: boolean): void {
    if (result) {
      this.reload();
    }
  }
}
