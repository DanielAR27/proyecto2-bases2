# connection/neo4j_connection.py

import os
from neo4j import GraphDatabase
import pandas as pd
import logging

class Neo4jConnection:
    """Clase para manejar conexiones y consultas a Neo4j"""
    
    def __init__(self):
        self.driver = None
        self.uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
        self.user = os.getenv('NEO4J_USER', 'neo4j')
        self.password = os.getenv('NEO4J_PASSWORD', 'password')
        
        # Configurar logging
        self.logger = logging.getLogger(__name__)
    
    def connect(self):
        """Establecer conexión con Neo4j"""
        try:
            self.driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password)
            )
            
            # Verificar conectividad
            self.verify_connectivity()
            self.logger.info(" Neo4j conectado correctamente")
            return True
            
        except Exception as e:
            self.logger.error(f" Error conectando a Neo4j: {e}")
            return False
    
    def verify_connectivity(self):
        """Verificar que la conexión funciona"""
        with self.driver.session() as session:
            result = session.run("RETURN 1 as test")
            test_value = result.single()["test"]
            if test_value != 1:
                raise Exception("Test de conectividad falló")
    
    def close(self):
        """Cerrar conexión"""
        if self.driver:
            self.driver.close()
            self.logger.info("Neo4j driver cerrado")
    
    def run_query(self, query, parameters=None):
        """
        Ejecutar query y retornar resultados como DataFrame
        
        Args:
            query (str): Query Cypher a ejecutar
            parameters (dict): Parámetros para la query
            
        Returns:
            pandas.DataFrame: Resultados de la query
        """
        if not self.driver:
            raise Exception("No hay conexión a Neo4j. Ejecuta connect() primero.")
        
        parameters = parameters or {}
        
        try:
            with self.driver.session() as session:
                result = session.run(query, parameters)
                
                # Convertir resultados a lista de diccionarios
                records = []
                for record in result:
                    records.append(dict(record))
                
                # Convertir a DataFrame
                if records:
                    df = pd.DataFrame(records)
                    self.logger.info(f"Query ejecutada exitosamente. {len(df)} filas retornadas.")
                    return df
                else:
                    self.logger.warning("Query no retornó resultados")
                    return pd.DataFrame()
                    
        except Exception as e:
            self.logger.error(f"Error ejecutando query: {e}")
            self.logger.error(f"Query: {query}")
            self.logger.error(f"Parameters: {parameters}")
            raise
    
    def run_query_raw(self, query, parameters=None):
        """
        Ejecutar query y retornar resultados raw de Neo4j
        
        Args:
            query (str): Query Cypher a ejecutar
            parameters (dict): Parámetros para la query
            
        Returns:
            neo4j.Result: Resultados raw de Neo4j
        """
        if not self.driver:
            raise Exception("No hay conexión a Neo4j. Ejecuta connect() primero.")
        
        parameters = parameters or {}
        
        try:
            with self.driver.session() as session:
                result = session.run(query, parameters)
                return result
                
        except Exception as e:
            self.logger.error(f"Error ejecutando query raw: {e}")
            raise
    
    def get_database_info(self):
        """Obtener información básica de la base de datos"""
        try:
            info_query = """
            CALL dbms.components() YIELD name, versions, edition
            RETURN name, versions[0] as version, edition
            """
            
            result = self.run_query(info_query)
            
            # También obtener estadísticas básicas
            stats_query = """
            MATCH (n) 
            RETURN labels(n) as labels, count(*) as count
            ORDER BY count DESC
            """
            
            stats = self.run_query(stats_query)
            
            return {
                'info': result.to_dict('records') if not result.empty else [],
                'node_stats': stats.to_dict('records') if not stats.empty else []
            }
            
        except Exception as e:
            self.logger.warning(f"No se pudo obtener información de la DB: {e}")
            return {'info': [], 'node_stats': []}
    
    def test_connection(self):
        """Método público para probar la conexión"""
        try:
            if not self.driver:
                if not self.connect():
                    return False
            
            self.verify_connectivity()
            
            # Obtener info básica
            info = self.get_database_info()
            
            print(" Conexión a Neo4j exitosa!")
            print(f" URI: {self.uri}")
            
            if info['node_stats']:
                print(" Estadísticas de nodos:")
                for stat in info['node_stats'][:5]:  # Top 5
                    labels = ', '.join(stat['labels']) if stat['labels'] else 'Sin etiqueta'
                    print(f"   - {labels}: {stat['count']} nodos")
            
            return True
            
        except Exception as e:
            print(f" Error probando conexión: {e}")
            return False

# Función helper para crear una instancia global
_neo4j_instance = None

def get_neo4j_connection():
    """Singleton para obtener la conexión a Neo4j"""
    global _neo4j_instance
    
    if _neo4j_instance is None:
        _neo4j_instance = Neo4jConnection()
        if not _neo4j_instance.connect():
            raise Exception("No se pudo conectar a Neo4j")
    
    return _neo4j_instance