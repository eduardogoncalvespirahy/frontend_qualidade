import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

import { Answer } from '../../../../../../../core/models/answer.model';
import { AnswerMachine } from '../../../../../../../core/models/answer-machine.model';
import { LimitAnswer } from '../../../../../../../core/models/limit-answer.model';
import { LimitAnswerMachine } from '../../../../../../../core/models/limit-answer-machine.model';
import { AnswerGroups } from '../../../../../../../core/models/answer-group.model';

import { ModalService } from '../../../../../../../core/services/modal.service';
import { AnswerService } from '../../../../../../../core/services/answer.service';
import { LimitAnswerService } from '../../../../../../../core/services/limit-answer.service';
import { AnswerGroupsService } from '../../../../../../../core/services/answer-group.service';
import { AnswerGroupItemsService } from '../../../../../../../core/services//answer-groups-items.service';
// Serviço de categorias (mesmo usado pelo FormComponent).
import { CategorieAnswerService } from '../../../../../../../core/services/categorieAnswer.service';

import { FormComponent } from '../form/form.component';
import { catchError, of } from 'rxjs';

// Os 4 possíveis tipos de parâmetro que este componente pode exibir
export type ParamType = 'answer' | 'answerMachine' | 'limitAnswer' | 'limitAnswerMachine';

// União dos 4 modelos — todos têm a mesma estrutura base
export type ParamItem = Answer | AnswerMachine | LimitAnswer | LimitAnswerMachine;

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.css',
})
export class DetailComponent {
  private readonly LimitAnswerService = inject(LimitAnswerService);
  private readonly modalService = inject(ModalService);
  private readonly answerService = inject(AnswerService);
  private readonly answerGroupsService = inject(AnswerGroupsService);
  private readonly answerGroupItemsService = inject(AnswerGroupItemsService);
  private readonly categorieAnswerService = inject(CategorieAnswerService);

  // Dados do parâmetro que será exibido — obrigatório, quem abrir o modal deve passar
  readonly item = input.required<ParamItem>();

  // Qual dos 4 tipos é esse item — obrigatório também
  readonly paramType = input.required<ParamType>();

  // Hierarquia de onde este parâmetro pertence — passada pelo param.component ao abrir o modal
  readonly formNome = input('');
  readonly sectionNome = input('');
  readonly locationNome = input('');

  // ─── Grupos ───────────────────────────────────────────────────────────────
  readonly groups = input<AnswerGroups[]>([]);
  readonly currentGroupId = input<string>('');

  protected readonly currentGroupNome = computed(() => {
    const id = this.currentGroupId();
    if (!id) return null;
    return this.groups().find((g) => g.id === id)?.nome ?? id;
  });

  // ─── Categorias ────────────────────────────────────────────────────────────
  // Só Answer possui categoryId; para os demais tipos isso fica indefinido.
  protected readonly categoriesResource = rxResource({
    stream: () =>
      this.categorieAnswerService
        .getAll(1000)
        .pipe(
          catchError(() => of({ data: [], total: 0, page: 1, limit: 1000, totalPages: 0 } as any)),
        ),
  });

  /** categoryId do item (quando for Answer). */
  protected readonly currentCategoryId = computed(() => {
    const cid = (this.item() as Partial<Answer>).categoryId;
    return cid == null ? null : cid;
  });

  /** Categoria completa do item (resolvida pela lista carregada). */
  protected readonly currentCategory = computed(() => {
    const cid = this.currentCategoryId();
    if (cid == null || cid === 0) return null;
    const cats = this.categoriesResource.value()?.data ?? [];
    // Answer.categoryId é number e Category.id é string → compara normalizado.
    return cats.find((c: any) => String(c.id) === String(cid)) ?? null;
  });

  /** Nome da categoria (ou null). */
  protected readonly currentCategoryNome = computed(() => this.currentCategory()?.nome ?? null);

