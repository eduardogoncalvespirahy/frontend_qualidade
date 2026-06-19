export interface User { // Ususario
  id: string;
  employeeId: string;
  username: string;
  email: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface UserCreate {
  employeeId: string;
  username: string;
  email: string; 
  status?: number;
}

export interface UserUpdate {
  employeeId?: string;
  username?: string;
  email?: string;  
  status?: number;
}
