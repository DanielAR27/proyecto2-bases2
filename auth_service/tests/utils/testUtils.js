// tests/utils/testUtils.js

const request = require('supertest');

/**
 * Utilidades para pruebas de integración
 */
const testUtils = {
  /**
   * Espera a que las conexiones se establezcan
   */
  waitForConnections: async () => {
    // Esperar a que las conexiones se establezcan (Redis, DB, etc.)
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  /**
   * Elimina usuarios de prueba a través de la API
   * @param {Object} app - Instancia de la aplicación Express
   * @param {string} adminToken - Token de autenticación del administrador
   * @param {Array} userIds - Array de IDs de usuarios a eliminar (excepto admin)
   * @param {string|number} adminId - ID del administrador (se elimina al final)
   */
  cleanTestUsers: async (app, adminToken, userIds = [], adminId = null) => {
    try {
      // Solo limpiar si tenemos tanto el adminToken como los IDs
      if (adminToken) {
        // Primero eliminar los usuarios de prueba (excepto admin)
        for (const id of userIds) {
          if (id) {
            await request(app)
              .delete(`/users/${id}`)
              .set('Authorization', `Bearer ${adminToken}`);
          }
        }
        
        // Por último, eliminar el admin si se proporcionó su ID
        if (adminId) {
          await request(app)
            .delete(`/users/${adminId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        }
      }
    } catch (error) {
      console.error('Error eliminando usuarios de prueba:', error);
    }
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
   * Registra un usuario administrador
   * @param {Object} app - Instancia de la aplicación Express
   * @param {Object} adminData - Datos del administrador
   * @returns {Object} - Objeto con token e ID del administrador
   */
  registerAndLoginAdmin: async (app, adminData) => {
    // Registrar administrador
    const registerRes = await request(app)
      .post('/auth/register')
      .send(adminData);
      
    if (registerRes.statusCode !== 201) {
      throw new Error(`Error al registrar administrador: ${JSON.stringify(registerRes.body)}`);
    }

    // Login con administrador
    const loginRes = await request(app)
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
   * Registra un usuario cliente
   * @param {Object} app - Instancia de la aplicación Express
   * @param {Object} userData - Datos del usuario
   * @returns {Object} - Objeto con token e ID del usuario
   */
  registerAndLoginUser: async (app, userData) => {
    // Registrar usuario
    const registerRes = await request(app)
      .post('/auth/register')
      .send(userData);
      
    if (registerRes.statusCode !== 201) {
      throw new Error(`Error al registrar usuario: ${JSON.stringify(registerRes.body)}`);
    }

    // Login con usuario
    const loginRes = await request(app)
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
  }
};

module.exports = testUtils;