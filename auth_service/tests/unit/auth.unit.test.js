// tests/auth.controller.test.js

// Mock de Postgres
jest.mock('../../src/db/db_postgres', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
}));

// Mock de Mongo
jest.mock('../../src/models/userMongoModel', () => ({
  findOne: jest.fn().mockResolvedValue(null),
  findOneAndUpdate: jest.fn().mockResolvedValue(null),
  findOneAndDelete: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(null)
}));

// Mock de UserDAO, bcrypt, jwt
jest.mock('../../src/dao/userDAO');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

// Importar lo necesario
const authController = require('../../src/controllers/authController');
const UserDAO = require('../../src/dao/userDAO');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Auth Controller', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('debería registrar un nuevo usuario exitosamente', async () => {
      // Mock de UserDAO
      UserDAO.findByEmail.mockResolvedValue(null); // No existe el email
      UserDAO.createUser.mockResolvedValue({ 
        id_usuario: 1, 
        nombre: 'Juan', 
        email: 'juan@example.com', 
        rol: 'cliente' 
      });
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashed_password');

      const req = {
        body: {
          nombre: 'Juan',
          email: 'juan@example.com',
          contrasena: 'password123',
          rol: 'cliente'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      expect(UserDAO.findByEmail).toHaveBeenCalledWith('juan@example.com');
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(UserDAO.createUser).toHaveBeenCalledWith({
        nombre: 'Juan',
        email: 'juan@example.com',
        contrasena_hash: 'hashed_password',
        rol: 'cliente'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Usuario registrado exitosamente.',
        usuario: expect.any(Object)
      }));
    });

    it('debería devolver error si falta algún campo', async () => {
      const req = {
        body: {
          email: 'juan@example.com',
          contrasena: 'password123',
          rol: 'cliente'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Todos los campos son obligatorios.' });
    });

    it('debería devolver error si el rol no es válido', async () => {
      const req = {
        body: {
          nombre: 'Juan',
          email: 'juan@example.com',
          contrasena: 'password123',
          rol: 'rol_invalido'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "El rol debe ser 'cliente' o 'administrador'." });
    });

    it('debería devolver error si el email ya está registrado', async () => {
      UserDAO.findByEmail.mockResolvedValue({ id_usuario: 1 });

      const req = {
        body: {
          nombre: 'Juan',
          email: 'juan@example.com',
          contrasena: 'password123',
          rol: 'cliente'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El email ya está registrado.' });
    });

    it('debería manejar errores del servidor', async () => {
      UserDAO.findByEmail.mockRejectedValue(new Error('DB Error'));

      const req = {
        body: {
          nombre: 'Juan',
          email: 'juan@example.com',
          contrasena: 'password123',
          rol: 'cliente'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock console.error para que no imprima en los tests
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      await authController.register(req, res);
      
      // Restaurar console.error
      console.error = originalConsoleError;

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor.' });
    });
  });

  describe('login', () => {
    it('debería iniciar sesión exitosamente', async () => {
      UserDAO.findByEmail.mockResolvedValue({
        id_usuario: 1,
        nombre: 'Juan',
        email: 'juan@example.com',
        rol: 'cliente',
        contrasena_hash: 'hashed_password'
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake_jwt_token');

      const req = {
        body: {
          email: 'juan@example.com',
          contrasena: 'password123'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(UserDAO.findByEmail).toHaveBeenCalledWith('juan@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id_usuario: 1,
          nombre: 'Juan',
          email: 'juan@example.com',
          rol: 'cliente'
        }),
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Inicio de sesión exitoso.',
        token: 'fake_jwt_token',
        usuario: expect.any(Object)
      }));
    });

    it('debería devolver error si faltan campos', async () => {
      const req = {
        body: {
          email: 'juan@example.com'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email y contraseña son obligatorios.' });
    });

    it('debería devolver error si el usuario no existe', async () => {
      UserDAO.findByEmail.mockResolvedValue(null);

      const req = {
        body: {
          email: 'notfound@example.com',
          contrasena: 'password123'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Credenciales inválidas.' });
    });

    it('debería devolver error si la contraseña es inválida', async () => {
      UserDAO.findByEmail.mockResolvedValue({
        id_usuario: 1,
        contrasena_hash: 'hashed_password'
      });
      bcrypt.compare.mockResolvedValue(false);

      const req = {
        body: {
          email: 'juan@example.com',
          contrasena: 'wrongpassword'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Credenciales inválidas.' });
    });

    it('debería manejar errores del servidor', async () => {
      UserDAO.findByEmail.mockRejectedValue(new Error('DB Error'));

      const req = {
        body: {
          email: 'juan@example.com',
          contrasena: 'password123'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock console.error para que no imprima en los tests
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      await authController.login(req, res);
      
      // Restaurar console.error
      console.error = originalConsoleError;

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor.' });
    });
  });

  describe('verifyToken', () => {
    it('debería verificar un token válido', () => {
      const decoded = { id_usuario: 1, nombre: 'Juan' };
      jwt.verify.mockReturnValue(decoded);

      const req = {
        header: jest.fn().mockReturnValue('Bearer fake_token')
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      authController.verifyToken(req, res);

      expect(jwt.verify).toHaveBeenCalledWith('fake_token', process.env.JWT_SECRET);
      expect(res.json).toHaveBeenCalledWith({ usuario: decoded });
    });

    it('debería devolver error si no hay token', () => {
      const req = {
        header: jest.fn().mockReturnValue(null)
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      authController.verifyToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No hay token.' });
    });

    it('debería rechazar un token inválido', () => {
      jwt.verify.mockImplementation(() => { throw new Error(); });

      const req = {
        header: jest.fn().mockReturnValue('Bearer invalid_token')
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      authController.verifyToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado.' });
    });
  });
});