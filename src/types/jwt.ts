export interface JwtPayload {
  sub: string; // user id
  email?: string;
  plan?: 'FREE' | 'PREMIUM'; // optionnel pour la suite
}

export interface JwtUser {
  userId: string;
  email?: string;
  plan?: 'FREE' | 'PREMIUM';
}
