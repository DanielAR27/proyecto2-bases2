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
 * /users/me:
 *   get:
 *     summary: Obtener información del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario
 *       401:
 *         description: Token inválido o no proporcionado
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
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         example: "Juan Pérez"
 *                       email:
 *                         type: string
 *                         example: "juan@example.com"
 *                       rol:
 *                         type: string
 *                         example: "cliente"
 *                       latitud:
 *                         type: number
 *                         format: float
 *                         example: 9.9341
 *                       longitud:
 *                         type: number
 *                         format: float
 *                         example: -84.0877
 *                       direccion_completa:
 *                         type: string
 *                         example: "Cartago, Costa Rica"
 *                       fecha_registro:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-01-15T10:30:00Z"
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
 *               email:
 *                 type: string
 *               rol:
 *                 type: string
 *                 enum: [cliente, administrador]
 *             example:
 *               nombre: "string"
 *               email: "string"
 *               rol: "string"
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         description: Error de validación (campos faltantes o rol inválido)
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: No autorizado. El usuario no tiene permisos para actualizar este perfil o intentó asignarse rol de administrador.
 *       404:
 *         description: Usuario no encontrado
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
 *         description: Usuario eliminado exitosamente
 *       401:
 *         description: Token inválido
 *       403:
 *         description: No autorizado (requiere rol de administrador)
 *       404:
 *         description: Usuario no encontrado
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
 *                     nombre:
 *                       type: string
 *                     email:
 *                       type: string
 *                     rol:
 *                       type: string
 *                     latitud:
 *                       type: number
 *                     longitud:
 *                       type: number
 *                     direccion_completa:
 *                       type: string
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
 */
router.put('/:id/location', verificarToken, userController.updateUserLocation);

module.exports = router;
