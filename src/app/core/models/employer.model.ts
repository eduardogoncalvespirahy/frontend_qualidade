export interface Employer { // Empresa - senior
  id: string;
  tradingName: string | null;
}

export interface EmployerCreate {
  id: string;
  tradingName?: string | null;
}

export interface EmployerUpdate {
  tradingName?: string | null;
}
