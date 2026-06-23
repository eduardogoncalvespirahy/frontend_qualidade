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
import { ListComponent } from './modals/list/list.component';

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
        m.nome.toLowerCase().includes(term) || (m.descricao ?? '').toLowerCase().includes(term),
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
          const section = form
            ? (employerSections.find((s) => s.id === form.sectionId) ?? null)
            : null;
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

  // async editar(machine: Machine): Promise<Machine | null> {
  //   const ref = this.modalService.openComponent(FormComponent, {
  //     title: `Editar: ${machine.nome} - Id: ${machine.id}`,
  //     size: 'lg',
  //     backdrop: 'static',
  //     inputs: { mode: 'edit', machine },
  //     buttons: [
  //       { text: 'Cancelar', variant: 'secondary', value: false },
  //       { text: 'Salvar', variant: 'primary', value: true, submit: true },
  //     ],
  //   });

  //   const confirmado = await ref.result;
  //   return confirmado ? ref.instance.value() : null;
  // }

  // async listar(machines: Machine[]): Promise<Machine | null> {
  //   return new Promise<Machine | null>((resolve) => {
  //     const ref = this.modalService.openComponent(ListComponent, {
  //       title: 'Maquinas',
  //       size: 'lg',
  //       scrollable: true,
  //       inputs: { machines },
  //       outputs: {
  //         select: (u) => {
  //           resolve(u as Machine);
  //           ref.close();
  //         },
  //       },
  //       buttons: [{ text: 'Fechar', variant: 'secondary', value: false }],
  //     });

  //     // fechou sem selecionar (resolve só tem efeito uma vez)
  //     ref.result.then(() => resolve(null));
  //   });
  // }
}
