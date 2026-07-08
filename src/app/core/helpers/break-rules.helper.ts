/**
 * Regras de negócio das paradas (BreakForm / BreakMachine).
 * Funções puras, sem dependência de Angular — fonte única da verdade
 * usada pelos componentes para validar criação e habilitar ativar/desativar.
 *
 * Regras:
 * - horaInicio: pode ser a hora atual ou posterior (nunca no passado).
 * - horaFim: sempre posterior à horaInicio (nunca igual/antes; como início
 *   já é >= agora, isso garante que fim também é futuro).
 * - Entre horaInicio e horaFim a parada é considerada ativa (status 1).
 * - Depois de horaFim a parada é sempre inativa (status 0), independente
 *   do valor gravado.
 * - Reativar (status -> 1) só é permitido enquanto horaFim ainda estiver
 *   vigente (no futuro). Se já expirou, não pode reativar.
 */

export interface BreakLike {
  horaInicio: Date | string;
  horaFim?: Date | string | null | undefined;
  status: number;
}

/** Tolerância para aceitar "a hora atual" (segundos correndo no formulário). */
const GRACE_MS = 60_000;

/**
 * Valida os horários de criação/edição.
 * @returns mensagem de erro, ou null se estiver tudo certo.
 */
export function validateBreakTimes(
  horaInicio: Date,
  horaFim: Date | null,
  now: Date = new Date(),
): string | null {
  if (Number.isNaN(horaInicio.getTime())) {
    return 'Informe uma hora de início válida.';
  }
  if (horaInicio.getTime() < now.getTime() - GRACE_MS) {
    return 'A hora de início deve ser a atual ou posterior.';
  }
  if (horaFim !== null) {
    if (Number.isNaN(horaFim.getTime())) return 'Informe uma hora de fim válida.';
    if (horaFim.getTime() <= horaInicio.getTime()) return 'A hora de fim deve ser posterior à hora de início.';
  }
  return null;
}


/** Sem hora fim, nunca expira. */
export function isExpired(b: BreakLike, now: Date = new Date()): boolean {
  if (!b.horaFim) return false;
  return new Date(b.horaFim).getTime() <= now.getTime();
}


/** Está dentro do período (entre início e fim)? */
export function isWithinWindow(b: BreakLike, now: Date = new Date()): boolean {
  const t = now.getTime();
  if (!b.horaFim) return t >= new Date(b.horaInicio).getTime();
  return t >= new Date(b.horaInicio).getTime() && t < new Date(b.horaFim).getTime();
}


/** Ainda não começou (agendada para o futuro). */
export function isScheduled(b: BreakLike, now: Date = new Date()): boolean {
  return new Date(b.horaInicio).getTime() > now.getTime();
}

/**
 * Status efetivo considerando o tempo:
 * só é ativa se o status gravado for 1 E ainda não tiver expirado.
 */
export function isActive(b: BreakLike, now: Date = new Date()): boolean {
  return b.status === 1 && !isExpired(b, now);
}

/** Pode reativar? Só quando está desativada e a horaFim ainda é vigente. */
export function canActivate(b: BreakLike, now: Date = new Date()): boolean {
  return b.status !== 1 && !isExpired(b, now);
}

/** Pode desativar? Enquanto estiver ativa (status 1) e não expirada. */
export function canDeactivate(b: BreakLike, now: Date = new Date()): boolean {
  return b.status === 1 && !isExpired(b, now);
}

/** Rótulo de status para exibição. */
export function statusLabel(
  b: BreakLike,
  now: Date = new Date(),
): 'Ativa' | 'Agendada' | 'Inativa' | 'Expirada' {
  if (isExpired(b, now)) return 'Expirada';
  if (b.status === 1) return isScheduled(b, now) ? 'Agendada' : 'Ativa';
  return 'Inativa';
}


