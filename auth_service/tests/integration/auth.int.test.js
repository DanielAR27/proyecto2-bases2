// tests/integration/auth.routes.test.js

const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');
const UserDAO = require('../../src/dao/userDAO');
const redisClient = require('../../src/config/redis');
const testUtils = require('../utils/testUtils');

/**
 * Pruebas de integración completas para las rutas de autenticación.
 * Prueba todas las funcionalidades expuestas en authController sin mocks.
 */

describe('AuthRoutes - Integración Completa', () => {
  const adminData = {
    nombre: 'Admin Test Integration',
    email: 'admin_integration@test.com',
    contrasena: 'adminPass123!',
    rol: 'administrador'
  };

  const userData = {
    nombre: 'User Test Integration',
    email: 'user_integration@test.com',
    contrasena: 'userPass123!',
    rol: 'cliente'
  };

  const duplicateUserData = {
    nombre: 'Duplicate User',
    email: 'user_integration@test.com', // Email deliberadamente duplicado
    contrasena: 'duplicatePass123!',
    rol: 'cliente'
  };

  let adminToken;
  let userToken;
  let adminId;
  let userId;
  let expiredToken;

  beforeAll(async () => {
    // Esperar a que las conexiones se establezcan
    await testUtils.waitForConnections();
    
    // Crear un token expirado para pruebas
    const payload = {
      id_usuario: 999,
      nombre: 'Expired User',
      email: 'expired@test.com',
      rol: 'cliente'
    };
    
    // Generamos un token que expiró hace 1 hora
    expiredToken = jwt.sign(
      payload, 
      process.env.JWT_SECRET,
      { expiresIn: '-1h' } // Token ya expirado
    );
  });
  
  afterAll(async () => {
    // Limpiar datos de prueba usando la API
    await testUtils.cleanTestUsers(app, adminToken, [userId], adminId);
    
    // Cerrar conexiones
    await testUtils.closeConnections(redisClient);
  });

  describe('Registro de usuarios', () => {
    it('POST /auth/register - debe registrar un nuevo administrador correctamente', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(adminData);
        
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Usuario registrado exitosamente.');
      expect(res.body.usuario).toHaveProperty('nombre', adminData.nombre);
      expect(res.body.usuario).toHaveProperty('email', adminData.email);
      expect(res.body.usuario).toHaveProperty('rol', adminData.rol);
      expect(res.body.usuario).not.toHaveProperty('contrasena_hash');
      
      // Guardar ID para pruebas posteriores
      adminId = res.body.usuario.id_usuario;
    });
    
    it('POST /auth/register - debe registrar un nuevo cliente correctamente', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(userData);
        
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Usuario registrado exitosamente.');
      expect(res.body.usuario).toHaveProperty('nombre', userData.nombre);
      expect(res.body.usuario).toHaveProperty('email', userData.email);
      expect(res.body.usuario).toHaveProperty('rol', userData.rol);
      
      // Guardar ID para pruebas posteriores
      userId = res.body.usuario.id_usuario;
    });
    
    it('POST /auth/register - debe rechazar registro con email duplicado', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(duplicateUserData);
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'El email ya está registrado.');
    });
    
    it('POST /auth/register - debe rechazar registro con campos faltantes (sin nombre)', async () => {
      const incompleteData = { ...userData };
      delete incompleteData.nombre;
      incompleteData.email = 'otro@test.com';
      
      const res = await request(app)
        .post('/auth/register')
        .send(incompleteData);
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Todos los campos son obligatorios.');
    });
    
    it('POST /auth/register - debe rechazar registro con campos faltantes (sin email)', async () => {
      const incompleteData = { ...userData };
      delete incompleteData.email;
      
      const res = await request(app)
        .post('/auth/register')
        .send(incompleteData);
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Todos los campos son obligatorios.');
    });
    
    it('POST /auth/register - debe rechazar registro con campos faltantes (sin contraseña)', async () => {
      const incompleteData = { ...userData };
      delete incompleteData.contrasena;
      incompleteData.email = 'otro@test.com';
      
      const res = await request(app)
        .post('/auth/register')
        .send(incompleteData);
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Todos los campos son obligatorios.');
    });
    
    it('POST /auth/register - debe rechazar registro con campos faltantes (sin rol)', async () => {
      const incompleteData = { ...userData };
      delete incompleteData.rol;
      incompleteData.email = 'otro@test.com';
      
      const res = await request(app)
        .post('/auth/register')
        .send(incompleteData);
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Todos los campos son obligatorios.');
    });
    
    it('POST /auth/register - debe rechazar registro con rol inválido', async () => {
      const invalidRolData = { 
        ...userData,
        email: 'rol_invalido@test.com',
        rol: 'superusuario' 
      };
      
      const res = await request(app)
        .post('/auth/register')
        .send(invalidRolData);
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', "El rol debe ser 'cliente' o 'administrador'.");
    });

    it('POST /auth/register - debe rechazar registro con campos vacíos', async () => {
      const emptyData = { 
        nombre: '',
        email: '',
        contrasena: '',
        rol: ''
      };
      
      const res = await request(app)
        .post('/auth/register')
        .send(emptyData);
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Todos los campos son obligatorios.');
    });
  });
  
  describe('Inicio de sesión', () => {
    it('POST /auth/login - debe autenticar al administrador correctamente', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: adminData.email,
          contrasena: adminData.contrasena
        });
        
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Inicio de sesión exitoso.');
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('usuario');
      expect(res.body.usuario).toHaveProperty('nombre', adminData.nombre);
      expect(res.body.usuario).toHaveProperty('email', adminData.email);
      expect(res.body.usuario).toHaveProperty('rol', adminData.rol);
      
      // Guardar token para pruebas posteriores
      adminToken = res.body.token;
    });
    
    it('POST /auth/login - debe autenticar al cliente correctamente', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          contrasena: userData.contrasena
        });
        
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Inicio de sesión exitoso.');
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('usuario');
      expect(res.body.usuario).toHaveProperty('nombre', userData.nombre);
      expect(res.body.usuario).toHaveProperty('email', userData.email);
      expect(res.body.usuario).toHaveProperty('rol', userData.rol);
      
      // Guardar token para pruebas posteriores
      userToken = res.body.token;
    });
    
    it('POST /auth/login - debe rechazar inicio de sesión con email no registrado', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'noexiste@test.com',
          contrasena: 'cualquiera123'
        });
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Credenciales inválidas.');
    });
    
    it('POST /auth/login - debe rechazar inicio de sesión con contraseña incorrecta', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          contrasena: 'incorrecta123'
        });
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Credenciales inválidas.');
    });
    
    it('POST /auth/login - debe rechazar inicio de sesión sin email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          contrasena: userData.contrasena
        });
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Email y contraseña son obligatorios.');
    });
    
    it('POST /auth/login - debe rechazar inicio de sesión sin contraseña', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email
        });
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Email y contraseña son obligatorios.');
    });
    
    it('POST /auth/login - debe rechazar inicio de sesión con credenciales vacías', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: '',
          contrasena: ''
        });
        
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Email y contraseña son obligatorios.');
    });
  });
  
  describe('Verificación de token', () => {
    it('GET /auth/verify - debe validar token de administrador correctamente', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('usuario');
      // No verificamos el ID exacto ya que puede variar
      expect(res.body.usuario).toHaveProperty('id_usuario');
      expect(res.body.usuario).toHaveProperty('nombre', adminData.nombre);
      expect(res.body.usuario).toHaveProperty('email', adminData.email);
      expect(res.body.usuario).toHaveProperty('rol', adminData.rol);
    });
    
    it('GET /auth/verify - debe validar token de cliente correctamente', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${userToken}`);
        
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('usuario');
      // No verificamos el ID exacto ya que puede variar
      expect(res.body.usuario).toHaveProperty('id_usuario');
      expect(res.body.usuario).toHaveProperty('nombre', userData.nombre);
      expect(res.body.usuario).toHaveProperty('email', userData.email);
      expect(res.body.usuario).toHaveProperty('rol', userData.rol);
    });
    
    it('GET /auth/verify - debe rechazar solicitud sin token', async () => {
      const res = await request(app)
        .get('/auth/verify');
        
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'No hay token.');
    });
    
    it('GET /auth/verify - debe rechazar token inválido', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer token.invalido.123');
        
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Token inválido o expirado.');
    });
    
    it('GET /auth/verify - debe rechazar token expirado', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`);
        
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Token inválido o expirado.');
    });
    
    it('GET /auth/verify - debe rechazar token con formato incorrecto', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'InvalidTokenFormat');
        
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Token inválido o expirado.');
    });

    it('GET /auth/verify - debe funcionar con token en formato "Bearer <token>"', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('usuario');
    });

    it('GET /auth/verify - debe funcionar con token sin prefijo "Bearer"', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', adminToken);
        
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('usuario');
    });
  });

  // Pruebas de extremo a extremo para flujos completos
  describe('Flujos completos de autenticación', () => {
    it('Debe permitir registro + login + verificación de token', async () => {
      // Crear un usuario nuevo
      const nuevoUsuario = {
        nombre: 'Flujo Completo',
        email: 'flujo_completo@test.com',
        contrasena: 'flujo123',
        rol: 'cliente'
      };
      
      // 1. Registro
      const registerRes = await request(app)
        .post('/auth/register')
        .send(nuevoUsuario);
        
      expect(registerRes.statusCode).toBe(201);
      
      // 2. Login
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: nuevoUsuario.email,
          contrasena: nuevoUsuario.contrasena
        });
        
      expect(loginRes.statusCode).toBe(200);
      const token = loginRes.body.token;
      
      // 3. Verificar token
      const verifyRes = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${token}`);
        
      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.usuario.email).toBe(nuevoUsuario.email);
      
      // Eliminar usuario creado (limpieza)
      if (adminToken) {
        await request(app)
          .delete(`/users/${loginRes.body.usuario.id_usuario}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });

    it('Debe rechazar correctamente después de eliminar un usuario', async () => {
      // Crear un usuario temporal
      const tempUser = {
        nombre: 'Usuario Temporal',
        email: 'temporal@test.com',
        contrasena: 'temp123',
        rol: 'cliente'
      };
      
      // Registrar usuario
      const registerRes = await request(app)
        .post('/auth/register')
        .send(tempUser);
        
      expect(registerRes.statusCode).toBe(201);
      const tempUserId = registerRes.body.usuario.id_usuario;
      
      // Login con el usuario temporal
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: tempUser.email,
          contrasena: tempUser.contrasena
        });
        
      expect(loginRes.statusCode).toBe(200);
      const tempToken = loginRes.body.token;
      
      // Eliminar el usuario
      if (adminToken) {
        await request(app)
          .delete(`/users/${tempUserId}`)
          .set('Authorization', `Bearer ${adminToken}`);
          
        // Intentar verificar con el token del usuario eliminado
        // El token seguirá siendo válido porque JWT no depende del estado de la BD
        const verifyRes = await request(app)
          .get('/auth/verify')
          .set('Authorization', `Bearer ${tempToken}`);
          
        expect(verifyRes.statusCode).toBe(200);
        
        // Pero el login debería fallar
        const reLoginRes = await request(app)
          .post('/auth/login')
          .send({
            email: tempUser.email,
            contrasena: tempUser.contrasena
          });
          
        expect(reLoginRes.statusCode).toBe(400);
      }
    });
  });
});