import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Location } from '../../../../../core/models/location.model';
import { Section } from '../../../../../core/models/section.model';
import { Form } from '../../../../../core/models/form.model';
import { FormTime } from '../../../../../core/models/form-time.model';
import { FormGroups } from '../../../../../core/models/form-group.model';
import { FormGroupItems } from '../../../../../core/models/form-group-items.model';
import { LocationService } from '../../../../../core/services/location.service';
import { SectionService } from '../../../../../core/services/section.service';
import { FormService } from '../../../../../core/services/form.service';
import { FormTimeService } from '../../../../../core/services/form-time.service';
import { FormGroupsService } from '../../../../../core/services/form-group.service';
import { FormGroupItemsService } from '../../../../../core/services/form-groups-items.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { forkJoin } from 'rxjs';
import { FormularioFormComponent } from './modals/form/form.component';
import { FormTimeComponent } from './modals/form-time/form-time.component';
import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';
import { BreakFormComponent } from '../../../../../core/components/break-form/break-form.component';

type Step = 'location' | 'section' | 'form' | 'break' | 'time';

interface Filters {
  nome: string;
  descricao: string;
  locationId: string;
  status: 'all' | 'active' | 'inactive';
  criadoDe: string;
  criadoAte: string;
  alteradoDe: string;
  alteradoAte: string;
}

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent, BreakFormComponent, FormTimeComponent],
  templateUrl: './form.component.html',
  styleUrl: './form.component.css',
})
export class FormComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly formService = inject(FormService);
  private readonly formTimeService = inject(FormTimeService);
  private readonly formGroupsService = inject(FormGroupsService);
  private readonly formGroupItemsService = inject(FormGroupItemsService);
  private readonly modalService = inject(ModalService);
  private readonly auth = inject(AuthService);

  // ───────── navegação ─────────
  readonly step = signal<Step>('location');

  // ───────── coleções / seleção ─────────
  readonly locations = signal<Location[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly selectedLocation = signal<Location | null>(null);
  readonly selectedSection = signal<Section | null>(null);
  /** formulário cujas paradas OU tempo serão geridos. */
  readonly selectedForm = signal<Form | null>(null);

  /** formId → FormTime existente (só para o indicador de "tempo configurado" no card). */
  readonly formTimeByFormId = signal<Record<string, FormTime>>({});

  // ───────── grupos de formulários ─────────
  readonly formGroups = signal<FormGroups[]>([]);
  readonly groupItems = signal<FormGroupItems[]>([]); // vínculos formulário↔grupo da seção
  readonly activeGroup = signal<string>(''); // '' = todos | 'none' = sem grupo | id do grupo
  readonly newGroupOpen = signal(false);
  readonly newGroupNome = signal('');
  readonly reordering = signal(false);

  /** formId -> vínculo do grupo (1 grupo por formulário). */
  readonly groupItemByForm = computed(() => {
    const m = new Map<string, FormGroupItems>();
    for (const it of this.groupItems()) {
      if (!m.has(it.formId)) m.set(it.formId, it);
    }
    return m;
  });

  /**
   * Vínculos do grupo ATIVO ordenados por `ordem` (base da reordenação).
   * Vazio quando não há um grupo específico selecionado.
   */
  readonly activeGroupOrder = computed<FormGroupItems[]>(() => {
    const ag = this.activeGroup();
    if (!ag || ag === 'none') return [];
    return this.groupItems()
      .filter((i) => i.formGroupId === ag)
      .sort((a, b) => a.ordem - b.ordem);
  });

  /** É possível reordenar? (um grupo específico está ativo). */
  readonly canReorder = computed(() => {
    const ag = this.activeGroup();
    return !!ag && ag !== 'none';
  });

  /** Formulários visíveis = filtrados + recorte pelo grupo ativo. */
  readonly displayedForms = computed(() => {
    const ag = this.activeGroup();
    const map = this.groupItemByForm();
    const base = this.filteredForms().filter((fm) => {
      if (ag === '') return true;
      const gid = map.get(fm.id)?.formGroupId ?? '';
      return ag === 'none' ? gid === '' : gid === ag;
    });

    // Num grupo específico, respeita a ordem definida (campo `ordem`).
    if (ag && ag !== 'none') {
      base.sort((a, b) => (map.get(a.id)?.ordem ?? 0) - (map.get(b.id)?.ordem ?? 0));
    }
    return base;
  });

  /** Id do grupo de um formulário (ou '' quando sem grupo). */
  groupIdOf(formId: string): string {
    return this.groupItemByForm().get(formId)?.formGroupId ?? '';
  }

  /** Quantidade de formulários num grupo. */
  countInGroup(groupId: string): number {
    return this.groupItems().filter((i) => i.formGroupId === groupId).length;
  }

  private nextOrdem(groupId: string): number {
    return this.countInGroup(groupId);
  }

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

  // ───────── feedback ─────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // ───────── filtros ─────────
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = {
    nome: '',
    descricao: '',
    locationId: '',
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
    for (const [k, v] of Object.entries(f)) if (k !== 'status' && v !== '') n++;
    return n;
  });
  readonly hasFilter = computed(() => this.activeFilterCount() > 0);

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
        this.statusMatch(fm.status, f.status) &&
        this.dateInRange(fm.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(fm.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  readonly locationOptions = computed(() =>
    [...this.permittedLocations()]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((l) => ({ value: l.id, label: l.nome })),
  );

  // ───────── títulos ─────────
  private readonly titles: Record<Step, string> = {
    location: 'Locais',
    section: 'Seções',
    form: 'Formulários',
    break: 'Paradas',
    time: 'Tempo',
  };
  private readonly descriptions: Record<Step, string> = {
    location: 'Selecione um local para gerenciar seus formularios.',
    section: 'Selecione uma seção para gerenciar seus formularios.',
    form: 'Gerencie os formulários desta seção.',
    break: 'Gerencie as paradas deste formulário.',
    time: 'Configure o tempo deste formulário.',
  };
  readonly pageTitle = computed(() => this.titles[this.step()]);
  readonly pageDescription = computed(() => this.descriptions[this.step()]);

  // ============================================================
  //  CARREGAMENTO
  // ============================================================

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

    const employerId = location.employerId;
    this.sectionService.getAll(1000, 1).subscribe({
      next: (res) => {
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
        this.loadFormTimes();
      },
      error: () => this.fail('Não foi possível carregar os formulários.'),
    });
  }

  /** Atualiza o mapa formId → FormTime (indicador de "tempo configurado"). */
  private loadFormTimes(): void {
    this.formTimeService.getAll(1000, 1).subscribe({
      next: (res) => {
        const map: Record<string, FormTime> = {};
        for (const ft of this.unwrap<FormTime>(res)) {
          if (ft.formId) map[ft.formId] = ft;
        }
        this.formTimeByFormId.set(map);
      },
      error: () => {
        /* indicador é opcional — silencioso */
      },
    });
  }

  /** Grupos da seção selecionada. */
  private loadGroups(): void {
    const sectionId = this.selectedSection()?.id;
    this.formGroupsService.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<FormGroups>(res);
        this.formGroups.set(all.filter((g) => g.sectionId === sectionId));
        this.loadGroupItems();
      },
      error: () => this.error.set('Não foi possível carregar os grupos.'),
    });
  }

  /** Vínculos formulário↔grupo restritos aos grupos desta seção. */
  private loadGroupItems(): void {
    const groupIds = new Set(this.formGroups().map((g) => g.id));
    this.formGroupItemsService.getAll(2000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<FormGroupItems>(res);
        this.groupItems.set(all.filter((it) => groupIds.has(it.formGroupId)));
      },
      error: () => this.groupItems.set([]),
    });
  }

  // ============================================================
  //  NAVEGAÇÃO
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
    this.loadGroups();
  }

  /** Abre a gestão de paradas do formulário. */
  openBreaks(form: Form): void {
    if (!this.isLocationAllowed(this.selectedLocation())) {
      this.error.set('Você não tem acesso a este local.');
      return;
    }
    this.clearFeedback();
    this.selectedForm.set(form);
    this.step.set('break');
  }

  /** Abre a configuração de tempo do formulário (etapa inline, como as paradas). */
  openTime(form: Form): void {
    if (!this.isLocationAllowed(this.selectedLocation())) {
      this.error.set('Você não tem acesso a este local.');
      return;
    }
    this.clearFeedback();
    this.selectedForm.set(form);
    this.step.set('time');
  }

  ngOnInit(): void {
    this.loadLocations();
  }

  back(): void {
    this.clearFeedback();
    if (this.step() === 'break' || this.step() === 'time') this.goToForms();
    else if (this.step() === 'form') this.goToSections();
    else if (this.step() === 'section') this.goToLocations();
  }

  goToLocations(): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedLocation.set(null);
    this.selectedSection.set(null);
    this.selectedForm.set(null);
    this.sections.set([]);
    this.forms.set([]);
    this.clearGroups();
    this.step.set('location');
  }

  goToSections(): void {
    if (!this.selectedLocation()) return;
    this.clearFeedback();
    this.resetFilters();
    this.selectedSection.set(null);
    this.selectedForm.set(null);
    this.forms.set([]);
    this.clearGroups();
    this.step.set('section');
  }

  goToForms(): void {
    if (!this.selectedSection()) return;
    this.clearFeedback();
    this.resetFilters();
    this.selectedForm.set(null);
    this.step.set('form');
    // ao voltar de "tempo"/"paradas", reflete alterações no indicador do card
    this.loadFormTimes();
  }

  // ============================================================
  //  CRUD — FORMULÁRIOS (sectionId travado pela seção)
  // ============================================================

  async novoForm(): Promise<void> {
    this.clearFeedback();
    // Só cria se o local atual for permitido.
    if (!this.isLocationAllowed(this.selectedLocation())) {
      this.error.set('Você não tem acesso a este local.');
      return;
    }
    const sec = this.selectedSection();
    if (!sec) return;
    const ref = this.modalService.openComponent(FormularioFormComponent, {
      title: 'Novo Formulário',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new', sections: [sec], lockedSectionId: sec.id },
      buttons: this.crudButtons('Criar'),
    });
    if (!(await ref.result)) return;
    const v = ref.instance.value();
    this.formService
      .create({ sectionId: sec.id, nome: v.nome, descricao: v.descricao, status: v.status })
      .subscribe({
        next: () => this.done('Formulário criado.', () => this.loadForms()),
        error: () => this.error.set('Erro ao criar o formulário.'),
      });
  }

  async editarForm(item: Form): Promise<void> {
    this.clearFeedback();
    // Só edita se o local atual for permitido.
    if (!this.isLocationAllowed(this.selectedLocation())) {
      this.error.set('Você não tem acesso a este local.');
      return;
    }
    const sec = this.selectedSection();
    const ref = this.modalService.openComponent(FormularioFormComponent, {
      title: `Editar: ${item.nome}`,
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'edit', item, sections: sec ? [sec] : [] },
      buttons: this.crudButtons('Salvar'),
    });
    if (!(await ref.result)) return;
    const v = ref.instance.value();
    this.formService
      .update(item.id, {
        sectionId: item.sectionId,
        nome: v.nome,
        descricao: v.descricao,
        status: v.status,
      })
      .subscribe({
        next: () => this.done('Formulário atualizado.', () => this.loadForms()),
        error: () => this.error.set('Erro ao atualizar o formulário.'),
      });
  }

  async excluirForm(item: Form): Promise<void> {
    // Só exclui se o local atual for permitido.
    if (!this.isLocationAllowed(this.selectedLocation())) {
      this.error.set('Você não tem acesso a este local.');
      return;
    }
    if (!(await this.confirmDelete(item.nome))) return;
    this.formService.delete(item.id).subscribe({
      next: () => this.done('Formulário excluído.', () => this.loadForms()),
      error: () => this.error.set('Erro ao excluir o formulário.'),
    });
  }

  // ============================================================
  //  GRUPOS DE FORMULÁRIOS
  // ============================================================

  toggleNewGroup(): void {
    this.newGroupOpen.update((v) => !v);
    this.newGroupNome.set('');
  }

  /** Cria um grupo vinculado à seção atual. */
  criarGrupo(): void {
    const nome = this.newGroupNome().trim();
    const sectionId = this.selectedSection()?.id;
    if (!nome || !sectionId) return;

    this.formGroupsService.create({ sectionId, nome, status: 1 }).subscribe({
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
    this.formGroupsService.delete(groupId).subscribe({
      next: () => {
        if (this.activeGroup() === groupId) this.activeGroup.set('');
        this.success.set('Grupo removido.');
        this.loadGroups();
      },
      error: () => this.error.set('Erro ao remover o grupo.'),
    });
  }

  /**
   * Relaciona/realoca um formulário a um grupo (ou remove o vínculo).
   * Como a chave do vínculo é (formGroupId, formId), trocar de grupo
   * significa apagar o vínculo antigo e criar um novo.
   */
  setFormGroup(form: Form, groupId: string): void {
    const current = this.groupItemByForm().get(form.id) ?? null;
    const target = groupId || '';
    const curGroup = current?.formGroupId ?? '';
    if (curGroup === target) return;

    const reload = () => this.loadGroupItems();
    const createLink = () =>
      this.formGroupItemsService
        .create({ formGroupId: target, formId: form.id, ordem: this.nextOrdem(target) })
        .subscribe({ next: reload, error: () => this.error.set('Erro ao relacionar ao grupo.') });

    if (!target) {
      // "Sem grupo" → remove o vínculo existente
      if (current) {
        this.formGroupItemsService
          .delete(current.formGroupId, form.id)
          .subscribe({ next: reload, error: () => this.error.set('Erro ao remover do grupo.') });
      }
      return;
    }

    if (current) {
      this.formGroupItemsService
        .delete(current.formGroupId, form.id)
        .subscribe({ next: createLink, error: createLink });
    } else {
      createLink();
    }
  }

  // ============================================================
  //  ORDEM DOS FORMULÁRIOS NO GRUPO
  // ============================================================

  /** É o primeiro item na ordem do grupo ativo? */
  isFirstNoGrupo(formId: string): boolean {
    const o = this.activeGroupOrder();
    return o.length > 0 && o[0].formId === formId;
  }

  /** É o último item na ordem do grupo ativo? */
  isLastNoGrupo(formId: string): boolean {
    const o = this.activeGroupOrder();
    return o.length > 0 && o[o.length - 1].formId === formId;
  }

  moverCima(form: Form): void {
    this.moverItem(form, -1);
  }

  moverBaixo(form: Form): void {
    this.moverItem(form, 1);
  }

  /**
   * Move um formulário na ordem do grupo ativo e persiste.
   * Reindexa `ordem` sequencialmente (0..n-1); só envia ao backend os
   * vínculos cujo `ordem` mudou. Aplica a mudança localmente de forma
   * otimista e reverte em caso de erro.
   */
  private moverItem(form: Form, dir: -1 | 1): void {
    if (this.reordering()) return;

    const ag = this.activeGroup();
    if (!ag || ag === 'none') return;

    const ordered = this.activeGroupOrder();
    const idx = ordered.findIndex((i) => i.formId === form.id);
    const alvo = idx + dir;
    if (idx < 0 || alvo < 0 || alvo >= ordered.length) return;

    // move no array e reindexa por posição
    const arr = ordered.slice();
    [arr[idx], arr[alvo]] = [arr[alvo], arr[idx]];

    const updates = arr
      .map((item, pos) => ({ item, ordem: pos }))
      .filter((u) => u.item.ordem !== u.ordem);
    if (!updates.length) return;

    // atualização otimista local
    this.clearFeedback();
    this.groupItems.update((list) =>
      list.map((it) => {
        const u = updates.find(
          (x) => x.item.formGroupId === it.formGroupId && x.item.formId === it.formId,
        );
        return u ? { ...it, ordem: u.ordem } : it;
      }),
    );

    // persiste apenas os que mudaram
    this.reordering.set(true);
    forkJoin(
      updates.map((u) =>
        this.formGroupItemsService.update(ag, u.item.formId, {
          formGroupId: ag,
          formId: u.item.formId,
          ordem: u.ordem,
        }),
      ),
    ).subscribe({
      next: () => this.reordering.set(false),
      error: () => {
        this.reordering.set(false);
        this.error.set('Erro ao reordenar. Recarregando a ordem…');
        this.loadGroupItems(); // reverte para o estado do servidor
      },
    });
  }

  // ============================================================
  //  HELPERS
  // ============================================================

  private crudButtons(confirmText: string) {
    return [
      { text: 'Cancelar', variant: 'secondary', value: false },
      { text: confirmText, variant: 'primary', value: true, submit: true },
    ];
  }

  private async confirmDelete(nome: string): Promise<boolean> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Confirmar exclusão',
      body: `Deseja realmente excluir "${nome}"?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Excluir', variant: 'danger', value: true },
      ],
    });
    return !!(await ref.result);
  }

  private done(msg: string, reload: () => void): void {
    this.success.set(msg);
    reload();
  }

  isAtivo(status: number): boolean {
    return status === 1;
  }
  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
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
  /** Zera o estado dos grupos (ao sair da seção atual). */
  private clearGroups(): void {
    this.formGroups.set([]);
    this.groupItems.set([]);
    this.activeGroup.set('');
    this.newGroupOpen.set(false);
    this.newGroupNome.set('');
  }
}
