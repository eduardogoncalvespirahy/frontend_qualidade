export interface Employee { // Funcionario - Senior
  id: string;
  companyNumber: number | null;
  registerNumber: number | null;
  registrationNumber: number | null;
  personId: string | null;
  personName: string | null;
  hireDate: Date | null;
  dismissalDate: Date | null;
  hash: string | null;
  employerId: string | null;
  departmentId: string | null;
  jobPositionId: string | null;
  workstationGroupId: string | null;
  workshiftId: string | null;
  costCenterId: string | null;
  syncedAt: Date | null;
}

export interface EmployeeCreate {
  id: string;
  companyNumber?: number | null;
  registerNumber?: number | null;
  registrationNumber?: number | null;
  personId?: string | null;
  personName?: string | null;
  hireDate?: string | Date | null;
  dismissalDate?: string | Date | null;
  hash?: string | null;
  employerId?: string | null;
  departmentId?: string | null;
  jobPositionId?: string | null;
  workstationGroupId?: string | null;
  workshiftId?: string | null;
  costCenterId?: string | null;
}

export type EmployeeUpdate = Partial<Omit<EmployeeCreate, "id">>;
