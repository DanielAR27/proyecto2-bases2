// tests/integration/repartidor.routes.test.js

const app = require('../../src/app');
const request = require('supertest');

const RepartidorDAO = require('../../src/dao/repartidorDAO');
const redisClient = require('../../src/config/redis');
const testUtils = require('../utils/testUtils');

/**
 * Pruebas de integración completas para las rutas de repartidores.
 * Usa el servicio de autenticación separado para obtener tokens,
 * pero la instancia de app para las operaciones de repartidores.
 */

describe('RepartidorRoutes - Integración Completa', () => {
  // Datos de prueba
  const adminData = {
    nombre: 'Admin Repartidores',
    email: 'admin_repartidores@example.com',
    contrasena: 'admin123',
    rol: 'administrador'
  };

  const userData = {
    nombre: 'Usuario Regular',
    email: 'usuario_regular_rep@example.com',
    contrasena: 'user123',
    rol: 'cliente'
  };

  const repartidorData = {
    nombre: 'Juan Carlos Pérez',
    telefono: '+506 8888-9999',
    vehiculo: 'Motocicleta Honda 150cc'
  };

  const updatedRepartidorData = {
    nombre: 'Juan Carlos Pérez González',
    telefono: '+506 8888-0000',
    vehiculo: 'Motocicleta Yamaha 200cc'
  };

  // Variables para almacenar tokens e IDs
  let adminToken;
  let userToken;
  let userId;
  let adminId;
  let createdRepartidorIds = [];

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
    // Limpiar datos de prueba (repartidores)
    await testUtils.cleanTestRepartidores(app, adminToken, createdRepartidorIds);
    
    // Limpiar datos de prueba (usuarios) usando el servicio AUTH
    await testUtils.cleanTestUsers(adminToken, [userId], adminId);
    
    // Verificar que no quedan repartidores de prueba
    for (const id of createdRepartidorIds) {
      const repartidor = await RepartidorDAO.findById(id);
      expect(repartidor).toBeFalsy();
    }
    
    // Cerrar conexiones
    await testUtils.closeConnections(redisClient);
  });

  describe('CRUD de Repartidores', () => {
    it('debe permitir a un administrador crear un repartidor', async () => {
      // Hacer directamente la solicitud HTTP para verificar la respuesta completa
      const response = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(repartidorData);
      
      console.log(adminToken);

      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('message', 'Repartidor creado correctamente.');
      expect(response.body).toHaveProperty('repartidor');
      
      const repartidor = response.body.repartidor;
      expect(repartidor).toHaveProperty('nombre', repartidorData.nombre);
      expect(repartidor).toHaveProperty('telefono', repartidorData.telefono);
      expect(repartidor).toHaveProperty('vehiculo', repartidorData.vehiculo);
      expect(repartidor).toHaveProperty('estado', 'disponible');
      expect(repartidor.latitud_actual).toBeFalsy();
      expect(repartidor.longitud_actual).toBeFalsy();
      
      // Guardar ID para pruebas posteriores y limpieza
      const repartidorId = repartidor.id_repartidor;
      console.log('ID obtenido:', repartidorId);
      console.log('Repartidor completo:', repartidor);

      expect(repartidorId).toBeDefined();
      createdRepartidorIds.push(repartidorId);
      
      // Verificar la creación obteniendo el repartidor
      const retrievedRepartidor = await testUtils.getRepartidorById(app, adminToken, repartidorId);
      expect(retrievedRepartidor).toHaveProperty('nombre', repartidorData.nombre);
      expect(retrievedRepartidor).toHaveProperty('telefono', repartidorData.telefono);
      expect(retrievedRepartidor).toHaveProperty('vehiculo', repartidorData.vehiculo);
    });
    });
    
    it('debe obtener todos los repartidores existentes (solo admin)', async () => {
      // Hacer directamente la solicitud HTTP
      const response = await request(app)
        .get('/drivers')
        .set('Authorization', `Bearer ${adminToken}`);
      
      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(200);
      
      const repartidores = response.body;
      expect(Array.isArray(repartidores)).toBe(true);
      expect(repartidores.length).toBeGreaterThanOrEqual(1);
      
      // Verificar que el repartidor creado está en la respuesta
      const foundRepartidor = repartidores.find(
        r => r.id_repartidor === createdRepartidorIds[0] || r._id === createdRepartidorIds[0]
      );
      expect(foundRepartidor).toBeDefined();
      expect(foundRepartidor).toHaveProperty('nombre', repartidorData.nombre);
    });
    
    it('debe obtener un repartidor específico por ID', async () => {
      const repartidorId = createdRepartidorIds[0];
      
      // Hacer directamente la solicitud HTTP
      const response = await request(app)
        .get(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('nombre', repartidorData.nombre);
      expect(response.body).toHaveProperty('telefono', repartidorData.telefono);
      expect(response.body).toHaveProperty('vehiculo', repartidorData.vehiculo);
      
      // Verificar que el ID coincide
      const returnedId = response.body.id_repartidor || response.body._id;
      expect(returnedId.toString()).toBe(repartidorId.toString());
    });
    
    it('debe actualizar un repartidor existente', async () => {
      const repartidorId = createdRepartidorIds[0];
      
      // Hacer directamente la solicitud HTTP
      const response = await request(app)
        .put(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedRepartidorData);
      
      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Repartidor actualizado correctamente.');
      expect(response.body).toHaveProperty('repartidor');
      
      const updatedRepartidor = response.body.repartidor;
      expect(updatedRepartidor).toHaveProperty('nombre', updatedRepartidorData.nombre);
      expect(updatedRepartidor).toHaveProperty('telefono', updatedRepartidorData.telefono);
      expect(updatedRepartidor).toHaveProperty('vehiculo', updatedRepartidorData.vehiculo);
      
      // Verificar la actualización obteniendo el repartidor nuevamente
      const getResponse = await request(app)
        .get(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.body).toHaveProperty('nombre', updatedRepartidorData.nombre);
      expect(getResponse.body).toHaveProperty('telefono', updatedRepartidorData.telefono);
      expect(getResponse.body).toHaveProperty('vehiculo', updatedRepartidorData.vehiculo);
    });
    
    it('debe eliminar un repartidor existente', async () => {
      const repartidorId = createdRepartidorIds[0];
      
      // Hacer directamente la solicitud HTTP
      const response = await request(app)
        .delete(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      // Verificar la respuesta HTTP
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Repartidor eliminado correctamente.');
      
      // Verificar que el repartidor fue eliminado
      const getResponse = await request(app)
        .get(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(getResponse.statusCode).toBe(404);
      expect(getResponse.body).toHaveProperty('error', 'Repartidor no encontrado.');
      
      // Verificar directamente en la base de datos
      const deletedRepartidor = await RepartidorDAO.findById(repartidorId);
      expect(deletedRepartidor).toBeFalsy();
      
      // Eliminamos el ID de la lista ya que se ha eliminado
      createdRepartidorIds = createdRepartidorIds.filter(id => id !== repartidorId);
    });
    
    it('debe devolver 404 al intentar obtener un repartidor inexistente', async () => {
      const nonExistentId = 99999;
      
      const response = await request(app)
        .get(`/drivers/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Repartidor no encontrado.');
    });
  
  // Flujo completo: crear, actualizar, eliminar en un solo test
  describe('Flujo completo de repartidor', () => {
    it('debe realizar un ciclo completo de operaciones CRUD', async () => {
      // 1. Crear repartidor
      const createResponse = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'María González López',
          telefono: '+506 7777-8888',
          vehiculo: 'Bicicleta eléctrica'
        });
      
      expect(createResponse.statusCode).toBe(201);
      expect(createResponse.body).toHaveProperty('message', 'Repartidor creado correctamente.');
      
      const repartidor = createResponse.body.repartidor;
      const repartidorId = repartidor.id_repartidor || repartidor._id;
      expect(repartidorId).toBeDefined();
      createdRepartidorIds.push(repartidorId);
      
      // 2. Actualizar repartidor
      const updateResponse = await request(app)
        .put(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'María González Actualizada',
          telefono: '+506 7777-0000',
          vehiculo: 'Motocicleta 250cc'
        });
      
      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.body.repartidor).toHaveProperty('nombre', 'María González Actualizada');
      expect(updateResponse.body.repartidor).toHaveProperty('telefono', '+506 7777-0000');
      expect(updateResponse.body.repartidor).toHaveProperty('vehiculo', 'Motocicleta 250cc');
      
      // 3. Obtener repartidor
      const getResponse = await request(app)
        .get(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.body).toHaveProperty('nombre', 'María González Actualizada');
      expect(getResponse.body).toHaveProperty('telefono', '+506 7777-0000');
      expect(getResponse.body).toHaveProperty('vehiculo', 'Motocicleta 250cc');
      
      // 4. Eliminar repartidor
      const deleteResponse = await request(app)
        .delete(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message', 'Repartidor eliminado correctamente.');
      
      // 5. Verificar que fue eliminado
      const getAfterDeleteResponse = await request(app)
        .get(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(getAfterDeleteResponse.statusCode).toBe(404);
      
      const deletedRepartidor = await RepartidorDAO.findById(repartidorId);
      expect(deletedRepartidor).toBeFalsy();
      
      // Eliminamos el ID de la lista ya que se ha eliminado
      createdRepartidorIds = createdRepartidorIds.filter(id => id !== repartidorId);
    });
  });
  
  // Test de verificación de permisos
  describe('Verificación de permisos', () => {
    it('no debe permitir a un usuario regular crear un repartidor', async () => {
      const res = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${userToken}`)
        .send(repartidorData);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Solo los administradores pueden crear repartidores.');
    });
    
    it('no debe permitir ver repartidores sin autenticación', async () => {
      const res = await request(app)
        .get('/drivers');
      
      expect([401, 403, 500].includes(res.statusCode)).toBe(true);
      expect(res.body).toHaveProperty('error');
    });
    
    it('no debe permitir a un usuario regular ver todos los repartidores', async () => {
      const res = await request(app)
        .get('/drivers')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Solo los administradores pueden ver todos los repartidores.');
    });
    
    it('no debe permitir actualizar un repartidor sin autenticación', async () => {
      // Primero crear un repartidor para la prueba
      const createResponse = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Repartidor Para Permisos',
          telefono: '+506 9999-0000',
          vehiculo: 'Scooter'
        });
      
      const repartidorId = createResponse.body.repartidor.id_repartidor || createResponse.body.repartidor._id;
      createdRepartidorIds.push(repartidorId);
      
      // Intentar actualizar sin token
      const res = await request(app)
        .put(`/drivers/${repartidorId}`)
        .send({
          nombre: 'Intento Actualización No Auth',
          telefono: '+506 0000-0000',
          vehiculo: 'No debería actualizarse'
        });
      
      expect([401, 403, 500].includes(res.statusCode)).toBe(true);
      expect(res.body).toHaveProperty('error');
    });
    
    it('no debe permitir a un usuario regular eliminar un repartidor', async () => {
      // Usar el repartidor creado en la prueba anterior
      const repartidorId = createdRepartidorIds[createdRepartidorIds.length - 1];
      
      const res = await request(app)
        .delete(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Solo los administradores pueden eliminar repartidores.');
    });
  });

  // Pruebas de validación de entrada
  describe('Validación de entrada', () => {
    it('debe requerir nombre, teléfono y vehículo al crear un repartidor', async () => {
      // Sin nombre
      const resSinNombre = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          telefono: '+506 8888-9999',
          vehiculo: 'Motocicleta'
        });
      
      expect(resSinNombre.statusCode).toBe(400);
      expect(resSinNombre.body).toHaveProperty('error', 'Nombre, teléfono y vehículo son obligatorios.');
      
      // Sin teléfono
      const resSinTelefono = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Juan Pérez',
          vehiculo: 'Motocicleta'
        });
      
      expect(resSinTelefono.statusCode).toBe(400);
      expect(resSinTelefono.body).toHaveProperty('error', 'Nombre, teléfono y vehículo son obligatorios.');
      
      // Sin vehículo
      const resSinVehiculo = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Juan Pérez',
          telefono: '+506 8888-9999'
        });
      
      expect(resSinVehiculo.statusCode).toBe(400);
      expect(resSinVehiculo.body).toHaveProperty('error', 'Nombre, teléfono y vehículo son obligatorios.');
    });
    
    it('debe requerir todos los campos al actualizar un repartidor', async () => {
      // Primero crear un repartidor para la prueba
      const createResponse = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Repartidor Para Validación',
          telefono: '+506 5555-6666',
          vehiculo: 'Bicicleta'
        });
      
      const repartidorId = createResponse.body.repartidor.id_repartidor || createResponse.body.repartidor._id;
      createdRepartidorIds.push(repartidorId);
      
      // Intentar actualizar sin nombre
      const resSinNombre = await request(app)
        .put(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          telefono: '+506 5555-7777',
          vehiculo: 'Motocicleta actualizada'
        });
      
      expect(resSinNombre.statusCode).toBe(400);
      expect(resSinNombre.body).toHaveProperty('error', 'Nombre, teléfono y vehículo son obligatorios.');
    });
    
    it('debe devolver 404 al intentar actualizar un repartidor inexistente', async () => {
      const nonExistentId = 99999;
      
      const res = await request(app)
        .put(`/drivers/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Repartidor Inexistente',
          telefono: '+506 0000-0000',
          vehiculo: 'Vehículo Inexistente'
        });
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Repartidor no encontrado.');
    });
    
    it('debe devolver 404 al intentar eliminar un repartidor inexistente', async () => {
      const nonExistentId = 99999;
      
      const res = await request(app)
        .delete(`/drivers/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Repartidor no encontrado.');
    });
  });
  
  describe('GET /drivers/available - Obtener repartidores disponibles', () => {
    let repartidorAvailableId;

    beforeAll(async () => {
      // Limpiar caché antes de empezar
      await redisClient.del('repartidores:available');
      
      // Crear un repartidor para las pruebas
      const createResponse = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Repartidor Disponible Test',
          telefono: '+506 1111-2222',
          vehiculo: 'Motocicleta de prueba'
        });
      
      repartidorAvailableId = createResponse.body.repartidor.id_repartidor || createResponse.body.repartidor._id;
      createdRepartidorIds.push(repartidorAvailableId);
    });

    afterAll(async () => {
      // Limpiar caché después de las pruebas
      await redisClient.del('repartidores:available');
    });

    it('un administrador puede obtener todos los repartidores disponibles', async () => {
      const res = await request(app)
        .get('/drivers/available')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Repartidores disponibles obtenidos correctamente.');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('repartidores');
      expect(Array.isArray(res.body.repartidores)).toBe(true);
      
      // Debe haber al menos el repartidor que configuramos
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      
      // Verificar que incluye el repartidor disponible que configuramos
      const repartidorDisponible = res.body.repartidores.find(r => 
        (r.id_repartidor || r._id).toString() === repartidorAvailableId.toString()
      );
      expect(repartidorDisponible).toBeDefined();
      expect(repartidorDisponible).toHaveProperty('estado', 'disponible');
      expect(repartidorDisponible).toHaveProperty('nombre');
      expect(repartidorDisponible).toHaveProperty('telefono');
      expect(repartidorDisponible).toHaveProperty('vehiculo');
    });

    it('debe guardar la respuesta en caché y recuperarla en solicitudes subsecuentes', async () => {
      // Primera solicitud - debería guardar en caché
      const firstRes = await request(app)
        .get('/drivers/available')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(firstRes.statusCode).toBe(200);
      
      // Verificar que se guardó en caché
      const cacheKey = 'repartidores:available';
      const cachedData = await redisClient.get(cacheKey);
      expect(cachedData).not.toBeNull();
      
      // El caché debe contener el objeto completo
      const parsedCache = JSON.parse(cachedData);
      expect(parsedCache).toHaveProperty('message');
      expect(parsedCache).toHaveProperty('total');
      expect(parsedCache).toHaveProperty('repartidores');
      
      // Segunda solicitud - debería recuperar de caché
      const secondRes = await request(app)
        .get('/drivers/available')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body).toEqual(firstRes.body);
    });

    it('no debe permitir a un cliente acceder a la información de repartidores disponibles', async () => {
      const res = await request(app)
        .get('/drivers/available')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No tiene permisos para acceder a esta información.');
    });

    it('debe retornar error sin token de autenticación', async () => {
      const res = await request(app).get('/drivers/available');
      expect([401, 403, 500].includes(res.statusCode)).toBe(true);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /drivers/available/location - Obtener repartidores disponibles con ubicación', () => {
    let repartidorWithLocationId;

    beforeAll(async () => {
      // Limpiar caché antes de empezar
      await redisClient.del('repartidores:available:location');
      
      // Crear un repartidor para agregar ubicación
      const createResponse = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Repartidor con Ubicación',
          telefono: '+506 3333-4444',
          vehiculo: 'Motocicleta con GPS'
        });
      
      repartidorWithLocationId = createResponse.body.repartidor.id_repartidor || createResponse.body.repartidor._id;
      createdRepartidorIds.push(repartidorWithLocationId);
      
      // Agregar ubicación al repartidor
      await request(app)
        .put(`/drivers/${repartidorWithLocationId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitud_actual: 9.9342,
          longitud_actual: -84.0875
        });
    });

    afterAll(async () => {
      // Limpiar caché después de las pruebas
      await redisClient.del('repartidores:available:location');
    });

    it('un administrador puede obtener repartidores disponibles con ubicación', async () => {
      const res = await request(app)
        .get('/drivers/available/location')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Repartidores disponibles con ubicación obtenidos correctamente.');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('repartidores');
      expect(Array.isArray(res.body.repartidores)).toBe(true);
      
      // Debe haber al menos el repartidor que configuramos
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      
      // Verificar que incluye el repartidor con ubicación que configuramos
      const repartidorWithLocation = res.body.repartidores.find(r => 
        (r.id_repartidor || r._id).toString() === repartidorWithLocationId.toString()
      );
      expect(repartidorWithLocation).toBeDefined();
      
      // Convertir a números para comparar (maneja string y number de Postgres/Mongo)
      expect(parseFloat(repartidorWithLocation.latitud_actual)).toBeCloseTo(9.9342, 4);
      expect(parseFloat(repartidorWithLocation.longitud_actual)).toBeCloseTo(-84.0875, 4);
      expect(repartidorWithLocation).toHaveProperty('estado', 'disponible');
      expect(repartidorWithLocation).toHaveProperty('nombre');
      expect(repartidorWithLocation).toHaveProperty('telefono');
      expect(repartidorWithLocation).toHaveProperty('vehiculo');
    });

    it('debe retornar solo repartidores que tienen ubicación configurada y están disponibles', async () => {
      const res = await request(app)
        .get('/drivers/available/location')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      
      // Todos los repartidores en la respuesta deben tener latitud_actual, longitud_actual y estado disponible
      res.body.repartidores.forEach(repartidor => {
        expect(repartidor.latitud_actual).toBeDefined();
        expect(repartidor.longitud_actual).toBeDefined();
        expect(repartidor.estado).toBe('disponible');
        
        // Convertir a números para verificar tipo (maneja string y number)
        const lat = parseFloat(repartidor.latitud_actual);
        const lng = parseFloat(repartidor.longitud_actual);
        expect(typeof lat).toBe('number');
        expect(typeof lng).toBe('number');
        expect(lat).not.toBeNaN();
        expect(lng).not.toBeNaN();
      });
    });

    it('debe incluir todos los campos necesarios para análisis OLAP y Neo4J', async () => {
      const res = await request(app)
        .get('/drivers/available/location')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.repartidores.length).toBeGreaterThan(0);
      
      const repartidor = res.body.repartidores[0];
      expect(repartidor).toHaveProperty('id_repartidor');
      expect(repartidor).toHaveProperty('nombre');
      expect(repartidor).toHaveProperty('telefono');
      expect(repartidor).toHaveProperty('vehiculo');
      expect(repartidor).toHaveProperty('latitud_actual');
      expect(repartidor).toHaveProperty('longitud_actual');
      expect(repartidor).toHaveProperty('estado');
    });
  });

  describe('PUT /drivers/:id/location - Actualizar ubicación repartidor', () => {
    let testRepartidorId;

    beforeAll(async () => {
      // Crear un repartidor específico para estos tests
      const createResponse = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Repartidor Location Test',
          telefono: '+506 5555-1111',
          vehiculo: 'Motocicleta GPS Test'
        });
      
      testRepartidorId = createResponse.body.repartidor.id_repartidor || createResponse.body.repartidor._id;
      createdRepartidorIds.push(testRepartidorId);
    });

    it('un administrador puede actualizar ubicación de repartidor', async () => {
      const locationData = {
        latitud_actual: 9.9341,
        longitud_actual: -84.0877
      };

      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ubicación del repartidor actualizada correctamente.');
      
      // Convertir a números para comparar (maneja string y number de Postgres/Mongo)
      expect(parseFloat(res.body.repartidor.latitud_actual)).toBeCloseTo(9.9341, 4);
      expect(parseFloat(res.body.repartidor.longitud_actual)).toBeCloseTo(-84.0877, 4);
      expect(res.body.repartidor).toHaveProperty('nombre', 'Repartidor Location Test');
      expect(res.body.repartidor).toHaveProperty('telefono', '+506 5555-1111');
    });

    it('debe invalidar cachés relacionados al actualizar ubicación', async () => {
      // Crear algunos cachés para verificar invalidación
      await redisClient.set(`repartidor:${testRepartidorId}`, JSON.stringify({ test: 'cache' }));
      await redisClient.set('repartidores:all', JSON.stringify({ test: 'cache' }));
      await redisClient.set('repartidores:available', JSON.stringify({ test: 'cache' }));
      await redisClient.set('repartidores:available:location', JSON.stringify({ test: 'cache' }));

      const locationData = {
        latitud_actual: 10.0,
        longitud_actual: -84.0
      };

      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData);

      expect(res.statusCode).toBe(200);

      // Verificar que los cachés se invalidaron
      const repartidorCache = await redisClient.get(`repartidor:${testRepartidorId}`);
      const repartidoresAllCache = await redisClient.get('repartidores:all');
      const repartidoresAvailableCache = await redisClient.get('repartidores:available');
      const repartidoresLocationCache = await redisClient.get('repartidores:available:location');

      expect(repartidorCache).toBeNull();
      expect(repartidoresAllCache).toBeNull();
      expect(repartidoresAvailableCache).toBeNull();
      expect(repartidoresLocationCache).toBeNull();
    });

    it('no debe permitir a un cliente actualizar ubicación de repartidor', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ latitud_actual: 9.9341, longitud_actual: -84.0877 });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No autorizado para actualizar esta ubicación.');
    });

    it('debe retornar error sin token de autenticación', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .send({ latitud_actual: 9.9341, longitud_actual: -84.0877 });

      expect([401, 403, 500].includes(res.statusCode)).toBe(true);
      expect(res.body).toHaveProperty('error');
    });

    it('debe rechazar actualización sin latitud_actual', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ longitud_actual: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud y longitud son obligatorios.');
    });

    it('debe rechazar actualización sin longitud_actual', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud_actual: 9.9341 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud y longitud son obligatorios.');
    });

    it('debe rechazar latitud_actual fuera de rango (mayor a 90)', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud_actual: 91, longitud_actual: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud debe estar entre -90 y 90 grados.');
    });

    it('debe rechazar latitud_actual fuera de rango (menor a -90)', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud_actual: -91, longitud_actual: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud debe estar entre -90 y 90 grados.');
    });

    it('debe rechazar longitud_actual fuera de rango (mayor a 180)', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud_actual: 9.9341, longitud_actual: 181 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Longitud debe estar entre -180 y 180 grados.');
    });

    it('debe rechazar longitud_actual fuera de rango (menor a -180)', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud_actual: 9.9341, longitud_actual: -181 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Longitud debe estar entre -180 y 180 grados.');
    });

    it('debe rechazar coordenadas no numéricas', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud_actual: 'no-es-numero', longitud_actual: -84.0877 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Latitud y longitud deben ser números válidos.');
    });

    it('debe manejar coordenadas como strings (compatibilidad con forms)', async () => {
      const res = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          latitud_actual: '9.9281',  // String válido
          longitud_actual: '-84.0907' // String válido
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ubicación del repartidor actualizada correctamente.');
      expect(parseFloat(res.body.repartidor.latitud_actual)).toBeCloseTo(9.9281, 4);
      expect(parseFloat(res.body.repartidor.longitud_actual)).toBeCloseTo(-84.0907, 4);
    });

    it('debe retornar error 404 para repartidor inexistente', async () => {
      const nonExistentId = 99999;
      const res = await request(app)
        .put(`/drivers/${nonExistentId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud_actual: 9.9341, longitud_actual: -84.0877 });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Repartidor no encontrado.');
    });

    it('debe verificar que la ubicación se persiste correctamente', async () => {
      // Actualizar ubicación
      const updateRes = await request(app)
        .put(`/drivers/${testRepartidorId}/location`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud_actual: 9.8888, longitud_actual: -84.1111 });

      expect(updateRes.statusCode).toBe(200);

      // Verificar que se puede obtener el repartidor con la ubicación actualizada
      const getRes = await request(app)
        .get(`/drivers/${testRepartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.statusCode).toBe(200);
      expect(parseFloat(getRes.body.latitud_actual)).toBeCloseTo(9.8888, 4);
      expect(parseFloat(getRes.body.longitud_actual)).toBeCloseTo(-84.1111, 4);
    });
  });
  
  describe('PUT /drivers/:id/status - Actualizar estado repartidor', () => {
    let testStatusRepartidorId;

    beforeAll(async () => {
      // Crear un repartidor específico para estos tests
      const createResponse = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Repartidor Status Test',
          telefono: '+506 6666-7777',
          vehiculo: 'Motocicleta Status Test'
        });
      
      testStatusRepartidorId = createResponse.body.repartidor.id_repartidor || createResponse.body.repartidor._id;
      createdRepartidorIds.push(testStatusRepartidorId);
    });

    it('un administrador puede actualizar estado de repartidor a ocupado', async () => {
      const res = await request(app)
        .put(`/drivers/${testStatusRepartidorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'ocupado' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Estado del repartidor actualizado correctamente.');
      expect(res.body.repartidor).toHaveProperty('estado', 'ocupado');
      expect(res.body.repartidor).toHaveProperty('nombre', 'Repartidor Status Test');
    });

    it('un administrador puede actualizar estado de repartidor a desconectado', async () => {
      const res = await request(app)
        .put(`/drivers/${testStatusRepartidorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'desconectado' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Estado del repartidor actualizado correctamente.');
      expect(res.body.repartidor).toHaveProperty('estado', 'desconectado');
    });

    it('un administrador puede actualizar estado de repartidor a disponible', async () => {
      const res = await request(app)
        .put(`/drivers/${testStatusRepartidorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'disponible' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Estado del repartidor actualizado correctamente.');
      expect(res.body.repartidor).toHaveProperty('estado', 'disponible');
    });

    it('debe rechazar estado inválido', async () => {
      const res = await request(app)
        .put(`/drivers/${testStatusRepartidorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'estado_invalido' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Estado debe ser uno de: disponible, ocupado, desconectado');
    });

    it('debe rechazar actualización sin estado', async () => {
      const res = await request(app)
        .put(`/drivers/${testStatusRepartidorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Estado debe ser uno de: disponible, ocupado, desconectado');
    });

    it('no debe permitir a un cliente actualizar estado de repartidor', async () => {
      const res = await request(app)
        .put(`/drivers/${testStatusRepartidorId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ estado: 'ocupado' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('No autorizado para cambiar el estado.');
    });

    it('debe retornar error 404 para repartidor inexistente', async () => {
      const nonExistentId = 99999;
      const res = await request(app)
        .put(`/drivers/${nonExistentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'ocupado' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Repartidor no encontrado.');
    });

    it('debe invalidar cachés relacionados al actualizar estado', async () => {
      // Crear algunos cachés para verificar invalidación
      await redisClient.set(`repartidor:${testStatusRepartidorId}`, JSON.stringify({ test: 'cache' }));
      await redisClient.set('repartidores:all', JSON.stringify({ test: 'cache' }));
      await redisClient.set('repartidores:available', JSON.stringify({ test: 'cache' }));
      await redisClient.set('repartidores:available:location', JSON.stringify({ test: 'cache' }));

      const res = await request(app)
        .put(`/drivers/${testStatusRepartidorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'ocupado' });

      expect(res.statusCode).toBe(200);

      // Verificar que los cachés se invalidaron
      const repartidorCache = await redisClient.get(`repartidor:${testStatusRepartidorId}`);
      const repartidoresAllCache = await redisClient.get('repartidores:all');
      const repartidoresAvailableCache = await redisClient.get('repartidores:available');
      const repartidoresLocationCache = await redisClient.get('repartidores:available:location');

      expect(repartidorCache).toBeNull();
      expect(repartidoresAllCache).toBeNull();
      expect(repartidoresAvailableCache).toBeNull();
      expect(repartidoresLocationCache).toBeNull();
    });
  });

  // Pruebas de comportamiento de caché
  describe('Comportamiento del caché', () => {
    it('debe usar caché al solicitar repartidores repetidamente', async () => {
      // Crear un repartidor para la prueba
      const createResponse = await request(app)
        .post('/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Repartidor Caché',
          telefono: '+506 8888-1111',
          vehiculo: 'Vehículo Caché'
        });
      
      const repartidorId = createResponse.body.repartidor.id_repartidor || createResponse.body.repartidor._id;
      createdRepartidorIds.push(repartidorId);
      
      // Primera solicitud (llena el caché)
      const firstRes = await request(app)
        .get(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(firstRes.statusCode).toBe(200);
      
      // Segunda solicitud (debería usar caché)
      const secondRes = await request(app)
        .get(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body).toEqual(firstRes.body);
      
      // Actualizar repartidor para invalidar caché
      await request(app)
        .put(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Repartidor Caché Actualizado',
          telefono: '+506 8888-2222',
          vehiculo: 'Vehículo Caché Actualizado'
        });
      
      // Tercera solicitud (debería obtener datos actualizados)
      const thirdRes = await request(app)
        .get(`/drivers/${repartidorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(thirdRes.statusCode).toBe(200);
      expect(thirdRes.body).toHaveProperty('nombre', 'Repartidor Caché Actualizado');
      expect(thirdRes.body).not.toEqual(firstRes.body);
    });
  });
});