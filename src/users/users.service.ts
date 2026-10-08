import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RoleName } from '../common/constants/roles';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** Única consulta que incluye passwordHash; uso exclusivo del login. */
  findForLogin(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .innerJoinAndSelect('user.role', 'role')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  /** Usuario activo con su rol, o null si no existe o está desactivado. */
  async findActiveAuthUser(id: string): Promise<AuthUser | null> {
    const user = await this.users.findOne({
      where: { id, isActive: true },
      relations: { role: true },
    });
    return user ? toAuthUser(user) : null;
  }

  async registerLogin(id: string): Promise<void> {
    await this.users.update(id, { lastLoginAt: new Date() });
  }
}

export const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role.name as RoleName,
});
