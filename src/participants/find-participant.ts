import { NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Participant } from './entities/participant.entity';

/**
 * Participante con su tipo, o 404. Recibe el EntityManager para poder usarse
 * dentro de la transacción del caso de uso.
 */
export async function findParticipantOrFail(
  manager: EntityManager,
  id: string,
): Promise<Participant> {
  const participant = await manager.getRepository(Participant).findOne({
    where: { id },
    relations: { participantType: true },
  });
  if (!participant) throw new NotFoundException('Participante no encontrado.');
  return participant;
}