  /** Mostra o bloco de categoria apenas para parâmetros do formulário. */
  protected readonly showCategoria = computed(() => this.paramType() === 'answer');

  // identificar se está ativo
  protected readonly isActive = computed(() => this.item().status === 1);

  // exibir status em tela
  protected readonly statusLabel = computed(() => (this.isActive() ? 'Ativo' : 'Inativo'));

  // Brincar com classe CSS
  protected readonly statusClass = computed(() =>
    this.isActive() ? 'text-bg-success' : 'text-bg-secondary',
  );

  protected readonly limitsResource = rxResource({
    params: () => this.item().id,
    stream: ({ params: answerId }) =>
      this.LimitAnswerService.getAll(100).pipe(
        catchError(() => of({ data: [], total: 0, page: 1, limit: 100, totalPages: 0 } as any)),
      ),
  });

  protected readonly limits = computed(() =>
    (this.limitsResource.value()?.data ?? []).filter(
      (l: any) => l.answerId === this.item().id && l.status === 1,
    ),
  );

  // Avisa o pai (param.component.ts) que algo mudou e precisa recarregar
  readonly reload_return = output<boolean>();

  // Converte o tipo técnico em texto legível para o usuário
  protected readonly typeLabel = computed(() => {
    const map: Record<ParamType, string> = {
      answer: 'Parâmetro do Formulário',
      answerMachine: 'Parâmetro da Máquina',
      limitAnswer: 'Limite',
      limitAnswerMachine: 'Limite da Máquina',
    };
    return map[this.paramType()];
  });

  // Mostra o vínculo do item — Answer tem formId, os outros têm machineId
  protected readonly parentLabel = computed(() => {
    const i = this.item() as any;
    if (i.formId) return `Formulário: ${i.formId}`;
    if (i.machineId) return `Máquina: ${i.machineId}`;
    return '—';
  });

