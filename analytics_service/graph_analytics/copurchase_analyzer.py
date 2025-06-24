# graph_analytics/copurchase_analyzer.py

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

def get_top_copurchases(data_source='Todos', limit=20):
    """
    Obtiene los productos más comprados juntos basado en análisis de co-compras
    
    Args:
        data_source (str): Fuente de datos seleccionada por el usuario
        limit (int): Número máximo de pares de productos a retornar
        
    Returns:
        pandas.DataFrame: Pares de productos con métricas de co-compra
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (p1:Producto)-[r:COMPRADO_CON]->(p2:Producto)
    WHERE p1.source_db IN $sources 
      AND p2.source_db IN $sources 
      AND r.source_db IN $sources
      AND p1.id_producto <> p2.id_producto 
      AND id(p1) < id(p2)
    RETURN p1.nombre AS producto1,
           p2.nombre AS producto2,
           p1.categoria AS categoria1,
           p2.categoria AS categoria2,
           p1.source_db AS fuente_datos,
           COALESCE(r.frecuencia, 0) AS frecuencia,
           COALESCE(r.support, 0.0) AS support,
           COALESCE(r.confidence, 0.0) AS confidence_p1_to_p2
    ORDER BY r.frecuencia DESC, r.support DESC
    LIMIT $limit
    """
    
    parameters = {
        'sources': sources,
        'limit': limit
    }
    
    cache_key = f"top_copurchases_{'_'.join(sources)}_{limit}"
    
    return load_graph_data_cached(query, parameters, cache_key)

def get_copurchase_metrics(data_source='Todos'):
    """
    Obtiene métricas generales de co-compras
    
    Args:
        data_source (str): Fuente de datos seleccionada
        
    Returns:
        pandas.DataFrame: Métricas generales de co-compras
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (p:Producto)
    WHERE p.source_db IN $sources
    WITH COUNT(p) AS total_productos
    
    MATCH (p1:Producto)-[r:COMPRADO_CON]->(p2:Producto)
    WHERE p1.source_db IN $sources 
      AND p2.source_db IN $sources 
      AND r.source_db IN $sources
      AND p1.id_producto <> p2.id_producto
    WITH total_productos,
         COUNT(r) AS total_relaciones_copurchase,
         COUNT(DISTINCT p1) AS productos_con_copurchases,
         AVG(r.frecuencia) AS frecuencia_promedio,
         MAX(r.frecuencia) AS frecuencia_maxima,
         AVG(r.support) AS support_promedio,
         MAX(r.support) AS support_maximo
    
    RETURN COALESCE(total_productos, 0) AS total_productos,
           COALESCE(total_relaciones_copurchase, 0) AS total_relaciones_copurchase,
           COALESCE(productos_con_copurchases, 0) AS productos_con_copurchases,
           COALESCE(frecuencia_promedio, 0.0) AS frecuencia_promedio,
           COALESCE(frecuencia_maxima, 0) AS frecuencia_maxima,
           COALESCE(support_promedio, 0.0) AS support_promedio,
           COALESCE(support_maximo, 0.0) AS support_maximo
    """
    
    parameters = {'sources': sources}
    cache_key = f"copurchase_metrics_{'_'.join(sources)}"
    
    return load_graph_data_cached(query, parameters, cache_key)

def get_strongest_product_relationships(data_source='Todos', min_confidence=0.3, limit=15):
    """
    Obtiene las relaciones de productos más fuertes basadas en confidence
    
    Args:
        data_source (str): Fuente de datos seleccionada
        min_confidence (float): Confidence mínimo para considerar relación fuerte
        limit (int): Número máximo de relaciones a retornar
        
    Returns:
        pandas.DataFrame: Relaciones más fuertes entre productos
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (p1:Producto)-[r:COMPRADO_CON]->(p2:Producto)
    WHERE p1.source_db IN $sources 
      AND p2.source_db IN $sources 
      AND r.source_db IN $sources
      AND p1.id_producto <> p2.id_producto
      AND r.confidence >= $min_confidence
    RETURN p1.nombre AS producto_origen,
           p2.nombre AS producto_destino,
           p1.categoria AS categoria_origen,
           p2.categoria AS categoria_destino,
           p1.source_db AS fuente_datos,
           COALESCE(r.frecuencia, 0) AS frecuencia,
           COALESCE(r.support, 0.0) AS support,
           COALESCE(r.confidence, 0.0) AS confidence,
           CASE 
               WHEN r.confidence >= 0.7 THEN 'Muy Alta'
               WHEN r.confidence >= 0.5 THEN 'Alta'
               WHEN r.confidence >= 0.3 THEN 'Media'
               ELSE 'Baja'
           END AS fuerza_relacion
    ORDER BY r.confidence DESC, r.frecuencia DESC
    LIMIT $limit
    """
    
    parameters = {
        'sources': sources,
        'min_confidence': min_confidence,
        'limit': limit
    }
    
    cache_key = f"strongest_relationships_{'_'.join(sources)}_{min_confidence}_{limit}"
    
    return load_graph_data_cached(query, parameters, cache_key)

def get_product_recommendations(product_name, data_source='Todos', limit=5):
    """
    Obtiene recomendaciones de productos basadas en co-compras para un producto específico
    
    Args:
        product_name (str): Nombre del producto para buscar recomendaciones
        data_source (str): Fuente de datos seleccionada
        limit (int): Número máximo de recomendaciones
        
    Returns:
        pandas.DataFrame: Productos recomendados con métricas
    """
    sources = get_neo4j_source_filter(data_source)
    
    query = """
    MATCH (p1:Producto)-[r:COMPRADO_CON]->(p2:Producto)
    WHERE p1.source_db IN $sources 
      AND p2.source_db IN $sources 
      AND r.source_db IN $sources
      AND p1.nombre CONTAINS $product_name
    RETURN p1.nombre AS producto_base,
           p2.nombre AS producto_recomendado,
           p2.categoria AS categoria_recomendado,
           p2.source_db AS fuente_datos,
           COALESCE(r.frecuencia, 0) AS frecuencia,
           COALESCE(r.support, 0.0) AS support,
           COALESCE(r.confidence, 0.0) AS confidence,
           CASE 
               WHEN r.confidence >= 0.7 THEN 'Muy recomendado'
               WHEN r.confidence >= 0.5 THEN 'Recomendado'
               WHEN r.confidence >= 0.3 THEN 'Moderadamente recomendado'
               ELSE 'Débilmente recomendado'
           END AS nivel_recomendacion
    ORDER BY r.confidence DESC, r.frecuencia DESC
    LIMIT $limit
    """
    
    parameters = {
        'sources': sources,
        'product_name': product_name,
        'limit': limit
    }
    
    cache_key = f"product_recommendations_{product_name.lower().replace(' ', '_')}_{'_'.join(sources)}_{limit}"
    
    return load_graph_data_cached(query, parameters, cache_key)