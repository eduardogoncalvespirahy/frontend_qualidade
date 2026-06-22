import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Location } from '../../../../core/models/location.model';
import { Section } from '../../../../core/models/section.model';
import { Form } from '../../../../core/models/form.model';
import { Machine, MachineCreate } from '../../../../core/models/machine.model';
import { ModalRef } from '../../../../core/modals/modal-ref';
import { MachineService } from '../../../../core/services/machine.service';

@Component({
  selector: 'app-new-machine',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-machine.component.html',
  styleUrl: './new-machine.component.css',
})
export class NewMachineComponent implements OnInit {
  private readonly machineService = inject(MachineService);

  // injetados pelo ModalService via Object.assign
  locations!: Location[];
  sections!: Section[];
  forms!: Form[];
  modalRef!: ModalRef<Machine>;

  protected readonly selectedLocationId = signal('');
  protected readonly selectedSectionId = signal('');
  protected readonly selectedFormId = signal('');
  protected readonly nome = signal('');
  protected readonly descricao = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly filteredSections = computed(() =>
    this.sections.filter((s) => {
      const location = this.locations.find((l) => l.id === this.selectedLocationId());
      return location ? s.employerId === location.employerId : false;
    }),
  );

  protected readonly filteredForms = computed(() =>
    this.forms.filter((f) => f.sectionId === this.selectedSectionId()),
  );

  ngOnInit(): void {
    if (this.locations?.length === 1) {
      this.selectedLocationId.set(this.locations[0].id);
    }
  }

  protected onLocationChange(id: string): void {
    this.selectedLocationId.set(id);
    this.selectedSectionId.set('');
    this.selectedFormId.set('');
  }

  protected onSectionChange(id: string): void {
    this.selectedSectionId.set(id);
    this.selectedFormId.set('');
  }

  protected save(): void {
    const nome = this.nome().trim();
    const formId = this.selectedFormId();

    if (!nome) {
      this.error.set('O nome é obrigatório.');
      return;
    }
    if (!formId) {
      this.error.set('Selecione um formulário.');
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    const payload: MachineCreate = {
      formId,
      nome,
      descricao: this.descricao().trim() || null,
    };

    this.machineService.create(payload).subscribe({
      next: (created) => this.modalRef.close(created),
      error: () => {
        this.loading.set(false);
        this.error.set('Erro ao criar máquina. Tente novamente.');
      },
    });
  }

  protected cancel(): void {
    this.modalRef.close();
  }
}
