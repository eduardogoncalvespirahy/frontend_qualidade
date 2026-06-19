export type LoginIdentifierType = 'email' | 'username' | 'registerNumber';

export interface LoginRequest {
  email?: string;
  username?: string;
  registerNumber?: number;
  password: string;
  systemId?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
}
