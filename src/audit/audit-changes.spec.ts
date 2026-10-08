import { creationChanges, diffChanges } from './audit-changes';

describe('audit-changes', () => {
  it('creationChanges registra todos los campos con old = null', () => {
    const changes = creationChanges({
      id: 'x',
      createdAt: new Date(),
      firstNames: 'ANA',
      birthDate: null,
    });
    expect(changes).toEqual({
      firstNames: { old: null, new: 'ANA' },
      birthDate: { old: null, new: null },
    });
  });

  it('nunca incluye contraseñas, hashes ni tokens', () => {
    const changes = creationChanges({
      email: 'a@b.pe',
      password: 'secreta',
      passwordHash: '$2b$...',
      verificationToken: 'abc',
    });
    expect(Object.keys(changes)).toEqual(['email']);
    expect(JSON.stringify(changes)).not.toMatch(/secreta|\$2b|abc/);
  });

  it('diffChanges devuelve solo los campos modificados', () => {
    const changes = diffChanges(
      { firstNames: 'ANA', phone: '999', extraData: { a: 1 } },
      { firstNames: 'ANA MARÍA', phone: '999', extraData: { a: 1 } },
    );
    expect(changes).toEqual({
      firstNames: { old: 'ANA', new: 'ANA MARÍA' },
    });
  });

  it('diffChanges ignora relaciones cargadas y valores undefined', () => {
    const changes = diffChanges(
      { roleId: 'r1', role: { id: 'r1' } },
      { roleId: 'r2', role: { id: 'r2' }, fullName: undefined },
    );
    expect(changes).toEqual({ roleId: { old: 'r1', new: 'r2' } });
  });

  it('normaliza fechas a ISO', () => {
    const changes = diffChanges(
      { lastLoginAt: null },
      { lastLoginAt: new Date('2026-10-08T10:00:00Z') },
    );
    expect(changes.lastLoginAt.new).toBe('2026-10-08T10:00:00.000Z');
  });
});
