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

// REEMPLAZAR COMPLETO el describe de GET /users/location en user.int.test.js:

  describe('GET /users/location - Obtener usuarios con ubicación', () => {
    beforeAll(async () => {
      // Limpiar caché antes de empezar
      await redisClient.del('users:geo:all');
      
      // Agregar ubicación a los usuarios de prueba
      await request(app)
        .put(`/users/${userId}/location`)
        .set('Authorization', userToken)
        .send({
          latitud: 9.9341,
          longitud: -84.0877,
          direccion_completa: 'Cartago, Costa Rica'
        });

      await request(app)
        .put(`/users/${secondUserId}/location`)
        .set('Authorization', adminToken)
        .send({
          latitud: 9.9280,
          longitud: -83.9200,
          direccion_completa: 'San José, Costa Rica'
        });
    });

    afterAll(async () => {
      // Limpiar caché después de las pruebas
      await redisClient.del('users:geo:all');
    });

    it('un administrador puede obtener todos los usuarios con ubicación', async () => {
      const res = await request(app)
        .get('/users/location')
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Usuarios con ubicación obtenidos correctamente.');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('usuarios');
      expect(Array.isArray(res.body.usuarios)).toBe(true);
      
      // Debe haber al menos los 2 usuarios que configuramos
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      
      // Verificar que incluye los usuarios con ubicación que configuramos
      const userWithLocation = res.body.usuarios.find(u => u.id_usuario === userId);
      expect(userWithLocation).toBeDefined();
      
      // Convertir a números para comparar (maneja string y number)
      expect(parseFloat(userWithLocation.latitud)).toBeCloseTo(9.9341, 4);
      expect(parseFloat(userWithLocation.longitud)).toBeCloseTo(-84.0877, 4);
      expect(userWithLocation).toHaveProperty('direccion_completa', 'Cartago, Costa Rica');
      expect(userWithLocation).toHaveProperty('nombre');
      expect(userWithLocation).toHaveProperty('email');
      expect(userWithLocation).toHaveProperty('rol');
    });

    it('debe guardar la respuesta en caché y recuperarla en solicitudes subsecuentes', async () => {
      // Primera solicitud - debería guardar en caché
      const firstRes = await request(app)
        .get('/users/location')
        .set('Authorization', adminToken);
      
      expect(firstRes.statusCode).toBe(200);
      
      // Verificar que se guardó en caché
      const cacheKey = 'users:geo:all';
      const cachedData = await redisClient.get(cacheKey);
      expect(cachedData).not.toBeNull();
      
      // El caché debe contener el objeto completo
      const parsedCache = JSON.parse(cachedData);
      expect(parsedCache).toHaveProperty('message');
      expect(parsedCache).toHaveProperty('total');
      expect(parsedCache).toHaveProperty('usuarios');
      
      // Segunda solicitud - debería recuperar de caché
      const secondRes = await request(app)
        .get('/users/location')
        .set('Authorization', adminToken);
      
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body).toEqual(firstRes.body);
    });

    it('no debe permitir a un cliente acceder a la información de ubicaciones', async () => {
      const res = await request(app)
        .get('/users/location')
        .set('Authorization', userToken);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No tiene permisos para acceder a esta información.');
    });

    it('debe retornar error 401 sin token de autenticación', async () => {
      const res = await request(app).get('/users/location');
      expect(res.statusCode).toBe(401);
    });

    it('debe retornar error 401 con token inválido', async () => {
      const res = await request(app)
        .get('/users/location')
        .set('Authorization', 'Bearer invalid.token.here');
      
      expect(res.statusCode).toBe(401);
    });

    it('debe retornar solo usuarios que tienen ubicación configurada', async () => {
      const res = await request(app)
        .get('/users/location')
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      
      // Todos los usuarios en la respuesta deben tener latitud y longitud
      res.body.usuarios.forEach(usuario => {
        expect(usuario.latitud).toBeDefined();
        expect(usuario.longitud).toBeDefined();
        
        // Convertir a números para verificar tipo (maneja string y number)
        const lat = parseFloat(usuario.latitud);
        const lng = parseFloat(usuario.longitud);
        expect(typeof lat).toBe('number');
        expect(typeof lng).toBe('number');
        expect(lat).not.toBeNaN();
        expect(lng).not.toBeNaN();
      });
    });

    it('debe incluir todos los campos necesarios para análisis OLAP', async () => {
      const res = await request(app)
        .get('/users/location')
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.usuarios.length).toBeGreaterThan(0);
      
      const usuario = res.body.usuarios[0];
      expect(usuario).toHaveProperty('id_usuario');
      expect(usuario).toHaveProperty('nombre');
      expect(usuario).toHaveProperty('email');
      expect(usuario).toHaveProperty('rol');
      expect(usuario).toHaveProperty('latitud');
      expect(usuario).toHaveProperty('longitud');
      expect(usuario).toHaveProperty('direccion_completa');
      expect(usuario).toHaveProperty('fecha_registro');
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

  describe('PUT /users/:id/location - Actualizar ubicación usuario', () => {
    it('un usuario puede actualizar su propia ubicación', async () => {
      const locationData = {
        latitud: 9.9341,
        longitud: -84.0877,
        direccion_completa: 'Cartago, Costa Rica'
      };

      const res = await request(app)
        .put(`/users/${userId}/location`)
        .set('Authorization', userToken)
        .send(locationData);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ubicación actualizada correctamente.');
      // Convertir a números para comparar (maneja string y number de Postgres)
      expect(parseFloat(res.body.usuario.latitud)).toBeCloseTo(9.9341, 4);
      expect(parseFloat(res.body.usuario.longitud)).toBeCloseTo(-84.0877, 4);
    });

    it('un administrador puede actualizar ubicación de cualquier usuario', async () => {
      const locationData = {
        latitud: 10.0,
        longitud: -84.0,
        direccion_completa: 'San José, Costa Rica'
      };

      const res = await request(app)
        .put(`/users/${userId}/location`)
        .set('Authorization', adminToken)
        .send(locationData);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ubicación actualizada correctamente.');
    });

    it('debe rechazar actualización sin latitud', async () => {
      const res = await request(app)
        .put(`/users/${userId}/location`)
        .set('Authorization', userToken)
        .send({ longitud: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud y longitud son obligatorios.');
    });

    it('debe rechazar latitud fuera de rango', async () => {
      const res = await request(app)
        .put(`/users/${userId}/location`)
        .set('Authorization', userToken)
        .send({ latitud: 91, longitud: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud debe estar entre -90 y 90 grados.');
    });

    it('debe rechazar longitud fuera de rango', async () => {
      const res = await request(app)
        .put(`/users/${userId}/location`)
        .set('Authorization', userToken)
        .send({ latitud: 9.9341, longitud: 181 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Longitud debe estar entre -180 y 180 grados.');
    });

    it('no debe permitir a un cliente actualizar ubicación de otro usuario', async () => {
      const res = await request(app)
        .put(`/users/${secondUserId}/location`)
        .set('Authorization', userToken)
        .send({ latitud: 9.9341, longitud: -84.0877 });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No autorizado para actualizar esta ubicación.');
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