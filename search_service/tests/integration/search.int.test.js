jest.setTimeout(60000); // 60 segundos en lugar de los 10 segundos predeterminados

// tests/routes/search.routes.test.js
const app = require('../../src/app');
const redisClient = require('../../src/config/redis');
const testUtils = require('../utils/testUtils');
const request = require('supertest');

describe('Servicio de Búsqueda', () => {
  // Datos de prueba
  let admin, restaurante, menu;
  let productos = [];
  const categorias = ['Bebidas', 'Comidas', 'Postres'];

  beforeAll(async () => {
    await testUtils.waitForConnections();

    // Crear usuario administrador
    admin = await testUtils.registerAndLoginAdmin({
      nombre: 'AdminBusqueda',
      email: 'adminbusqueda@test.com',
      contrasena: 'admin123',
      rol: 'administrador'
    });

    // Crear restaurante
    restaurante = await testUtils.createRestaurant(admin.token, {
      nombre: 'Restaurante Búsqueda',
      direccion: 'Calle Búsqueda 123'
    });

    // Crear menú
    menu = await testUtils.createMenu(admin.token, {
      nombre: 'Menú Búsqueda',
      id_restaurante: restaurante.id_restaurante
    });

    // Crear productos de diferentes categorías
    for (const categoria of categorias) {
      // 2 productos por categoría
      for (let i = 1; i <= 2; i++) {
        const producto = await testUtils.createProduct(admin.token, {
          nombre: `${categoria} Test ${i}`,
          categoria: categoria,
          descripcion: `Descripción de prueba para ${categoria.toLowerCase()} ${i}`,
          precio: 1000 * i,
          id_menu: menu.id_menu
        });
        productos.push(producto);
      }
    }

    // Reindexar productos para asegurar que estén disponibles para búsqueda
    try {
      await testUtils.reindexProducts(app, admin.token);
    } catch (error) {
      console.warn('Error al reindexar productos:', error.message);
    }
  });

  afterAll(async () => {
    try {
      // Limpiar productos
      await testUtils.cleanTestProducts(admin.token, productos.map(p => p.id_producto));
      
      // Limpiar menú
      await testUtils.cleanTestMenus(admin.token, [menu.id_menu]);
      
      // Limpiar restaurante
      await testUtils.cleanTestRestaurants(admin.token, [restaurante.id_restaurante]);
      
      // Eliminar usuario admin
      await testUtils.cleanTestUsers(admin.token, [], admin.id);
      
      // Cerrar conexiones
      await testUtils.closeConnections(redisClient);
    } catch (error) {
      console.error('Error en limpieza:', error);
    }
  });

  // 1. Prueba de búsqueda por texto
  test('Búsqueda de productos por texto', async () => {
    // Buscar un término que debe existir en varios productos
    const resultados = await testUtils.searchProductsByText(app, 'Test');
    
    expect(resultados).toHaveProperty('total');
    expect(resultados).toHaveProperty('products');
    expect(Array.isArray(resultados.products)).toBe(true);
    expect(resultados.products.length).toBeGreaterThan(0);
    
    // Verificar estructura de los productos retornados
    const primerProducto = resultados.products[0];
    expect(primerProducto).toHaveProperty('nombre');
    expect(primerProducto).toHaveProperty('categoria');
    expect(primerProducto).toHaveProperty('id_producto');
  });

  // 2. Prueba de búsqueda por categoría
  test('Búsqueda de productos por categoría', async () => {
    // Buscar productos de la categoría "Bebidas"
    const resultados = await testUtils.searchProductsByCategory(app, 'Bebidas');
    
    expect(resultados).toHaveProperty('total');
    expect(resultados).toHaveProperty('products');
    expect(Array.isArray(resultados.products)).toBe(true);
    
    // Verificar que todos los productos sean de la categoría correcta
    resultados.products.forEach(producto => {
      expect(producto.categoria).toBe('Bebidas');
    });
  });

  // 3. Prueba de reindexación (solo admin)
  test('Reindexación de productos (admin)', async () => {
    const resultado = await testUtils.reindexProducts(app, admin.token);
    
    expect(resultado).toHaveProperty('message', 'Productos reindexados correctamente');
    expect(resultado).toHaveProperty('count');
    expect(resultado.count).toBeGreaterThan(0);
  });

  // 4. Pruebas de casos de error
  test('Casos de error en búsqueda', async () => {
    // Búsqueda sin término de búsqueda
    const resSinTermino = await request(app)
      .get('/search/products');
    
    expect(resSinTermino.statusCode).toBe(400);
    expect(resSinTermino.body).toHaveProperty('error');

    // Reindexación sin ser administrador
    const userNoAdmin = await testUtils.registerAndLoginUser({
      nombre: 'Usuario Búsqueda',
      email: 'usuariobusqueda@test.com',
      contrasena: 'user123',
      rol: 'cliente'
    });

    const resNoAdmin = await request(app)
      .post('/search/reindex')
      .set('Authorization', `Bearer ${userNoAdmin.token}`);
    
    expect(resNoAdmin.statusCode).toBe(403);
    expect(resNoAdmin.body).toHaveProperty('error');
    
    // Limpiar el usuario creado
    await testUtils.cleanTestUsers(admin.token, [userNoAdmin.id]);
  });

  // 5. Prueba de caché Redis
  test('Caché Redis funciona para búsquedas', async () => {
    // 1. Limpiar posible caché
    await redisClient.del('search:Test:1:10');
    
    // 2. Primera búsqueda (crea la caché)
    await request(app).get('/search/products?q=Test');
    
    // 3. Verificar que se guardó en caché
    const cachedData = await redisClient.get('search:Test:1:10');
    expect(cachedData).not.toBeNull();
    
    // 4. Crear un producto nuevo que debería limpiarse al actualizarse
    const nuevoProducto = await testUtils.createProduct(admin.token, {
      nombre: 'Producto Nuevo Test',
      categoria: 'Bebidas',
      descripcion: 'Producto para probar limpieza de caché',
      precio: 2500,
      id_menu: menu.id_menu
    });
    
    // Agregar a la lista para limpieza
    productos.push(nuevoProducto);
    
    // 5. Indexar el nuevo producto
    await testUtils.reindexProducts(app, admin.token);
    
    // Esperar a que se procese la indexación
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 6. La caché debería haberse limpiado
    const cacheDespuesDeActualizar = await redisClient.get('search:Test:1:10');
    expect(cacheDespuesDeActualizar).toBeNull();
  });

  // 6. Prueba de paginación en búsquedas
  test('Paginación en búsquedas', async () => {
    // Búsqueda con límite 1
    const resultadosPagina1 = await testUtils.searchProductsByText(app, 'Test', 1, 1);
    expect(resultadosPagina1.products.length).toBe(1);
    
    // Búsqueda segunda página
    const resultadosPagina2 = await testUtils.searchProductsByText(app, 'Test', 2, 1);
    
    // Verificar que son diferentes productos
    if (resultadosPagina1.total > 1) {
      expect(resultadosPagina1.products[0].id_producto).not.toEqual(
        resultadosPagina2.products[0].id_producto
      );
    }
  });

  // Añadir al test de búsqueda
  test('Caché en searchProducts funciona correctamente', async () => {
    // Término de búsqueda único para esta prueba
    const termino = 'CachePrueba';
    const cacheKey = `search:${termino}:1:10`;
    
    // 1. Limpiar caché existente
    await redisClient.del(cacheKey);
    
    // 2. Primera búsqueda (guardará en caché)
    const primeraRespuesta = await request(app)
      .get(`/search/products?q=${termino}`);
    
    // 3. Verificar caché creada
    const cacheCreado = await redisClient.get(cacheKey);
    expect(cacheCreado).not.toBeNull();
    
    // 4. Segunda búsqueda (debería usar caché)
    const segundaRespuesta = await request(app)
      .get(`/search/products?q=${termino}`);
    
    // 5. Verificar que ambas respuestas son iguales (mismos datos)
    expect(JSON.stringify(segundaRespuesta.body)).toBe(JSON.stringify(primeraRespuesta.body));
  });

  // Añadir al test de búsqueda por categoría
  test('Caché en searchProductsByCategory funciona correctamente', async () => {
    // Categoría para esta prueba
    const categoria = 'Bebidas';
    const cacheKey = `search:category:${categoria}:1:10`;
    
    // 1. Limpiar caché existente
    await redisClient.del(cacheKey);
    
    // 2. Primera búsqueda (guardará en caché)
    const primeraRespuesta = await request(app)
      .get(`/search/products/category/${categoria}`);
    
    // 3. Verificar caché creada
    const cacheCreado = await redisClient.get(cacheKey);
    expect(cacheCreado).not.toBeNull();
    
    // 4. Segunda búsqueda (debería usar caché)
    const segundaRespuesta = await request(app)
      .get(`/search/products/category/${categoria}`);
    
    // 5. Verificar que ambas respuestas son iguales (mismos datos)
    expect(JSON.stringify(segundaRespuesta.body)).toBe(JSON.stringify(primeraRespuesta.body));
  });

  test('Reindexación cuando no existe el índice', async () => {
    // Forzar eliminación del índice primero
    try {
      const { elasticClient, PRODUCT_INDEX } = require('../../src/config/elastic');
      const exists = await elasticClient.indices.exists({ index: PRODUCT_INDEX });
      if (exists) {
        await elasticClient.indices.delete({ index: PRODUCT_INDEX });
      }
      
      // Ahora reindexar
      const resultado = await testUtils.reindexProducts(app, admin.token);
      expect(resultado).toHaveProperty('message', 'Productos reindexados correctamente');
    } catch (error) {
      fail('No debería lanzar error: ' + error.message);
    }
  });

  test('Productos sin descripción se indexan correctamente', async () => {
    // Crear producto sin descripción
    const productoSinDesc = await testUtils.createProduct(admin.token, {
      nombre: 'Producto Sin Descripción',
      categoria: 'Prueba',
      precio: 1000,
      id_menu: menu.id_menu
      // Sin campo descripción
    });
    
    // Agregar a la lista para limpieza
    productos.push(productoSinDesc);
    
    // Reindexar e intentar buscar el producto
    await testUtils.reindexProducts(app, admin.token);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Buscar por nombre exacto
    const resultados = await testUtils.searchProductsByText(app, 'Producto Sin Descripción');
    expect(resultados.products.some(p => p.id_producto == productoSinDesc.id_producto)).toBe(true);
  });

});