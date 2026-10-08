import { PartialType } from '@nestjs/swagger';
import { CreateParticipantDto } from './create-participant.dto';

/** El estado (status) no se edita aquí: lo cambian los casos de uso del flujo. */
export class UpdateParticipantDto extends PartialType(CreateParticipantDto) {}
