const express = require('express');
const userController = require('../controllers/userController');
const { verificarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
* @swagger
* tags:
*   name: Usuarios
*   description: Endpoints para gestionar usuarios
*/

/**
* @swagger
* /users:
*   get:
*     summary: Obtener todos los usuarios
*     description: Endpoint para análisis completo de referidos. Devuelve todos los usuarios del sistema.
*     tags: [Usuarios]
*     responses:
*       200:
*         description: Lista completa de usuarios obtenida exitosamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Todos los usuarios obtenidos correctamente."
*                 total:
*                   type: integer
*                   example: 50
*                 usuarios:
*                   type: array
*                   items:
*                     type: object
*                     properties:
*                       id_usuario:
*                         type: integer
*                       nombre:
*                         type: string
*                       email:
*                         type: string
*                       rol:
*                         type: string
*                       latitud:
*                         type: number
*                         format: float
*                         nullable: true
*                       longitud:
*                         type: number
*                         format: float
*                         nullable: true
*                       direccion_completa:
*                         type: string
*                         nullable: true
*                       fecha_registro:
*                         type: string
*                         format: date-time
*                       id_referido:
*                         type: integer
*                         nullable: true
*                   example:
*                     - id_usuario: 1
*                       nombre: "Juan Pérez"
*                       email: "juan@example.com"
*                       rol: "cliente"
*                       latitud: 9.9341
*                       longitud: -84.0877
*                       direccion_completa: "Cartago, Costa Rica"
*                       fecha_registro: "2025-01-15T10:30:00Z"
*                       id_referido: null
*                     - id_usuario: 9
*                       nombre: "María López"
*                       email: "maria@example.com"
*                       rol: "cliente"
*                       latitud: null
*                       longitud: null
*                       direccion_completa: null
*                       fecha_registro: "2025-01-20T14:45:00Z"
*                       id_referido: null
*                     - id_usuario: 15
*                       nombre: "Carlos Gómez"
*                       email: "carlos@example.com"
*                       rol: "cliente"
*                       latitud: 10.0167
*                       longitud: -84.2167
*                       direccion_completa: "Alajuela, Costa Rica"
*                       fecha_registro: "2025-01-22T16:30:00Z"
*                       id_referido: 9
*                     - "..."
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Error en el servidor."
*/
router.get('/', userController.getAllUsers);

/**
* @swagger
* /users/me:
*   get:
*     summary: Obtener información del usuario autenticado
*     tags: [Usuarios]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Información del usuario.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 id_usuario:
*                    type: integer
*                    example: 5
*                 nombre:
*                    type: string
*                    example: "Juan"
*                 email:
*                    type: string
*                    example: "juan@gmail.com"
*                 rol:
*                    type: string
*                    example: "cliente"
*                 latitud:
*                     type: integer
*                     nullable: true
*                     example: null
*                 longitud:
*                     type: integer
*                     nullable: true
*                     example: null
*                 direccion_completa:
*                     type: string
*                     nullable: true
*                     example: null
*                 id_referido:
*                     type: integer
*                     nullable: true
*                     example: null
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
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Error en el servidor."
*/
router.get('/me', verificarToken, userController.getMe);

/**
* @swagger
* /users/location:
*   get:
*     summary: Obtener todos los usuarios con ubicación geográfica
*     description: Endpoint para ETL y análisis OLAP. Solo accesible por administradores.
*     tags: [Usuarios]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Lista de usuarios con ubicación obtenida exitosamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Usuarios con ubicación obtenidos correctamente."
*                 total:
*                   type: integer
*                   example: 25
*                 usuarios:
*                   type: array
*                   items:
*                     type: object
*                     properties:
*                       id_usuario:
*                         type: integer
*                       nombre:
*                         type: string
*                       email:
*                         type: string
*                       rol:
*                         type: string
*                       latitud:
*                         type: number
*                         format: float
*                       longitud:
*                         type: number
*                         format: float
*                       direccion_completa:
*                         type: string
*                       fecha_registro:
*                         type: string
*                         format: date-time
*                   example:
*                     - id_usuario: 1
*                       nombre: "Juan Pérez"
*                       email: "juan@example.com"
*                       rol: "cliente"
*                       latitud: 9.9341
*                       longitud: -84.0877
*                       direccion_completa: "Cartago, Costa Rica"
*                       fecha_registro: "2025-01-15T10:30:00Z"
*                     - id_usuario: 2
*                       nombre: "María Gómez"
*                       email: "maria@example.com"
*                       rol: "cliente"
*                       latitud: 10.0167
*                       longitud: -84.2167
*                       direccion_completa: "Alajuela, Costa Rica"
*                       fecha_registro: "2025-01-16T14:45:00Z"
*                     - "..."
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
*       403:
*         description: No autorizado - requiere rol de administrador
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "No tiene permisos para acceder a esta información."
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Error en el servidor."
*/
router.get('/location', verificarToken, userController.getAllUsersWithLocation);

/**
* @swagger
* /users/referrers:
*   get:
*     summary: Obtener todos los usuarios que tienen un referido
*     description: Endpoint para análisis de referidos. Solo accesible por administradores.
*     tags: [Usuarios]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Lista de usuarios con referido obtenida exitosamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Usuarios con referido obtenidos correctamente."
*                 total:
*                   type: integer
*                   example: 15
*                 usuarios:
*                   type: array
*                   items:
*                     type: object
*                     properties:
*                       id_usuario:
*                         type: integer
*                       nombre:
*                         type: string
*                       email:
*                         type: string
*                       rol:
*                         type: string
*                       latitud:
*                         type: number
*                         format: float
*                         nullable: true
*                       longitud:
*                         type: number
*                         format: float
*                         nullable: true
*                       direccion_completa:
*                         type: string
*                         nullable: true
*                       fecha_registro:
*                         type: string
*                         format: date-time
*                       id_referido:
*                         type: integer
*                   example:
*                     - id_usuario: 3
*                       nombre: "Carlos López"
*                       email: "carlos@example.com"
*                       rol: "cliente"
*                       latitud: 9.9341
*                       longitud: -84.0877
*                       direccion_completa: "Cartago, Costa Rica"
*                       fecha_registro: "2025-01-20T09:15:00Z"
*                       id_referido: 1
*                     - id_usuario: 5
*                       nombre: "Ana Rodríguez"
*                       email: "ana@example.com"
*                       rol: "cliente"
*                       latitud: null
*                       longitud: null
*                       direccion_completa: null
*                       fecha_registro: "2025-01-22T16:30:00Z"
*                       id_referido: 2
*                     - "..."
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
*       403:
*         description: No autorizado - requiere rol de administrador
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "No tiene permisos para acceder a esta información."
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Error en el servidor."
*/
router.get('/referrers', verificarToken, userController.getAllUsersWithReferrer);

/**
* @swagger
* /users/{id}:
*   get:
*     summary: Obtener información de un usuario por ID
*     tags: [Usuarios]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: ID del usuario a consultar
*     responses:
*       200:
*         description: Información del usuario.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 id_usuario:
*                    type: integer
*                    example: 5
*                 nombre:
*                    type: string
*                    example: "Juan"
*                 email:
*                    type: string
*                    example: "juan@gmail.com"
*                 rol:
*                    type: string
*                    example: "cliente"
*                 latitud:
*                     type: number
*                     nullable: true
*                     example: 9.9341
*                 longitud:
*                     type: number
*                     nullable: true
*                     example: -84.0877
*                 direccion_completa:
*                     type: string
*                     nullable: true
*                     example: "Cartago, Costa Rica"
*                 id_referido:
*                     type: integer
*                     nullable: true
*                     example: null
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
*       403:
*         description: No autorizado para ver este usuario
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "No tiene permisos para ver este usuario."
*       404:
*         description: Usuario no encontrado
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Usuario no encontrado."
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Error en el servidor."
*/
router.get('/:id', verificarToken, userController.getUserById);

/**
* @swagger
* /users/{id}:
*   put:
*     summary: Actualizar información de un usuario
*     tags: [Usuarios]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: ID del usuario a actualizar
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - nombre
*               - email
*               - rol
*             properties:
*               nombre:
*                 type: string
*                 example: "John"
*               email:
*                 type: string
*                 example: "john@gmail.com"
*               rol:
*                 type: string
*                 enum: [cliente, administrador]
*                 example: "cliente"
*     responses:
*       200:
*         description: Usuario actualizado correctamente.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Usuario actualizado correctamente."
*                 usuario:
*                   type: object
*                   properties:
*                     id_usuario:
*                       type: integer
*                       example: 5
*                     nombre:
*                       type: string
*                       example: "John"
*                     email:
*                       type: string
*                       example: "john@gmail.com"
*                     rol:
*                       type: string
*                       example: "cliente"
*       400:
*         description: Error de validación (campos faltantes o rol inválido)
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Todos los campos son obligatorios."
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
*       403:
*         description: No autorizado. El usuario no tiene permisos para actualizar este perfil o intentó asignarse rol de administrador.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "No tiene permisos para actualizar este usuario."
*       404:
*         description: Usuario no encontrado
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Usuario no encontrado."
*/
router.put('/:id', verificarToken, userController.updateUser);

/**
* @swagger
* /users/{id}:
*   delete:
*     summary: Eliminar un usuario
*     tags: [Usuarios]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: ID del usuario a eliminar
*     responses:
*       200:
*         description: Usuario eliminado correctamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Usuario eliminado correctamente."
*       401:
*         description: Token inválido o expirado
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Token inválido o expirado."
*       403:
*         description: No autorizado (requiere rol de administrador)
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "No tiene permisos para eliminar usuarios."
*       404:
*         description: Usuario no encontrado
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Usuario no encontrado."
*/
router.delete('/:id', verificarToken, userController.deleteUser);

/**
* @swagger
* /users/{id}/location:
*   put:
*     summary: Actualizar ubicación geográfica de un usuario
*     tags: [Usuarios]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: ID del usuario cuya ubicación se va a actualizar
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - latitud
*               - longitud
*             properties:
*               latitud:
*                 type: number
*                 format: float
*                 minimum: -90
*                 maximum: 90
*                 description: Latitud en grados decimales
*               longitud:
*                 type: number
*                 format: float
*                 minimum: -180
*                 maximum: 180
*                 description: Longitud en grados decimales
*               direccion_completa:
*                 type: string
*                 maxLength: 500
*                 description: Dirección completa del usuario (opcional)
*             example:
*               latitud: 9.9341
*               longitud: -84.0877
*               direccion_completa: "Cartago, Costa Rica"
*     responses:
*       200:
*         description: Ubicación actualizada exitosamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Ubicación actualizada correctamente."
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
*                       example: "clinete"
*                     latitud:
*                       type: number
*                       example: 9.9341
*                     longitud:
*                       type: number
*                       example: -84.0877
*                     direccion_completa:
*                       type: string
*                       example: "Cartago, Costa Rica"
*       400:
*         description: Error de validación (latitud y longitud son obligatorios)
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Latitud y longitud son obligatorios."
*       401:
*         description: Token inválido o no proporcionado
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Token requerido."
*       403:
*         description: No autorizado para actualizar esta ubicación
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "No autorizado para actualizar esta ubicación."
*       404:
*         description: Usuario no encontrado
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Usuario no encontrado."
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Error en el servidor."
*/
router.put('/:id/location', verificarToken, userController.updateUserLocation);

/**
* @swagger
* /users/{id}/registration-date:
*   put:
*     summary: Actualizar fecha de registro de un usuario (solo administradores)
*     tags: [Usuarios]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: ID del usuario cuya fecha de registro se va a actualizar
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - fecha_registro
*             properties:
*               fecha_registro:
*                 type: string
*                 format: date-time
*                 description: Nueva fecha de registro en formato ISO
*                 example: "2024-01-15T10:30:00Z"
*     responses:
*       200:
*         description: Fecha de registro actualizada correctamente.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Fecha de registro actualizada correctamente."
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
*                     fecha_registro:
*                       type: string
*                       format: date-time
*                       description: Nueva fecha de registro en formato ISO
*                       example: "2024-01-15T10:30:00Z"
*       400:
*         description: Error de validación en los parámetros enviados
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*             examples:
*               fecha_invalida:
*                 summary: Formato de fecha inválido
*                 value:
*                   error: "Formato de fecha inválido."
*               fecha_faltante:
*                 summary: Falta la fecha de registro
*                 value:
*                   error: "La fecha de registro es obligatoria."
*       401:
*         description: Token inválido o expirado
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Token inválido o expirado."
*       403:
*         description: No autorizado (requiere rol de administrador)
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "No tiene permisos para actualizar fecha de registro."
*       404:
*         description: Usuario no encontrado
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Usuario no encontrado."
*/
router.put('/:id/registration-date', verificarToken, userController.updateUserRegistrationDate);

module.exports = router;
