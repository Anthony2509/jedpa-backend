import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  let status: jest.Mock;
  let json: jest.Mock<void, [Record<string, unknown>]>;
  let host: ArgumentsHost;

  beforeEach(() => {
    json = jest.fn<void, [Record<string, unknown>]>();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/api/participants' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('mantiene los mensajes de validación de una HttpException', () => {
    filter.catch(new BadRequestException(['dni inválido']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['dni inválido'],
        error: 'Bad Request',
        path: '/api/participants',
      }),
    );
  });

  it('traduce la violación de unicidad 23505 a 409 sin exponer el valor', () => {
    const driverError = Object.assign(new Error('duplicate key'), {
      code: '23505',
      detail: 'Key (dni)=(12345678) already exists.',
    });
    filter.catch(
      new QueryFailedError('INSERT ...', ['12345678'], driverError),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({ statusCode: 409, error: 'Conflict' });
    expect(JSON.stringify(body)).not.toContain('12345678');
  });

  it('responde 500 genérico ante errores desconocidos', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    filter.catch(new Error('fallo interno con datos'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain('datos');
  });
});
