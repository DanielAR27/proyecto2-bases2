// src/routes/menuRoutes.js

const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Menús
 *   description: Endpoints para gestión de menús de restaurantes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Menu:
 *       type: object
 *       properties:
 *         id_menu:
 *           type: integer
 *           example: 1
 *         id_restaurante:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "Menú Principal"
 *         descripcion:
 *           type: string
 *           nullable: true
 *           example: "Platos principales del restaurante"
 *     MenuCreate:
 *       type: object
 *       required:
 *         - id_restaurante
 *         - nombre
 *       properties:
 *         id_restaurante:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           maxLength: 100
 *           example: "Menú Principal"
 *         descripcion:
 *           type: string
 *           maxLength: 1000
 *           example: "Platos principales del restaurante"
 *     MenuUpdate:
 *       type: object
 *       required:
 *         - nombre
 *       properties:
 *         nombre:
 *           type: string
 *           maxLength: 100
 *           example: "Menú Principal Actualizado"
 *         descripcion:
 *           type: string
 *           maxLength: 1000
 *           example: "Descripción actualizada del menú"
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /menus:
 *   post:
 *     summary: Crear un nuevo menú
 *     description: Crea un nuevo menú para un restaurante específico. Solo administradores pueden realizar esta acción. También invalida el caché de menús.
 *     tags: [Menús]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuCreate'
 *           example:
 *             id_restaurante: 1
 *             nombre: "Menú Principal"
 *             descripcion: "Platos principales del restaurante"
 *     responses:
 *       201:
 *         description: Menú creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Menú creado correctamente."
 *                 menu:
 *                   $ref: '#/components/schemas/Menu'
 *             example:
 *               message: "Menú creado correctamente."
 *               menu:
 *                 id_menu: 1
 *                 id_restaurante: 1
 *                 nombre: "Menú Principal"
 *                 descripcion: "Platos principales del restaurante"
 *       400:
 *         description: Error de validación - campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "id_restaurante y nombre son obligatorios."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden crear menús
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden crear menús."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.post('/', authMiddleware, menuController.createMenu);

/**
 * @swagger
 * /menus:
 *   get:
 *     summary: Obtener todos los menús
 *     description: Retorna una lista de todos los menús disponibles ordenados por ID. Los datos pueden venir de caché Redis.
 *     tags: [Menús]
 *     responses:
 *       200:
 *         description: Lista de menús obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Menu'
 *             example:
 *               - id_menu: 1
 *                 id_restaurante: 1
 *                 nombre: "Menú Principal"
 *                 descripcion: "Platos principales del restaurante"
 *               - id_menu: 2
 *                 id_restaurante: 1
 *                 nombre: "Menú Vegetariano"
 *                 descripcion: "Opciones vegetarianas especiales"
 *               - id_menu: 3
 *                 id_restaurante: 2
 *                 nombre: "Menú Ejecutivo"
 *                 descripcion: "Menú especial para almuerzos ejecutivos"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.get('/', menuController.getAllMenus);

/**
 * @swagger
 * /menus/{id}:
 *   get:
 *     summary: Obtener un menú por ID
 *     description: Retorna la información detallada de un menú específico. Los datos pueden venir de caché Redis.
 *     tags: [Menús]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del menú
 *         example: 1
 *     responses:
 *       200:
 *         description: Menú encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Menu'
 *             example:
 *               id_menu: 1
 *               id_restaurante: 1
 *               nombre: "Menú Principal"
 *               descripcion: "Platos principales del restaurante"
 *       404:
 *         description: Menú no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Menú no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.get('/:id', menuController.getMenuById);

/**
 * @swagger
 * /menus/{id}:
 *   put:
 *     summary: Actualizar un menú existente
 *     description: Actualiza la información de un menú existente. Solo administradores pueden realizar esta acción. También invalida los cachés relacionados.
 *     tags: [Menús]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del menú a actualizar
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuUpdate'
 *           example:
 *             nombre: "Menú Principal Actualizado"
 *             descripcion: "Descripción actualizada del menú"
 *     responses:
 *       200:
 *         description: Menú actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Menú actualizado correctamente."
 *                 menu:
 *                   $ref: '#/components/schemas/Menu'
 *             example:
 *               message: "Menú actualizado correctamente."
 *               menu:
 *                 id_menu: 1
 *                 id_restaurante: 1
 *                 nombre: "Menú Principal Actualizado"
 *                 descripcion: "Descripción actualizada del menú"
 *       400:
 *         description: Error de validación - nombre es obligatorio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "El nombre del menú es obligatorio."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden actualizar menús
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden actualizar menús."
 *       404:
 *         description: Menú no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Menú no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.put('/:id', authMiddleware, menuController.updateMenu);

/**
 * @swagger
 * /menus/{id}:
 *   delete:
 *     summary: Eliminar un menú
 *     description: Elimina un menú del sistema permanentemente. Solo administradores pueden realizar esta acción. También elimina productos asociados e invalida múltiples cachés.
 *     tags: [Menús]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del menú a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Menú eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Menú eliminado correctamente."
 *             example:
 *               message: "Menú eliminado correctamente."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden eliminar menús
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden eliminar menús."
 *       404:
 *         description: Menú no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Menú no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.delete('/:id', authMiddleware, menuController.deleteMenu);

module.exports = router;