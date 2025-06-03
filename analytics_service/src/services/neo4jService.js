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

  // Crear relaciones de distancia entre restaurante y repartidores
  async createDistanceRelations(id_restaurante, availableDrivers) {
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
  }
};

module.exports = neo4jService;