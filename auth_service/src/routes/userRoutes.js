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

module.exports = router;
