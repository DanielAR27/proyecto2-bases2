const { runQuery } = require('../config/neo4j');

const neo4jService = {
  // Crear o actualizar restaurante en el grafo
  async createOrUpdateRestaurant(restaurantData) {
    const { id_restaurante, nombre, latitud, longitud } = restaurantData;
    
    const query = `
      MERGE (r:Restaurante {id_restaurante: $id_restaurante})
      SET r.nombre = $nombre, 
          r.latitud = $latitud, 
          r.longitud = $longitud
      RETURN r
    `;
    
    const result = await runQuery(query, {
      id_restaurante,
      nombre,
      latitud: parseFloat(latitud),
      longitud: parseFloat(longitud)
    });
    
    return result.records[0]?.get('r').properties;
  },

  // Crear o actualizar repartidor en el grafo
  async createOrUpdateDriver(driverData) {
    const { id_repartidor, nombre, latitud_actual, longitud_actual } = driverData;
    
    const query = `
      MERGE (d:Repartidor {id_repartidor: $id_repartidor})
      SET d.nombre = $nombre,
          d.latitud_actual = $latitud_actual,
          d.longitud_actual = $longitud_actual
      RETURN d
    `;
    
    const result = await runQuery(query, {
      id_repartidor,
      nombre,
      latitud_actual: parseFloat(latitud_actual),
      longitud_actual: parseFloat(longitud_actual)
    });
    
    return result.records[0]?.get('d').properties;
  },

  // Crear o actualizar usuario en el grafo
  async createOrUpdateUser(userData) {
    const { id_usuario, nombre, latitud, longitud } = userData;
    
    const query = `
      MERGE (u:Usuario {id_usuario: $id_usuario})
      SET u.nombre = $nombre,
          u.latitud = $latitud,
          u.longitud = $longitud
      RETURN u
    `;
    
    const result = await runQuery(query, {
      id_usuario,
      nombre,
      latitud: parseFloat(latitud || 0),
      longitud: parseFloat(longitud || 0)
    });
    
    return result.records[0]?.get('u').properties;
  },

  // Crear o actualizar pedido en el grafo
  async createOrUpdatePedido(pedidoData) {
    const { id_pedido, estado, tipo } = pedidoData;
    
    const query = `
      MERGE (p:Pedido {id_pedido: $id_pedido})
      SET p.estado = $estado, p.tipo = $tipo
      RETURN p
    `;
    
    const result = await runQuery(query, {
      id_pedido,
      estado,
      tipo
    });
    
    return result.records[0]?.get('p').properties;
  },

  // Crear relaciones de distancia entre restaurante y repartidores
  async createRestaurantDriverDistances(id_restaurante, availableDrivers) {
    // Primero sincronizar todos los nodos
    for (const driver of availableDrivers) {
      await this.createOrUpdateDriver(driver);
    }
    
    // Crear/actualizar relaciones DISTANCIA con fórmula de Haversine
    const query = `
      MATCH (r:Restaurante {id_restaurante: $id_restaurante})
      MATCH (d:Repartidor)
      WHERE d.id_repartidor IN $driver_ids
      WITH r, d, 
           6371 * acos(
             cos(radians(r.latitud)) * 
             cos(radians(d.latitud_actual)) * 
             cos(radians(d.longitud_actual) - radians(r.longitud)) + 
             sin(radians(r.latitud)) * 
             sin(radians(d.latitud_actual))
           ) AS distancia_km
      MERGE (r)-[dist:DISTANCIA]->(d)
      SET dist.kilometros = distancia_km,
          dist.calculado_en = datetime()
      RETURN d.id_repartidor AS id_repartidor, 
             d.nombre AS nombre,
             d.latitud_actual AS latitud, 
             d.longitud_actual AS longitud,
             distancia_km
      ORDER BY distancia_km ASC
      LIMIT 1
    `;
    
    const driver_ids = availableDrivers.map(d => d.id_repartidor);
    const result = await runQuery(query, {
      id_restaurante,
      driver_ids
    });
    
    if (result.records.length === 0) {
      return null;
    }
    
    // El primer elemento del query
    const record = result.records[0];
    return {
      id_repartidor: record.get('id_repartidor'),
      nombre: record.get('nombre'),
      coordenadas: {
        lat: record.get('latitud'),
        lng: record.get('longitud')
      },
      distancia: parseFloat(record.get('distancia_km').toFixed(2))
    };
  },

  // Crear relaciones de distancia entre repartidor y usuarios (persistente)
  async createDriverUsersDistances(id_repartidor, usuarios) {
    // Primero sincronizar todos los nodos de usuarios
    for (const usuario of usuarios) {
      await this.createOrUpdateUser(usuario);
    }
    
    // Crear/actualizar relaciones DISTANCIA_ENTREGA con fórmula de Haversine
    const query = `
      MATCH (d:Repartidor {id_repartidor: $id_repartidor})
      MATCH (u:Usuario)
      WHERE u.id_usuario IN $usuario_ids
      WITH d, u, 
          6371 * acos(
            cos(radians(d.latitud_actual)) * 
            cos(radians(u.latitud)) * 
            cos(radians(u.longitud) - radians(d.longitud_actual)) + 
            sin(radians(d.latitud_actual)) * 
            sin(radians(u.latitud))
          ) AS distancia_km
      MERGE (d)-[dist:DISTANCIA_ENTREGA]->(u)
      SET dist.kilometros = distancia_km,
          dist.calculado_en = datetime()
      RETURN u.id_usuario AS id_usuario, 
            u.nombre AS nombre,
            u.latitud AS latitud, 
            u.longitud AS longitud,
            distancia_km
      ORDER BY distancia_km ASC
    `;
    
    const usuario_ids = usuarios.map(u => u.id_usuario);
    const result = await runQuery(query, {
      id_repartidor,
      usuario_ids
    });
    
    return result.records.map(record => ({
      id_usuario: record.get('id_usuario'),
      nombre: record.get('nombre'),
      coordenadas: {
        lat: record.get('latitud'),
        lng: record.get('longitud')
      },
      distancia: parseFloat(record.get('distancia_km').toFixed(2))
    }));
  },
  
  // Crear relación PROVIENE (Pedido -> Restaurante)
  async createProvieneRelation(id_pedido, id_restaurante) {
    const query = `
      MATCH (p:Pedido {id_pedido: $id_pedido})
      MATCH (r:Restaurante {id_restaurante: $id_restaurante})
      MERGE (p)-[:PROVIENE]->(r)
      RETURN p, r
    `;
    
    return await runQuery(query, { id_pedido, id_restaurante });
  },

  // Crear relación PERTENECE (Pedido -> Usuario)
  async createPerteneceRelation(id_pedido, id_usuario) {
    const query = `
      MATCH (p:Pedido {id_pedido: $id_pedido})
      MATCH (u:Usuario {id_usuario: $id_usuario})
      MERGE (p)-[:PERTENECE]->(u)
      RETURN p, u
    `;
    
    return await runQuery(query, { id_pedido, id_usuario });
  },

  // Crear relación ASIGNADO (Pedido -> Repartidor)
  async createAsignadoRelation(id_pedido, id_repartidor) {
    const query = `
      MATCH (p:Pedido {id_pedido: $id_pedido})
      MATCH (d:Repartidor {id_repartidor: $id_repartidor})
      MERGE (p)-[:ASIGNADO]->(d)
      RETURN p, d
    `;
    
    return await runQuery(query, { id_pedido, id_repartidor });
  },

  // Resolver TSP usando relaciones existentes (sin retorno al origen)
  async solveTSPGreedy(id_repartidor, usuarios) {
    const usuario_ids = usuarios.map(u => u.id_usuario);
    
    if (usuario_ids.length === 0) {
      return {
        ruta_optimizada: [],
        distancia_total: 0,
        total_paradas: 0,
        mensaje: 'No hay usuarios para optimizar'
      };
    }
    
    // Obtener distancias del repartidor a usuarios desde relaciones existentes
    const driverDistancesQuery = `
      MATCH (d:Repartidor {id_repartidor: $id_repartidor})-[dist:DISTANCIA_ENTREGA]->(u:Usuario)
      WHERE u.id_usuario IN $usuario_ids
      RETURN u.id_usuario AS id_usuario, 
            u.nombre AS nombre,
            u.latitud AS latitud, 
            u.longitud AS longitud,
            dist.kilometros AS distancia_km
      ORDER BY dist.kilometros ASC
    `;
    
    const driverResult = await runQuery(driverDistancesQuery, {
      id_repartidor,
      usuario_ids
    });
    
    const driverDistances = driverResult.records.map(record => ({
      id_usuario: record.get('id_usuario'),
      nombre: record.get('nombre'),
      coordenadas: {
        lat: record.get('latitud'),
        lng: record.get('longitud')
      },
      distancia: parseFloat(record.get('distancia_km').toFixed(2))
    }));
    
    if (driverDistances.length === 0) {
      return {
        ruta_optimizada: [],
        distancia_total: 0,
        total_paradas: 0,
        mensaje: 'No se encontraron relaciones de distancia. Ejecute createDriverUsersDistances primero.'
      };
    }
    
    // Si solo hay un usuario, retornar directamente
    if (usuario_ids.length === 1) {
      return {
        ruta_optimizada: [{
          ...driverDistances[0],
          orden: 1,
          distancia_desde_repartidor: driverDistances[0].distancia,
          distancia_acumulada: driverDistances[0].distancia
        }],
        distancia_total: driverDistances[0].distancia,
        total_paradas: 1
      };
    }
    
    // Crear matriz de distancias entre usuarios
    const distanceMatrixQuery = `
      MATCH (u1:Usuario), (u2:Usuario)
      WHERE u1.id_usuario IN $usuario_ids AND u2.id_usuario IN $usuario_ids
      AND u1.id_usuario <> u2.id_usuario
      WITH u1, u2, 
          6371 * acos(
            cos(radians(u1.latitud)) * 
            cos(radians(u2.latitud)) * 
            cos(radians(u2.longitud) - radians(u1.longitud)) + 
            sin(radians(u1.latitud)) * 
            sin(radians(u2.latitud))
          ) AS distancia_km
      RETURN u1.id_usuario AS desde, 
            u2.id_usuario AS hasta, 
            distancia_km
    `;
    
    const matrixResult = await runQuery(distanceMatrixQuery, { usuario_ids });
    
    // Construir matriz de distancias
    const distanceMatrix = {};
    matrixResult.records.forEach(record => {
      const desde = record.get('desde');
      const hasta = record.get('hasta');
      const distancia = record.get('distancia_km');
      
      if (!distanceMatrix[desde]) distanceMatrix[desde] = {};
      distanceMatrix[desde][hasta] = distancia;
    });
    
    // Algoritmo greedy TSP (sin retorno al origen)
    const visitados = new Set();
    const ruta = [];
    let distanciaTotal = 0;
    
    // Empezar con el usuario más cercano al repartidor
    let usuarioActual = driverDistances[0];
    ruta.push({
      id_usuario: usuarioActual.id_usuario,
      nombre: usuarioActual.nombre,
      coordenadas: usuarioActual.coordenadas,
      orden: 1,
      distancia_desde_repartidor: usuarioActual.distancia,
      distancia_acumulada: usuarioActual.distancia
    });
    visitados.add(usuarioActual.id_usuario);
    distanciaTotal += usuarioActual.distancia;
    
    // Visitar usuarios restantes usando vecino más cercano
    while (visitados.size < usuario_ids.length) {
      let siguienteUsuarioId = null;
      let menorDistancia = Infinity;
      
      // Buscar el usuario más cercano no visitado
      for (const usuarioId of usuario_ids) {
        if (!visitados.has(usuarioId)) {
          const distancia = distanceMatrix[usuarioActual.id_usuario]?.[usuarioId] || Infinity;
          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            siguienteUsuarioId = usuarioId;
          }
        }
      }
      
      if (siguienteUsuarioId) {
        const siguienteUsuarioData = driverDistances.find(u => u.id_usuario === siguienteUsuarioId);
        
        distanciaTotal += menorDistancia;
        ruta.push({
          id_usuario: siguienteUsuarioId,
          nombre: siguienteUsuarioData.nombre,
          coordenadas: siguienteUsuarioData.coordenadas,
          orden: ruta.length + 1,
          distancia_desde_anterior: parseFloat(menorDistancia.toFixed(2)),
          distancia_acumulada: parseFloat(distanciaTotal.toFixed(2))
        });
        visitados.add(siguienteUsuarioId);
        usuarioActual = { id_usuario: siguienteUsuarioId };
      } else {
        break; // No se pudo encontrar siguiente usuario
      }
    }
    
    return {
      ruta_optimizada: ruta,
      distancia_total: parseFloat(distanciaTotal.toFixed(2)),
      total_paradas: ruta.length
    };
  }
};

module.exports = neo4jService;