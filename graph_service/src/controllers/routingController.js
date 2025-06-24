const axios = require('axios');
const neo4jService = require('../services/neo4jService');

const routingController = {
  async optimizeRoute(req, res) {
    try {
      const { id } = req.params;
      console.log(' Iniciando optimización de ruta para repartidor:', id);

      // Verificar autenticación y autorización
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden optimizar rutas.' });
      }

      if (!id) {
        return res.status(400).json({ error: 'ID del repartidor es requerido.' });
      }

      // Obtener token del header
      const authToken = req.header('Authorization');
      const authHeaders = {
        headers: {
          Authorization: authToken
        }
      };

      // Paso 1: Obtener usuarios asignados al repartidor
      console.log(' Obteniendo usuarios asignados al repartidor...');
      const usuariosResponse = await axios.get(`${process.env.API_URL}/drivers/${id}/users`, authHeaders);
      const usuarios = usuariosResponse.data.usuarios || [];
      console.log(' Usuarios asignados obtenidos:', usuarios.length);

      if (usuarios.length === 0) {
        return res.status(404).json({ 
          error: 'No hay usuarios asignados a este repartidor.',
          ruta_optimizada: [],
          distancia_total: 0,
          total_paradas: 0
        });
      }

      // Paso 2: Obtener información del repartidor
      console.log(' Obteniendo información del repartidor...');
      const repartidorResponse = await axios.get(`${process.env.API_URL}/drivers/${id}`, authHeaders);
      const repartidor = repartidorResponse.data;
      console.log(' Repartidor obtenido:', { 
        nombre: repartidor.nombre, 
        latitud: repartidor.latitud_actual, 
        longitud: repartidor.longitud_actual 
      });

      if (!repartidor || !repartidor.latitud_actual || !repartidor.longitud_actual) {
        return res.status(400).json({ error: 'Repartidor no tiene ubicación actual configurada.' });
      }

      // Paso 3: Crear/actualizar nodo del repartidor en Neo4J
      console.log(' Creando/actualizando nodo del repartidor en Neo4J...');
      await neo4jService.createOrUpdateDriver({
        id_repartidor: repartidor.id_repartidor,
        nombre: repartidor.nombre,
        latitud_actual: repartidor.latitud_actual,
        longitud_actual: repartidor.longitud_actual
      });
      console.log(' Nodo del repartidor actualizado');

      // Paso 4: Crear relaciones de distancia entre repartidor y usuarios
      console.log(' Calculando y guardando distancias repartidor-usuarios...');
      const distancias = await neo4jService.createDriverUsersDistances(parseInt(id), usuarios);
      console.log(' Distancias calculadas:', distancias.length);

      if (distancias.length === 0) {
        return res.status(500).json({ error: 'No se pudieron calcular las distancias.' });
      }

      // Paso 5: Resolver TSP para encontrar ruta óptima
      console.log(' Aplicando algoritmo TSP para optimizar ruta...');
      const rutaOptimizada = await neo4jService.solveTSPGreedy(parseInt(id), usuarios);
      console.log(' Ruta optimizada calculada:', {
        total_paradas: rutaOptimizada.total_paradas,
        distancia_total: rutaOptimizada.distancia_total
      });

      console.log(' Optimización completada exitosamente!');

      // Respuesta exitosa
      res.json({
        message: 'Ruta optimizada calculada correctamente',
        repartidor: {
          id_repartidor: repartidor.id_repartidor,
          nombre: repartidor.nombre,
          ubicacion_actual: {
            lat: repartidor.latitud_actual,
            lng: repartidor.longitud_actual
          }
        },
        ...rutaOptimizada
      });

    } catch (error) {
      console.error(' Error optimizando ruta:', error.message);
      console.error(' Stack trace:', error.stack);
      
      // Manejar errores específicos de axios
      if (error.response) {
        console.error(' Error de API:', error.response.status, error.response.data);
        return res.status(error.response.status).json({ 
          error: error.response.data.error || 'Error en llamada a API' 
        });
      }

      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  },

  async assignDriver(req, res) {
    try {
      const { id_pedido } = req.params;
      console.log(' Iniciando asignación para pedido:', id_pedido);

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
      console.log(' Obteniendo información del pedido...');
      const pedidoResponse = await axios.get(`${process.env.API_URL}/orders/${id_pedido}`);
      const pedido = pedidoResponse.data;
      console.log(' Pedido obtenido:', { id_pedido: pedido.id_pedido, id_restaurante: pedido.id_restaurante, estado: pedido.estado });

      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      if (pedido.estado !== 'pendiente') {
        return res.status(400).json({ error: 'El pedido no está en estado pendiente.' });
      }

      // Paso 2: Obtener información del restaurante
      console.log(' Obteniendo información del restaurante...');
      const restauranteResponse = await axios.get(`${process.env.API_URL}/restaurants/${pedido.id_restaurante}`);
      const restaurante = restauranteResponse.data;
      console.log(' Restaurante obtenido:', { 
        nombre: restaurante.nombre, 
        latitud: restaurante.latitud, 
        longitud: restaurante.longitud 
      });

      if (!restaurante || !restaurante.latitud || !restaurante.longitud) {
        return res.status(400).json({ error: 'Restaurante no tiene ubicación configurada.' });
      }

      // Paso 3: Obtener repartidores disponibles con ubicación (CON TOKEN)
      console.log(' Obteniendo repartidores disponibles...');
      const repartidoresResponse = await axios.get(`${process.env.API_URL}/drivers/available/location`, authHeaders);
      const availableDrivers = repartidoresResponse.data.repartidores || [];
      console.log(' Repartidores disponibles:', availableDrivers.length);
      console.log(' Lista de repartidores:', availableDrivers.map(d => ({ 
        id: d.id_repartidor, 
        nombre: d.nombre, 
        lat: d.latitud_actual, 
        lng: d.longitud_actual 
      })));

      if (availableDrivers.length === 0) {
        return res.status(404).json({ error: 'No hay repartidores disponibles con ubicación.' });
      }

      // Paso 4: Crear nodo del restaurante en Neo4J
      console.log(' Creando nodo del restaurante en Neo4J...');
      const restauranteNode = await neo4jService.createOrUpdateRestaurant({
        id_restaurante: restaurante.id_restaurante,
        nombre: restaurante.nombre,
        latitud: restaurante.latitud,
        longitud: restaurante.longitud
      });
      console.log(' Nodo del restaurante creado:', restauranteNode);

      // Paso 5: Calcular distancias y encontrar el más cercano
      console.log(' Calculando distancias en Neo4J...');
      const nearestDriver = await neo4jService.createRestaurantDriverDistances(
        restaurante.id_restaurante,
        availableDrivers
      );
      console.log(' Repartidor más cercano encontrado:', nearestDriver);

      if (!nearestDriver) {
        return res.status(500).json({ error: 'No se pudo calcular el repartidor más cercano.' });
      }

      // Paso 6: Obtener información del usuario del pedido
      console.log(' Obteniendo información del usuario...');
      const usuarioResponse = await axios.get(`${process.env.AUTH_SERVICE_URL}/users/${pedido.id_usuario}`, authHeaders);
      const usuario = usuarioResponse.data;
      console.log(' Usuario obtenido:', { nombre: usuario.nombre });

      // Paso 7: Crear nodos y relaciones del pedido
      console.log(' Creando nodos y relaciones del pedido...');
      // Cambiar el estado del pedido a la hora de registrarlo en el grafo.
      pedido.estado = "en preparacion";

      // Crear usuario
      await neo4jService.createOrUpdateUser(usuario);

      // Crear pedido
      await neo4jService.createOrUpdatePedido(pedido);

      // Crear relaciones
      await neo4jService.createProvieneRelation(pedido.id_pedido, restaurante.id_restaurante);
      await neo4jService.createPerteneceRelation(pedido.id_pedido, usuario.id_usuario);
      await neo4jService.createAsignadoRelation(pedido.id_pedido, nearestDriver.id_repartidor);

      console.log(' Nodos y relaciones del pedido creados');

      // Paso 8: Asignar repartidor al pedido (CON TOKEN)
      console.log(' Asignando repartidor al pedido...');
      await axios.put(`${process.env.API_URL}/orders/${id_pedido}/assign`, {
        id_repartidor: nearestDriver.id_repartidor
      }, authHeaders);
      console.log(' Repartidor asignado al pedido');

      // Paso 9: Cambiar estado del pedido a "en camino" (CON TOKEN)
      console.log(' Cambiando estado del pedido...');
      await axios.put(`${process.env.API_URL}/orders/${id_pedido}`, {
        estado: "en preparacion"
      }, authHeaders);
      console.log(' Estado del pedido actualizado a "en camino"');

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
      console.error(' Error asignando repartidor:', error.message);
      console.error(' Stack trace:', error.stack);
      
      // Manejar errores específicos de axios
      if (error.response) {
        console.error(' Error de API:', error.response.status, error.response.data);
        return res.status(error.response.status).json({ 
          error: error.response.data.error || 'Error en llamada a API' 
        });
      }

      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
};

module.exports = routingController;