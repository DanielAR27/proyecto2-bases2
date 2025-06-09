const express = require('express');
const router = express.Router();
const queryingController = require('../controllers/queryingController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
* @swagger
* tags:
*   name: Querying Analytics
*   description: Análisis de datos usando grafos y algoritmos de co-purchases
*/

/**
* @swagger
* components:
*   schemas:
*     Copurchase:
*       type: object
*       properties:
*         producto1:
*           type: string
*           example: "Pizza Margherita"
*         producto2:
*           type: string
*           example: "Coca Cola"
*         frecuencia:
*           type: integer
*           description: Número de veces que se compraron juntos
*           example: 15
*         support:
*           type: number
*           format: float
*           description: Frecuencia relativa del par en todas las transacciones
*           example: 0.0375
*         confidence:
*           type: number
*           format: float
*           description: Probabilidad condicional de compra conjunta
*           example: 0.6250
*     SyncResult:
*       type: object
*       properties:
*         productos_sincronizados:
*           type: integer
*           example: 25
*         pedidos_sincronizados:
*           type: integer
*           example: 150
*         relaciones_creadas:
*           type: integer
*           example: 320
*     Influencer:
*       type: object
*       properties:
*         id_usuario:
*           type: integer
*           description: ID único del usuario influyente
*           example: 42
*         nombre:
*           type: string
*           description: Nombre completo del usuario
*           example: "María González Rodríguez"
*         total_referidos:
*           type: integer
*           description: Número total de usuarios referidos por este usuario
*           example: 8
*     UserSyncResult:
*       type: object
*       properties:
*         usuarios_sincronizados:
*           type: integer
*           example: 100
*         source_db:
*           type: string
*           example: "mongodb"
*     ReferenceRelationsResult:
*       type: object
*       properties:
*         relaciones_creadas:
*           type: integer
*           example: 65
*         source_db:
*           type: string
*           example: "mongodb"
*     Error:
*       type: object
*       properties:
*         error:
*           type: string
*/

/**
* @swagger
*  /querying/co-purchases:
*   get:
*     summary: Obtener los 5 productos más comprados juntos
*     description: Retorna el top 5 de productos que más frecuentemente se compran en conjunto, basado en análisis de market basket usando Neo4J
*     tags: [Querying Analytics]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Top 5 co-purchases obtenidos correctamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Top 5 productos más comprados juntos obtenidos correctamente"
*                 copurchases:
*                   type: array
*                   items:
*                     $ref: '#/components/schemas/Copurchase'
*                 total:
*                   type: integer
*                   example: 5
*                 generado_en:
*                   type: string
*                   format: date-time
*                   example: "2025-06-04T16:30:00.000Z"
*             example:
*               message: "Top 5 productos más comprados juntos obtenidos correctamente"
*               copurchases:
*                 - producto1: "Pizza Margherita"
*                   producto2: "Coca Cola"
*                   frecuencia: 15
*                   support: 0.0375
*                   confidence: 0.6250
*                 - producto1: "Hamburguesa Clásica"
*                   producto2: "Papas Fritas"
*                   frecuencia: 12
*                   support: 0.0300
*                   confidence: 0.5714
*               total: 5
*               generado_en: "2025-06-04T16:30:00.000Z"

*       401:
*         description: Token inválido o no proporcionado
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             example:
*               error: "Acceso no autorizado. Token requerido."
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             example:
*               error: "Error interno del servidor al obtener co-purchases."
*/
router.get('/co-purchases', authMiddleware, queryingController.getCopurchases);

/**
* @swagger
* /querying/influencers:
*   get:
*     summary: Obtener los 5 usuarios más influyentes
*     description: Retorna el top 5 de usuarios que más referencias han hecho, basado en análisis de grafos usando Neo4J
*     tags: [Querying Analytics]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Top 5 influencers obtenidos correctamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Top 5 usuarios más influyentes obtenidos correctamente"
*                 influencers:
*                   type: array
*                   items:
*                     $ref: '#/components/schemas/Influencer'
*                 total:
*                   type: integer
*                   example: 5
*                 generado_en:
*                   type: string
*                   format: date-time
*                   example: "2025-06-05T14:30:00.000Z"
*             example:
*               message: "Top 5 usuarios más influyentes obtenidos correctamente"
*               influencers:
*                 - id_usuario: 42
*                   nombre: "María González Rodríguez"
*                   total_referidos: 8
*                 - id_usuario: 17
*                   nombre: "Carlos Méndez Vargas"
*                   total_referidos: 6
*                 - id_usuario: 23
*                   nombre: "Ana Sofía Jiménez"
*                   total_referidos: 5
*                 - id_usuario: 89
*                   nombre: "Diego Ramírez Castro"
*                   total_referidos: 4
*                 - id_usuario: 56
*                   nombre: "Lucía Fernández Mora"
*                   total_referidos: 3
*               total: 5
*               generado_en: "2025-06-05T14:30:00.000Z"
*       401:
*         description: Token inválido o no proporcionado
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             example:
*               error: "Acceso no autorizado. Token requerido."
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             example:
*               error: "Error interno del servidor al obtener influencers."
*/
router.get('/influencers', authMiddleware, queryingController.getInfluencers);

/**
* @swagger
* /querying/recalculate-copurchases:
*   post:
*     summary: Recalcular análisis de co-purchases desde la base de datos
*     description: Sincroniza todos los datos históricos de productos y pedidos desde las APIs, y recalcula las relaciones de co-purchases usando algoritmos de market basket analysis en Neo4J
*     tags: [Querying Analytics]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Co-purchases recalculados correctamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Co-purchases recalculados correctamente desde la base de datos"
*                 sincronizacion:
*                   $ref: '#/components/schemas/SyncResult'
*                 copurchases_calculados:
*                   type: integer
*                   description: Número total de pares de co-purchases encontrados
*                   example: 45
*                 top_5_actualizado:
*                   type: array
*                   items:
*                     $ref: '#/components/schemas/Copurchase'
*                   description: Top 5 actualizado después del recálculo
*                 recalculado_en:
*                   type: string
*                   format: date-time
*                   example: "2025-06-04T16:45:00.000Z"
*             example:
*               message: "Co-purchases recalculados correctamente desde la base de datos"
*               sincronizacion:
*                 productos_sincronizados: 25
*                 pedidos_sincronizados: 150
*                 relaciones_creadas: 320
*               copurchases_calculados: 45
*               top_5_actualizado:
*                 - producto1: "Pizza Margherita"
*                   producto2: "Coca Cola"
*                   frecuencia: 15
*                   support: 0.0375
*                   confidence: 0.6250
*               recalculado_en: "2025-06-04T16:45:00.000Z"
*       401:
*         description: Token inválido o no proporcionado
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             example:
*               error: "Acceso no autorizado. Token requerido."
*       403:
*         description: No autorizado - requiere rol de administrador
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             example:
*               error: "Solo los administradores pueden recalcular co-purchases."
*       400:
*         description: Error en llamada a API externa
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             examples:
*               api_no_disponible:
*                 summary: API externa no disponible
*                 value:
*                   error: "Error en llamada a API externa"
*               datos_invalidos:
*                 summary: Datos inválidos en respuesta de API
*                 value:
*                   error: "Estructura de datos inválida en respuesta de API"
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             examples:
*               error_neo4j:
*                 summary: Error en Neo4J
*                 value:
*                   error: "Error interno del servidor al recalcular co-purchases."
*               error_sincronizacion:
*                 summary: Error en sincronización
*                 value:
*                   error: "Error al sincronizar datos históricos"
*/
router.post('/recalculate-copurchases', authMiddleware, queryingController.recalculateCopurchases);

/**
* @swagger
* /querying/recalculate-influencers:
*   post:
*     summary: Recalcular análisis de usuarios influyentes desde la base de datos
*     description: Sincroniza todos los datos de usuarios desde la API de autenticación, crea las relaciones de referencia y recalcula el ranking de usuarios más influyentes usando Neo4J
*     tags: [Querying Analytics]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Influencers recalculados correctamente
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Influencers recalculados correctamente desde la base de datos"
*                 sincronizacion:
*                   $ref: '#/components/schemas/UserSyncResult'
*                 relaciones_creadas:
*                   $ref: '#/components/schemas/ReferenceRelationsResult'
*                 top_5_actualizado:
*                   type: array
*                   items:
*                     $ref: '#/components/schemas/Influencer'
*                   description: Top 5 actualizado después del recálculo
*                 recalculado_en:
*                   type: string
*                   format: date-time
*                   example: "2025-06-05T14:45:00.000Z"
*             example:
*               message: "Influencers recalculados correctamente desde la base de datos"
*               sincronizacion:
*                 usuarios_sincronizados: 100
*                 source_db: "mongodb"
*               relaciones_creadas:
*                 relaciones_creadas: 65
*                 source_db: "mongodb"
*               top_5_actualizado:
*                 - id_usuario: 42
*                   nombre: "María González Rodríguez"
*                   total_referidos: 8
*                 - id_usuario: 17
*                   nombre: "Carlos Méndez Vargas"
*                   total_referidos: 6
*               recalculado_en: "2025-06-05T14:45:00.000Z"
*       401:
*         description: Token inválido o no proporcionado
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             example:
*               error: "Acceso no autorizado. Token requerido."
*       403:
*         description: No autorizado - requiere rol de administrador
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             example:
*               error: "Solo los administradores pueden recalcular influencers."
*       400:
*         description: Error en llamada a API externa
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             examples:
*               api_no_disponible:
*                 summary: API de usuarios no disponible
*                 value:
*                   error: "Error en llamada a API externa"
*               datos_invalidos:
*                 summary: Datos inválidos en respuesta de API
*                 value:
*                   error: "Estructura de datos inválida en respuesta de API"
*       500:
*         description: Error interno del servidor
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Error'
*             examples:
*               error_neo4j:
*                 summary: Error en Neo4J
*                 value:
*                   error: "Error interno del servidor al recalcular influencers."
*               error_sincronizacion:
*                 summary: Error en sincronización de usuarios
*                 value:
*                   error: "Error al sincronizar datos de usuarios"
*/
router.post('/recalculate-influencers', authMiddleware, queryingController.recalculateInfluencers);

module.exports = router;