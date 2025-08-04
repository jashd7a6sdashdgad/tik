import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { LoginCredentials, User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Hardcoded credentials as requested
const VALID_CREDENTIALS = {
  username: 'mahboob',
  password: 'mahboob123'
};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function validateCredentials(credentials: LoginCredentials): Promise<User> {
  const { username, password } = credentials;

  if (username !== VALID_CREDENTIALS.username) {
    throw new AuthError('Invalid username or password');
  }

  if (password !== VALID_CREDENTIALS.password) {
    throw new AuthError('Invalid username or password');
  }

  // Return user object
  return {
    id: '1',
    username: VALID_CREDENTIALS.username,
    email: `${VALID_CREDENTIALS.username}@assistant.local`
  };
}

export function generateToken(user: User): string {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: '30d' } // Token expires in 30 days
  );
}

export function verifyToken(token: string): User {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email
    };
  } catch (error) {
    throw new AuthError('Invalid or expired token');
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

export function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcryptjs.compare(password, hashedPassword);
}

// Cookie configuration for cross-device access
export const COOKIE_OPTIONS = {
  name: 'auth-token',
  options: {
    httpOnly: false, // Allow client access for cross-device sync
    secure: false, // Allow HTTP for local network
    sameSite: 'lax' as const, // More permissive for network access
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
    domain: undefined // Allow subdomain access
  }
};