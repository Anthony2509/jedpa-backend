import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ROLES } from '../common/constants/roles';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleResponseDto } from './dto/role-response.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@Roles(ROLES.ADMIN)
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los roles del sistema' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  async findAll(): Promise<RoleResponseDto[]> {
    return (await this.roles.findAll()).map((role) =>
      RoleResponseDto.from(role),
    );
  }
}
