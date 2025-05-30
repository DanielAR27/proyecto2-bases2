// tests/integration/menu.routes.test.js

const app = require('../../src/app');
const request = require('supertest');

const MenuDAO = require('../../src/dao/menuDAO');
const redisClient = require('../../src/config/redis');
const testUtils = require('../utils/testUtils');

/**
 * Pruebas de integración completas para las rutas de menús.
 * Usa el servicio de autenticación separado para obtener tokens,
 * pero la instancia de app para las operaciones de menús.
 */

describe('MenuRoutes - Integración Completa', () => {
  // Datos de prueba
  const adminData = {
    nombre: 'Admin Menús',
    email: 'admin_menus@example.com',
    contrasena: 'admin123',
    rol: 'administrador'
  };

  const userData = {
    nombre: 'Usuario Regular',
    email: 'usuario_regular_menus@example.com',
    contrasena: 'user123',
    rol: 'cliente'
  };

  const restaurantData = {
    nombre: 'Restaurante Menús',
    direccion: 'Calle Test 123, Ciudad Test'
  };

  const menuData = {
    nombre: 'Menú de Prueba',
    descripcion: 'Descripción del menú de prueba'
  };

  const updatedMenuData = {
    nombre: 'Menú Actualizado',
    descripcion: 'Descripción actualizada del menú'
  };

  // Variables para almacenar tokens e IDs
  let adminToken;
  let userToken;
  let userId;
  let adminId;
  let restaurantId;
  let createdMenuIds = [];

  beforeAll(async () => {
    // Usar una DB diferente o limpiar completamente para cada prueba
    await redisClient.flushDb();

    // Esperar a que las conexiones se establezcan
    await testUtils.waitForConnections();
    
    // Registrar y obtener token para el administrador usando el servicio AUTH
    const adminAuth = await testUtils.registerAndLoginAdmin(adminData);
    adminToken = adminAuth.token;
    adminId = adminAuth.id;
    
    // Registrar y obtener token para el usuario regular usando el servicio AUTH
    const userAuth = await testUtils.registerAndLoginUser(userData);
    userToken = userAuth.token;
    userId = userAuth.id;

    // Crear un restaurante para asociar los menús
    const restaurant = await testUtils.createRestaurant(app, adminToken, restaurantData);
    restaurantId = restaurant.id_restaurante || restaurant._id;
  });
  
  afterAll(async () => {
    // Limpiar datos de prueba (menús)
    await testUtils.cleanTestMenus(app, adminToken, createdMenuIds);
    
    // Limpiar datos de prueba (restaurante)
    await testUtils.cleanTestRestaurants(app, adminToken, [restaurantId]);
    
    // Limpiar datos de prueba (usuarios) usando el servicio AUTH
    await testUtils.cleanTestUsers(adminToken, [userId], adminId);
    
    // Cerrar conexiones
    await testUtils.closeConnections(redisClient);
  });

  describe('CRUD de Menús', () => {
    it('debe permitir a un administrador crear un menú', async () => {
      const fullMenuData = {
        ...menuData,
        id_restaurante: restaurantId
      };
      
      // Crear un menú usando la API
      const res = await request(app)
        .post('/menus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fullMenuData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Menú creado correctamente.');
      expect(res.body).toHaveProperty('menu');
      expect(res.body.menu).toHaveProperty('nombre', fullMenuData.nombre);
      expect(res.body.menu).toHaveProperty('descripcion', fullMenuData.descripcion);
      
      // Guardar ID para pruebas posteriores y limpieza
      const menuId = res.body.menu.id_menu;
      createdMenuIds.push(menuId);
      
      // Verificar la creación obteniendo el menú
      const getRes = await request(app).get(`/menus/${menuId}`);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toHaveProperty('nombre', fullMenuData.nombre);
    });
    
    it('debe obtener todos los menús existentes', async () => {
      // Obtener todos los menús
      const res = await request(app).get('/menus');
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      
      // Verificar que el primer menú creado está en la lista
      const menuExists = res.body.some(menu => menu.id_menu === createdMenuIds[0]);
      expect(menuExists).toBe(true);
    });
    
    it('debe obtener un menú específico por su ID', async () => {
      const menuId = createdMenuIds[0];
      
      const res = await request(app).get(`/menus/${menuId}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id_menu', menuId);
      expect(res.body).toHaveProperty('nombre', menuData.nombre);
      expect(res.body).toHaveProperty('descripcion', menuData.descripcion);
    });
    
    it('debe actualizar un menú existente', async () => {
      const menuId = createdMenuIds[0];
      
      // Actualizar el menú
      const res = await request(app)
        .put(`/menus/${menuId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedMenuData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Menú actualizado correctamente.');
      expect(res.body.menu).toHaveProperty('nombre', updatedMenuData.nombre);
      expect(res.body.menu).toHaveProperty('descripcion', updatedMenuData.descripcion);
      
      // Verificar la actualización obteniendo el menú nuevamente
      const getRes = await request(app).get(`/menus/${menuId}`);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toHaveProperty('nombre', updatedMenuData.nombre);
    });
    
    it('debe eliminar un menú existente', async () => {
      const menuId = createdMenuIds[0];
      
      // Eliminar el menú
      const res = await request(app)
        .delete(`/menus/${menuId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Menú eliminado correctamente.');
      
      // Verificar que el menú fue eliminado
      const getRes = await request(app).get(`/menus/${menuId}`);
      expect(getRes.statusCode).toBe(404);
      
      // Verificar directamente en la base de datos (opcional)
      const deletedMenu = await MenuDAO.findById(menuId);
      expect(deletedMenu).toBeFalsy();
      
      // Eliminamos el ID de la lista ya que se ha eliminado
      createdMenuIds = createdMenuIds.filter(id => id !== menuId);
    });
  });
  
  // Flujo completo: crear, actualizar, eliminar en un solo test
  describe('Flujo completo de menú', () => {
    it('debe realizar un ciclo completo de operaciones CRUD', async () => {
      // 1. Crear menú
      const fullMenuData = {
        id_restaurante: restaurantId,
        nombre: 'Menú Flujo Completo',
        descripcion: 'Descripción del menú flujo completo'
      };
      
      const createRes = await request(app)
        .post('/menus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fullMenuData);
      
      expect(createRes.statusCode).toBe(201);
      
      const menuId = createRes.body.menu.id_menu;
      createdMenuIds.push(menuId);
      
      // 2. Actualizar menú
      const updateData = {
        nombre: 'Menú FC Actualizado',
        descripcion: 'Descripción FC actualizada'
      };
      
      const updateRes = await request(app)
        .put(`/menus/${menuId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);
      
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.menu).toHaveProperty('nombre', updateData.nombre);
      
      // 3. Obtener menú
      const getRes = await request(app).get(`/menus/${menuId}`);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toHaveProperty('nombre', updateData.nombre);
      
      // 4. Eliminar menú
      const deleteRes = await request(app)
        .delete(`/menus/${menuId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(deleteRes.statusCode).toBe(200);
      
      // 5. Verificar que fue eliminado
      const getDeletedRes = await request(app).get(`/menus/${menuId}`);
      expect(getDeletedRes.statusCode).toBe(404);
      
      // Eliminamos el ID de la lista ya que se ha eliminado
      createdMenuIds = createdMenuIds.filter(id => id !== menuId);
    });
  });
  
  // Test de verificación de caché Redis
  describe('Comportamiento del caché', () => {
    it('debe usar caché al solicitar menús repetidamente', async () => {
      // 1. Crear menú para la prueba
      const fullMenuData = {
        id_restaurante: restaurantId,
        nombre: 'Menú Caché',
        descripcion: 'Descripción del menú caché'
      };
      
      const createRes = await request(app)
        .post('/menus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fullMenuData);
      
      const menuId = createRes.body.menu.id_menu;
      createdMenuIds.push(menuId);
      
      // 2. Primera solicitud (llena el caché)
      const firstRes = await request(app).get(`/menus/${menuId}`);
      expect(firstRes.statusCode).toBe(200);
      
      // 3. Segunda solicitud (debería usar caché)
      // No podemos verificar directamente el uso del caché en la prueba,
      // pero podemos verificar que la respuesta es consistente
      const secondRes = await request(app).get(`/menus/${menuId}`);
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body).toEqual(firstRes.body);
    });
  });
  
  // Test de verificación de permisos
  describe('Verificación de permisos', () => {
    it('no debe permitir a un usuario regular crear un menú', async () => {
      const fullMenuData = {
        id_restaurante: restaurantId,
        nombre: 'Menú No Autorizado',
        descripcion: 'Este menú no debería crearse'
      };
      
      const res = await request(app)
        .post('/menus')
        .set('Authorization', `Bearer ${userToken}`)
        .send(fullMenuData);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Solo los administradores pueden crear menús.');
    });
    
    it('no debe permitir actualizar un menú sin autenticación', async () => {
      // Crear un menú para la prueba
      const fullMenuData = {
        id_restaurante: restaurantId,
        nombre: 'Menú Auth Test',
        descripcion: 'Descripción menú auth'
      };
      
      const createRes = await request(app)
        .post('/menus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fullMenuData);
      
      const menuId = createRes.body.menu.id_menu;
      createdMenuIds.push(menuId);
      
      // Intentar actualizar sin token
      const updateData = {
        nombre: 'Intento Actualización No Auth',
        descripcion: 'No debería actualizarse'
      };
      
      const res = await request(app)
        .put(`/menus/${menuId}`)
        .send(updateData);
      
      expect(res.statusCode).toBe(403);
    });
    
    it('no debe permitir a un usuario regular eliminar un menú', async () => {
      const menuId = createdMenuIds[createdMenuIds.length - 1];
      
      const res = await request(app)
        .delete(`/menus/${menuId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Solo los administradores pueden eliminar menús.');
    });
  });
  
  // Pruebas de validación de entrada
  describe('Validación de entrada', () => {
    it('debe requerir campos obligatorios al crear un menú', async () => {
      // Sin nombre (obligatorio)
      const invalidData = {
        id_restaurante: restaurantId,
        descripcion: 'Falta el nombre'
      };
      
      const res = await request(app)
        .post('/menus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'id_restaurante y nombre son obligatorios.');
    });
    
    it('debe requerir campos obligatorios al actualizar un menú', async () => {
      // Crear un menú para la prueba
      const fullMenuData = {
        id_restaurante: restaurantId,
        nombre: 'Menú Validación',
        descripcion: 'Descripción menú validación'
      };
      
      const createRes = await request(app)
        .post('/menus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fullMenuData);
      
      const menuId = createRes.body.menu.id_menu;
      createdMenuIds.push(menuId);
      
      // Actualizar sin nombre (obligatorio)
      const invalidUpdateData = {
        descripcion: 'Descripción sin nombre'
      };
      
      const res = await request(app)
        .put(`/menus/${menuId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdateData);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'El nombre del menú es obligatorio.');
    });
  });
});