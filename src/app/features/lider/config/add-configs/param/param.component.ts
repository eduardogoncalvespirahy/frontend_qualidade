import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Location } from '../../../../../core/models/location.model';
import { Section } from '../../../../../core/models/section.model';
import { Form } from '../../../../../core/models/form.model';
import { Answer } from '../../../../../core/models/answer.model';
import { AnswerGroups } from '../../../../../core/models/answer-group.model';
import { AnswerGroupItems } from '../../../../../core/models/answer-group-items.model';

import { LocationService } from '../../../../../core/services/location.service';
import { SectionService } from '../../../../../core/services/section.service';
import { FormService } from '../../../../../core/services/form.service';
import { AnswerService } from '../../../../../core/services/answer.service';
import { LimitAnswerService } from '../../../../../core/services/limit-answer.service';
import { AnswerGroupsService } from '../../../../../core/services/answer-group.service';
import { AnswerGroupItemsService } from '../../../../../core/services/answer-groups-items.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { AuthService } from '../../../../../core/services/auth.service';

import { DetailComponent, ParamItem, ParamType } from './modals/detail/detail.component';
import { FormComponent } from './modals/form/form.component';
import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';

type Step = 'location' | 'section' | 'form' | 'parameters';

/** Campos filtráveis derivados das interfaces (sem o id). */
interface Filters {
  nome: string;
  descricao: string;
  locationId: string; // filtro de Local (nível de locais)
  sectionId: string; // Form
  status: 'all' | 'active' | 'inactive';
  criadoDe: string; // yyyy-mm-dd
  criadoAte: string;
  alteradoDe: string;
  alteradoAte: string;
}

