// tests/routes/pedido.routes.test.js
const app = require('../../src/app');
const redisClient = require('../../src/config/redis');
const testUtils = require('../utils/testUtils');
const request = require('supertest');

describe('Pedidos API', () => {
  // Datos de prueba
  let admin, user, otroUser, restaurante, menu, producto;
  let pedidoId;

  beforeAll(async () => {
    // Usar una DB diferente o limpiar completamente para cada prueba
    await redisClient.flushDb();

    await testUtils.waitForConnections();

    // Crear usuarios
    admin = await testUtils.registerAndLoginAdmin({
      nombre: 'AdminPedido',
      email: 'adminpedido@test.com',
      contrasena: 'admin123',
      rol: 'administrador'
    });

    user = await testUtils.registerAndLoginUser({
      nombre: 'ClientePedido',
      email: 'clientepedido@test.com',
      contrasena: 'user123',
      rol: 'cliente'
    });

    otroUser = await testUtils.registerAndLoginUser({
      nombre: 'OtroClientePedido',
      email: 'otro.clientepedido@test.com',
      contrasena: 'user123',
      rol: 'cliente'
    });

    // Crear restaurante
    restaurante = await testUtils.createRestaurant(app, admin.token, {
      nombre: 'Restaurante Prueba',
      direccion: 'Calle Test 123'
    });

    // Crear menú
    menu = await testUtils.createMenu(app, admin.token, {
      nombre: 'Menú Test',
      id_restaurante: restaurante.id_restaurante
    });

    // Crear producto sin id_restaurante, solo con id_menu
    producto = await testUtils.createProduct(app, admin.token, {
      nombre: 'Producto Prueba',
      categoria: 'Test',
      descripcion: 'Producto para testing',
      precio: 5000,
      id_menu: menu.id_menu
    });
  });

  afterAll(async () => {
    // Limpiar recursos
    if (pedidoId) {
      await testUtils.deletePedido(app, admin.token, pedidoId);
    }

    await testUtils.cleanTestProducts(app, admin.token, [producto?.id_producto]);
    await testUtils.cleanTestMenus(app, admin.token, [menu?.id_menu]);
    await testUtils.cleanTestRestaurants(app, admin.token, [restaurante?.id_restaurante]);
    await testUtils.cleanTestUsers(admin.token, [user.id, otroUser.id], admin.id);
    await testUtils.closeConnections(redisClient);
  });

  // 1 y 2) Crear pedidos (admin y usuario)
  test('Crear pedidos como admin y como usuario', async () => {
    // Admin crea pedido para usuario
    const adminPedido = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        id_usuario: user.id,
        id_restaurante: restaurante.id_restaurante,
        tipo: 'para recoger',
        productos: [{ id_producto: producto.id_producto, cantidad: 1 }]
      });

    expect(adminPedido.statusCode).toBe(201);
    expect(adminPedido.body.pedido.id_usuario).toBe(user.id);
    
    // Guardar ID para limpieza
    pedidoId = adminPedido.body.pedido.id_pedido;

    // Usuario crea pedido para sí mismo
    const userPedido = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        id_usuario: user.id,
        id_restaurante: restaurante.id_restaurante,
        tipo: 'en restaurante',
        productos: [{ id_producto: producto.id_producto, cantidad: 2 }]
      });

    expect(userPedido.statusCode).toBe(201);
    
    // Limpiar este pedido
    await testUtils.deletePedido(app, user.token, userPedido.body.pedido.id_pedido);
  });

  // 3-5) Casos de error en creación
  test('Validación de errores al crear pedidos', async () => {
    // 3) Usuario intenta crear para otro
    const otroUserPedido = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        id_usuario: otroUser.id,
        id_restaurante: restaurante.id_restaurante,
        tipo: 'para recoger',
        productos: [{ id_producto: producto.id_producto, cantidad: 1 }]
      });

    expect(otroUserPedido.statusCode).toBe(403);

    // 4) Falta campo requerido
    const sinTipo = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        id_usuario: user.id,
        id_restaurante: restaurante.id_restaurante,
        productos: [{ id_producto: producto.id_producto, cantidad: 1 }]
      });

    expect(sinTipo.statusCode).toBe(400);

    // 5) Producto inexistente
    const productoInexistente = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        id_usuario: user.id,
        id_restaurante: restaurante.id_restaurante,
        tipo: 'para recoger',
        productos: [{ id_producto: 99999, cantidad: 1 }]
      });

    expect(productoInexistente.statusCode).toBe(404);
  });

  // 6-8) Operaciones de consulta y eliminación
  test('Operaciones de consulta y eliminación', async () => {
    // 6) Pedido inexistente
    const pedidoInexistente = await request(app)
      .get('/orders/99999');
    
    expect(pedidoInexistente.statusCode).toBe(404);

    // Crear pedido para probar eliminación
    const nuevoPedido = await testUtils.createPedido(app, otroUser.token, {
      id_usuario: otroUser.id,
      id_restaurante: restaurante.id_restaurante,
      tipo: 'para recoger',
      productos: [{ id_producto: producto.id_producto, cantidad: 1 }]
    });

    // 7) Admin elimina pedido de usuario
    const adminElimina = await request(app)
      .delete(`/orders/${nuevoPedido.id_pedido}`)
      .set('Authorization', `Bearer ${admin.token}`);
    
    expect(adminElimina.statusCode).toBe(200);

    // Crear otro pedido para probar eliminación por usuario incorrecto
    const otroPedido = await testUtils.createPedido(app, otroUser.token, {
      id_usuario: otroUser.id,
      id_restaurante: restaurante.id_restaurante,
      tipo: 'para recoger',
      productos: [{ id_producto: producto.id_producto, cantidad: 1 }]
    });

    // 8) Usuario intenta eliminar pedido de otro
    const userEliminaOtro = await request(app)
      .delete(`/orders/${otroPedido.id_pedido}`)
      .set('Authorization', `Bearer ${user.token}`);
    
    expect(userEliminaOtro.statusCode).toBe(403);
    
    // Limpiar
    await testUtils.deletePedido(app, otroUser.token, otroPedido.id_pedido);
  });

  // 9) Caché Redis
  test('Caché Redis funciona correctamente', async () => {
    // Crear pedido para prueba de caché
    const cachePedido = await testUtils.createPedido(app, user.token, {
      id_usuario: user.id,
      id_restaurante: restaurante.id_restaurante,
      tipo: 'para recoger',
      productos: [{ id_producto: producto.id_producto, cantidad: 1 }]
    });
    
    // Limpiar caché
    await redisClient.del(`pedido:${cachePedido.id_pedido}`);
    
    // Primera consulta
    await request(app).get(`/orders/${cachePedido.id_pedido}`);
    
    // Verificar caché
    const cacheValue = await redisClient.get(`pedido:${cachePedido.id_pedido}`);
    expect(cacheValue).not.toBeNull();
    
    // Limpiar
    await testUtils.deletePedido(app, user.token, cachePedido.id_pedido);
  });

  // Test para getAllPedidos básico
  test('Obtener todos los pedidos', async () => {
    const res = await request(app)
      .get('/orders');
    
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

});