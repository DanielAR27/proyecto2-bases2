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
      
      console.log(adminToken);

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
  
  describe('GET /restaurants/location - Obtener restaurantes con ubicación', () => {
    let restaurantWithLocationId;

    beforeAll(async () => {
      // Limpiar caché antes de empezar
      await redisClient.del('restaurants:geo:all');
      
      // Crear un restaurante para agregar ubicación
      const createResponse = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Restaurante con Ubicación',
          direccion: 'Dirección para Geo Test'
        });
      
      restaurantWithLocationId = createResponse.body.restaurante.id_restaurante || createResponse.body.restaurante._id;
      createdRestaurantIds.push(restaurantWithLocationId);
      
      // Agregar ubicación al restaurante
      await request(app)
        .put(`/restaurants/${restaurantWithLocationId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitud: 9.9281,
          longitud: -84.0907
        });
    });

    afterAll(async () => {
      // Limpiar caché después de las pruebas
      await redisClient.del('restaurants:geo:all');
    });

    it('un administrador puede obtener todos los restaurantes con ubicación', async () => {
      const res = await request(app)
        .get('/restaurants/location')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Restaurantes con ubicación obtenidos correctamente.');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('restaurantes');
      expect(Array.isArray(res.body.restaurantes)).toBe(true);
      
      // Debe haber al menos el restaurante que configuramos
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      
      // Verificar que incluye el restaurante con ubicación que configuramos
      const restaurantWithLocation = res.body.restaurantes.find(r => 
        (r.id_restaurante || r._id).toString() === restaurantWithLocationId.toString()
      );
      expect(restaurantWithLocation).toBeDefined();
      
      // Convertir a números para comparar (maneja string y number de Postgres/Mongo)
      expect(parseFloat(restaurantWithLocation.latitud)).toBeCloseTo(9.9281, 4);
      expect(parseFloat(restaurantWithLocation.longitud)).toBeCloseTo(-84.0907, 4);
      expect(restaurantWithLocation).toHaveProperty('nombre');
      expect(restaurantWithLocation).toHaveProperty('direccion');
      expect(restaurantWithLocation).toHaveProperty('id_admin');
    });

    it('debe guardar la respuesta en caché y recuperarla en solicitudes subsecuentes', async () => {
      // Primera solicitud - debería guardar en caché
      const firstRes = await request(app)
        .get('/restaurants/location')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(firstRes.statusCode).toBe(200);
      
      // Verificar que se guardó en caché
      const cacheKey = 'restaurants:geo:all';
      const cachedData = await redisClient.get(cacheKey);
      expect(cachedData).not.toBeNull();
      
      // El caché debe contener el objeto completo
      const parsedCache = JSON.parse(cachedData);
      expect(parsedCache).toHaveProperty('message');
      expect(parsedCache).toHaveProperty('total');
      expect(parsedCache).toHaveProperty('restaurantes');
      
      // Segunda solicitud - debería recuperar de caché
      const secondRes = await request(app)
        .get('/restaurants/location')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body).toEqual(firstRes.body);
    });

    it('no debe permitir a un cliente acceder a la información de ubicaciones', async () => {
      const res = await request(app)
        .get('/restaurants/location')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No tiene permisos para acceder a esta información.');
    });

    it('debe retornar error 401 sin token de autenticación', async () => {
      const res = await request(app).get('/restaurants/location');
      expect([401, 403, 500].includes(res.statusCode)).toBe(true);
      expect(res.body).toHaveProperty('error');
    });

    it('debe retornar error 401 con token inválido', async () => {
      const res = await request(app)
        .get('/restaurants/location')
        .set('Authorization', 'Bearer invalid.token.here');
      
      expect([401, 403, 500].includes(res.statusCode)).toBe(true);
      expect(res.body).toHaveProperty('error');
    });

    it('debe retornar solo restaurantes que tienen ubicación configurada', async () => {
      const res = await request(app)
        .get('/restaurants/location')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      
      // Todos los restaurantes en la respuesta deben tener latitud y longitud
      res.body.restaurantes.forEach(restaurante => {
        expect(restaurante.latitud).toBeDefined();
        expect(restaurante.longitud).toBeDefined();
        
        // Convertir a números para verificar tipo (maneja string y number)
        const lat = parseFloat(restaurante.latitud);
        const lng = parseFloat(restaurante.longitud);
        expect(typeof lat).toBe('number');
        expect(typeof lng).toBe('number');
        expect(lat).not.toBeNaN();
        expect(lng).not.toBeNaN();
      });
    });

    it('debe incluir todos los campos necesarios para análisis OLAP', async () => {
      const res = await request(app)
        .get('/restaurants/location')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.restaurantes.length).toBeGreaterThan(0);
      
      const restaurante = res.body.restaurantes[0];
      expect(restaurante).toHaveProperty('id_restaurante');
      expect(restaurante).toHaveProperty('nombre');
      expect(restaurante).toHaveProperty('direccion');
      expect(restaurante).toHaveProperty('id_admin');
      expect(restaurante).toHaveProperty('latitud');
      expect(restaurante).toHaveProperty('longitud');
    });
  });

  describe('PUT /restaurants/:id/location - Actualizar ubicación restaurante', () => {
    let testRestaurantId;

    beforeAll(async () => {
      // Crear un restaurante específico para estosf tests
      const createResponse = await request(app)
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Restaurante Location Test',
          direccion: 'Dirección Location Test'
        });
      
      testRestaurantId = createResponse.body.restaurante.id_restaurante || createResponse.body.restaurante._id;
      createdRestaurantIds.push(testRestaurantId);
    });

    it('un administrador puede actualizar ubicación de restaurante', async () => {
      const locationData = {
        latitud: 9.9341,
        longitud: -84.0877
      };

      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ubicación del restaurante actualizada correctamente.');
      
      // Convertir a números para comparar (maneja string y number de Postgres/Mongo)
      expect(parseFloat(res.body.restaurante.latitud)).toBeCloseTo(9.9341, 4);
      expect(parseFloat(res.body.restaurante.longitud)).toBeCloseTo(-84.0877, 4);
      expect(res.body.restaurante).toHaveProperty('nombre', 'Restaurante Location Test');
      expect(res.body.restaurante).toHaveProperty('direccion', 'Dirección Location Test');
    });

    it('debe invalidar cachés relacionados al actualizar ubicación', async () => {
      // Crear algunos cachés para verificar invalidación
      await redisClient.set(`restaurant:${testRestaurantId}`, JSON.stringify({ test: 'cache' }));
      await redisClient.set('restaurants:all', JSON.stringify({ test: 'cache' }));
      await redisClient.set('restaurants:geo:all', JSON.stringify({ test: 'cache' }));

      const locationData = {
        latitud: 10.0,
        longitud: -84.0
      };

      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData);

      expect(res.statusCode).toBe(200);

      // Verificar que los cachés se invalidaron
      const restaurantCache = await redisClient.get(`restaurant:${testRestaurantId}`);
      const restaurantsAllCache = await redisClient.get('restaurants:all');
      const restaurantsGeoCache = await redisClient.get('restaurants:geo:all');

      expect(restaurantCache).toBeNull();
      expect(restaurantsAllCache).toBeNull();
      expect(restaurantsGeoCache).toBeNull();
    });

    it('no debe permitir a un cliente actualizar ubicación de restaurante', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ latitud: 9.9341, longitud: -84.0877 });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No autorizado para actualizar esta ubicación.');
    });

    it('debe retornar error 401 sin token de autenticación', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .send({ latitud: 9.9341, longitud: -84.0877 });

      expect([401, 403, 500].includes(res.statusCode)).toBe(true);
      expect(res.body).toHaveProperty('error');
    });

    it('debe rechazar actualización sin latitud', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ longitud: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud y longitud son obligatorios.');
    });

    it('debe rechazar actualización sin longitud', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: 9.9341 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud y longitud son obligatorios.');
    });

    it('debe rechazar latitud fuera de rango (mayor a 90)', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: 91, longitud: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud debe estar entre -90 y 90 grados.');
    });

    it('debe rechazar latitud fuera de rango (menor a -90)', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: -91, longitud: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud debe estar entre -90 y 90 grados.');
    });

    it('debe rechazar longitud fuera de rango (mayor a 180)', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: 9.9341, longitud: 181 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Longitud debe estar entre -180 y 180 grados.');
    });

    it('debe rechazar longitud fuera de rango (menor a -180)', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: 9.9341, longitud: -181 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Longitud debe estar entre -180 y 180 grados.');
    });

    it('debe rechazar coordenadas no numéricas', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: 'no-es-numero', longitud: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud y longitud deben ser números válidos.');
    });

    it('debe manejar coordenadas como strings (compatibilidad con forms)', async () => {
      const res = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          latitud: '9.9281',  // String válido
          longitud: '-84.0907' // String válido
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ubicación del restaurante actualizada correctamente.');
      expect(parseFloat(res.body.restaurante.latitud)).toBeCloseTo(9.9281, 4);
      expect(parseFloat(res.body.restaurante.longitud)).toBeCloseTo(-84.0907, 4);
    });

    it('debe retornar error 404 para restaurante inexistente', async () => {
      const nonExistentId = 99999;
      const res = await request(app)
        .put(`/restaurants/${nonExistentId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: 9.9341, longitud: -84.0877 });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Restaurante no encontrado.');
    });

    it('debe verificar que la ubicación se persiste correctamente', async () => {
      // Actualizar ubicación
      const updateRes = await request(app)
        .put(`/restaurants/${testRestaurantId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: 9.8888, longitud: -84.1111 });

      expect(updateRes.statusCode).toBe(200);

      // Verificar que se puede obtener el restaurante con la ubicación actualizada
      const getRes = await request(app)
        .get(`/restaurants/${testRestaurantId}`);

      expect(getRes.statusCode).toBe(200);
      expect(parseFloat(getRes.body.latitud)).toBeCloseTo(9.8888, 4);
      expect(parseFloat(getRes.body.longitud)).toBeCloseTo(-84.1111, 4);
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