  protected async deletar(item: ParamItem): Promise<void> {
    const ref = this.modalService.open<boolean>({
      title: `Deletar Parâmetro`,
      body: `Deseja realmente deletar "${(item as any).nome}"?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Deletar', variant: 'danger', value: true },
      ],
    });

    const confirmed = await ref.result;
    if (!confirmed) return;

    this.LimitAnswerService.getAll(100).subscribe({
      next: (result) => {
        const limites = result.data.filter((l) => l.answerId === item.id);
        const deletes = limites.map((l) => this.LimitAnswerService.delete(l.id).toPromise());

        Promise.all(deletes).then(() => {
          this.answerService.delete(item.id).subscribe({
            next: () => {
              // remove também o vínculo de grupo (se houver)
              const finish = () => {
                this.reload_return.emit(true);
                ref.close();
              };
              const gid = this.currentGroupId();
              if (gid) {
                this.answerGroupItemsService
                  .delete(gid, item.id)
                  .subscribe({ next: finish, error: finish });
              } else {
                finish();
              }
            },
          });
        });
      },
    });
  }

  protected async editar(item: ParamItem): Promise<void> {
    // Pega o limite atual deste parâmetro (se existir) para pré-preencher o form
    const existingLimit = this.limits()[0] ?? null;

    const ref = this.modalService.openComponent(FormComponent, {
      title: `Editar: ${(item as any).nome}`,
      size: 'lg',
      backdrop: 'static',
      inputs: {
        mode: 'edit',
        item: item as Answer,
        parentId: (item as any).formId ?? (item as any).machineId ?? '',
        existingLimit,
        groups: this.groups(),
        currentGroupId: this.currentGroupId(),
      },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Salvar', variant: 'primary', value: true, submit: true },
      ],
    });

    const confirmed = await ref.result;
    if (!confirmed) return;

    const value = ref.instance.value();
    const limitValue = ref.instance.limitValue();
    const grupo = ref.instance.groupSelection();
    const formId = (item as any).formId ?? '';

    const finish = () => this.reload_return.emit(true);
    const afterLimit = () => this.applyGroup(grupo, value.id, formId, finish);

    this.answerService
      .update(value.id, {
        nome: value.nome,
        descricao: value.descricao,
        status: value.status,
        categoryId: value.categoryId,
      })
      .subscribe({
        next: () => this.applyLimit(existingLimit, limitValue, value.id, afterLimit),
      });
  }

  /**
   * Aplica a alteração de limite mantendo histórico:
   *  - valores informados e diferentes → cria uma NOVA versão ATIVA (status 1)
   *    e desativa a anterior (status 0);
   *  - valores iguais aos atuais → não faz nada;
   *  - limites apagados → desativa o limite atual (se houver).
   *
   * IMPORTANTE: o `status: 1` no create é obrigatório — o backend grava
   * `status = dto.status ?? null`. Sem isso, o novo limite ficava com status
   * NULL e era filtrado da visualização (dava a impressão de "não atualizar").
   */
  private applyLimit(
    existingLimit: LimitAnswer | null,
    limitValue: { limitMin: string | null; limitMax: string | null } | null,
    answerId: string,
    done: () => void,
  ): void {
    const norm = (v: string | null | undefined) => (v ?? '').toString().trim();

    // Nenhum valor informado → desativa o limite atual (se houver).
    if (!limitValue) {
      if (existingLimit) {
        this.LimitAnswerService.update(existingLimit.id, {
          answerId: existingLimit.answerId,
          status: 0,
        }).subscribe({ next: done, error: done });
      } else {
        done();
      }
      return;
    }

    // Sem mudança em relação ao limite ativo → nada a fazer.
    if (
      existingLimit &&
      existingLimit.status === 1 &&
      norm(existingLimit.limitMin) === norm(limitValue.limitMin) &&
      norm(existingLimit.limitMax) === norm(limitValue.limitMax)
    ) {
      done();
      return;
    }

    if(Number(norm(limitValue.limitMax)) <= 0){
      limitValue.limitMax = null;
    }

    if(Number(norm(limitValue.limitMin)) <= 0){
      limitValue.limitMin = null;
    }    

    // Cria a nova versão ATIVA e desativa a anterior (mantém histórico).
    this.LimitAnswerService.create({
      answerId,
      limitMin: limitValue.limitMin,
      limitMax: limitValue.limitMax,
      status: 1,
    }).subscribe({
      next: () => {
        if (existingLimit) {
          this.LimitAnswerService.update(existingLimit.id, {
            answerId: existingLimit.answerId,
            status: 0,
          }).subscribe({ next: done, error: done });
        } else {
          done();
        }
      },
      error:(err) =>{ console.log(err);  return done},
    });
  }

  /**
   * Reconcilia o vínculo de grupo após salvar a edição.
   * Cria o grupo antes, se o usuário optou por um novo. Trocar de grupo
   * apaga o vínculo antigo e cria o novo (a chave é answerGroupId + answerId).
   */
  private applyGroup(
    grupo: { groupId: string; novoNome: string | null },
    answerId: string,
    formId: string,
    finish: () => void,
  ): void {
    const reconcile = (targetGroupId: string) => {
      const oldGroup = this.currentGroupId();
      if (oldGroup === targetGroupId) {
        finish();
        return;
      }
      const createNew = () => {
        if (!targetGroupId) {
          finish();
          return;
        }
        this.answerGroupItemsService
          .create({ answerGroupId: targetGroupId, answerId })
          .subscribe({ next: finish, error: finish });
      };
      if (oldGroup) {
        this.answerGroupItemsService
          .delete(oldGroup, answerId)
          .subscribe({ next: createNew, error: createNew });
      } else {
        createNew();
      }
    };

    if (grupo.novoNome) {
      this.answerGroupsService
        .create({ formId, nome: grupo.novoNome, status: 1 })
        .subscribe({ next: (g) => reconcile(g.id), error: finish });
    } else {
      reconcile(grupo.groupId);
    }
  }
}
