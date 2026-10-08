import { SnakeNamingStrategy } from './snake-naming.strategy';

describe('SnakeNamingStrategy', () => {
  const strategy = new SnakeNamingStrategy();

  it('convierte propiedades camelCase a snake_case', () => {
    expect(strategy.columnName('participantTypeId', undefined, [])).toBe(
      'participant_type_id',
    );
    expect(strategy.columnName('createdAt', undefined, [])).toBe('created_at');
  });

  it('respeta el nombre de tabla indicado en @Entity', () => {
    expect(strategy.tableName('AuditLog', 'audit_logs')).toBe('audit_logs');
    expect(strategy.tableName('DeliveryPlace', undefined)).toBe(
      'delivery_place',
    );
  });

  it('genera columnas de relación en snake_case', () => {
    expect(strategy.joinColumnName('participantType', 'id')).toBe(
      'participant_type_id',
    );
  });
});
