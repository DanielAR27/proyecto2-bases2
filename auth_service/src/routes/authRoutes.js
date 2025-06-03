const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints relacionados al registro, login y verificación de usuarios
 */

/**
* @swagger
* tags:
*   name: Autenticación
*   description: Endpoints relacionados al registro, login y verificación de usuarios
*/

/**
* @swagger
* /auth/register:
*   post:
*     summary: Registrar un nuevo usuario
*     tags: [Autenticación]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - nombre
*               - email
*               - contrasena
*               - rol
*             properties:
*               nombre:
*                 type: string
*                 example: "Juan"
*               email:
*                 type: string
*                 example: "juan@gmail.com"
*               contrasena:
*                 type: string
*                 example: "1234"
*               rol:
*                 type: string
*                 enum: [cliente, administrador]
*                 example: "cliente"
*               id_referido:
*                 type: integer
*                 nullable: true
*                 description: ID del usuario que refirió a este usuario (opcional)
*                 example: 5
*     responses:
*       201:
*         description: Usuario registrado exitosamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Usuario registrado exitosamente."
*                 usuario:
*                   type: object
*                   properties:
*                     id_usuario:
*                       type: integer
*                       example: 5
*                     nombre:
*                       type: string
*                       example: "Juan"
*                     email:
*                       type: string
*                       example: "juan@gmail.com"
*                     rol:
*                       type: string
*                       example: "cliente"
*                     fecha_registro:
*                       type: string
*                       format: date-time
*                       example: "2025-06-02T15:30:00Z"
*                     latitud:
*                       type: number
*                       nullable: true
*                       example: null
*                     longitud:
*                       type: number
*                       nullable: true
*                       example: null
*                     direccion_completa:
*                       type: string
*                       nullable: true
*                       example: null
*                     id_referido:
*                       type: integer
*                       nullable: true
*                       example: 5
*       400:
*         description: Error de validación
*       500:
*         description: Error interno del servidor
*/
router.post('/register', authController.register);

/**
* @swagger
* /auth/login:
*   post:
*     summary: Iniciar sesión
*     tags: [Autenticación]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - email
*               - contrasena
*             properties:
*               email:
*                 type: string
*                 example: "juan@gmail.com"
*               contrasena:
*                 type: string
*                 example: "1234"
*     responses:
*       200:
*         description: Inicio de sesión exitoso.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Inicio de sesión exitoso."
*                 token:
*                   type: string
*                   example: "eyJhbGciOiJIU..."
*                 usuario:
*                   type: object
*                   properties:
*                     id_usuario:
*                       type: integer
*                       example: 5
*                     nombre:
*                       type: string
*                       example: "Juan"
*                     email:
*                       type: string
*                       example: "juan@gmail.com"
*                     rol:
*                       type: string
*                       example: "cliente"
*       400:
*         description: Credenciales inválidas
*/
router.post('/login', authController.login);

/**
* @swagger
* /auth/verify:
*   get:
*     summary: Verificar la validez de un token JWT
*     tags: [Autenticación]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Inicio de sesión exitoso.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 usuario:
*                   type: object
*                   properties:
*                     id_usuario:
*                       type: integer
*                       example: 5
*                     nombre:
*                       type: string
*                       example: "Juan"
*                     email:
*                       type: string
*                       example: "juan@gmail.com"
*                     rol:
*                       type: string
*                       example: "cliente"
*                     iat:
*                       type: integer
*                       example: 1748894057
*                     exp:
*                       type: integer
*                       example: 1748901257
*       401:
*         description: Token inválido o no proporcionado
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Token inválido o expirado."
*/
router.get('/verify', authController.verifyToken);

module.exports = router;