@Component({
  selector: 'app-param',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  templateUrl: './param.component.html',
  styleUrl: './param.component.css',
})
export class ParamComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly formService = inject(FormService);
  private readonly answerService = inject(AnswerService);
  private readonly limitAnswerService = inject(LimitAnswerService);
  private readonly answerGroupsService = inject(AnswerGroupsService);
  private readonly answerGroupItemsService = inject(AnswerGroupItemsService);
  private readonly modalService = inject(ModalService);
  private readonly auth = inject(AuthService);

  // ───────── navegação ─────────
  readonly step = signal<Step>('location');

  // ───────── coleções ─────────
  readonly locations = signal<Location[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly answers = signal<Answer[]>([]); // parâmetros do formulário selecionado

  // ───────── grupos de parâmetros ─────────
  readonly answerGroups = signal<AnswerGroups[]>([]);
  readonly groupItems = signal<AnswerGroupItems[]>([]); // vínculos param↔grupo do formulário
  readonly activeGroup = signal<string>(''); // '' = todos | 'none' = sem grupo | id do grupo
  readonly newGroupOpen = signal(false);
  readonly newGroupNome = signal('');

  // ───────── seleções ─────────
  readonly selectedLocation = signal<Location | null>(null);
  readonly selectedSection = signal<Section | null>(null);
  readonly selectedForm = signal<Form | null>(null);

  // ───────── permissões de local (credentialLocation) ─────────
  /** Nomes dos locais liberados para a credencial logada. */
  readonly allowedLocations = computed(() => this.auth.locations());

  /**
   * Um local é permitido para a credencial?
   * - Lista vazia = sem restrição (libera tudo, ex.: admin).
   * - Caso contrário, precisa constar em allowedLocations (por nome ou id).
   *   Troque `return true` por `return false` se vazio = nenhum acesso.
   */
  private isLocationAllowed(loc: Location | null | undefined): boolean {
    if (!loc) return false;
    const allowed = this.allowedLocations();
    if (allowed.length === 0) return true;
    return allowed.includes(loc.nome) || allowed.includes(loc.id);
  }

  /** Guarda de acesso para ações que mutam dados. */
  private guardLocation(): boolean {
    if (!this.isLocationAllowed(this.selectedLocation())) {
      this.error.set('Você não tem acesso a este local.');
      return false;
    }
    return true;
  }

  // ───────── feedback ─────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // ───────── filtros por campo ─────────
  readonly filtersOpen = signal(false);

  private readonly emptyFilters: Filters = {
    nome: '',
    descricao: '',
    locationId: '',
    sectionId: '',
    status: 'all',
    criadoDe: '',
    criadoAte: '',
    alteradoDe: '',
    alteradoAte: '',
  };

  readonly filters = signal<Filters>({ ...this.emptyFilters });

  updateFilter<K extends keyof Filters>(key: K, value: Filters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }

  readonly activeFilterCount = computed(() => {
    const f = this.filters();
    let n = f.status !== 'all' ? 1 : 0;
    for (const [k, v] of Object.entries(f)) {
      if (k !== 'status' && v !== '') n++;
    }
    return n;
  });

  readonly hasFilter = computed(() => this.activeFilterCount() > 0);

  // ── helpers de comparação ──
  private textMatch(value: string | null | undefined, term: string): boolean {
    if (!term.trim()) return true;
    return (value ?? '').toLowerCase().includes(term.trim().toLowerCase());
  }

  private statusMatch(status: number, f: Filters['status']): boolean {
    if (f === 'all') return true;
    return f === 'active' ? status === 1 : status !== 1;
  }

  private dateInRange(date: Date | string | null | undefined, from: string, to: string): boolean {
    if (!from && !to) return true;
    if (!date) return false;
    const d = new Date(date).getTime();
    if (from && d < new Date(from).getTime()) return false;
    if (to && d > new Date(`${to}T23:59:59`).getTime()) return false;
    return true;
  }

  /** Só os locais permitidos pela credencial (base para lista e opções de filtro). */
  private readonly permittedLocations = computed(() =>
    this.locations().filter((l) => this.isLocationAllowed(l)),
  );

  readonly filteredLocations = computed(() => {
    const f = this.filters();
    return this.permittedLocations().filter(
      (l) =>
        this.textMatch(l.nome, f.nome) &&
        this.textMatch(l.descricao, f.descricao) &&
        (!f.locationId || l.id === f.locationId) &&
        this.statusMatch(l.status, f.status),
    );
  });

  readonly filteredSections = computed(() => {
    const f = this.filters();
    return this.sections().filter(
      (s) =>
        this.textMatch(s.nome, f.nome) &&
        this.textMatch(s.descricao, f.descricao) &&
        this.statusMatch(s.status, f.status) &&
        this.dateInRange(s.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(s.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  readonly filteredForms = computed(() => {
    const f = this.filters();
    return this.forms().filter(
      (fm) =>
        this.textMatch(fm.nome, f.nome) &&
        this.textMatch(fm.descricao, f.descricao) &&
        this.textMatch(fm.sectionId, f.sectionId) &&
        this.statusMatch(fm.status, f.status) &&
        this.dateInRange(fm.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(fm.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  readonly filteredAnswers = computed(() => {
    const f = this.filters();
    return this.answers().filter(
      (a) =>
        this.textMatch(a.nome, f.nome) &&
        this.textMatch(a.descricao, f.descricao) &&
        this.statusMatch(a.status, f.status) &&
        this.dateInRange(a.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(a.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  /** answerId -> vínculo de grupo (1 grupo por parâmetro). */
  readonly groupItemByAnswer = computed(() => {
    const m = new Map<string, AnswerGroupItems>();
    for (const it of this.groupItems()) {
      if (!m.has(it.answerId)) m.set(it.answerId, it);
    }
    return m;
  });

  /** Parâmetros visíveis = filtrados + recorte pelo grupo ativo. */
  readonly displayedAnswers = computed(() => {
    const ag = this.activeGroup();
    const map = this.groupItemByAnswer();
    return this.filteredAnswers().filter((a) => {
      if (ag === '') return true;
      const gid = map.get(a.id)?.answerGroupId ?? '';
      return ag === 'none' ? gid === '' : gid === ag;
    });
  });

  /** Id do grupo de um parâmetro (ou '' quando sem grupo). */
  groupIdOf(answerId: string): string {
    return this.groupItemByAnswer().get(answerId)?.answerGroupId ?? '';
  }

  /** Quantidade de parâmetros num grupo. */
  countInGroup(groupId: string): number {
    return this.groupItems().filter((i) => i.answerGroupId === groupId).length;
  }

  private nextOrdem(groupId: string): number {
    return this.countInGroup(groupId);
  }

  // ── opções de IDs (selects de filtro) ──
  private distinct(values: (string | null | undefined)[]): string[] {
    return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
  }

  readonly locationOptions = computed(() =>
    [...this.permittedLocations()]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((l) => ({ value: l.id, label: l.nome })),
  );

  readonly sectionIdOptions = computed<{ value: string; label: string }[]>(() => {
    const byId = new Map(this.sections().map((s) => [s.id, s.nome]));
    return this.distinct(this.forms().map((f) => f.sectionId)).map((id) => ({
      value: id,
      label: byId.get(id) ?? id,
    }));
  });

  // ───────── títulos dinâmicos ─────────
  private readonly titles: Record<Step, string> = {
    location: 'Locais',
    section: 'Seções',
    form: 'Formulários',
    parameters: 'Parâmetros',
  };
  private readonly descriptions: Record<Step, string> = {
    location: 'Selecione um local para gerenciar seus parâmetros e limites.',
    section: 'Selecione uma seção para gerenciar seus parâmetros e limites.',
    form: 'Selecione um formulário para gerenciar seus parâmetros e limites.',
    parameters: 'Gerencie os parâmetros e limites deste formulário.',
  };

  readonly pageTitle = computed(() => this.titles[this.step()]);
  readonly pageDescription = computed(() => this.descriptions[this.step()]);

  ngOnInit(): void {
    this.loadLocations();
  }

  // ============================================================
  //  CARREGAMENTO
  // ============================================================

  /** O backend devolve PaginatedResult<T>. Ajuste a propriedade se necessário. */
  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r?.['data'] ?? r?.['items'] ?? r?.['results'] ?? []) as T[];
  }

  private loadLocations(): void {
    this.startLoading();
    this.locationService.getAll(1000, 1).subscribe({
      next: (res) => {
        this.locations.set(this.unwrap<Location>(res));
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar os locais.'),
    });
  }

  private loadSections(): void {
    this.startLoading();
    const location = this.selectedLocation();

    // Blindagem: sem local permitido → não carrega seções.
    if (!location || !this.isLocationAllowed(location)) {
      this.sections.set([]);
      this.loading.set(false);
      return;
    }

    this.sectionService.getAll(1000, 1).subscribe({
      next: (res) => {
        const employerId = location.employerId;
        const all = this.unwrap<Section>(res);
        this.sections.set(employerId ? all.filter((s) => s.employerId === employerId) : all);
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar as seções.'),
    });
  }

  private loadForms(): void {
    this.startLoading();
    const sectionId = this.selectedSection()?.id;
    this.formService.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<Form>(res);
        this.forms.set(all.filter((f) => f.sectionId === sectionId));
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar os formulários.'),
    });
  }

  private loadAnswers(): void {
    this.startLoading();
    const formId = this.selectedForm()?.id;
    this.answerService.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<Answer>(res);
        this.answers.set(all.filter((a) => a.formId === formId));
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar os parâmetros.'),
    });
  }

  /** Grupos do formulário selecionado. */
  private loadGroups(): void {
    const formId = this.selectedForm()?.id;
    this.answerGroupsService.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<AnswerGroups>(res);
        this.answerGroups.set(all.filter((g) => g.formId === formId));
        this.loadGroupItems();
      },
      error: () => this.error.set('Não foi possível carregar os grupos.'),
    });
  }

  /** Vínculos param↔grupo restritos aos grupos deste formulário. */
  private loadGroupItems(): void {
    const groupIds = new Set(this.answerGroups().map((g) => g.id));
    this.answerGroupItemsService.getAll(2000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<AnswerGroupItems>(res);
        this.groupItems.set(all.filter((it) => groupIds.has(it.answerGroupId)));
      },
      error: () => this.groupItems.set([]),
    });
  }

  // ============================================================
  //  AVANÇAR
  // ============================================================

  selectLocation(loc: Location): void {
    // Blindagem: não permite abrir um local sem permissão.
    if (!this.isLocationAllowed(loc)) {
      this.error.set('Você não tem acesso a este local.');
      return;
    }
    this.clearFeedback();
    this.resetFilters();
    this.selectedLocation.set(loc);
    this.step.set('section');
    this.loadSections();
  }

  selectSection(sec: Section): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedSection.set(sec);
    this.step.set('form');
    this.loadForms();
  }

  selectForm(form: Form): void {
    this.clearFeedback();
    this.resetFilters();
    this.activeGroup.set('');
    this.selectedForm.set(form);
    this.step.set('parameters');
    this.loadAnswers();
    this.loadGroups();
  }

  // ============================================================
  //  RETROCEDER / NAVEGAR PELA TRILHA
  // ============================================================

  back(): void {
    this.clearFeedback();
    switch (this.step()) {
      case 'parameters':
        this.goToForms();
        break;
      case 'form':
        this.goToSections();
        break;
      case 'section':
        this.goToLocations();
        break;
    }
  }

  goToLocations(): void {
    this.clearFeedback();
    this.resetFilters();
    this.clearGroups();
    this.selectedLocation.set(null);
    this.selectedSection.set(null);
    this.selectedForm.set(null);
    this.sections.set([]);
    this.forms.set([]);
    this.answers.set([]);
    this.step.set('location');
  }

  goToSections(): void {
    if (!this.selectedLocation()) return;
    this.clearFeedback();
    this.resetFilters();
    this.clearGroups();
    this.selectedSection.set(null);
    this.selectedForm.set(null);
    this.forms.set([]);
    this.answers.set([]);
    this.step.set('section');
  }

  goToForms(): void {
    if (!this.selectedSection()) return;
    this.clearFeedback();
    this.resetFilters();
    this.clearGroups();
    this.selectedForm.set(null);
    this.answers.set([]);
    this.step.set('form');
  }

  // ============================================================
  //  MODAIS
  // ============================================================

  async detalhar(answer: Answer): Promise<void> {
    if (!this.guardLocation()) return;

    const ref = this.modalService.openComponent(DetailComponent, {
      title: answer.nome ?? '',
      size: 'lg',
      inputs: {
        item: answer as ParamItem,
        paramType: 'answer' as ParamType,
        formNome: this.selectedForm()?.nome ?? '',
        sectionNome: this.selectedSection()?.nome ?? '',
        locationNome: this.selectedLocation()?.nome ?? '',
        groups: this.answerGroups(),
        currentGroupId: this.groupIdOf(answer.id),
      },
      outputs: {
        reload_return: (value: unknown) => {
          if (value) {
            ref.close();
            this.loadAnswers();
            this.loadGroupItems();
          }
        },
      },
      buttons: [{ text: 'Fechar', variant: 'secondary', value: true }],
    });

    await ref.result;
  }

  async novo(): Promise<void> {
    if (!this.guardLocation()) return;

    const formId = this.selectedForm()?.id;
    if (!formId) return;

    // pré-seleciona o grupo ativo (se houver) dentro do modal
    const preGroup = this.activeGroup() && this.activeGroup() !== 'none' ? this.activeGroup() : '';

    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Novo Parâmetro',
      size: 'lg',
      backdrop: 'static',
      inputs: {
        mode: 'new',
        parentId: formId,
        groups: this.answerGroups(),
        currentGroupId: preGroup,
      },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Criar', variant: 'primary', value: true, submit: true },
      ],
    });

    const confirmed = await ref.result;
    if (!confirmed) return;

    const value = ref.instance.value();
    const grupo = ref.instance.groupSelection();

    this.answerService
      .create({
        formId: value.formId,
        nome: value.nome,
        descricao: value.descricao,
        status: value.status,
        categoryId: value.categoryId,
      })
      .subscribe({
        next: (created) => {
          const limit = ref.instance.limitValue();
          const proceed = () => this.linkGroupAfterCreate(created.id, grupo);
          if (limit) {
            this.limitAnswerService
              .create({
                answerId: created.id,
                limitMin: limit.limitMin,
                limitMax: limit.limitMax,
              })
              .subscribe({
                next: proceed,
                error: () => {
                  this.error.set('Parâmetro criado, mas falhou ao salvar o limite.');
                  this.loadAnswers();
                },
              });
          } else {
            proceed();
          }
        },
        error: () => this.error.set('Erro ao criar o parâmetro.'),
      });
  }

  /** Vincula o parâmetro recém-criado ao grupo escolhido no modal,
   *  criando o grupo antes se o usuário optou por um novo. */
  private linkGroupAfterCreate(
    answerId: string,
    grupo: { groupId: string; novoNome: string | null },
  ): void {
    const done = () => {
      this.success.set('Parâmetro criado com sucesso.');
      this.loadAnswers();
      this.loadGroups();
    };

    if (grupo.novoNome) {
      const formId = this.selectedForm()?.id;
      if (!formId) return done();
      this.answerGroupsService.create({ formId, nome: grupo.novoNome, status: 1 }).subscribe({
        next: (g) => this.linkParam(g.id, answerId, done),
        error: () => {
          this.error.set('Parâmetro criado, mas falhou ao criar o grupo.');
          this.loadAnswers();
        },
      });
    } else if (grupo.groupId) {
      this.linkParam(grupo.groupId, answerId, done);
    } else {
      done();
    }
  }

  private linkParam(groupId: string, answerId: string, done: () => void): void {
    this.answerGroupItemsService
      .create({ answerGroupId: groupId, answerId, ordem: this.nextOrdem(groupId) })
      .subscribe({
        next: done,
        error: () => {
          this.error.set('Parâmetro criado, mas falhou ao vincular ao grupo.');
          this.loadAnswers();
        },
      });
  }

  // ============================================================
  //  GRUPOS DE PARÂMETROS
  // ============================================================

  toggleNewGroup(): void {
    this.newGroupOpen.update((v) => !v);
    this.newGroupNome.set('');
  }

  /** Cria um grupo vinculado ao formulário atual. */
  criarGrupo(): void {
    if (!this.guardLocation()) return;

    const nome = this.newGroupNome().trim();
    const formId = this.selectedForm()?.id;
    if (!nome || !formId) return;

    this.answerGroupsService.create({ formId, nome, status: 1 }).subscribe({
      next: () => {
        this.success.set('Grupo criado com sucesso.');
        this.newGroupOpen.set(false);
        this.newGroupNome.set('');
        this.loadGroups();
      },
      error: () => this.error.set('Erro ao criar o grupo.'),
    });
  }

  excluirGrupo(groupId: string): void {
    if (!this.guardLocation()) return;

    this.answerGroupsService.delete(groupId).subscribe({
      next: () => {
        if (this.activeGroup() === groupId) this.activeGroup.set('');
        this.success.set('Grupo removido.');
        this.loadGroups();
      },
      error: () => this.error.set('Erro ao remover o grupo.'),
    });
  }

  /**
   * Relaciona/realoca um parâmetro a um grupo (ou remove o vínculo).
   * Como a chave do vínculo é (answerGroupId, answerId), trocar de grupo
   * significa apagar o vínculo antigo e criar um novo.
   */
  setParamGroup(answer: Answer, groupId: string): void {
    if (!this.guardLocation()) return;

    const current = this.groupItemByAnswer().get(answer.id) ?? null;
    const target = groupId || '';
    const curGroup = current?.answerGroupId ?? '';
    if (curGroup === target) return;

    const reload = () => this.loadGroupItems();
    const createLink = () =>
      this.answerGroupItemsService
        .create({ answerGroupId: target, answerId: answer.id, ordem: this.nextOrdem(target) })
        .subscribe({ next: reload, error: () => this.error.set('Erro ao relacionar ao grupo.') });

    if (!target) {
      // "Sem grupo" → remove o vínculo existente
      if (current) {
        this.answerGroupItemsService
          .delete(current.answerGroupId, answer.id)
          .subscribe({ next: reload, error: () => this.error.set('Erro ao remover do grupo.') });
      }
      return;
    }

    if (current) {
      this.answerGroupItemsService
        .delete(current.answerGroupId, answer.id)
        .subscribe({ next: createLink, error: createLink });
    } else {
      createLink();
    }
  }

  private clearGroups(): void {
    this.answerGroups.set([]);
    this.groupItems.set([]);
    this.activeGroup.set('');
    this.newGroupOpen.set(false);
    this.newGroupNome.set('');
  }

  // ============================================================
  //  HELPERS
  // ============================================================

  isAtivo(status: number): boolean {
    return status === 1;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  private startLoading(): void {
    this.loading.set(true);
    this.error.set(null);
  }

  private fail(message: string): void {
    this.loading.set(false);
    this.error.set(message);
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }

  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
  }
}
