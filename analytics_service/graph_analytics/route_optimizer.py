# graph_analytics/route_optimizer.py

from utils.data_loader import load_graph_data_cached

def get_neo4j_source_filter(data_source):
    """
    Convierte la selección del usuario a formato Neo4j
    
    Args:
        data_source (str): "PostgreSQL", "MongoDB", o "Todos"
        
    Returns:
        list: Lista de fuentes para filtrar en Neo4j
    """
    if data_source == "PostgreSQL":
        return ["postgres"]
    elif data_source == "MongoDB":
        return ["mongo"]
    else:  # "Todos"
        return ["postgres", "mongo"]

def get_top_delivery_drivers(data_source='Todos', limit=20):
    """
    Obtiene el ranking de repartidores con más pedidos asignados
    
    Args:
        data_source (str): Fuente de datos seleccionada por el usuario
        limit (int): Número máximo de repartidores a retornar
        
    Returns:
        pandas.DataFrame: Repartidores ordenados por número de pedidos
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (d:Repartidor)
    WHERE d.source_db IN $sources
    OPTIONAL MATCH (p:Pedido)-[r:ASIGNADO]->(d)
    WHERE p.source_db IN $sources AND r.source_db IN $sources
    WITH d, COUNT(p) AS total_pedidos
    RETURN d.id_repartidor AS id_repartidor,
           d.nombre AS nombre_repartidor,
           d.source_db AS fuente_datos,
           d.latitud_actual AS latitud,
           d.longitud_actual AS longitud,
           COALESCE(total_pedidos, 0) AS total_pedidos_asignados
    ORDER BY total_pedidos_asignados DESC, d.nombre ASC
    LIMIT $limit
    """
    
    parameters = {
        'sources': sources,
        'limit': limit
    }
    
    cache_key = f"top_drivers_{'_'.join(sources)}_{limit}"
    
    return load_graph_data_cached(query, parameters, cache_key)

def get_top_restaurants_by_orders(data_source='Todos', limit=20):
    """
    Obtiene el ranking de restaurantes con más pedidos
    
    Args:
        data_source (str): Fuente de datos seleccionada por el usuario
        limit (int): Número máximo de restaurantes a retornar
        
    Returns:
        pandas.DataFrame: Restaurantes ordenados por número de pedidos
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (r:Restaurante)
    WHERE r.source_db IN $sources
    OPTIONAL MATCH (p:Pedido)-[rel:PROVIENE]->(r)
    WHERE p.source_db IN $sources AND rel.source_db IN $sources
    WITH r, COUNT(p) AS total_pedidos
    RETURN r.id_restaurante AS id_restaurante,
           r.nombre AS nombre_restaurante,
           r.source_db AS fuente_datos,
           r.latitud AS latitud,
           r.longitud AS longitud,
           COALESCE(total_pedidos, 0) AS total_pedidos_recibidos
    ORDER BY total_pedidos_recibidos DESC, r.nombre ASC
    LIMIT $limit
    """
    
    parameters = {
        'sources': sources,
        'limit': limit
    }
    
    cache_key = f"top_restaurants_{'_'.join(sources)}_{limit}"
    
    return load_graph_data_cached(query, parameters, cache_key)

def get_delivery_metrics(data_source='Todos'):
    """
    Obtiene métricas generales del sistema de entregas
    
    Args:
        data_source (str): Fuente de datos seleccionada
        
    Returns:
        pandas.DataFrame: Métricas generales de entregas
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (d:Repartidor)
    WHERE d.source_db IN $sources
    WITH COUNT(d) AS total_repartidores
    
    MATCH (r:Restaurante)
    WHERE r.source_db IN $sources
    WITH total_repartidores, COUNT(r) AS total_restaurantes
    
    MATCH (u:Usuario)
    WHERE u.source_db IN $sources
    WITH total_repartidores, total_restaurantes, COUNT(u) AS total_usuarios
    
    MATCH (p:Pedido)
    WHERE p.source_db IN $sources
    WITH total_repartidores, total_restaurantes, total_usuarios, COUNT(p) AS total_pedidos
    
    OPTIONAL MATCH (p:Pedido)-[r_asig:ASIGNADO]->(d:Repartidor)
    WHERE p.source_db IN $sources AND r_asig.source_db IN $sources AND d.source_db IN $sources
    WITH total_repartidores, total_restaurantes, total_usuarios, total_pedidos,
         COUNT(p) AS pedidos_asignados
    
    OPTIONAL MATCH (p:Pedido)-[r_prov:PROVIENE]->(r:Restaurante)
    WHERE p.source_db IN $sources AND r_prov.source_db IN $sources AND r.source_db IN $sources
    WITH total_repartidores, total_restaurantes, total_usuarios, total_pedidos, pedidos_asignados,
         COUNT(p) AS pedidos_con_restaurante
    
    RETURN COALESCE(total_repartidores, 0) AS total_repartidores,
           COALESCE(total_restaurantes, 0) AS total_restaurantes,
           COALESCE(total_usuarios, 0) AS total_usuarios,
           COALESCE(total_pedidos, 0) AS total_pedidos,
           COALESCE(pedidos_asignados, 0) AS pedidos_asignados,
           COALESCE(pedidos_con_restaurante, 0) AS pedidos_con_restaurante
    """
    
    parameters = {'sources': sources}
    cache_key = f"delivery_metrics_{'_'.join(sources)}"
    
    return load_graph_data_cached(query, parameters, cache_key)

def get_driver_efficiency_analysis(data_source='Todos'):
    """
    Obtiene análisis de eficiencia de repartidores basado en distancias y pedidos
    
    Args:
        data_source (str): Fuente de datos seleccionada
        
    Returns:
        pandas.DataFrame: Análisis de eficiencia por repartidor
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (d:Repartidor)
    WHERE d.source_db IN $sources
    OPTIONAL MATCH (p:Pedido)-[r_asig:ASIGNADO]->(d)
    WHERE p.source_db IN $sources AND r_asig.source_db IN $sources
    OPTIONAL MATCH (d)-[r_dist:DISTANCIA_ENTREGA]->(u:Usuario)
    WHERE r_dist.source_db IN $sources AND u.source_db IN $sources
    WITH d, 
         COUNT(DISTINCT p) AS pedidos_asignados,
         COUNT(DISTINCT u) AS usuarios_en_rango,
         AVG(r_dist.kilometros) AS distancia_promedio,
         MIN(r_dist.kilometros) AS distancia_minima,
         MAX(r_dist.kilometros) AS distancia_maxima
    WHERE pedidos_asignados > 0 OR usuarios_en_rango > 0
    RETURN d.id_repartidor AS id_repartidor,
           d.nombre AS nombre_repartidor,
           d.source_db AS fuente_datos,
           COALESCE(pedidos_asignados, 0) AS pedidos_asignados,
           COALESCE(usuarios_en_rango, 0) AS usuarios_en_rango,
           COALESCE(distancia_promedio, 0.0) AS distancia_promedio_km,
           COALESCE(distancia_minima, 0.0) AS distancia_minima_km,
           COALESCE(distancia_maxima, 0.0) AS distancia_maxima_km,
           CASE 
               WHEN pedidos_asignados > 0 AND distancia_promedio IS NOT NULL 
               THEN ROUND(pedidos_asignados / distancia_promedio, 2)
               ELSE 0.0
           END AS eficiencia_pedidos_por_km
    ORDER BY eficiencia_pedidos_por_km DESC, pedidos_asignados DESC
    """
    
    parameters = {'sources': sources}
    cache_key = f"driver_efficiency_{'_'.join(sources)}"
    
    return load_graph_data_cached(query, parameters, cache_key)