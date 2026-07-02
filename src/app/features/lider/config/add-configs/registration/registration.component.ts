import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { RoleService } from '../../../../../core/services/role.service';
import { UserService } from '../../../../../core/services/user.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { SystemService } from '../../../../../core/services/system.service';
import { EmployeeService } from '../../../../../core/services/employee.service';
import { LocationService } from '../../../../../core/services/location.service';
import { CredentialService } from '../../../../../core/services/credential.service';
import { CredentialRoleService } from '../../../../../core/services/credential-role.service';
import { CredentialLocationService } from '../../../../../core/services/credential-location.service';

import { User } from '../../../../../core/models/user.model';
import { Role } from '../../../../../core/models/role.model';
import { System } from '../../../../../core/models/system.model';
import { Employee } from '../../../../../core/models/employee.model';
import { Location } from '../../../../../core/models/location.model';
import { Credential } from '../../../../../core/models/credential.model';

import { FormComponent } from './modals/form/form.component';
import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';
import { CredentialFormComponent } from './modals/credential-form/credential-form.component';
import { CredentialRoleFormComponent } from './modals/credential-role-form/credential-role-form.component';
import { CredentialLocationFormComponent } from './modals/credential-location-form/credential-location-form.component';

type Step = 'user' | 'credential' | 'role' | 'location';

