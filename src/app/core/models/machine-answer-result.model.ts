// Resposta de um parâmetro de máquina durante uma inspeção
export interface MachineAnswerResult {
  id: string;
  machineId: string;
  answerId: string;
  controlId: string;  
  resposta: string;
  limitsAnswerId: string | null;
  dataCriacao: Date;
  dataAlteracao: Date;
}

// Payload para registrar uma nova resposta de máquina
export interface MachineAnswerResultCreate {
  machineId: string;
  answerId: string;
  controlId: string;  
  resposta: string;
  limitsAnswerId?: string | null;
  dataCriacao?: Date;
  dataAlteracao?: Date;
}

// Payload para atualizar uma resposta de máquina existente
export interface MachineAnswerResultUpdate {
  machineId: string;
  answerId: string;
  controlId: string;  
  resposta: string;
  limitsAnswerId?: string | null;
  dataCriacao?: Date;
  dataAlteracao?: Date;
}
