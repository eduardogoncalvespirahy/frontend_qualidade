import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import { Machine } from '../../../../../../../core/models/machine.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormService } from '../../../../../../../core/services/form.service';
import { rxResource } from '@angular/core/rxjs-interop';
import { PaginatedResult } from '../../../../../../../core/models/paginated.model';
import { Form } from '../../../../../../../core/models/form.model';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form.component.html',
  styleUrl: './form.component.css',
})
export class FormComponent implements OnInit {
    private readonly formService = inject(FormService);
    
  readonly machine = input<Machine | null>(null);
  readonly mode = input<'new' | 'edit'>('new');

  protected id = '';
  protected formId = '';
  protected nome = '';
  protected descricao = '';
  protected status = true;
  protected dataCriacao = new Date();
  protected dataAlteracao = new Date();

  protected readonly formsResource = rxResource<PaginatedResult<Form>, void>({
    stream: () => this.formService.getAll(),
  });  

  protected readonly forms = computed(() => this.formsResource.value()?.data ?? []);  

  ngOnInit(): void {
    const u = this.machine();
    if (u) {
      this.id = u.id;
      this.formId = u.formId;
      this.nome = u.nome;
      this.descricao = u.descricao || '';
      this.status = u.status === 1;
      this.dataCriacao = u.dataCriacao;
      this.dataAlteracao = u.dataAlteracao;
    }
  }

  /** Valores atuais do formulário (lidos pelo opener após confirmar). */
  value(): Machine {
    return {
      id: this.id,
      formId: this.formId,
      nome: this.nome,
      descricao: this.descricao || '',
      status: this.status ? 1 : 0,
      dataCriacao: this.dataCriacao,
      dataAlteracao: this.dataAlteracao,
    };
  }
}
