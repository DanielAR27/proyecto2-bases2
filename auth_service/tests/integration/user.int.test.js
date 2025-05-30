// tests/integration/user.routes.test.js

const request = require('supertest');
const app = require('../../src/app');
const UserDAO = require('../../src/dao/userDAO');
const redisClient = require('../../src/config/redis');
const testUtils = require('../utils/testUtils');

/**
 * Pruebas de integración completas para las rutas de usuarios.
 * Prueba todas las funcionalidades expuestas en userController sin mocks.
 */

describe('UserRoutes - Integración Completa', () => {
  // Datos de prueba
  const adminData = {
    nombre: 'Admin Test',
    email: 'admin_users_test@example.com',
    contrasena: 'admin123',
    rol: 'administrador'
  };

  const userData = {
    nombre: 'Usuario Test',
    email: 'usuario_test@example.com',
    contrasena: 'user123',
    rol: 'cliente'
  };

  const secondUserData = {
    nombre: 'Segundo Usuario',
    email: 'segundo_test@example.com',
    contrasena: 'second123',
    rol: 'cliente'
  };

  // Variables para almacenar tokens e IDs
  let adminToken;
  let userToken;
  let userId;
  let adminId;
  let secondUserId;

  beforeAll(async () => {
    // Esperar a que las conexiones se establezcan
    await testUtils.waitForConnections();
    
    // Registrar y obtener token para el administrador
    const adminAuth = await testUtils.registerAndLoginAdmin(app, adminData);
    adminToken = `Bearer ${adminAuth.token}`;
    adminId = adminAuth.id;
    
    // Registrar y obtener token para el usuario
    const userAuth = await testUtils.registerAndLoginUser(app, userData);
    userToken = `Bearer ${userAuth.token}`;
    userId = userAuth.id;
    
    // Registrar segundo usuario para pruebas adicionales
    const secondUserAuth = await testUtils.registerAndLoginUser(app, secondUserData);
    secondUserId = secondUserAuth.id;
  });
  
  afterAll(async () => {
    // Limpiar datos de prueba
    await testUtils.cleanTestUsers(app, adminToken.replace('Bearer ', ''), [userId, secondUserId], adminId);
    
    // Cerrar conexiones
    await testUtils.closeConnections(redisClient);
  });

  describe('GET /users/me - Obtener usuario actual', () => {
    it('debe retornar el usuario autenticado', async () => {
      const res = await request(app)
        .get('/users/me')
        .set('Authorization', userToken);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('email', userData.email);
      expect(res.body).toHaveProperty('nombre', userData.nombre);
      expect(res.body).toHaveProperty('rol', userData.rol);
    });

    it('debe guardar el usuario en caché y recuperarlo de caché en solicitudes subsecuentes', async () => {
      // Primera solicitud - debería guardar en caché
      const firstRes = await request(app)
        .get('/users/me')
        .set('Authorization', userToken);
      
      expect(firstRes.statusCode).toBe(200);
      
      // Segunda solicitud - debería recuperar de caché
      const cacheKey = `user:${userId}`;
      const cachedData = await redisClient.get(cacheKey);
      expect(cachedData).not.toBeNull();
      
      const secondRes = await request(app)
        .get('/users/me')
        .set('Authorization', userToken);
      
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body).toEqual(firstRes.body);
    });

    it('debe retornar error 401 sin token de autenticación', async () => {
      const res = await request(app).get('/users/me');
      expect(res.statusCode).toBe(401);
    });

    it('debe retornar error 401 con token inválido', async () => {
      const res = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer invalid.token.here');
      
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /users/:id - Actualizar usuario', () => {
    it('un usuario puede actualizar su propia información', async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', userToken)
        .send({ 
          nombre: 'Usuario Actualizado', 
          email: 'usuario_updated@example.com', 
          rol: 'cliente' 
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Usuario actualizado correctamente.');
      expect(res.body.usuario.nombre).toBe('Usuario Actualizado');
      expect(res.body.usuario.email).toBe('usuario_updated@example.com');
      
      // Verificar que se invalidó la caché
      const cacheKey = `user:${userId}`;
      const cachedData = await redisClient.get(cacheKey);
      expect(cachedData).toBeNull();
      
      // Verificar que los cambios se guardaron en la base de datos
      const updatedUser = await UserDAO.findById(userId);
      expect(updatedUser.nombre).toBe('Usuario Actualizado');
    });

    it('un administrador puede actualizar cualquier usuario', async () => {
      const res = await request(app)
        .put(`/users/${secondUserId}`)
        .set('Authorization', adminToken)
        .send({ 
          nombre: 'Segundo Usuario Actualizado', 
          email: 'segundo_updated@example.com', 
          rol: 'cliente' 
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Usuario actualizado correctamente.');
      expect(res.body.usuario.nombre).toBe('Segundo Usuario Actualizado');
    });

    it('un administrador puede cambiar el rol de otro usuario', async () => {
      const res = await request(app)
        .put(`/users/${secondUserId}`)
        .set('Authorization', adminToken)
        .send({ 
          nombre: 'Segundo Usuario Admin', 
          email: 'segundo_admin@example.com', 
          rol: 'administrador' 
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.usuario.rol).toBe('administrador');
    });

    it('no debe permitir a un usuario cliente actualizar a otro usuario', async () => {
      const res = await request(app)
        .put(`/users/${secondUserId}`)
        .set('Authorization', userToken)
        .send({ 
          nombre: 'Segundo Usuario Hackeado', 
          email: 'segundo_hacked@example.com', 
          rol: 'cliente' 
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No tiene permisos para actualizar este usuario.');
    });

    it('no debe permitir a un cliente cambiar su propio rol a administrador', async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', userToken)
        .send({ 
          nombre: 'Usuario Test', 
          email: 'usuario_test@example.com', 
          rol: 'administrador' 
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No tiene permisos para asignarse rol de administrador.');
    });

    it('debe retornar error 400 si faltan campos obligatorios', async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', userToken)
        .send({ 
          nombre: '', 
          email: 'usuario_test@example.com', 
          rol: 'cliente' 
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Todos los campos son obligatorios.');
    });

    it('debe retornar error 400 si el rol es inválido', async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', userToken)
        .send({ 
          nombre: 'Usuario Test', 
          email: 'usuario_test@example.com', 
          rol: 'superusuario' 
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("El rol debe ser 'cliente' o 'administrador'.");
    });

    it('debe retornar error 404 si el usuario no existe', async () => {
      const nonExistentId = 99999;
      const res = await request(app)
        .put(`/users/${nonExistentId}`)
        .set('Authorization', adminToken)
        .send({ 
          nombre: 'No Existe', 
          email: 'noexiste@example.com', 
          rol: 'cliente' 
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Usuario no encontrado.');
    });
  });

  describe('DELETE /users/:id - Eliminar usuario', () => {
    it('un administrador puede eliminar a cualquier usuario', async () => {
      // Primero, verificamos que el usuario existe
      const userCheck = await UserDAO.findById(secondUserId);
      expect(userCheck).not.toBeNull();
      
      const res = await request(app)
        .delete(`/users/${secondUserId}`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Usuario eliminado correctamente.');
      
      // Verificar que el usuario fue eliminado de la base de datos
      const deletedUser = await UserDAO.findById(secondUserId);
      expect(deletedUser).toBeFalsy();
    });

    it('no debe permitir a un cliente eliminar usuarios', async () => {
      const res = await request(app)
        .delete(`/users/${adminId}`)
        .set('Authorization', userToken);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No tiene permisos para eliminar usuarios.');
    });

    it('debe retornar error 404 si intenta eliminar un usuario que no existe', async () => {
      const nonExistentId = 99999;
      const res = await request(app)
        .delete(`/users/${nonExistentId}`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Usuario no encontrado.');
    });

    it('debe invalidar todas las cachés relacionadas al eliminar un usuario', async () => {
      // Crear algunas cachés para probar
      await redisClient.set(`user:${userId}`, JSON.stringify({ id_usuario: userId, nombre: 'Test' }));
      await redisClient.set('restaurants:all', JSON.stringify([{ id: 1 }]));
      await redisClient.set('reservas:all', JSON.stringify([{ id: 1 }]));
      await redisClient.set('pedidos:all', JSON.stringify([{ id: 1 }]));
      
      // Eliminar usuario
      const res = await request(app)
        .delete(`/users/${userId}`)
        .set('Authorization', adminToken);
      
      expect(res.statusCode).toBe(200);
      
      // Verificar que las cachés se invalidaron
      const userCache = await redisClient.get(`user:${userId}`);
      const restaurantsCache = await redisClient.get('restaurants:all');
      const reservasCache = await redisClient.get('reservas:all');
      const pedidosCache = await redisClient.get('pedidos:all');
      
      expect(userCache).toBeNull();
      expect(restaurantsCache).toBeNull();
      expect(reservasCache).toBeNull();
      expect(pedidosCache).toBeNull();
      
      // Verificar que el usuario fue eliminado de la base de datos
      const deletedUser = await UserDAO.findById(userId);
      expect(deletedUser).toBeFalsy();
    });

    it('un administrador puede eliminarse a sí mismo', async () => {
      const res = await request(app)
        .delete(`/users/${adminId}`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Usuario eliminado correctamente.');
      
      // Verificar que el usuario fue eliminado de la base de datos
      const deletedUser = await UserDAO.findById(adminId);
      expect(deletedUser).toBeFalsy();
    });
  });
});