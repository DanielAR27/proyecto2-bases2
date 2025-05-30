// tests/utils/testUtils.js

const request = require('supertest');

/**
 * Utilidades para pruebas de integración con soporte para servicio AUTH separado
 * y operaciones de restaurantes usando app
 */
const testUtils = {
  /**
   * URL del servicio de autenticación (configurable vía variables de entorno)
   */
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
  SEARCH_SERVICE_URL: process.env.SEARCH_SERVICE_URL,
  
  /**
   * Espera a que las conexiones se establezcan
   */
  waitForConnections: async () => {
    // Esperar a que las conexiones se establezcan (Redis, DB, etc.)
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  /**
   * Cierra conexiones de servicios (Redis, etc.)
   * @param {Object} redisClient - Cliente de Redis
   */
  closeConnections: async (redisClient) => {
    if (redisClient && typeof redisClient.quit === 'function') {
      try {
        await redisClient.quit();
      } catch (error) {
        console.error('Error al cerrar conexión con Redis:', error);
      }
    }
  },

  /**
   * Registra un usuario administrador usando el servicio AUTH
   * @param {Object} adminData - Datos del administrador
   * @returns {Object} - Objeto con token e ID del administrador
   */
  registerAndLoginAdmin: async (adminData) => {
    // Registrar administrador en el servicio de autenticación
    const registerRes = await request(testUtils.AUTH_SERVICE_URL)
      .post('/auth/register')
      .send(adminData);
      
    if (registerRes.statusCode !== 201) {
      throw new Error(`Error al registrar administrador: ${JSON.stringify(registerRes.body)}`);
    }

    // Login con administrador
    const loginRes = await request(testUtils.AUTH_SERVICE_URL)
      .post('/auth/login')
      .send({
        email: adminData.email,
        contrasena: adminData.contrasena
      });
      
    if (loginRes.statusCode !== 200) {
      throw new Error(`Error al iniciar sesión con administrador: ${JSON.stringify(loginRes.body)}`);
    }

    return {
      token: loginRes.body.token,
      id: loginRes.body.usuario.id_usuario
    };
  },

  /**
   * Registra un usuario cliente usando el servicio AUTH
   * @param {Object} userData - Datos del usuario
   * @returns {Object} - Objeto con token e ID del usuario
   */
  registerAndLoginUser: async (userData) => {
    // Registrar usuario
    const registerRes = await request(testUtils.AUTH_SERVICE_URL)
      .post('/auth/register')
      .send(userData);
      
    if (registerRes.statusCode !== 201) {
      throw new Error(`Error al registrar usuario: ${JSON.stringify(registerRes.body)}`);
    }

    // Login con usuario
    const loginRes = await request(testUtils.AUTH_SERVICE_URL)
      .post('/auth/login')
      .send({
        email: userData.email,
        contrasena: userData.contrasena
      });
      
    if (loginRes.statusCode !== 200) {
      throw new Error(`Error al iniciar sesión con usuario: ${JSON.stringify(loginRes.body)}`);
    }

    return {
      token: loginRes.body.token,
      id: loginRes.body.usuario.id_usuario
    };
  },
  
  /**
   * Verifica un token JWT usando el servicio AUTH
   * @param {string} token - Token JWT a verificar
   * @returns {Object} - Datos del usuario si el token es válido
   */
  verifyToken: async (token) => {
    const res = await request(testUtils.AUTH_SERVICE_URL)
      .get('/auth/verify')
      .set('Authorization', `Bearer ${token}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al verificar token: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.usuario;
  },
  
  /**
   * Elimina un usuario del servicio AUTH usando su ID
   * @param {string} adminToken - Token del administrador
   * @param {string|number} userId - ID del usuario a eliminar
   */
  deleteUser: async (adminToken, userId) => {
    const res = await request(testUtils.AUTH_SERVICE_URL)
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al eliminar usuario: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },
  
  /**
   * Elimina usuarios de prueba a través del servicio AUTH
   * @param {string} adminToken - Token de autenticación del administrador
   * @param {Array} userIds - Array de IDs de usuarios a eliminar (excepto admin)
   * @param {string|number} adminId - ID del administrador (se elimina al final)
   */
  cleanTestUsers: async (adminToken, userIds = [], adminId = null) => {
    try {
      // Solo limpiar si tenemos tanto el adminToken como los IDs
      if (adminToken) {
        // Primero eliminar los usuarios de prueba (excepto admin)
        for (const id of userIds) {
          if (id) {
            await testUtils.deleteUser(adminToken, id);
          }
        }
        
        // Por último, eliminar el admin si se proporcionó su ID
        if (adminId) {
          await testUtils.deleteUser(adminToken, adminId);
        }
      }
    } catch (error) {
      console.error('Error eliminando usuarios de prueba:', error);
    }
  },
  
  // ***** OPERACIONES DE RESTAURANTES USANDO APP *****
  
  /**
   * Crea un restaurante usando la instancia de app
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {Object} restaurantData - Datos del restaurante
   * @returns {Object} - El restaurante creado
   */
  createRestaurant: async (app, adminToken, restaurantData) => {
    const res = await request(app)
      .post('/restaurants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(restaurantData);
      

    if (res.statusCode !== 201) {
      throw new Error(`Error al crear restaurante: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.restaurante;
  },
  
  /**
   * Obtiene todos los restaurantes
   * @param {Object} app - Instancia de la aplicación Express
   * @returns {Array} - Lista de restaurantes
   */
  getAllRestaurants: async (app) => {
    const res = await request(app)
      .get('/restaurants');
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener restaurantes: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },
  
  /**
   * Obtiene un restaurante por su ID
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string|number} restaurantId - ID del restaurante
   * @returns {Object} - El restaurante
   */
  getRestaurantById: async (app, restaurantId) => {
    const res = await request(app)
      .get(`/restaurants/${restaurantId}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener restaurante: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },
  
  /**
   * Actualiza un restaurante
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {string|number} restaurantId - ID del restaurante
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} - El restaurante actualizado
   */
  updateRestaurant: async (app, adminToken, restaurantId, updateData) => {
    const res = await request(app)
      .put(`/restaurants/${restaurantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al actualizar restaurante: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.restaurante;
  },
  
  /**
   * Elimina un restaurante
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {string|number} restaurantId - ID del restaurante
   * @returns {Object} - Mensaje de confirmación
   */
  deleteRestaurant: async (app, adminToken, restaurantId) => {
    const res = await request(app)
      .delete(`/restaurants/${restaurantId}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al eliminar restaurante: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },
  
  /**
   * Elimina todos los restaurantes de prueba
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {Array} restaurantIds - Array de IDs de restaurantes a eliminar
   */
  cleanTestRestaurants: async (app, adminToken, restaurantIds = []) => {
    try {
      if (adminToken && restaurantIds.length > 0) {
        for (const id of restaurantIds) {
          if (id) {
            await testUtils.deleteRestaurant(app, adminToken, id);
          }
        }
      }
    } catch (error) {
      console.error('Error eliminando restaurantes de prueba:', error);
    }
  },

  // ***** OPERACIONES DE MENÚS USANDO APP *****
    
  /**
   * Crea un menú usando la instancia de app
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {Object} menuData - Datos del menú
   * @returns {Object} - El menú creado
   */
  createMenu: async (app, adminToken, menuData) => {
    const res = await request(app)
      .post('/menus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(menuData);
      
    if (res.statusCode !== 201) {
      throw new Error(`Error al crear menú: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.menu;
  },

  /**
   * Obtiene todos los menús
   * @param {Object} app - Instancia de la aplicación Express
   * @returns {Array} - Lista de menús
   */
  getAllMenus: async (app) => {
    const res = await request(app)
      .get('/menus');
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener menús: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Obtiene un menú por su ID
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string|number} menuId - ID del menú
   * @returns {Object} - El menú
   */
  getMenuById: async (app, menuId) => {
    const res = await request(app)
      .get(`/menus/${menuId}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener menú: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Actualiza un menú
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {string|number} menuId - ID del menú
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} - El menú actualizado
   */
  updateMenu: async (app, adminToken, menuId, updateData) => {
    const res = await request(app)
      .put(`/menus/${menuId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al actualizar menú: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.menu;
  },

  /**
   * Elimina un menú
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {string|number} menuId - ID del menú
   * @returns {Object} - Mensaje de confirmación
   */
  deleteMenu: async (app, adminToken, menuId) => {
    const res = await request(app)
      .delete(`/menus/${menuId}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al eliminar menú: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Elimina todos los menús de prueba
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {Array} menuIds - Array de IDs de menús a eliminar
   */
  cleanTestMenus: async (app, adminToken, menuIds = []) => {
    try {
      if (adminToken && menuIds.length > 0) {
        for (const id of menuIds) {
          if (id) {
            await testUtils.deleteMenu(app, adminToken, id);
          }
        }
      }
    } catch (error) {
      console.error('Error eliminando menús de prueba:', error);
    }
  },

  // ***** OPERACIONES DE PRODUCTOS USANDO APP *****
    
  /**
   * Crea un producto usando la instancia de app
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {Object} productData - Datos del producto
   * @returns {Object} - El producto creado
   */
  createProduct: async (app, adminToken, productData) => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productData);
      
    if (res.statusCode !== 201) {
      throw new Error(`Error al crear producto: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.producto;
  },

  /**
   * Obtiene todos los productos
   * @param {Object} app - Instancia de la aplicación Express
   * @returns {Array} - Lista de productos
   */
  getAllProducts: async (app) => {
    const res = await request(app)
      .get('/products');
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener productos: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Obtiene un producto por su ID
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string|number} productId - ID del producto
   * @returns {Object} - El producto
   */
  getProductById: async (app, productId) => {
    const res = await request(app)
      .get(`/products/${productId}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener producto: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Actualiza un producto
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {string|number} productId - ID del producto
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} - El producto actualizado
   */
  updateProduct: async (app, adminToken, productId, updateData) => {
    const res = await request(app)
      .put(`/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al actualizar producto: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.producto;
  },

  /**
   * Elimina un producto
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {string|number} productId - ID del producto
   * @returns {Object} - Mensaje de confirmación
   */
  deleteProduct: async (app, adminToken, productId) => {
    const res = await request(app)
      .delete(`/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al eliminar producto: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Elimina todos los productos de prueba
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @param {Array} productIds - Array de IDs de productos a eliminar
   */
  cleanTestProducts: async (app, adminToken, productIds = []) => {
    try {
      if (adminToken && productIds.length > 0) {
        for (const id of productIds) {
          if (id) {
            await testUtils.deleteProduct(app, adminToken, id);
          }
        }
      }
    } catch (error) {
      console.error('Error eliminando productos de prueba:', error);
    }
  },

  /**
   * Busca productos por términos usando el servicio de búsqueda
   * @param {string} searchTerm - Término de búsqueda
   * @param {string} token - Token de autenticación (opcional)
   * @returns {Array} - Productos encontrados
   */
  searchProducts: async (searchTerm, token = null) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await request(testUtils.SEARCH_SERVICE_URL)
        .get(`/search/products?q=${encodeURIComponent(searchTerm)}`)
        .set(headers)
        .timeout(3000);  // Timeout más corto para prevenir bloqueos
        
      if (res.statusCode === 200) {
        // El servicio de búsqueda podría devolver un objeto con los resultados en una propiedad
        // o directamente un array de resultados
        if (Array.isArray(res.body)) {
          return res.body;
        } else if (res.body && Array.isArray(res.body.hits)) {
          return res.body.hits;
        } else if (res.body && Array.isArray(res.body.results)) {
          return res.body.results;
        } else if (res.body && res.body.products && Array.isArray(res.body.products)) {
          return res.body.products;
        } else {
          console.warn('Respuesta de búsqueda con formato inesperado:', res.body);
          return [];
        }
      } else {
        console.warn(`Error en búsqueda, código: ${res.statusCode}`);
        return [];
      }
    } catch (error) {
      console.warn('Error al buscar productos:', error.message);
      // Devolver array vacío en caso de error en el servicio de búsqueda
      return [];
    }
  },

  /**
   * Indexa un producto en el servicio de búsqueda
   * @param {Object} producto - Datos del producto a indexar
   * @param {string} adminToken - Token del administrador
   * @returns {Object} - Respuesta del servicio de búsqueda
   */
  indexProductInSearch: async (producto, adminToken) => {
    try {
      if (!producto || !adminToken) {
        console.warn('Faltan datos para indexar producto');
        return null;
      }
      
      const res = await request(testUtils.SEARCH_SERVICE_URL)
        .post('/search/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(producto)
        .timeout(3000);
        
      return res.body;
    } catch (error) {
      console.warn('Error al indexar producto en búsqueda:', error.message);
      return null;
    }
  },

  /**
   * Actualiza un producto en el servicio de búsqueda
   * @param {string|number} productId - ID del producto
   * @param {Object} producto - Datos actualizados del producto
   * @param {string} adminToken - Token del administrador
   * @returns {Object} - Respuesta del servicio de búsqueda
   */
  updateProductInSearch: async (productId, producto, adminToken) => {
    try {
      if (!productId || !producto || !adminToken) {
        console.warn('Faltan datos para actualizar producto en búsqueda');
        return null;
      }
      
      const res = await request(testUtils.SEARCH_SERVICE_URL)
        .put(`/search/product/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(producto)
        .timeout(3000);
        
      return res.body;
    } catch (error) {
      console.warn('Error al actualizar producto en búsqueda:', error.message);
      return null;
    }
  },

  /**
   * Elimina un producto del servicio de búsqueda
   * @param {string|number} productId - ID del producto a eliminar
   * @param {string} adminToken - Token del administrador
   * @returns {Object} - Respuesta del servicio de búsqueda
   */
  deleteProductFromSearch: async (productId, adminToken) => {
    try {
      if (!productId || !adminToken) {
        console.warn('Faltan datos para eliminar producto de búsqueda');
        return null;
      }
      
      const res = await request(testUtils.SEARCH_SERVICE_URL)
        .delete(`/search/product/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(3000);
        
      return res.body;
    } catch (error) {
      // Si el error es 404 (No encontrado), no lo tratamos como error
      // ya que podría ser que el producto nunca existió en el índice o ya fue eliminado
      if (error.status === 404) {
        console.log('Producto no encontrado en el índice de búsqueda (404)');
        return { message: 'Producto no encontrado en el índice' };
      }
      
      console.warn('Error al eliminar producto de búsqueda:', error.message);
      return null;
    }
  },

  // ***** OPERACIONES DE PEDIDOS USANDO APP *****
    
  /**
   * Crea un pedido usando la instancia de app
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} token - Token del usuario o administrador
   * @param {Object} pedidoData - Datos del pedido
   * @returns {Object} - El pedido creado
   */
  createPedido: async (app, token, pedidoData) => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(pedidoData);
      
    if (res.statusCode !== 201) {
      throw new Error(`Error al crear pedido: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.pedido;
  },

  /**
   * Obtiene todos los pedidos
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} token - Token del administrador
   * @returns {Array} - Lista de pedidos
   */
  getAllPedidos: async (app, token) => {
    const res = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${token}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener pedidos: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Obtiene un pedido por su ID
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} token - Token del usuario o administrador
   * @param {string|number} pedidoId - ID del pedido
   * @returns {Object} - El pedido
   */
  getPedidoById: async (app, token, pedidoId) => {
    const res = await request(app)
      .get(`/orders/${pedidoId}`)
      .set('Authorization', `Bearer ${token}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener pedido: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Elimina un pedido
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} token - Token del usuario o administrador
   * @param {string|number} pedidoId - ID del pedido
   * @returns {Object} - Mensaje de confirmación
   */
  deletePedido: async (app, token, pedidoId) => {
    const res = await request(app)
      .delete(`/orders/${pedidoId}`)
      .set('Authorization', `Bearer ${token}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al eliminar pedido: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Elimina todos los pedidos de prueba
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} token - Token del usuario o administrador
   * @param {Array} pedidoIds - Array de IDs de pedidos a eliminar
   */
  cleanTestPedidos: async (app, token, pedidoIds = []) => {
    try {
      if (token && pedidoIds.length > 0) {
        for (const id of pedidoIds) {
          if (id) {
            await testUtils.deletePedido(app, token, id);
          }
        }
      }
    } catch (error) {
      console.error('Error eliminando pedidos de prueba:', error);
    }
  },

  // ***** OPERACIONES DE RESERVAS USANDO APP *****
      
  /**
   * Crea una reserva usando la instancia de app
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} token - Token del usuario o administrador
   * @param {Object} reservationData - Datos de la reserva
   * @returns {Object} - La reserva creada
   */
  createReservation: async (app, token, reservationData) => {
    const res = await request(app)
      .post('/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(reservationData);
      
    if (res.statusCode !== 201) {
      throw new Error(`Error al crear reserva: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.reserva;
  },

  /**
   * Obtiene todas las reservas
   * @param {Object} app - Instancia de la aplicación Express
   * @returns {Array} - Lista de reservas
   */
  getAllReservations: async (app) => {
    const res = await request(app)
      .get('/reservations');
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener reservas: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Obtiene una reserva por su ID
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string|number} reservationId - ID de la reserva
   * @returns {Object} - La reserva
   */
  getReservationById: async (app, reservationId) => {
    const res = await request(app)
      .get(`/reservations/${reservationId}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener reserva: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Actualiza una reserva
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} token - Token del usuario o administrador
   * @param {string|number} reservationId - ID de la reserva
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} - La reserva actualizada
   */
  updateReservation: async (app, token, reservationId, updateData) => {
    const res = await request(app)
      .put(`/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al actualizar reserva: ${JSON.stringify(res.body)}`);
    }
    
    return res.body.reserva;
  },

  /**
   * Elimina una reserva
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} token - Token del usuario o administrador
   * @param {string|number} reservationId - ID de la reserva
   * @returns {Object} - Mensaje de confirmación
   */
  deleteReservation: async (app, token, reservationId) => {
    const res = await request(app)
      .delete(`/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${token}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al eliminar reserva: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Elimina todas las reservas de prueba
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} token - Token del administrador
   * @param {Array} reservationIds - Array de IDs de reservas a eliminar
   */
  cleanTestReservations: async (app, token, reservationIds = []) => {
    try {
      if (token && reservationIds.length > 0) {
        for (const id of reservationIds) {
          if (id) {
            await testUtils.deleteReservation(app, token, id);
          }
        }
      }
    } catch (error) {
      console.error('Error eliminando reservas de prueba:', error);
    }
  }

};

module.exports = testUtils;