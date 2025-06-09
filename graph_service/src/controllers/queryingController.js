const axios = require('axios');
const neo4jService = require('../services/neo4jService');

const queryingController = {
  async getCopurchases(req, res) {
    try {
      console.log('🚀 Obteniendo top 5 productos más comprados juntos...');

      // Verificar autenticación (cualquier usuario autenticado puede ver)
      if (!req.usuario) {
        return res.status(401).json({ error: 'Acceso no autorizado. Token requerido.' });
      }

      // Obtener co-purchases desde Neo4J
      console.log('📊 Consultando co-purchases en Neo4J...');
      const copurchases = await neo4jService.getTopCopurchases();
      console.log('✅ Co-purchases obtenidos:', copurchases.length);

      console.log('🎉 Co-purchases obtenidos exitosamente!');

      // Respuesta exitosa (incluye casos con array vacío)
      res.json({
        message: 'Top 5 productos más comprados juntos obtenidos correctamente',
        copurchases,
        total: copurchases.length,
        generado_en: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo co-purchases:', error.message);
      console.error('📍 Stack trace:', error.stack);
      
      res.status(500).json({ error: 'Error interno del servidor al obtener co-purchases.' });
    }
  },

  async recalculateCopurchases(req, res) {
    try {
      console.log('🚀 Iniciando recálculo completo de co-purchases...');

      // Verificar autenticación y autorización (solo administradores)
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden recalcular co-purchases.' });
      }

      // Obtener token del header para llamadas a API
      const authToken = req.header('Authorization');
      const authHeaders = {
        headers: {
          Authorization: authToken
        }
      };

      // URLs de las APIs
      const ordersApiUrl = `${process.env.API_URL}/orders`;
      const productsApiUrl = `${process.env.API_URL}/products`;

      console.log('📡 Obteniendo datos desde APIs...');
      console.log('🔗 URLs:', { ordersApiUrl, productsApiUrl });

      // Paso 1: Obtener productos desde API
      console.log('🔄 Obteniendo productos desde API...');
      const productsResponse = await axios.get(productsApiUrl, authHeaders);
      const products = productsResponse.data;
      console.log('✅ Productos obtenidos:', products.length);

      // Paso 2: Obtener pedidos desde API
      console.log('🔄 Obteniendo pedidos desde API...');
      const ordersResponse = await axios.get(ordersApiUrl, authHeaders);
      const orders = ordersResponse.data;
      console.log('✅ Pedidos obtenidos:', orders.length);

      // Paso 3: Sincronizar datos en Neo4J
      console.log('🔄 Sincronizando datos en Neo4J...');
      const syncResult = await neo4jService.syncHistoricalData(orders, products);
      console.log('✅ Sincronización completada:', syncResult);

      // Paso 4: Calcular co-purchases
      console.log('🧮 Calculando co-purchases...');
      const copurchases = await neo4jService.calculateCopurchases();
      console.log('✅ Co-purchases calculados:', copurchases.length);

      // Paso 5: Obtener top 5 actualizado
      console.log('📊 Obteniendo top 5 actualizado...');
      const top5 = await neo4jService.getTopCopurchases();
      console.log('✅ Top 5 obtenido:', top5.length);

      console.log('🎉 Recálculo completado exitosamente!');

      // Respuesta exitosa
      res.json({
        message: 'Co-purchases recalculados correctamente desde la base de datos',
        sincronizacion: syncResult,
        copurchases_calculados: copurchases.length,
        top_5_actualizado: top5,
        recalculado_en: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error recalculando co-purchases:', error.message);
      console.error('📍 Stack trace:', error.stack);
      
      // Manejar errores específicos de axios
      if (error.response) {
        console.error('🔴 Error de API:', error.response.status, error.response.data);
        return res.status(error.response.status).json({ 
          error: error.response.data.error || 'Error en llamada a API externa' 
        });
      }

      res.status(500).json({ error: 'Error interno del servidor al recalcular co-purchases.' });
    }
  },

  async getInfluencers(req, res) {
    try {
      console.log('🚀 Obteniendo top 5 usuarios más influyentes...');

      // Verificar autenticación (cualquier usuario autenticado puede ver)
      if (!req.usuario) {
        return res.status(401).json({ error: 'Acceso no autorizado. Token requerido.' });
      }

      // Obtener influencers desde Neo4J
      console.log('📊 Consultando influencers en Neo4J...');
      const influencers = await neo4jService.getTopInfluencers();
      console.log('✅ Influencers obtenidos:', influencers.length);

      console.log('🎉 Influencers obtenidos exitosamente!');

      // Respuesta exitosa (incluye casos con array vacío)
      res.json({
        message: 'Top 5 usuarios más influyentes obtenidos correctamente',
        influencers,
        total: influencers.length,
        generado_en: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo influencers:', error.message);
      console.error('📍 Stack trace:', error.stack);
      
      res.status(500).json({ error: 'Error interno del servidor al obtener influencers.' });
    }
  },

  async recalculateInfluencers(req, res) {
    try {
      console.log('🚀 Iniciando recálculo completo de influencers...');

      // Verificar autenticación y autorización (solo administradores)
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden recalcular influencers.' });
      }

      // Obtener token del header para llamadas a API
      const authToken = req.header('Authorization');
      const authHeaders = {
        headers: {
          Authorization: authToken
        }
      };

      // URL de la API de usuarios (corregida para usar /users/referrers)
      const usersApiUrl = `${process.env.AUTH_SERVICE_URL}/users/referrers`;

      console.log('📡 Obteniendo datos de usuarios desde API...');
      console.log('🔗 URL:', usersApiUrl);

      // Paso 1: Obtener usuarios desde API
      console.log('🔄 Obteniendo usuarios desde API...');
      const usersResponse = await axios.get(usersApiUrl, authHeaders);
      const usersData = usersResponse.data; // Toda la respuesta con estructura { message, total, usuarios: [...] }
      console.log('✅ Usuarios obtenidos:', usersData.total || usersData.usuarios?.length || 0);

      // Paso 2: Sincronizar usuarios en Neo4J
      console.log('🔄 Sincronizando usuarios en Neo4J...');
      const syncResult = await neo4jService.syncUsersData(usersData);
      console.log('✅ Sincronización de usuarios completada:', syncResult);

      // Paso 3: Crear relaciones REFIERE
      console.log('🔗 Creando relaciones de referencia...');
      const relationshipsResult = await neo4jService.createReferenceRelationships(usersData);
      console.log('✅ Relaciones de referencia creadas:', relationshipsResult);

      // Paso 4: Obtener top 5 actualizado
      console.log('📊 Obteniendo top 5 influencers actualizado...');
      const top5 = await neo4jService.getTopInfluencers();
      console.log('✅ Top 5 influencers obtenido:', top5.length);

      console.log('🎉 Recálculo de influencers completado exitosamente!');

      // Respuesta exitosa
      res.json({
        message: 'Influencers recalculados correctamente desde la base de datos',
        sincronizacion: syncResult,
        relaciones_creadas: relationshipsResult,
        top_5_actualizado: top5,
        recalculado_en: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error recalculando influencers:', error.message);
      console.error('📍 Stack trace:', error.stack);
      
      // Manejar errores específicos de axios
      if (error.response) {
        console.error('🔴 Error de API:', error.response.status, error.response.data);
        return res.status(error.response.status).json({ 
          error: error.response.data.error || 'Error en llamada a API externa' 
        });
      }

      res.status(500).json({ error: 'Error interno del servidor al recalcular influencers.' });
    }
  }
};

module.exports = queryingController;