interface Filters {
  // usuário
  username: string;
  email: string;
  employeeId: string;
  // credencial
  systemId: string;
  // compartilhados
  status: 'all' | 'active' | 'inactive';
  criadoDe: string;
  criadoAte: string;
  alteradoDe: string;
  alteradoAte: string;
}

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.css',
})
export class RegistrationComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly credentialService = inject(CredentialService);
  private readonly credentialRoleService = inject(CredentialRoleService);
  private readonly credentialLocationService = inject(CredentialLocationService);
  private readonly roleService = inject(RoleService);
  private readonly systemService = inject(SystemService);
  private readonly employeeService = inject(EmployeeService);
  private readonly locationService = inject(LocationService);
  private readonly modalService = inject(ModalService);

  // ───────── navegação (sempre inicia em 'user') ─────────
  readonly step = signal<Step>('user');

  // ───────── coleções / seleção ─────────
  readonly users = signal<User[]>([]);
  readonly credentials = signal<Credential[]>([]);
  readonly roles = signal<Role[]>([]); // catálogo de regras (papéis)
  readonly systems = signal<System[]>([]); // catálogo de sistemas
  readonly employees = signal<Employee[]>([]); // catálogo de funcionários
  readonly locationsCatalog = signal<Location[]>([]); // catálogo de locais

  // Nomes (ou ids) das regras vinculadas à credencial atual (credentialRole).
  readonly assignedRoleNames = signal<string[]>([]);
  // Nomes (ou ids) dos locais vinculados à credencial atual (credentialLocation).
  readonly assignedLocationNames = signal<string[]>([]);

  // ── combobox de busca de funcionário (filtro) ──
  readonly employeeFilterQuery = signal('');
  readonly employeeFilterOpen = signal(false);
  private employeeFilterBlurTimer: ReturnType<typeof setTimeout> | null = null;

  readonly selectedUser = signal<User | null>(null);
  readonly selectedCredential = signal<Credential | null>(null);

  // ───────── feedback ─────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // ───────── filtros ─────────
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = {
    username: '',
    email: '',
    employeeId: '',
    systemId: '',
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

  readonly filteredUsers = computed(() => {
    const f = this.filters();
    return this.users().filter(
      (u) =>
        this.textMatch(u.username, f.username) &&
        this.textMatch(u.email, f.email) &&
        (!f.employeeId || u.employeeId === f.employeeId) &&
        this.statusMatch(u.status, f.status) &&
        this.dateInRange(u.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(u.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  readonly filteredCredentials = computed(() => {
    const f = this.filters();
    return this.credentials().filter(
      (c) =>
        (!f.systemId || c.systemId === f.systemId) &&
        this.statusMatch(c.status, f.status) &&
        this.dateInRange(c.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(c.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  /** Regras disponíveis para a credencial selecionada (mesmo systemId). */
  readonly rolesForCredential = computed(() => {
    const sys = this.selectedCredential()?.systemId;
    return this.roles().filter((r) => !sys || r.systemId === sys);
  });

  // ───────── regras da credencial (credentialRole — N:1) ─────────

  /**
   * Regras atualmente vinculadas à credencial, resolvidas contra o catálogo.
   * getRoleNamesByCredential devolve nomes; casamos por nome OU id
   * para tolerar ambos os formatos. Se não achar, id fica '' (remover desabilitado).
   */
  readonly credentialRoles = computed<{ id: string; nome: string }[]>(() => {
    const catalog = this.roles();
    return this.assignedRoleNames().map((token) => {
      const hit = catalog.find((r) => r.nome === token || r.id === token);
      return { id: hit?.id ?? '', nome: hit?.nome ?? token };
    });
  });

  /** Regras do sistema da credencial que ainda NÃO estão vinculadas (modal de adicionar). */
  readonly availableRoles = computed<{ id: string; nome: string }[]>(() => {
    const assigned = this.assignedRoleNames();
    return this.rolesForCredential()
      .filter((r) => !assigned.some((token) => token === r.nome || token === r.id))
      .map((r) => ({ id: r.id, nome: r.nome }));
  });

  // ───────── locais da credencial (credentialLocation — N:1) ─────────

  /**
   * Locais atualmente vinculados à credencial, resolvidos contra o catálogo.
   * getLocationNamesByCredential devolve nomes; casamos por nome OU id
   * para tolerar ambos os formatos. Se não achar, id fica '' (remover desabilitado).
   */
  readonly credentialLocations = computed<{ id: string; nome: string }[]>(() => {
    const catalog = this.locationsCatalog();
    return this.assignedLocationNames().map((token) => {
      const hit = catalog.find((l) => l.nome === token || l.id === token);
      return { id: hit?.id ?? '', nome: hit?.nome ?? token };
    });
  });

  /** Locais do catálogo que ainda NÃO estão vinculados (para o modal de adicionar). */
  readonly availableLocations = computed<{ id: string; nome: string }[]>(() => {
    const assigned = this.assignedLocationNames();
    return this.locationsCatalog()
      .filter((l) => !assigned.some((token) => token === l.nome || token === l.id))
      .map((l) => ({ id: l.id, nome: l.nome }));
  });

  /** Nome amigável de um sistema a partir do seu id. */
  systemNome(systemId: string | null | undefined): string {
    if (!systemId) return '';
    return this.systems().find((s) => s.id === systemId)?.nome ?? systemId;
  }

  /** Opções de sistema para o filtro (por nome). */
  readonly systemOptions = computed(() =>
    [...this.systems()]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((s) => ({ value: s.id, label: s.nome })),
  );

  /** Nome do funcionário (personName) a partir do employeeId. */
  employeeNome(employeeId: string | null | undefined): string {
    if (!employeeId) return '';
    return this.employees().find((e) => e.id === employeeId)?.personName ?? employeeId;
  }

  /** Opções de funcionário para o filtro (por nome). */
  readonly employeeOptions = computed(() =>
    [...this.employees()]
      .sort((a, b) => (a.personName ?? '').localeCompare(b.personName ?? ''))
      .map((e) => ({ value: e.id, label: e.personName || e.id })),
  );

  /** Opções do combobox de filtro, conforme o texto digitado. */
  readonly filteredEmployeeOptions = computed(() => {
    const q = this.employeeFilterQuery().trim().toLowerCase();
    const opts = this.employeeOptions();
    const base = q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts;
    return base.slice(0, 50);
  });

  onEmployeeFilterQuery(text: string): void {
    this.employeeFilterQuery.set(text);
    this.employeeFilterOpen.set(true);
    this.updateFilter('employeeId', ''); // digitar exige nova seleção
  }

  selectEmployeeFilter(opt: { value: string; label: string }): void {
    if (this.employeeFilterBlurTimer) clearTimeout(this.employeeFilterBlurTimer);
    this.updateFilter('employeeId', opt.value);
    this.employeeFilterQuery.set(opt.label);
    this.employeeFilterOpen.set(false);
  }

  onEmployeeFilterBlur(): void {
    this.employeeFilterBlurTimer = setTimeout(() => this.employeeFilterOpen.set(false), 150);
  }

  clearEmployeeFilter(): void {
    this.updateFilter('employeeId', '');
    this.employeeFilterQuery.set('');
    this.employeeFilterOpen.set(true);
  }

  // ───────── títulos ─────────
  private readonly titles: Record<Step, string> = {
    user: 'Usuários',
    credential: 'Credenciais',
    role: 'Regras da credencial',
    location: 'Locais da credencial',
  };
  private readonly descriptions: Record<Step, string> = {
    user: 'Selecione um usuário para gerenciar suas credenciais.',
    credential: 'Gerencie as credenciais deste usuário.',
    role: 'Vincule ou remova as regras desta credencial.',
    location: 'Vincule ou remova os locais que esta credencial pode acessar.',
  };
  readonly pageTitle = computed(() => this.titles[this.step()]);
  readonly pageDescription = computed(() => this.descriptions[this.step()]);

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadSystems();
    this.loadEmployees();
    this.loadLocationsCatalog();
  }

  private loadRoles(): void {
    this.roleService.getAll(1000, 1).subscribe({
      next: (res) => this.roles.set(this.unwrap<Role>(res)),
      error: () => this.roles.set([]),
    });
  }

  private loadSystems(): void {
    this.systemService.getAll(1000, 1).subscribe({
      next: (res) => this.systems.set(this.unwrap<System>(res)),
      error: () => this.systems.set([]),
    });
  }

  private loadEmployees(): void {
    this.employeeService.getAll(1000, 1).subscribe({
      next: (res) => this.employees.set(this.unwrap<Employee>(res)),
      error: () => this.employees.set([]),
    });
  }

  private loadLocationsCatalog(): void {
    this.locationService.getAll(1000, 1).subscribe({
      next: (res) => this.locationsCatalog.set(this.unwrap<Location>(res)),
      error: () => this.locationsCatalog.set([]),
    });
  }

  // ============================================================
  //  CARREGAMENTO
  // ============================================================

  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r?.['data'] ?? r?.['items'] ?? r?.['results'] ?? []) as T[];
  }

  /** Normaliza a resposta de nomes (regras/locais) para string[]. */
  private toNameList(res: unknown): string[] {
    if (!res) return [];
    if (Array.isArray(res)) return res as string[];
    const r = res as Record<string, unknown>;
    if (Array.isArray(r['data'])) return r['data'] as string[];
    return [];
  }

  loadUsers(): void {
    this.startLoading();
    this.userService.getAll(1000, 1).subscribe({
      next: (res) => {
        this.users.set(this.unwrap<User>(res));
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar os usuários.'),
    });
  }

  loadCredentials(): void {
    this.startLoading();
    const userId = this.selectedUser()?.id;
    this.credentialService.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<Credential>(res);
        this.credentials.set(all.filter((c) => c.userId === userId));
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar as credenciais.'),
    });
  }

  loadCredentialRoles(): void {
    this.startLoading();
    const credentialId = this.selectedCredential()?.id;
    if (!credentialId) {
      this.assignedRoleNames.set([]);
      this.loading.set(false);
      return;
    }
    this.credentialRoleService.getRoleNamesByCredential(credentialId).subscribe({
      next: (res) => {
        this.assignedRoleNames.set(this.toNameList(res));
        this.loading.set(false);
      },
      // sem regras costuma vir vazio/404 — tratamos como "nenhuma regra".
      error: () => {
        this.assignedRoleNames.set([]);
        this.loading.set(false);
      },
    });
  }

  loadCredentialLocations(): void {
    this.startLoading();
    const credentialId = this.selectedCredential()?.id;
    if (!credentialId) {
      this.assignedLocationNames.set([]);
      this.loading.set(false);
      return;
    }
    this.credentialLocationService.getLocationNamesByCredential(credentialId).subscribe({
      next: (res) => {
        this.assignedLocationNames.set(this.toNameList(res));
        this.loading.set(false);
      },
      // sem locais costuma vir vazio/404 — tratamos como "nenhum local".
      error: () => {
        this.assignedLocationNames.set([]);
        this.loading.set(false);
      },
    });
  }

  // ============================================================
  //  NAVEGAÇÃO
  // ============================================================

  selectUser(u: User): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedUser.set(u);
    this.step.set('credential');
    this.loadCredentials();
  }

  /** Clique no card da credencial → gestão das REGRAS (N:1). */
  selectCredential(c: Credential): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedCredential.set(c);
    this.step.set('role');
    this.loadCredentialRoles();
  }

  /** Botão "Locais" no card da credencial → gestão dos LOCAIS (N:1). */
  openLocations(c: Credential): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedCredential.set(c);
    this.step.set('location');
    this.loadCredentialLocations();
  }

  back(): void {
    this.clearFeedback();
    if (this.step() === 'role' || this.step() === 'location') this.goToCredentials();
    else if (this.step() === 'credential') this.goToUsers();
  }

  goToUsers(): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedUser.set(null);
    this.selectedCredential.set(null);
    this.credentials.set([]);
    this.assignedRoleNames.set([]);
    this.assignedLocationNames.set([]);
    this.step.set('user');
  }

  goToCredentials(): void {
    if (!this.selectedUser()) return;
    this.clearFeedback();
    this.resetFilters();
    this.selectedCredential.set(null);
    this.assignedRoleNames.set([]);
    this.assignedLocationNames.set([]);
    this.step.set('credential');
  }

  // ============================================================
  //  CRUD — USUÁRIOS
  // ============================================================

  async novoUsuario(): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Novo Usuário',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new', employees: this.employees() },
      buttons: this.crudButtons('Criar'),
    });
    if (!(await ref.result)) return;
    const v = ref.instance.value();
    this.userService
      .create({ employeeId: v.employeeId, username: v.username, email: v.email, status: v.status })
      .subscribe({
        next: () => this.done('Usuário criado.', () => this.loadUsers()),
        error: () => this.error.set('Erro ao criar o usuário.'),
      });
  }

  async editarUsuario(item: User): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: `Editar: ${item.username}`,
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'edit', item, employees: this.employees() },
      buttons: this.crudButtons('Salvar'),
    });
    if (!(await ref.result)) return;
    const v = ref.instance.value();
    this.userService
      .update(item.id, {
        employeeId: v.employeeId,
        username: v.username,
        email: v.email,
        status: v.status,
      })
      .subscribe({
        next: () => this.done('Usuário atualizado.', () => this.loadUsers()),
        error: () => this.error.set('Erro ao atualizar o usuário.'),
      });
  }

  async excluirUsuario(item: User): Promise<void> {
    if (!(await this.confirmDelete(`o usuário "${item.username}"`))) return;
    this.userService.delete(item.id).subscribe({
      next: () => this.done('Usuário excluído.', () => this.loadUsers()),
      error: () => this.error.set('Erro ao excluir o usuário.'),
    });
  }

  // ============================================================
  //  CRUD — CREDENCIAIS (userId travado pelo usuário)
  // ============================================================

  async novaCredencial(): Promise<void> {
    this.clearFeedback();
    const userId = this.selectedUser()?.id ?? '';
    // Sistemas em que o usuário ainda não tem credencial.
    const usados = new Set(this.credentials().map((c) => c.systemId));
    const disponiveis = this.systems().filter((s) => !usados.has(s.id));

    const ref = this.modalService.openComponent(CredentialFormComponent, {
      title: 'Nova Credencial',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new', lockedUserId: userId, availableSystems: disponiveis },
      buttons: this.crudButtons('Criar'),
    });
    if (!(await ref.result)) return;
    const v = ref.instance.value();
    const systemIds: string[] = v.systemIds ?? [];
    if (!systemIds.length) {
      this.error.set('Selecione ao menos um sistema.');
      return;
    }

    // Cria a credencial em cada sistema selecionado com a mesma senha (texto puro).
    const requisicoes = systemIds.map((systemId) =>
      this.credentialService.create({ userId, systemId, senha: v.senha, status: v.status }),
    );
    forkJoin(requisicoes).subscribe({
      next: () =>
        this.done(`${systemIds.length} credencial(is) criada(s).`, () => this.loadCredentials()),
      error: () => this.error.set('Erro ao criar uma ou mais credenciais.'),
    });
  }

  async editarCredencial(item: Credential): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(CredentialFormComponent, {
      title: `Editar credencial: ${this.systemNome(item.systemId)}`,
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'edit', item, systemName: this.systemNome(item.systemId) },
      buttons: this.crudButtons('Salvar'),
    });
    if (!(await ref.result)) return;
    const v = ref.instance.value();
    // O update só aceita senha/status; a senha só é enviada se preenchida.
    const payload: { senha?: string; status?: number } = { status: v.status };
    if (v.senha) payload.senha = v.senha;
    this.credentialService.update(item.id, payload).subscribe({
      next: () => this.done('Credencial atualizada.', () => this.loadCredentials()),
      error: () => this.error.set('Erro ao atualizar a credencial.'),
    });
  }

  async excluirCredencial(item: Credential): Promise<void> {
    if (!(await this.confirmDelete(`a credencial "${item.systemId}"`))) return;
    this.credentialService.delete(item.id).subscribe({
      next: () => this.done('Credencial excluída.', () => this.loadCredentials()),
      error: () => this.error.set('Erro ao excluir a credencial.'),
    });
  }

  // ============================================================
  //  REGRAS DA CREDENCIAL (N por credencial)
  // ============================================================

  /** Abre o modal de multi-seleção e vincula as regras escolhidas. */
  async adicionarRegras(): Promise<void> {
    this.clearFeedback();
    const credentialId = this.selectedCredential()?.id;
    if (!credentialId) return;

    const disponiveis = this.availableRoles();
    if (!disponiveis.length) {
      this.error.set('Não há regras disponíveis para adicionar.');
      return;
    }

    const ref = this.modalService.openComponent(CredentialRoleFormComponent, {
      title: 'Adicionar regras',
      size: 'lg',
      backdrop: 'static',
      inputs: { availableRoles: disponiveis },
      buttons: this.crudButtons('Adicionar'),
    });
    if (!(await ref.result)) return;

    const { roleIds } = ref.instance.value();
    if (!roleIds.length) {
      this.error.set('Selecione ao menos uma regra.');
      return;
    }

    // Um vínculo por regra selecionada.
    const requisicoes = roleIds.map((roleId) =>
      this.credentialRoleService.create({ credentialId, roleId }),
    );
    forkJoin(requisicoes).subscribe({
      next: () =>
        this.done(`${roleIds.length} regra(s) vinculada(s).`, () => this.loadCredentialRoles()),
      error: () => this.error.set('Erro ao vincular uma ou mais regras.'),
    });
  }

  /** Remove uma regra vinculada. Requer o id resolvido no catálogo. */
  async removerRegra(role: { id: string; nome: string }): Promise<void> {
    const credentialId = this.selectedCredential()?.id;
    if (!credentialId || !role.id) return;
    if (!(await this.confirmDelete(`a regra "${role.nome}"`))) return;
    this.credentialRoleService.delete(credentialId, role.id).subscribe({
      next: () => this.done('Regra removida.', () => this.loadCredentialRoles()),
      error: () => this.error.set('Erro ao remover a regra.'),
    });
  }

  // ============================================================
  //  LOCAIS DA CREDENCIAL (N por credencial)
  // ============================================================

  /** Abre o modal de multi-seleção e vincula os locais escolhidos. */
  async adicionarLocais(): Promise<void> {
    this.clearFeedback();
    const credentialId = this.selectedCredential()?.id;
    if (!credentialId) return;

    const disponiveis = this.availableLocations();
    if (!disponiveis.length) {
      this.error.set('Não há locais disponíveis para adicionar.');
      return;
    }

    const ref = this.modalService.openComponent(CredentialLocationFormComponent, {
      title: 'Adicionar locais',
      size: 'lg',
      backdrop: 'static',
      inputs: { availableLocations: disponiveis },
      buttons: this.crudButtons('Adicionar'),
    });
    if (!(await ref.result)) return;

    const { locationIds } = ref.instance.value();
    if (!locationIds.length) {
      this.error.set('Selecione ao menos um local.');
      return;
    }

    // Um vínculo por local selecionado.
    const requisicoes = locationIds.map((locationId) =>
      this.credentialLocationService.create({ credentialId, locationId }),
    );
    forkJoin(requisicoes).subscribe({
      next: () =>
        this.done(`${locationIds.length} local(is) vinculado(s).`, () =>
          this.loadCredentialLocations(),
        ),
      error: () => this.error.set('Erro ao vincular um ou mais locais.'),
    });
  }

  /** Remove um local vinculado. Requer o id resolvido no catálogo. */
  async removerLocal(loc: { id: string; nome: string }): Promise<void> {
    const credentialId = this.selectedCredential()?.id;
    if (!credentialId || !loc.id) return;
    if (!(await this.confirmDelete(`o local "${loc.nome}"`))) return;
    this.credentialLocationService.delete(credentialId, loc.id).subscribe({
      next: () => this.done('Local removido.', () => this.loadCredentialLocations()),
      error: () => this.error.set('Erro ao remover o local.'),
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

  private async confirmDelete(alvo: string): Promise<boolean> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Confirmar exclusão',
      body: `Deseja realmente excluir ${alvo}?`,
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
    this.employeeFilterQuery.set('');
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
}
