import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Machine } from '../../../../../../../core/models/machine.model';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../../../../../core/services/modal.service';
import { FormComponent } from '../form/form.component';
import { MachineService } from '../../../../../../../core/services/machine.service';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.css',
})
export class DetailComponent {
  private readonly modalService = inject(ModalService);
  private readonly machineService = inject(MachineService);

  readonly machine = input.required<Machine>();

  protected readonly isActive = computed(() => this.machine().status === 1);

  protected readonly statusLabel = computed(() => (this.isActive() ? 'Ativo' : 'Inativo'));

  protected readonly statusClass = computed(() =>
    this.isActive() ? 'text-bg-success' : 'text-bg-secondary',
  );

  protected async editar(machine: Machine): Promise<void> {
    const ref = this.modalService.openComponent(FormComponent, {
      title: `Editar Máquina: ${machine.nome}`,
      size: 'lg',
      backdrop: 'static',
      inputs: {
        mode: 'edit',
        machine,
      },
      buttons: [
        {
          text: 'Cancelar',
          variant: 'secondary',
          value: false,
        },
        {
          text: 'Salvar',
          variant: 'primary',
          value: true,
          submit: true,
        },
      ],
    });

    const confirmed = await ref.result;

    if (!confirmed) {
      return;
    }

    const value = ref.instance.value();

    this.machineService
      .update(value.id, {
        formId: value.formId,
        nome: value.nome,
        descricao: value.descricao,
        status: value.status,
      })
      .subscribe();
  }

  protected async deletar(machine: Machine): Promise<boolean> {
    const ref = this.modalService.open<boolean>({
      title: `Deletar Máquina`,
      body: `Deseja realmente deletar a máquina "${machine.nome}"?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        {
          text: 'Cancelar',
          variant: 'secondary',
          value: false,
        },
        {
          text: 'Deletar',
          variant: 'danger',
          value: true,
        },
      ],
    });

    const confirmed = await ref.result;

    if (!confirmed) {
      return false;
    }

    this.machineService.delete(machine.id).subscribe();

    return true;
  }
}
