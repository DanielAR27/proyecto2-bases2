const axios = require('axios');
const neo4jService = require('../services/neo4jService');

const routingController = {
  async assignDriver(req, res) {
    try {
      const { id_pedido } = req.body;
      console.log('🚀 Iniciando asignación para pedido:', id_pedido);

      // Verificar autenticación y autorización
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden asignar repartidores.' });
      }

      if (!id_pedido) {
        return res.status(400).json({ error: 'ID del pedido es requerido.' });
      }

      // Obtener token del header
      const authToken = req.header('Authorization');
      const authHeaders = {
        headers: {
          Authorization: authToken
        }
      };

      // Paso 1: Obtener información del pedido
      console.log('📦 Obteniendo información del pedido...');
      const pedidoResponse = await axios.get(`${process.env.API_URL}/orders/${id_pedido}`);
      const pedido = pedidoResponse.data;
      console.log('✅ Pedido obtenido:', { id_pedido: pedido.id_pedido, id_restaurante: pedido.id_restaurante, estado: pedido.estado });

      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      if (pedido.estado !== 'pendiente') {
        return res.status(400).json({ error: 'El pedido no está en estado pendiente.' });
      }

      // Paso 2: Obtener información del restaurante
      console.log('🏪 Obteniendo información del restaurante...');
      const restauranteResponse = await axios.get(`${process.env.API_URL}/restaurants/${pedido.id_restaurante}`);
      const restaurante = restauranteResponse.data;
      console.log('✅ Restaurante obtenido:', { 
        nombre: restaurante.nombre, 
        latitud: restaurante.latitud, 
        longitud: restaurante.longitud 
      });

      if (!restaurante || !restaurante.latitud || !restaurante.longitud) {
        return res.status(400).json({ error: 'Restaurante no tiene ubicación configurada.' });
      }

      // Paso 3: Obtener repartidores disponibles con ubicación (CON TOKEN)
      console.log('🚗 Obteniendo repartidores disponibles...');
      const repartidoresResponse = await axios.get(`${process.env.API_URL}/drivers/available/location`, authHeaders);
      const availableDrivers = repartidoresResponse.data.repartidores || [];
      console.log('✅ Repartidores disponibles:', availableDrivers.length);
      console.log('📋 Lista de repartidores:', availableDrivers.map(d => ({ 
        id: d.id_repartidor, 
        nombre: d.nombre, 
        lat: d.latitud_actual, 
        lng: d.longitud_actual 
      })));

      if (availableDrivers.length === 0) {
        return res.status(404).json({ error: 'No hay repartidores disponibles con ubicación.' });
      }

      // Paso 4: Crear nodo del restaurante en Neo4J
      console.log('🌐 Creando nodo del restaurante en Neo4J...');
      const restauranteNode = await neo4jService.createOrUpdateRestaurant({
        id_restaurante: restaurante.id_restaurante,
        nombre: restaurante.nombre,
        latitud: restaurante.latitud,
        longitud: restaurante.longitud
      });
      console.log('✅ Nodo del restaurante creado:', restauranteNode);

      // Paso 5: Calcular distancias y encontrar el más cercano
      console.log('📏 Calculando distancias en Neo4J...');
      const nearestDriver = await neo4jService.createDistanceRelations(
        restaurante.id_restaurante,
        availableDrivers
      );
      console.log('✅ Repartidor más cercano encontrado:', nearestDriver);

      if (!nearestDriver) {
        return res.status(500).json({ error: 'No se pudo calcular el repartidor más cercano.' });
      }

      // Paso 6: Asignar repartidor al pedido (CON TOKEN)
      console.log('🔗 Asignando repartidor al pedido...');
      await axios.put(`${process.env.API_URL}/orders/${id_pedido}/assign`, {
        id_repartidor: nearestDriver.id_repartidor
      }, authHeaders);
      console.log('✅ Repartidor asignado al pedido');

      // Paso 7: Cambiar estado del pedido a "en camino" (CON TOKEN)
      console.log('🚚 Cambiando estado del pedido...');
      await axios.put(`${process.env.API_URL}/orders/${id_pedido}/status`, {
        estado: "en preparacion"
      }, authHeaders);
      console.log('✅ Estado del pedido actualizado a "en camino"');

      // Paso 8: Cambiar estado del repartidor a "ocupado" (CON TOKEN)
      console.log('👨‍💼 Cambiando estado del repartidor...');
      await axios.put(`${process.env.API_URL}/drivers/${nearestDriver.id_repartidor}/status`, {
        estado: "ocupado"
      }, authHeaders);
      console.log('✅ Estado del repartidor actualizado a "ocupado"');

      console.log('🎉 Asignación completada exitosamente!');

      // Respuesta exitosa
      res.json({
        message: 'Repartidor asignado correctamente',
        repartidor: {
          id_repartidor: nearestDriver.id_repartidor,
          nombre: nearestDriver.nombre,
          coordenadas: nearestDriver.coordenadas,
          distancia: nearestDriver.distancia
        }
      });

    } catch (error) {
      console.error('❌ Error asignando repartidor:', error.message);
      console.error('📍 Stack trace:', error.stack);
      
      // Manejar errores específicos de axios
      if (error.response) {
        console.error('🔴 Error de API:', error.response.status, error.response.data);
        return res.status(error.response.status).json({ 
          error: error.response.data.error || 'Error en llamada a API' 
        });
      }

      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
};

module.exports = routingController;