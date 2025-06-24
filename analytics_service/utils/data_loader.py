# utils/data_loader.py

import streamlit as st
import pandas as pd
from connection.hive_connection import HiveConnection
from connection.neo4j_connection import Neo4jConnection

@st.cache_resource
def get_hive_connection():
    """Conexión singleton a Hive"""
    hive = HiveConnection()
    if hive.connect():
        hive.use_database("warehouse")
        return hive
    return None

@st.cache_resource  
def get_neo4j_connection():
    """Conexión singleton a Neo4j"""
    neo4j = Neo4jConnection()
    if neo4j.connect():
        return neo4j
    return None

def load_data_cached(query, cache_key):
    """
    Cache para consultas pesadas - versión simplificada
    
    Args:
        query (str): Query SQL a ejecutar
        cache_key (str): Clave única para el cache
        
    Returns:
        pandas.DataFrame: Resultados de la query
    """
    if cache_key not in st.session_state:
        hive = get_hive_connection()
        if hive:
            try:
                st.session_state[cache_key] = hive.query(query)
            except Exception as e:
                st.error(f"Error ejecutando consulta: {e}")
                st.code(query, language='sql')
                return pd.DataFrame()
        else:
            st.error("No se pudo conectar a Hive")
            return pd.DataFrame()
    
    return st.session_state[cache_key]

def load_graph_data_cached(query, parameters, cache_key):
    """
    Cache para consultas de NEO4J
    
    Args:
        query (str): Query Cypher a ejecutar
        parameters (dict): Parámetros para la query
        cache_key (str): Clave única para el cache
        
    Returns:
        pandas.DataFrame: Resultados de la query
    """
    if cache_key not in st.session_state:
        try:
            neo4j = get_neo4j_connection()
            if neo4j:
                st.session_state[cache_key] = neo4j.run_query(query, parameters)
            else:
                st.error("No se pudo conectar a Neo4j")
                return pd.DataFrame()
        except Exception as e:
            st.error(f"Error ejecutando consulta Neo4j: {e}")
            with st.expander("🔍 Ver detalles del error"):
                st.code(query, language='cypher')
                st.write("**Parámetros:**", parameters)
                st.exception(e)
            return pd.DataFrame()
    
    return st.session_state[cache_key]