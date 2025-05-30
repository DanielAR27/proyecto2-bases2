// tests/unit/user.controller.test.js

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
  
// Mock de user DAO
jest.mock('../../src/dao/userDAO');

// Mock de Axios
jest.mock('axios', () => ({
  delete: jest.fn().mockResolvedValue({ data: {} })
}));

// Mock de Redis
jest.mock('../../src/config/redis', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(null)
}));


// Importar lo necesario
const userController = require('../../src/controllers/userController');
const UserDAO = require('../../src/dao/userDAO');

describe('User Controller', () => {

  beforeEach(() => {
    // Silenciar error y logs
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('debería devolver la información del usuario', async () => {
      UserDAO.findById.mockResolvedValue({ id_usuario: 1, nombre: 'Juan', email: 'juan@example.com' });

      const req = { usuario: { id_usuario: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.getMe(req, res);

      expect(UserDAO.findById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ id_usuario: 1, nombre: 'Juan', email: 'juan@example.com' });
    });

    it('debería devolver 404 si el usuario no existe', async () => {
      UserDAO.findById.mockResolvedValue(null);

      const req = { usuario: { id_usuario: 99 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado.' });
    });

    it('debería manejar errores de servidor', async () => {
      UserDAO.findById.mockRejectedValue(new Error('DB Error'));

      const req = { usuario: { id_usuario: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor.' });
    });
  });

  describe('updateUser', () => {
    it('debería actualizar el usuario si está autorizado', async () => {
      UserDAO.findById.mockResolvedValue({ id_usuario: 1 });
      UserDAO.updateUser.mockResolvedValue({ id_usuario: 1, nombre: 'Juan Actualizado', email: 'nuevo@example.com', rol: 'cliente' });

      const req = {
        params: { id: '1' },
        body: { nombre: 'Juan Actualizado', email: 'nuevo@example.com', rol: 'cliente' },
        usuario: { id_usuario: 1, rol: 'cliente' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.updateUser(req, res);

      expect(UserDAO.findById).toHaveBeenCalledWith('1');
      expect(UserDAO.updateUser).toHaveBeenCalledWith('1', { nombre: 'Juan Actualizado', email: 'nuevo@example.com', rol: 'cliente' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Usuario actualizado correctamente.' }));
    });

    it('debería devolver error 400 si faltan campos', async () => {
      const req = {
        params: { id: '1' },
        body: { nombre: '', email: 'nuevo@example.com', rol: 'cliente' },
        usuario: { id_usuario: 1, rol: 'cliente' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Todos los campos son obligatorios.' });
    });

    it('debería devolver error 400 si el rol es inválido', async () => {
      const req = {
        params: { id: '1' },
        body: { nombre: 'Juan', email: 'juan@example.com', rol: 'superadmin' },
        usuario: { id_usuario: 1, rol: 'cliente' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "El rol debe ser 'cliente' o 'administrador'." });
    });

    it('debería devolver error 403 si intenta actualizar a otro usuario sin ser admin', async () => {
      const req = {
        params: { id: '2' },
        body: { nombre: 'Juan', email: 'juan@example.com', rol: 'cliente' },
        usuario: { id_usuario: 1, rol: 'cliente' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'No tiene permisos para actualizar este usuario.' });
    });

    it('debería devolver error 403 si un cliente intenta cambiar su rol a administrador', async () => {
      const req = {
        params: { id: '1' },
        body: { nombre: 'Juan', email: 'juan@example.com', rol: 'administrador' },
        usuario: { id_usuario: 1, rol: 'cliente' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'No tiene permisos para asignarse rol de administrador.' });
    });

    it('debería devolver error 404 si el usuario no existe', async () => {
      UserDAO.findById.mockResolvedValue(null);

      const req = {
        params: { id: '1' },
        body: { nombre: 'Juan', email: 'juan@example.com', rol: 'cliente' },
        usuario: { id_usuario: 1, rol: 'cliente' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado.' });
    });

    it('debería manejar errores de servidor', async () => {
      UserDAO.findById.mockRejectedValue(new Error('DB Error'));

      const req = {
        params: { id: '1' },
        body: { nombre: 'Juan', email: 'juan@example.com', rol: 'cliente' },
        usuario: { id_usuario: 1, rol: 'cliente' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor.' });
    });
  });

  describe('deleteUser', () => {
    it('debería eliminar un usuario si el rol es administrador', async () => {
      UserDAO.deleteUser.mockResolvedValue(true);

      const req = {
        params: { id: '1' },
        usuario: { rol: 'administrador' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.deleteUser(req, res);

      expect(UserDAO.deleteUser).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Usuario eliminado correctamente.' });
    });

    it('debería devolver error 403 si no es administrador', async () => {
      const req = {
        params: { id: '1' },
        usuario: { rol: 'cliente' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'No tiene permisos para eliminar usuarios.' });
    });

    it('debería devolver error 404 si el usuario no existe', async () => {
      UserDAO.deleteUser.mockResolvedValue(false);

      const req = {
        params: { id: '1' },
        usuario: { rol: 'administrador' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado.' });
    });

    it('debería manejar errores de servidor', async () => {
      UserDAO.deleteUser.mockRejectedValue(new Error('DB Error'));

      const req = {
        params: { id: '1' },
        usuario: { rol: 'administrador' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor.' });
    });
  });

});
