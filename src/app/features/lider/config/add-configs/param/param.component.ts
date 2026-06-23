import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { Location } from '../../../../../core/models/location.model';
import { Section } from '../../../../../core/models/section.model';
import { Form } from '../../../../../core/models/form.model';
import { Machine } from '../../../../../core/models/machine.model';
import { Answer } from '../../../../../core/models/answer.model';
import { AnswerMachine } from '../../../../../core/models/answer-machine.model';
import { LimitAnswer } from '../../../../../core/models/limit-answer.model';
import { LimitAnswerMachine } from '../../../../../core/models/limit-answer-machine.model';
import { PaginatedResult } from '../../../../../core/models/paginated.model';

import { LocationService } from '../../../../../core/services/location.service';
import { SectionService } from '../../../../../core/services/section.service';
import { FormService } from '../../../../../core/services/form.service';
import { MachineService } from '../../../../../core/services/machine.service';
import { AnswerService } from '../../../../../core/services/answer.service';
import { AnswerMachineService } from '../../../../../core/services/answer-machine.service';
import { LimitAnswerService } from '../../../../../core/services/limit-answer.service';
import { LimitAnswerMachineService } from '../../../../../core/services/limit-answer-machine.service';

// Resultado vazio padrão usado quando a API retorna erro (tabela sem dados ainda).
// Isso impede que um endpoint vazio bloqueie a exibição de toda a tela.
function emptyPage<T>(): PaginatedResult<T> {
  return { data: [], total: 0, page: 1, limit: 500, totalPages: 0 };
}

