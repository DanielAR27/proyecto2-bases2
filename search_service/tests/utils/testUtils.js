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
  API_URL: process.env.API_URL,
  
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
   * @param {string} adminToken - Token del administrador
   * @param {Object} restaurantData - Datos del restaurante
   * @returns {Object} - El restaurante creado
   */
  createRestaurant: async (adminToken, restaurantData) => {
    const res = await request(testUtils.API_URL)
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
   * @returns {Array} - Lista de restaurantes
   */
  getAllRestaurants: async () => {
    const res = await request(testUtils.API_URL)
      .get('/restaurants');
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener restaurantes: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },
  
  /**
   * Obtiene un restaurante por su ID
   * @param {string|number} restaurantId - ID del restaurante
   * @returns {Object} - El restaurante
   */
  getRestaurantById: async (restaurantId) => {
    const res = await request(testUtils.API_URL)
      .get(`/restaurants/${restaurantId}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener restaurante: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },
  
  /**
   * Actualiza un restaurante
   * @param {string} adminToken - Token del administrador
   * @param {string|number} restaurantId - ID del restaurante
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} - El restaurante actualizado
   */
  updateRestaurant: async (adminToken, restaurantId, updateData) => {
    const res = await request(testUtils.API_URL)
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
   * @param {string} adminToken - Token del administrador
   * @param {string|number} restaurantId - ID del restaurante
   * @returns {Object} - Mensaje de confirmación
   */
  deleteRestaurant: async (adminToken, restaurantId) => {
    const res = await request(testUtils.API_URL)
      .delete(`/restaurants/${restaurantId}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al eliminar restaurante: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },
  
  /**
   * Elimina todos los restaurantes de prueba
   * @param {string} adminToken - Token del administrador
   * @param {Array} restaurantIds - Array de IDs de restaurantes a eliminar
   */
  cleanTestRestaurants: async (adminToken, restaurantIds = []) => {
    try {
      if (adminToken && restaurantIds.length > 0) {
        for (const id of restaurantIds) {
          if (id) {
            await testUtils.deleteRestaurant(adminToken, id);
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
   * @param {string} adminToken - Token del administrador
   * @param {Object} menuData - Datos del menú
   * @returns {Object} - El menú creado
   */
  createMenu: async (adminToken, menuData) => {
    const res = await request(testUtils.API_URL)
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
   * @returns {Array} - Lista de menús
   */
  getAllMenus: async () => {
    const res = await request(testUtils.API_URL)
      .get('/menus');
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener menús: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Obtiene un menú por su ID
   * @param {string|number} menuId - ID del menú
   * @returns {Object} - El menú
   */
  getMenuById: async (menuId) => {
    const res = await request(testUtils.API_URL)
      .get(`/menus/${menuId}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener menú: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Actualiza un menú
   * @param {string} adminToken - Token del administrador
   * @param {string|number} menuId - ID del menú
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} - El menú actualizado
   */
  updateMenu: async (adminToken, menuId, updateData) => {
    const res = await request(testUtils.API_URL)
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
   * @param {string} adminToken - Token del administrador
   * @param {string|number} menuId - ID del menú
   * @returns {Object} - Mensaje de confirmación
   */
  deleteMenu: async (adminToken, menuId) => {
    const res = await request(testUtils.API_URL)
      .delete(`/menus/${menuId}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al eliminar menú: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Elimina todos los menús de prueba
   * @param {string} adminToken - Token del administrador
   * @param {Array} menuIds - Array de IDs de menús a eliminar
   */
  cleanTestMenus: async (adminToken, menuIds = []) => {
    try {
      if (adminToken && menuIds.length > 0) {
        for (const id of menuIds) {
          if (id) {
            await testUtils.deleteMenu(adminToken, id);
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
   * @param {string} adminToken - Token del administrador
   * @param {Object} productData - Datos del producto
   * @returns {Object} - El producto creado
   */
  createProduct: async (adminToken, productData) => {
    const res = await request(testUtils.API_URL)
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
   * @returns {Array} - Lista de productos
   */
  getAllProducts: async (app) => {
    const res = await request(testUtils.API_URL)
      .get('/products');
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener productos: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Obtiene un producto por su ID
   * @param {string|number} productId - ID del producto
   * @returns {Object} - El producto
   */
  getProductById: async (productId) => {
    const res = await request(testUtils.API_URL)
      .get(`/products/${productId}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al obtener producto: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Actualiza un producto
   * @param {string} adminToken - Token del administrador
   * @param {string|number} productId - ID del producto
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} - El producto actualizado
   */
  updateProduct: async (adminToken, productId, updateData) => {
    const res = await request(testUtils.API_URL)
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
   * @param {string} adminToken - Token del administrador
   * @param {string|number} productId - ID del producto
   * @returns {Object} - Mensaje de confirmación
   */
  deleteProduct: async (adminToken, productId) => {
    const res = await request(testUtils.API_URL)
      .delete(`/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al eliminar producto: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Elimina todos los productos de prueba
   * @param {string} adminToken - Token del administrador
   * @param {Array} productIds - Array de IDs de productos a eliminar
   */
  cleanTestProducts: async (adminToken, productIds = []) => {
    try {
      if (adminToken && productIds.length > 0) {
        for (const id of productIds) {
          if (id) {
            await testUtils.deleteProduct(adminToken, id);
          }
        }
      }
    } catch (error) {
      console.error('Error eliminando productos de prueba:', error);
    }
  },

  /**
   * Busca productos por texto en el servicio de búsqueda
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} query - Término de búsqueda
   * @param {number} page - Número de página
   * @param {number} limit - Límite de resultados por página
   * @returns {Object} - Resultados de búsqueda
   */
  searchProductsByText: async (app, query, page = 1, limit = 10) => {
    const res = await request(app)
      .get(`/search/products?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error en búsqueda de productos: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Busca productos por categoría en el servicio de búsqueda
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} categoria - Categoría a buscar
   * @param {number} page - Número de página
   * @param {number} limit - Límite de resultados por página
   * @returns {Object} - Resultados de búsqueda por categoría
   */
  searchProductsByCategory: async (app, categoria, page = 1, limit = 10) => {
    const res = await request(app)
      .get(`/search/products/category/${encodeURIComponent(categoria)}?page=${page}&limit=${limit}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error en búsqueda por categoría: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  },

  /**
   * Reindexar todos los productos (solo admin)
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token del administrador
   * @returns {Object} - Respuesta de la reindexación
   */
  reindexProducts: async (app, adminToken) => {
    const res = await request(app)
      .post('/search/reindex')
      .set('Authorization', `Bearer ${adminToken}`);
      
    if (res.statusCode !== 200) {
      throw new Error(`Error al reindexar productos: ${JSON.stringify(res.body)}`);
    }
    
    return res.body;
  }

};

module.exports = testUtils;