# graph_analytics/influence_analyzer.py

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

def get_user_influence_network(data_source='Todos', limit=20):
    """
    Obtiene la red de influencia de usuarios basada en referencias
    
    Args:
        data_source (str): Fuente de datos seleccionada por el usuario
        limit (int): Número máximo de usuarios a retornar
        
    Returns:
        pandas.DataFrame: Usuarios con sus estadísticas de influencia
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (u:Usuario)
    WHERE u.source_db IN $sources
    OPTIONAL MATCH (u)-[r:REFIERE]->(referido:Usuario)
    WHERE r.source_db IN $sources AND referido.source_db IN $sources
    WITH u, COUNT(referido) AS total_referidos
    WITH u, total_referidos,
         CASE 
             WHEN total_referidos > 5 THEN 'Alto'
             WHEN total_referidos > 2 THEN 'Medio'
             WHEN total_referidos > 0 THEN 'Bajo'
             ELSE 'Sin referidos'
         END AS nivel_influencia
    RETURN u.id_usuario AS id_usuario,
           u.nombre AS nombre,
           u.source_db AS fuente_datos,
           total_referidos,
           nivel_influencia
    ORDER BY total_referidos DESC, u.id_usuario ASC
    LIMIT $limit
    """
    
    parameters = {
        'sources': sources,
        'limit': limit
    }
    
    # Cache key que incluye las fuentes seleccionadas
    cache_key = f"user_influence_{'_'.join(sources)}_{limit}"
    
    return load_graph_data_cached(query, parameters, cache_key)

def get_influence_metrics(data_source='Todos'):
    """
    Obtiene métricas generales de la red de influencia
    
    Args:
        data_source (str): Fuente de datos seleccionada
        
    Returns:
        pandas.DataFrame: Métricas generales de influencia
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (u:Usuario)
    WHERE u.source_db IN $sources
    OPTIONAL MATCH (u)-[r:REFIERE]->(referido:Usuario)
    WHERE r.source_db IN $sources AND referido.source_db IN $sources
    WITH u, COUNT(referido) AS referidos_count
    RETURN COALESCE(COUNT(u), 0) AS total_usuarios,
           COALESCE(COUNT(CASE WHEN referidos_count > 0 THEN 1 END), 0) AS usuarios_con_referidos,
           COALESCE(AVG(toFloat(referidos_count)), 0.0) AS promedio_referidos_por_usuario,
           COALESCE(MAX(referidos_count), 0) AS max_referidos,
           COALESCE(SUM(referidos_count), 0) AS total_referencias
    """
    
    parameters = {'sources': sources}
    cache_key = f"influence_metrics_{'_'.join(sources)}"
    
    return load_graph_data_cached(query, parameters, cache_key)

def get_influence_distribution(data_source='Todos'):
    """
    Obtiene la distribución de niveles de influencia
    
    Args:
        data_source (str): Fuente de datos seleccionada
        
    Returns:
        pandas.DataFrame: Distribución por niveles de influencia
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (u:Usuario)
    WHERE u.source_db IN $sources
    OPTIONAL MATCH (u)-[r:REFIERE]->(referido:Usuario)
    WHERE r.source_db IN $sources AND referido.source_db IN $sources
    WITH u, COUNT(referido) AS total_referidos
    WITH CASE 
             WHEN total_referidos > 5 THEN 'Alto'
             WHEN total_referidos > 2 THEN 'Medio'
             WHEN total_referidos > 0 THEN 'Bajo'
             ELSE 'Sin referidos'
         END AS nivel_influencia
    WITH nivel_influencia, COUNT(*) AS cantidad_usuarios
    WITH COLLECT({nivel: nivel_influencia, cantidad: cantidad_usuarios}) AS distribuciones,
         SUM(cantidad_usuarios) AS total_usuarios
    UNWIND distribuciones AS dist
    RETURN dist.nivel AS nivel_influencia,
           dist.cantidad AS cantidad_usuarios,
           ROUND(100.0 * dist.cantidad / total_usuarios, 2) AS porcentaje
    ORDER BY 
        CASE dist.nivel
            WHEN 'Alto' THEN 1
            WHEN 'Medio' THEN 2
            WHEN 'Bajo' THEN 3
            WHEN 'Sin referidos' THEN 4
        END
    """
    
    parameters = {'sources': sources}
    cache_key = f"influence_distribution_{'_'.join(sources)}"
    
    return load_graph_data_cached(query, parameters, cache_key)