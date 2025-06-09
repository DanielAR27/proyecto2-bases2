const { runQuery } = require('../config/neo4j');

// Obtener el identificador de la base de datos desde variables de entorno
const SOURCE_DB = process.env.DB_TYPE || 'default';

const neo4jService = {
  // Crear o actualizar restaurante en el grafo
  async createOrUpdateRestaurant(restaurantData) {
    const { id_restaurante, nombre, latitud, longitud } = restaurantData;
    
    const query = `
      MERGE (r:Restaurante {id_restaurante: $id_restaurante, source_db: $source_db})
      SET r.nombre = $nombre, 
          r.latitud = $latitud, 
          r.longitud = $longitud,
          r.updated_at = datetime()
      RETURN r
    `;
    
    const result = await runQuery(query, {
      id_restaurante,
      nombre,
      latitud: parseFloat(latitud),
      longitud: parseFloat(longitud),
      source_db: SOURCE_DB
    });
    
    return result.records[0]?.get('r').properties;
  },

  // Crear o actualizar repartidor en el grafo
  async createOrUpdateDriver(driverData) {
    const { id_repartidor, nombre, latitud_actual, longitud_actual } = driverData;
    
    const query = `
      MERGE (d:Repartidor {id_repartidor: $id_repartidor, source_db: $source_db})
      SET d.nombre = $nombre,
          d.latitud_actual = $latitud_actual,
          d.longitud_actual = $longitud_actual,
          d.updated_at = datetime()
      RETURN d
    `;
    
    const result = await runQuery(query, {
      id_repartidor,
      nombre,
      latitud_actual: parseFloat(latitud_actual),
      longitud_actual: parseFloat(longitud_actual),
      source_db: SOURCE_DB
    });
    
    return result.records[0]?.get('d').properties;
  },

  // Crear o actualizar usuario en el grafo
  async createOrUpdateUser(userData) {
    const { id_usuario, nombre, latitud, longitud, id_referido } = userData;
    
    const query = `
      MERGE (u:Usuario {id_usuario: $id_usuario, source_db: $source_db})
      SET u.nombre = $nombre,
          u.latitud = $latitud,
          u.longitud = $longitud,
          u.id_referido = $id_referido,
          u.updated_at = datetime()
      RETURN u
    `;
    
    const result = await runQuery(query, {
      id_usuario,
      nombre,
      latitud: parseFloat(latitud || 0),
      longitud: parseFloat(longitud || 0),
      id_referido: id_referido || null,
      source_db: SOURCE_DB
    });
    
    return result.records[0]?.get('u').properties;
  },

  // Crear o actualizar pedido en el grafo
  async createOrUpdatePedido(pedidoData) {
    const { id_pedido, estado, tipo } = pedidoData;
    
    const query = `
      MERGE (p:Pedido {id_pedido: $id_pedido, source_db: $source_db})
      SET p.estado = $estado, 
          p.tipo = $tipo,
          p.updated_at = datetime()
      RETURN p
    `;
    
    const result = await runQuery(query, {
      id_pedido,
      estado,
      tipo,
      source_db: SOURCE_DB
    });
    
    return result.records[0]?.get('p').properties;
  },

  // Crear o actualizar producto en el grafo
  async createOrUpdateProduct(productData) {
    const { id_producto, nombre, categoria, precio } = productData;
    
    const query = `
      MERGE (p:Producto {id_producto: $id_producto, source_db: $source_db})
      SET p.nombre = $nombre,
          p.categoria = $categoria,
          p.precio = $precio,
          p.updated_at = datetime()
      RETURN p
    `;
    
    const result = await runQuery(query, {
      id_producto,
      nombre,
      categoria,
      precio: parseFloat(precio),
      source_db: SOURCE_DB
    });
    
    return result.records[0]?.get('p').properties;
  },

  // Crear relación CONTIENE (Pedido -> Producto)
  async createContieneRelation(id_pedido, id_producto, cantidad) {
    const query = `
      MATCH (pedido:Pedido {id_pedido: $id_pedido, source_db: $source_db})
      MATCH (producto:Producto {id_producto: $id_producto, source_db: $source_db})
      MERGE (pedido)-[r:CONTIENE]->(producto)
      SET r.cantidad = $cantidad,
          r.source_db = $source_db,
          r.updated_at = datetime()
      RETURN pedido, r, producto
    `;
    
    return await runQuery(query, { 
      id_pedido, 
      id_producto, 
      cantidad, 
      source_db: SOURCE_DB 
    });
  },

  // Sincronizar datos históricos de pedidos y productos
  async syncHistoricalData(orders, products) {
    console.log(`Sincronizando productos para DB: ${SOURCE_DB}...`);
    for (const product of products) {
      await this.createOrUpdateProduct(product);
    }
    
    console.log(`Sincronizando pedidos y relaciones para DB: ${SOURCE_DB}...`);
    for (const order of orders) {
      // Crear/actualizar pedido
      await this.createOrUpdatePedido({
        id_pedido: order.id_pedido,
        estado: order.estado,
        tipo: order.tipo
      });
      
      // Crear relaciones CONTIENE para cada producto en el pedido
      for (const detalle of order.detalles) {
        await this.createContieneRelation(
          order.id_pedido,
          detalle.id_producto,
          detalle.cantidad
        );
      }
    }
    
    console.log(`Sincronización completada para DB: ${SOURCE_DB}`);
    return {
      productos_sincronizados: products.length,
      pedidos_sincronizados: orders.length,
      relaciones_creadas: orders.reduce((total, order) => total + order.detalles.length, 0),
      source_db: SOURCE_DB
    };
  },

  // Sincronizar datos de usuarios - FUNCIÓN CORREGIDA
  async syncUsersData(usersResponse) {
    // La respuesta viene con estructura: { message, total, usuarios: [...] }
    const users = usersResponse.usuarios || [];
    
    console.log(`Sincronizando ${users.length} usuarios para DB: ${SOURCE_DB}...`);
    
    for (const user of users) {
      await this.createOrUpdateUser({
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        latitud: user.latitud || 0,
        longitud: user.longitud || 0,
        id_referido: user.id_referido
      });
    }
    
    console.log(`Sincronización de usuarios completada para DB: ${SOURCE_DB}`);
    return {
      usuarios_sincronizados: users.length,
      source_db: SOURCE_DB
    };
  },

  // Crear todas las relaciones de referencia - FUNCIÓN CORREGIDA
  async createReferenceRelationships(usersResponse) {
    // La respuesta viene con estructura: { message, total, usuarios: [...] }
    const users = usersResponse.usuarios || [];
    
    console.log(`Creando relaciones REFIERE para DB: ${SOURCE_DB}...`);
    
    let relaciones_creadas = 0;
    
    for (const user of users) {
      if (user.id_referido) {
        await this.createRefiereRelation(user.id_referido, user.id_usuario);
        relaciones_creadas++;
      }
    }
    
    console.log(`${relaciones_creadas} relaciones REFIERE creadas para DB: ${SOURCE_DB}`);
    return {
      relaciones_creadas,
      source_db: SOURCE_DB
    };
  },

  // Limpiar relaciones COMPRADO_CON existentes para esta DB
  async clearCopurchaseRelations() {
    const query = `
      MATCH (p1:Producto {source_db: $source_db})-[r:COMPRADO_CON]-(p2:Producto {source_db: $source_db})
      WHERE r.source_db = $source_db
      DELETE r
      RETURN COUNT(r) as relaciones_eliminadas
    `;
    
    const result = await runQuery(query, { source_db: SOURCE_DB });
    const count = result.records[0]?.get('relaciones_eliminadas') || 0;
    console.log(`Eliminadas ${count} relaciones COMPRADO_CON anteriores para DB: ${SOURCE_DB}`);
    return count;
  },

  // Calcular co-purchases y crear relaciones COMPRADO_CON (solo para esta DB)
  async calculateCopurchases() {
    console.log(`Calculando co-purchases para DB: ${SOURCE_DB}...`);
    
    // Primero limpiar relaciones anteriores
    await this.clearCopurchaseRelations();
    
    const query = `
      // Encontrar pares de productos que aparecen en los mismos pedidos (misma DB)
      MATCH (p1:Producto {source_db: $source_db})<-[:CONTIENE]-(pedido:Pedido {source_db: $source_db})-[:CONTIENE]->(p2:Producto {source_db: $source_db})
      WHERE p1.id_producto <> p2.id_producto AND id(p1) < id(p2)
      WITH p1, p2, COUNT(DISTINCT pedido) AS frecuencia
      
      // Calcular support y confidence
      MATCH (p1)<-[:CONTIENE]-(pedido1:Pedido {source_db: $source_db})
      WITH p1, p2, frecuencia, COUNT(DISTINCT pedido1) AS total_p1
      MATCH (p2)<-[:CONTIENE]-(pedido2:Pedido {source_db: $source_db})
      WITH p1, p2, frecuencia, total_p1, COUNT(DISTINCT pedido2) AS total_p2
      MATCH (pedido3:Pedido {source_db: $source_db})
      WITH p1, p2, frecuencia, total_p1, total_p2, COUNT(DISTINCT pedido3) AS total_pedidos
      
      // Calcular métricas
      WITH p1, p2, frecuencia,
           toFloat(frecuencia) / total_pedidos AS support,
           toFloat(frecuencia) / total_p1 AS confidence_p1_to_p2,
           toFloat(frecuencia) / total_p2 AS confidence_p2_to_p1
      
      WHERE frecuencia >= 1
      
      // Crear relaciones bidireccionales
      MERGE (p1)-[r1:COMPRADO_CON]->(p2)
      SET r1.frecuencia = frecuencia,
          r1.support = support,
          r1.confidence = confidence_p1_to_p2,
          r1.source_db = $source_db,
          r1.calculado_en = datetime()
      
      MERGE (p2)-[r2:COMPRADO_CON]->(p1)
      SET r2.frecuencia = frecuencia,
          r2.support = support,
          r2.confidence = confidence_p2_to_p1,
          r2.source_db = $source_db,
          r2.calculado_en = datetime()
      
      RETURN p1.nombre, p2.nombre, frecuencia, support, 
             confidence_p1_to_p2, confidence_p2_to_p1
      ORDER BY frecuencia DESC, support DESC
    `;
    
    const result = await runQuery(query, { source_db: SOURCE_DB });
    
    const copurchases = result.records.map(record => ({
      producto1: record.get('p1.nombre'),
      producto2: record.get('p2.nombre'),
      frecuencia: record.get('frecuencia').toNumber(),
      support: parseFloat(record.get('support').toFixed(4)),
      confidence_1_to_2: parseFloat(record.get('confidence_p1_to_p2').toFixed(4)),
      confidence_2_to_1: parseFloat(record.get('confidence_p2_to_p1').toFixed(4))
    }));
    
    console.log(`Calculados ${copurchases.length} pares de co-purchases para DB: ${SOURCE_DB}`);
    return copurchases;
  },

  // Obtener top 5 productos más comprados juntos (solo de esta DB)
  async getTopCopurchases() {
    const query = `
      MATCH (p1:Producto {source_db: $source_db})-[r:COMPRADO_CON]->(p2:Producto {source_db: $source_db})
      WHERE p1.id_producto <> p2.id_producto AND id(p1) < id(p2) AND r.source_db = $source_db
      WITH p1, p2, r
      MATCH (p2)-[r2:COMPRADO_CON]->(p1)
      WHERE r2.source_db = $source_db
      RETURN p1.nombre AS producto1,
             p2.nombre AS producto2,
             r.frecuencia AS frecuencia,
             r.support AS support,
             r.confidence AS confidence_p1_to_p2,
             r2.confidence AS confidence_p2_to_p1
      ORDER BY r.frecuencia DESC, r.support DESC
      LIMIT 5
    `;
    
    const result = await runQuery(query, { source_db: SOURCE_DB });
    
    return result.records.map(record => ({
      producto1: record.get('producto1'),
      producto2: record.get('producto2'),
      frecuencia: record.get('frecuencia').toNumber(),
      support: parseFloat(record.get('support').toFixed(4)),
      confidence_p1_to_p2: parseFloat(record.get('confidence_p1_to_p2').toFixed(4)),
      confidence_p2_to_p1: parseFloat(record.get('confidence_p2_to_p1').toFixed(4))
    }));
  },
  
  // Obtener top 5 usuarios más influyentes (solo de esta DB)
  async getTopInfluencers() {
    const query = `
      MATCH (u:Usuario {source_db: $source_db})-[r:REFIERE]->(referido:Usuario {source_db: $source_db})
      WHERE r.source_db = $source_db
      WITH u, COUNT(referido) AS total_referidos
      RETURN u.id_usuario AS id_usuario,
            u.nombre AS nombre,
            total_referidos
      ORDER BY total_referidos DESC
      LIMIT 5
    `;
    
    const result = await runQuery(query, { source_db: SOURCE_DB });
    
    return result.records.map(record => ({
      id_usuario: record.get('id_usuario'),
      nombre: record.get('nombre'),
      total_referidos: record.get('total_referidos').toNumber()
    }));
  },

  // Crear relaciones de distancia entre restaurante y repartidores (misma DB)
  async createRestaurantDriverDistances(id_restaurante, availableDrivers) {
    // Primero sincronizar todos los nodos
    for (const driver of availableDrivers) {
      await this.createOrUpdateDriver(driver);
    }
    
    // Crear/actualizar relaciones DISTANCIA con fórmula de Haversine
    const query = `
      MATCH (r:Restaurante {id_restaurante: $id_restaurante, source_db: $source_db})
      MATCH (d:Repartidor {source_db: $source_db})
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
          dist.source_db = $source_db,
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
      driver_ids,
      source_db: SOURCE_DB
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

  // Crear relaciones de distancia entre repartidor y usuarios (persistente, misma DB)
  async createDriverUsersDistances(id_repartidor, usuarios) {
    // Primero sincronizar todos los nodos de usuarios
    for (const usuario of usuarios) {
      await this.createOrUpdateUser(usuario);
    }
    
    // Crear/actualizar relaciones DISTANCIA_ENTREGA con fórmula de Haversine
    const query = `
      MATCH (d:Repartidor {id_repartidor: $id_repartidor, source_db: $source_db})
      MATCH (u:Usuario {source_db: $source_db})
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
          dist.source_db = $source_db,
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
      usuario_ids,
      source_db: SOURCE_DB
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
  
  // Crear relación PROVIENE (Pedido -> Restaurante) - misma DB
  async createProvieneRelation(id_pedido, id_restaurante) {
    const query = `
      MATCH (p:Pedido {id_pedido: $id_pedido, source_db: $source_db})
      MATCH (r:Restaurante {id_restaurante: $id_restaurante, source_db: $source_db})
      MERGE (p)-[rel:PROVIENE]->(r)
      SET rel.source_db = $source_db,
          rel.created_at = datetime()
      RETURN p, r
    `;
    
    return await runQuery(query, { 
      id_pedido, 
      id_restaurante, 
      source_db: SOURCE_DB 
    });
  },

  // Crear relación PERTENECE (Pedido -> Usuario) - misma DB
  async createPerteneceRelation(id_pedido, id_usuario) {
    const query = `
      MATCH (p:Pedido {id_pedido: $id_pedido, source_db: $source_db})
      MATCH (u:Usuario {id_usuario: $id_usuario, source_db: $source_db})
      MERGE (p)-[rel:PERTENECE]->(u)
      SET rel.source_db = $source_db,
          rel.created_at = datetime()
      RETURN p, u
    `;
    
    return await runQuery(query, { 
      id_pedido, 
      id_usuario, 
      source_db: SOURCE_DB 
    });
  },

  // Crear relación ASIGNADO (Pedido -> Repartidor) - misma DB
  async createAsignadoRelation(id_pedido, id_repartidor) {
    const query = `
      MATCH (p:Pedido {id_pedido: $id_pedido, source_db: $source_db})
      MATCH (d:Repartidor {id_repartidor: $id_repartidor, source_db: $source_db})
      MERGE (p)-[rel:ASIGNADO]->(d)
      SET rel.source_db = $source_db,
          rel.created_at = datetime()
      RETURN p, d
    `;
    
    return await runQuery(query, { 
      id_pedido, 
      id_repartidor, 
      source_db: SOURCE_DB 
    });
  },

  // Crear relación REFIERE (Usuario -> Usuario)
  async createRefiereRelation(id_referente, id_referido) {
    const query = `
      MATCH (referente:Usuario {id_usuario: $id_referente, source_db: $source_db})
      MATCH (referido:Usuario {id_usuario: $id_referido, source_db: $source_db})
      MERGE (referente)-[r:REFIERE]->(referido)
      SET r.source_db = $source_db,
          r.created_at = datetime()
      RETURN referente, r, referido
    `;
    
    return await runQuery(query, { 
      id_referente, 
      id_referido, 
      source_db: SOURCE_DB 
    });
  },

  // Resolver TSP usando relaciones existentes (sin retorno al origen) - misma DB
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
      MATCH (d:Repartidor {id_repartidor: $id_repartidor, source_db: $source_db})-[dist:DISTANCIA_ENTREGA]->(u:Usuario {source_db: $source_db})
      WHERE u.id_usuario IN $usuario_ids AND dist.source_db = $source_db
      RETURN u.id_usuario AS id_usuario, 
            u.nombre AS nombre,
            u.latitud AS latitud, 
            u.longitud AS longitud,
            dist.kilometros AS distancia_km
      ORDER BY dist.kilometros ASC
    `;
    
    const driverResult = await runQuery(driverDistancesQuery, {
      id_repartidor,
      usuario_ids,
      source_db: SOURCE_DB
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
    
    // Crear matriz de distancias entre usuarios (misma DB)
    const distanceMatrixQuery = `
      MATCH (u1:Usuario {source_db: $source_db}), (u2:Usuario {source_db: $source_db})
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
    
    const matrixResult = await runQuery(distanceMatrixQuery, { 
      usuario_ids, 
      source_db: SOURCE_DB 
    });
    
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