import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Machine, MachineUpdate } from '../../../../core/models/machine.model';

export type EditMachineResult = { action: 'updated'; machine: Machine } | { action: 'deleted' };
import { Form } from '../../../../core/models/form.model';
import { Section } from '../../../../core/models/section.model';
import { ModalRef } from '../../../../core/modals/modal-ref';
import { MachineService } from '../../../../core/services/machine.service';

@Component({
  selector: 'app-edit-machine',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './edit-machine.component.html',
  styleUrl: './edit-machine.component.css',
})
export class EditMachineComponent implements OnInit {
  private readonly machineService = inject(MachineService);

  // injetados pelo ModalService via Object.assign
  machine!: Machine;
  form!: Form | null;
  section!: Section | null;
  modalRef!: ModalRef<EditMachineResult>;

  protected readonly nome = signal('');
  protected readonly descricao = signal('');
  protected readonly status = signal(1);
  protected readonly loading = signal(false);
  protected readonly confirming = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.nome.set(this.machine.nome);
    this.descricao.set(this.machine.descricao ?? '');
    this.status.set(this.machine.status);
  }

  protected save(): void {
    const nome = this.nome().trim();
    if (!nome) {
      this.error.set('O nome é obrigatório.');
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    const payload: MachineUpdate = {
      nome,
      descricao: this.descricao().trim() || null,
      status: this.status(),
    };

    this.machineService.update(this.machine.id, payload).subscribe({
      next: (updated) => this.modalRef.close({ action: 'updated', machine: updated }),
      error: () => {
        this.loading.set(false);
        this.error.set('Erro ao salvar. Tente novamente.');
      },
    });
  }

  protected remove(): void {
    if (!this.confirming()) {
      this.confirming.set(true);
      return;
    }

    this.loading.set(true);

    this.machineService.delete(this.machine.id).subscribe({
      next: () => this.modalRef.close({ action: 'deleted' }),
      error: () => {
        this.loading.set(false);
        this.confirming.set(false);
        this.error.set('Erro ao remover. Tente novamente.');
      },
    });
  }

  protected cancel(): void {
    this.modalRef.close();
  }
}