@Component({
  selector: 'app-param',
  standalone: true,
  imports: [],
  templateUrl: './param.component.html',
  styleUrl: './param.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParamComponent {

  // ─── Serviços injetados ───────────────────────────────────────────────────
  // Cada serviço corresponde a uma tabela no banco. Os serviços ficam em core/
  // e não devem ser modificados aqui.
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly formService = inject(FormService);
  private readonly machineService = inject(MachineService);
  private readonly answerService = inject(AnswerService);
  private readonly answerMachineService = inject(AnswerMachineService);
  private readonly limitAnswerService = inject(LimitAnswerService);
  private readonly limitAnswerMachineService = inject(LimitAnswerMachineService);

  // ─── Estado local ─────────────────────────────────────────────────────────
  // signal() cria uma variável reativa: quando muda, o Angular re-renderiza
  // apenas os trechos do template que a utilizam.
  protected readonly query = signal('');                      // texto da busca
  protected readonly expandedFormId = signal<string | null>(null); // qual card está expandido

  // ─── Recursos (chamadas HTTP) ─────────────────────────────────────────────
  // rxResource faz a chamada HTTP e expõe .value(), .isLoading(), .error().
  // O pipe(catchError(...)) garante que, se a API retornar erro (ex: tabela
  // ainda sem dados), o recurso resolve como lista vazia em vez de travar.
  //
  // RECURSOS CRÍTICOS — se falharem, a hierarquia não monta e mostramos erro:
  protected readonly locationsResource = rxResource<PaginatedResult<Location>, void>({
    stream: () => this.locationService.getAll(100),
  });

  protected readonly sectionsResource = rxResource<PaginatedResult<Section>, void>({
    stream: () => this.sectionService.getAll(100),
  });

  protected readonly formsResource = rxResource<PaginatedResult<Form>, void>({
    stream: () => this.formService.getAll(100),
  });

  protected readonly machinesResource = rxResource<PaginatedResult<Machine>, void>({
    stream: () => this.machineService.getAll(),
  });

  // RECURSOS SECUNDÁRIOS — podem estar vazios (tabelas recém-criadas).
  // catchError devolve lista vazia para não bloquear a página.
  protected readonly answersResource = rxResource<PaginatedResult<Answer>, void>({
    stream: () => this.answerService.getAll(500).pipe(
      catchError(() => of(emptyPage<Answer>())),
    ),
  });

  protected readonly answerMachinesResource = rxResource<PaginatedResult<AnswerMachine>, void>({
    stream: () => this.answerMachineService.getAll(500).pipe(
      catchError(() => of(emptyPage<AnswerMachine>())),
    ),
  });

  protected readonly limitAnswersResource = rxResource<PaginatedResult<LimitAnswer>, void>({
    stream: () => this.limitAnswerService.getAll(500).pipe(
      catchError(() => of(emptyPage<LimitAnswer>())),
    ),
  });

  protected readonly limitAnswerMachinesResource = rxResource<PaginatedResult<LimitAnswerMachine>, void>({
    stream: () => this.limitAnswerMachineService.getAll(500).pipe(
      catchError(() => of(emptyPage<LimitAnswerMachine>())),
    ),
  });

  // ─── Arrays extraídos dos recursos ───────────────────────────────────────
  // computed() recalcula automaticamente sempre que o recurso muda.
  // O ?? [] garante array vazio enquanto está carregando.
  protected readonly locations = computed(() => this.locationsResource.value()?.data ?? []);
  protected readonly sections  = computed(() => this.sectionsResource.value()?.data ?? []);
  protected readonly forms     = computed(() => this.formsResource.value()?.data ?? []);
  protected readonly machines  = computed(() => this.machinesResource.value()?.data ?? []);
  protected readonly answers              = computed(() => this.answersResource.value()?.data ?? []);
  protected readonly answerMachines       = computed(() => this.answerMachinesResource.value()?.data ?? []);
  protected readonly limitAnswers         = computed(() => this.limitAnswersResource.value()?.data ?? []);
  protected readonly limitAnswerMachines  = computed(() => this.limitAnswerMachinesResource.value()?.data ?? []);

  // ─── Agrupamento hierárquico ──────────────────────────────────────────────
  // Monta a árvore de dados que o template percorre com @for.
  // A hierarquia é:
  //   Location (local da fábrica)
  //     └── Section (seção/departamento) — vinculada pelo employerId
  //           └── Form (formulário de inspeção) — vinculado pelo sectionId
  //                 ├── Answer[] (parâmetros do formulário) — vinculados pelo formId ── LimitAnswer[] (limites do formulário) — pelo formId
  //                 └── Machine[] (máquinas do formulário) — vinculadas pelo formId
  //                       ├── AnswerMachine[] (parâmetros da máquina) — pelo machineId ── LimitAnswerMachine[] (limites da máquina) — pelo machineId
  //                       
  //                       
  protected readonly grouped = computed((): LocationGroup[] => {
    const locations        = this.locations();
    const sections         = this.sections();
    const forms            = this.forms();
    const machines         = this.machines();
    const answers          = this.answers();
    const answerMachines   = this.answerMachines();
    const limitAnswers     = this.limitAnswers();
    const limitAnswerMachines = this.limitAnswerMachines();
    const term = this.query().trim().toLowerCase();

    return locations.map((location) => {
      // Filtra seções que pertencem a este local (pelo employerId)
      const locationSections = sections.filter((s) => s.employerId === location.employerId);

      const sectionGroups: SectionGroup[] = locationSections.map((section) => {
        // Filtra formulários desta seção
        const sectionForms = forms.filter((f) => f.sectionId === section.id);

        const formGroups: FormGroup[] = sectionForms.map((form) => {
          // Parâmetros diretos do formulário (sem máquina)
          const formAnswers = answers.filter((a) => a.formId === form.id);

          // Máquinas vinculadas a este formulário
          const formMachines = machines.filter((m) => m.formId === form.id);

          // Para cada máquina, agrega seus parâmetros e limites
          const machineGroups: MachineGroup[] = formMachines.map((machine) => ({
            machine,
            answerMachines:      answerMachines.filter((a) => a.machineId === machine.id),
            limitAnswers:        limitAnswers.filter((a) => a.machineId === machine.id),
            limitAnswerMachines: limitAnswerMachines.filter((a) => a.machineId === machine.id),
          }));

          return { form, answers: formAnswers, machines: machineGroups };
        });

        // Filtra os cards pelo texto da busca (se houver)
        const filteredForms = !term
          ? formGroups
          : formGroups.filter(
              (fg) =>
                fg.form.nome.toLowerCase().includes(term) ||
                fg.answers.some((a) => a.nome.toLowerCase().includes(term)) ||
                fg.machines.some(
                  (mg) =>
                    mg.machine.nome.toLowerCase().includes(term) ||
                    mg.answerMachines.some((a) => a.nome.toLowerCase().includes(term)) ||
                    mg.limitAnswers.some((a) => a.nome.toLowerCase().includes(term)) ||
                    mg.limitAnswerMachines.some((a) => a.nome.toLowerCase().includes(term)),
                ),
            );

        return { section, forms: filteredForms };
      });

      return { location, sections: sectionGroups };
    });
  });

  // ─── Estados de loading e erro ────────────────────────────────────────────
  // loading: verdadeiro enquanto qualquer recurso ainda está buscando dados.
  // hasError: verdadeiro SOMENTE se os recursos críticos (hierarquia base)
  //           falharem. Recursos secundários usam catchError e nunca chegam aqui.
  protected readonly loading = computed(
    () =>
      this.locationsResource.isLoading() ||
      this.sectionsResource.isLoading()  ||
      this.formsResource.isLoading()     ||
      this.machinesResource.isLoading()  ||
      this.answersResource.isLoading()   ||
      this.answerMachinesResource.isLoading() ||
      this.limitAnswersResource.isLoading()   ||
      this.limitAnswerMachinesResource.isLoading(),
  );

  protected readonly hasError = computed(
    () =>
      // Apenas os recursos críticos bloqueiam a tela com mensagem de erro
      !!this.locationsResource.error() ||
      !!this.sectionsResource.error()  ||
      !!this.formsResource.error()     ||
      !!this.machinesResource.error(),
  );

  // ─── Ações do template ────────────────────────────────────────────────────

  protected onSearch(value: string): void {
    this.query.set(value);
  }

  // Abre/fecha o painel de detalhes de um formulário ao clicar no card
  protected toggleForm(id: string): void {
    this.expandedFormId.update((current) => (current === id ? null : id));
  }

  // Recarrega todos os recursos (botão de refresh no header)
  protected reload(): void {
    this.locationsResource.reload();
    this.sectionsResource.reload();
    this.formsResource.reload();
    this.machinesResource.reload();
    this.answersResource.reload();
    this.answerMachinesResource.reload();
    this.limitAnswersResource.reload();
    this.limitAnswerMachinesResource.reload();
  }

  protected statusLabel(status: number): string {
    return status === 1 ? 'Ativo' : 'Inativo';
  }

  // Conta o total de parâmetros de um formulário (para exibir no card)
  protected totalFormParams(fg: FormGroup): number {
    return (
      fg.answers.length +
      fg.machines.reduce(
        (acc, mg) =>
          acc + mg.answerMachines.length + mg.limitAnswers.length + mg.limitAnswerMachines.length,
        0,
      )
    );
  }
}

// ─── Interfaces de agrupamento (usadas apenas neste componente) ─────────────
// Não são modelos de API — são estruturas internas que o computed() monta
// para facilitar a renderização hierárquica no template.

interface MachineGroup {
  machine: Machine;
  answerMachines: AnswerMachine[];       // parâmetros específicos desta máquina
  limitAnswers: LimitAnswer[];           // limites vinculados a esta máquina
  limitAnswerMachines: LimitAnswerMachine[]; // limites de máquina
}

interface FormGroup {
  form: Form;
  answers: Answer[];       // parâmetros gerais do formulário (sem máquina)
  machines: MachineGroup[];
}

interface SectionGroup {
  section: Section;
  forms: FormGroup[];
}

interface LocationGroup {
  location: Location;
  sections: SectionGroup[];
}
