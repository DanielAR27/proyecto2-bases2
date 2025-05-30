// tests/auth.middleware.test.js

const { verificarToken } = require('../../src/middlewares/authMiddleware');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería verificar el token y continuar', () => {
    const decoded = { id_usuario: 1, nombre: 'Test User' };
    jwt.verify.mockReturnValue(decoded);

    const req = {
      header: jest.fn().mockReturnValue('Bearer test_token')
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    verificarToken(req, res, next);

    expect(req.header).toHaveBeenCalledWith('Authorization');
    expect(jwt.verify).toHaveBeenCalledWith('test_token', process.env.JWT_SECRET);
    expect(req.usuario).toEqual(decoded);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('debería devolver error 401 si no hay token', () => {
    const req = {
      header: jest.fn().mockReturnValue(null)
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    verificarToken(req, res, next);

    expect(req.header).toHaveBeenCalledWith('Authorization');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado. No hay token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debería devolver error 401 si el token es inválido', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('Token inválido');
    });

    const req = {
      header: jest.fn().mockReturnValue('Bearer invalid_token')
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    verificarToken(req, res, next);

    expect(req.header).toHaveBeenCalledWith('Authorization');
    expect(jwt.verify).toHaveBeenCalledWith('invalid_token', process.env.JWT_SECRET);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado.' });
    expect(next).not.toHaveBeenCalled();
  });
});