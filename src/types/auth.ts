export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}
