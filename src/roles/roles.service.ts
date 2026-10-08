import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {}

  findAll(): Promise<Role[]> {
    return this.roles.find({ order: { name: 'ASC' } });
  }

  /** Rol existente o 400: se usa al asignar un rol a un usuario. */
  async getOrFail(id: string): Promise<Role> {
    const role = await this.roles.findOneBy({ id });
    if (!role) {
      throw new BadRequestException('El rol indicado no existe.');
    }
    return role;
  }
}
