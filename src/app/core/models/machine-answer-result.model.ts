// Resposta de um parâmetro de máquina durante uma inspeção
export interface MachineAnswerResult {
  id: string;
  machineAnswerId: string;
  resposta: string | null;
}

// Payload para registrar uma nova resposta de máquina
export interface MachineAnswerResultCreate {
  machineAnswerId: string;
  resposta?: string | null;
}

// Payload para atualizar uma resposta de máquina existente
export interface MachineAnswerResultUpdate {
  machineAnswerId?: string;
  resposta?: string | null;
}
