import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export interface HashedPassword {
  hash: string;
  salt: string;
  hashedPassword: string;
}

export async function hashPassword(password: string): Promise<HashedPassword> {
  // Generar salt
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  
  // Crear hash con el salt
  const hashedPassword = await bcrypt.hash(password, salt);
  
  return {
    hash: hashedPassword,
    salt: salt,
    hashedPassword: hashedPassword
  };
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

export function generateSalt(): string {
  return bcrypt.genSaltSync(SALT_ROUNDS);
}
