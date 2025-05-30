// tests/integration/restaurant.routes.test.js

const app = require('../../src/app');
const request = require('supertest');

const RestaurantDAO = require('../../src/dao/restaurantDAO');
const redisClient = require('../../src/config/redis');
const testUtils = require('../utils/testUtils');

/**
 * Pruebas de integración completas para las rutas de restaurantes.
 * Usa el servicio de autenticación separado para obtener tokens,
 * pero la instancia de app para las operaciones de restaurantes.
 */

describe('RestaurantRoutes - Integración Completa', () => {
  // Datos de prueba
  const adminData = {
    nombre: 'Admin Restaurantes',
    email: 'admin_restaurantes@example.com',
    contrasena: 'admin123',
    rol: 'administrador'
  };

  const userData = {
    nombre: 'Usuario Regular',
    email: 'usuario_regular@example.com',
    contrasena: 'user123',
    rol: 'cliente'
  };

  const restaurantData = {
    nombre: 'Restaurante de Prueba',
    direccion: 'Calle Test 123, Ciudad Test'
  };

  const updatedRestaurantData = {
    nombre: 'Restaurante Actualizado',
    direccion: 'Avenida Test 456, Ciudad Test'
  };

  // Variables para almacenar tokens e IDs
  let adminToken;
  let userToken;
  let userId;
  let adminId;
  let createdRestaurantIds = [];

  beforeAll(async () => {
    // Usar una DB diferente o limpiar completamente para cada prueba
    await redisClient.flushDb();
    
    // Esperar a que las conexiones se establezcan
    await testUtils.waitForConnections();
    
    // Registrar y obtener token para el administrador usando el servicio AUTH
    const adminAuth = await testUtils.registerAndLoginAdmin(adminData);
    adminToken = adminAuth.token;
    adminId = adminAuth.id;
    
    // Comprobar que se obtuvo un token válido
    expect(adminToken).toBeDefined();
    expect(adminToken.length).toBeGreaterThan(0);
    expect(adminId).toBeDefined();
    
    // Registrar y obtener token para el usuario regular usando el servicio AUTH
    const userAuth = await testUtils.registerAndLoginUser(userData);
    userToken = userAuth.token;
    userId = userAuth.id;
    
    // Comprobar que se obtuvo un token válido
    expect(userToken).toBeDefined();
    expect(userToken.length).toBeGreaterThan(0);
    expect(userId).toBeDefined();
  });
  
  afterAll(async () => {
    // Limpiar datos de prueba (restaurantes)
    await testUtils.cleanTestRestaurants(app, adminToken, createdRestaurantIds);
    
    // Limpiar datos de prueba (usuarios) usando el servicio AUTH
    await testUtils.cleanTestUsers(adminToken, [userId], adminId);
    
    // Verificar que no quedan restaurantes de prueba
    for (const id of createdRestaurantIds) {
      const restaurant = await RestaurantDAO.findById(id);
      expect(restaurant).toBeFalsy();
    }
    
    // Cerrar conexiones
    await testUtils.closeConnections(redisClient);
  });

  describe('CRUD de Restaurantes', () => {
    it('debe permitir a un administrador crear un restaurante', async () => {
      // Hacer directamente la solicitud HTTP para verificar la respuesta completa
      const response = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(restaurantData);
      
      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('message', 'Restaurante creado correctamente.');
      expect(response.body).toHaveProperty('restaurante');
      
      const restaurante = response.body.restaurante;
      expect(restaurante).toHaveProperty('nombre', restaurantData.nombre);
      expect(restaurante).toHaveProperty('direccion', restaurantData.direccion);
      
      // Guardar ID para pruebas posteriores y limpieza
      const restaurantId = restaurante.id_restaurante || restaurante._id;
      expect(restaurantId).toBeDefined();
      createdRestaurantIds.push(restaurantId);
      
      // Verificar la creación obteniendo el restaurante
      const retrievedRestaurant = await testUtils.getRestaurantById(app, restaurantId);
      expect(retrievedRestaurant).toHaveProperty('nombre', restaurantData.nombre);
      expect(retrievedRestaurant).toHaveProperty('direccion', restaurantData.direccion);
    });
    
    it('debe obtener todos los restaurantes existentes', async () => {
      // Hacer directamente la solicitud HTTP
      const response = await request(app)
        .get('/restaurants');
      
      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(200);
      
      const restaurantes = response.body;
      expect(Array.isArray(restaurantes)).toBe(true);
      expect(restaurantes.length).toBeGreaterThanOrEqual(1);
      
      // Verificar que el restaurante creado está en la respuesta
      const foundRestaurant = restaurantes.find(
        r => r.id_restaurante === createdRestaurantIds[0] || r._id === createdRestaurantIds[0]
      );
      expect(foundRestaurant).toBeDefined();
      expect(foundRestaurant).toHaveProperty('nombre', restaurantData.nombre);
    });
    
    it('debe obtener un restaurante específico por ID', async () => {
      const restaurantId = createdRestaurantIds[0];
      
      // Hacer directamente la solicitud HTTP
      const response = await request(app)
        .get(`/restaurants/${restaurantId}`);
      
      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('nombre', restaurantData.nombre);
      expect(response.body).toHaveProperty('direccion', restaurantData.direccion);
      
      // Verificar que el ID coincide
      const returnedId = response.body.id_restaurante || response.body._id;
      expect(returnedId.toString()).toBe(restaurantId.toString());
    });
    
    it('debe actualizar un restaurante existente', async () => {
      const restaurantId = createdRestaurantIds[0];
      
      // Hacer directamente la solicitud HTTP
      const response = await request(app)
        .put(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedRestaurantData);
      
      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Restaurante actualizado correctamente.');
      expect(response.body).toHaveProperty('restaurante');
      
      const updatedRestaurant = response.body.restaurante;
      expect(updatedRestaurant).toHaveProperty('nombre', updatedRestaurantData.nombre);
      expect(updatedRestaurant).toHaveProperty('direccion', updatedRestaurantData.direccion);
      
      // Verificar la actualización obteniendo el restaurante nuevamente
      const getResponse = await request(app)
        .get(`/restaurants/${restaurantId}`);
        
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.body).toHaveProperty('nombre', updatedRestaurantData.nombre);
      expect(getResponse.body).toHaveProperty('direccion', updatedRestaurantData.direccion);
    });
    
    it('debe eliminar un restaurante existente', async () => {
      const restaurantId = createdRestaurantIds[0];
      
      // Hacer directamente la solicitud HTTP
      const response = await request(app)
        .delete(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Restaurante eliminado correctamente.');
      
      // Verificar que el restaurante fue eliminado
      const getResponse = await request(app)
        .get(`/restaurants/${restaurantId}`);
      
      expect(getResponse.statusCode).toBe(404);
      expect(getResponse.body).toHaveProperty('error', 'Restaurante no encontrado.');
      
      // Verificar directamente en la base de datos
      const deletedRestaurant = await RestaurantDAO.findById(restaurantId);
      expect(deletedRestaurant).toBeFalsy();
      
      // Eliminamos el ID de la lista ya que se ha eliminado
      createdRestaurantIds = createdRestaurantIds.filter(id => id !== restaurantId);
    });
    
    it('debe devolver 404 al intentar obtener un restaurante inexistente', async () => {
      const nonExistentId = 99999;
      
      const response = await request(app)
        .get(`/restaurants/${nonExistentId}`);
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Restaurante no encontrado.');
    });
  });
  
  // Flujo completo: crear, actualizar, eliminar en un solo test
  describe('Flujo completo de restaurante', () => {
    it('debe realizar un ciclo completo de operaciones CRUD', async () => {
      // 1. Crear restaurante
      const createResponse = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Restaurante Flujo Completo',
          direccion: 'Dirección Flujo Completo'
        });
      
      expect(createResponse.statusCode).toBe(201);
      expect(createResponse.body).toHaveProperty('message', 'Restaurante creado correctamente.');
      
      const restaurante = createResponse.body.restaurante;
      const restaurantId = restaurante.id_restaurante || restaurante._id;
      expect(restaurantId).toBeDefined();
      createdRestaurantIds.push(restaurantId);
      
      // 2. Actualizar restaurante
      const updateResponse = await request(app)
        .put(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Restaurante FC Actualizado',
          direccion: 'Dirección FC Actualizada'
        });
      
      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.body.restaurante).toHaveProperty('nombre', 'Restaurante FC Actualizado');
      expect(updateResponse.body.restaurante).toHaveProperty('direccion', 'Dirección FC Actualizada');
      
      // 3. Obtener restaurante
      const getResponse = await request(app)
        .get(`/restaurants/${restaurantId}`);
      
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.body).toHaveProperty('nombre', 'Restaurante FC Actualizado');
      expect(getResponse.body).toHaveProperty('direccion', 'Dirección FC Actualizada');
      
      // 4. Eliminar restaurante
      const deleteResponse = await request(app)
        .delete(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message', 'Restaurante eliminado correctamente.');
      
      // 5. Verificar que fue eliminado
      const getAfterDeleteResponse = await request(app)
        .get(`/restaurants/${restaurantId}`);
        
      expect(getAfterDeleteResponse.statusCode).toBe(404);
      
      const deletedRestaurant = await RestaurantDAO.findById(restaurantId);
      expect(deletedRestaurant).toBeFalsy();
      
      // Eliminamos el ID de la lista ya que se ha eliminado
      createdRestaurantIds = createdRestaurantIds.filter(id => id !== restaurantId);
    });
  });
  
  // Test de verificación de permisos
  describe('Verificación de permisos', () => {
    it('no debe permitir a un usuario regular crear un restaurante', async () => {
      const res = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${userToken}`)
        .send(restaurantData);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Solo los administradores pueden crear restaurantes.');
    });
    
    it('no debe permitir actualizar un restaurante sin autenticación', async () => {
      // Primero crear un restaurante para la prueba
      const createResponse = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Restaurante Para Permisos',
          direccion: 'Dirección Permisos'
        });
      
      const restaurantId = createResponse.body.restaurante.id_restaurante || createResponse.body.restaurante._id;
      createdRestaurantIds.push(restaurantId);
      
      // Intentar actualizar sin token
      const res = await request(app)
        .put(`/restaurants/${restaurantId}`)
        .send({
          nombre: 'Intento Actualización No Auth',
          direccion: 'No debería actualizarse'
        });
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
    
    it('no debe permitir a un usuario regular eliminar un restaurante', async () => {
      // Usar el restaurante creado en la prueba anterior
      const restaurantId = createdRestaurantIds[createdRestaurantIds.length - 1];
      
      const res = await request(app)
        .delete(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Solo los administradores pueden eliminar restaurantes.');
    });
  });
  
  // Pruebas de validación de entrada
  describe('Validación de entrada', () => {
    it('debe requerir nombre y dirección al crear un restaurante', async () => {
      // Sin nombre
      const resSinNombre = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          direccion: 'Solo dirección'
        });
      
      expect(resSinNombre.statusCode).toBe(400);
      expect(resSinNombre.body).toHaveProperty('error', 'Nombre y dirección son obligatorios.');
      
      // Sin dirección
      const resSinDireccion = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Solo nombre'
        });
      
      expect(resSinDireccion.statusCode).toBe(400);
      expect(resSinDireccion.body).toHaveProperty('error', 'Nombre y dirección son obligatorios.');
    });
    
    it('debe requerir nombre y dirección al actualizar un restaurante', async () => {
      // Primero crear un restaurante para la prueba
      const createResponse = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Restaurante Para Validación',
          direccion: 'Dirección Validación'
        });
      
      const restaurantId = createResponse.body.restaurante.id_restaurante || createResponse.body.restaurante._id;
      createdRestaurantIds.push(restaurantId);
      
      // Intentar actualizar sin nombre
      const resSinNombre = await request(app)
        .put(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          direccion: 'Solo dirección actualizada'
        });
      
      expect(resSinNombre.statusCode).toBe(400);
      expect(resSinNombre.body).toHaveProperty('error', 'Nombre y dirección son obligatorios.');
      
      // Intentar actualizar sin dirección
      const resSinDireccion = await request(app)
        .put(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Solo nombre actualizado'
        });
      
      expect(resSinDireccion.statusCode).toBe(400);
      expect(resSinDireccion.body).toHaveProperty('error', 'Nombre y dirección son obligatorios.');
    });
    
    it('debe devolver 404 al intentar actualizar un restaurante inexistente', async () => {
      const nonExistentId = 99999;
      
      const res = await request(app)
        .put(`/restaurants/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Restaurante Inexistente',
          direccion: 'Dirección Inexistente'
        });
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Restaurante no encontrado.');
    });
    
    it('debe devolver 404 al intentar eliminar un restaurante inexistente', async () => {
      const nonExistentId = 99999;
      
      const res = await request(app)
        .delete(`/restaurants/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Restaurante no encontrado.');
    });
  });
  
  // Pruebas de comportamiento de caché
  describe('Comportamiento del caché', () => {
    it('debe usar caché al solicitar restaurantes repetidamente', async () => {
      // Crear un restaurante para la prueba
      const createResponse = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Restaurante Caché',
          direccion: 'Dirección Caché'
        });
      
      const restaurantId = createResponse.body.restaurante.id_restaurante || createResponse.body.restaurante._id;
      createdRestaurantIds.push(restaurantId);
      
      // Primera solicitud (llena el caché)
      const firstRes = await request(app).get(`/restaurants/${restaurantId}`);
      expect(firstRes.statusCode).toBe(200);
      
      // Segunda solicitud (debería usar caché)
      const secondRes = await request(app).get(`/restaurants/${restaurantId}`);
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body).toEqual(firstRes.body);
      
      // Actualizar restaurante para invalidar caché
      await request(app)
        .put(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Restaurante Caché Actualizado',
          direccion: 'Dirección Caché Actualizada'
        });
      
      // Tercera solicitud (debería obtener datos actualizados)
      const thirdRes = await request(app).get(`/restaurants/${restaurantId}`);
      expect(thirdRes.statusCode).toBe(200);
      expect(thirdRes.body).toHaveProperty('nombre', 'Restaurante Caché Actualizado');
      expect(thirdRes.body).not.toEqual(firstRes.body);
    });
  });
});