import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { AuditActor } from '../audit/audit-actor';
import { creationChanges, diffChanges } from '../audit/audit-changes';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RoleName, ROLES } from '../common/constants/roles';
import { BCRYPT_ROUNDS } from '../common/constants/security';
import {
  buildPaginatedResponse,
  PaginatedResponse,
} from '../common/pagination';
import { escapeLike } from '../common/utils/text';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';

const ENTITY = 'User';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly roles: RolesService,
    private readonly audit: AuditService,
  ) {}

  // ── Autenticación ────────────────────────────────────────────────

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

  // ── Gestión de usuarios (ADMIN) ──────────────────────────────────

  async findAll(
    query: UserQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const qb = this.users
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.role', 'role')
      .orderBy('user.fullName', 'ASC')
      .skip(query.skip)
      .take(query.limit);

    if (query.search) {
      qb.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search)', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.roleId) {
      qb.andWhere('user.roleId = :roleId', { roleId: query.roleId });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    const [users, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(
      users.map((u) => UserResponseDto.from(u)),
      total,
      query,
    );
  }

  async findOne(id: string): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.getOrFail(this.users.manager, id));
  }

  async create(
    dto: CreateUserDto,
    actor: AuditActor,
  ): Promise<UserResponseDto> {
    await this.roles.getOrFail(dto.roleId);
    await this.assertEmailAvailable(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const id = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      const user = await repo.save(
        repo.create({
          email: dto.email,
          fullName: dto.fullName,
          roleId: dto.roleId,
          passwordHash,
        }),
      );
      await this.audit.record(manager, actor, {
        action: AuditAction.CREATE,
        entity: ENTITY,
        entityId: user.id,
        changes: creationChanges(user),
      });
      return user.id;
    });
    return this.findOne(id);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuditActor,
  ): Promise<UserResponseDto> {
    if (dto.email) await this.assertEmailAvailable(dto.email, id);
    const newRole = dto.roleId ? await this.roles.getOrFail(dto.roleId) : null;
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      : undefined;

    await this.dataSource.transaction(async (manager) => {
      const user = await this.getOrFail(manager, id);
      if (newRole && newRole.id !== user.roleId) {
        if (id === actor.userId) {
          throw new BadRequestException('No puede cambiar su propio rol.');
        }
        if (user.role.name === ROLES.ADMIN) {
          await this.assertAnotherActiveAdmin(manager, id);
        }
      }

      const before = { ...user };
      const changes = {
        email: dto.email,
        fullName: dto.fullName,
        roleId: dto.roleId,
      };
      await manager.getRepository(User).update(id, {
        ...changes,
        ...(passwordHash && { passwordHash }),
      });

      const auditChanges = diffChanges(before, changes);
      if (passwordHash) {
        // Se registra que la contraseña cambió, nunca su valor.
        auditChanges.passwordChanged = { old: null, new: true };
      }
      if (Object.keys(auditChanges).length) {
        await this.audit.record(manager, actor, {
          action: AuditAction.UPDATE,
          entity: ENTITY,
          entityId: id,
          changes: auditChanges,
        });
      }
    });
    return this.findOne(id);
  }

  async setActive(
    id: string,
    isActive: boolean,
    actor: AuditActor,
  ): Promise<UserResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const user = await this.getOrFail(manager, id);
      if (user.isActive === isActive) return;
      if (!isActive && id === actor.userId) {
        throw new BadRequestException('No puede desactivar su propio usuario.');
      }
      if (!isActive && user.role.name === ROLES.ADMIN) {
        await this.assertAnotherActiveAdmin(manager, id);
      }

      await manager.getRepository(User).update(id, { isActive });
      await this.audit.record(manager, actor, {
        action: isActive ? AuditAction.ACTIVATE : AuditAction.DEACTIVATE,
        entity: ENTITY,
        entityId: id,
        changes: { isActive: { old: user.isActive, new: isActive } },
      });
    });
    return this.findOne(id);
  }

  // ── Reglas internas ──────────────────────────────────────────────

  private async getOrFail(manager: EntityManager, id: string): Promise<User> {
    const user = await manager.getRepository(User).findOne({
      where: { id },
      relations: { role: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return user;
  }

  private async assertEmailAvailable(email: string, exceptId?: string) {
    const taken = await this.users.existsBy({
      email,
      ...(exceptId && { id: Not(exceptId) }),
    });
    if (taken) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }
  }

  /** Evita dejar el sistema sin administradores activos. */
  private async assertAnotherActiveAdmin(
    manager: EntityManager,
    exceptId: string,
  ) {
    const others = await manager.getRepository(User).count({
      where: {
        id: Not(exceptId),
        isActive: true,
        role: { name: ROLES.ADMIN },
      },
    });
    if (others === 0) {
      throw new BadRequestException(
        'Debe quedar al menos un administrador activo.',
      );
    }
  }
}

export const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role.name as RoleName,
});
