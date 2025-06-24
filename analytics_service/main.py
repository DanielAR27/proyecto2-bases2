# main.py

import streamlit as st
from pages import main_kpis, temporal_trends, geographic_analysis, product_analysis, peak_hours, influence_network, copurchase_network, delivery_network

# Configuración de la página
st.set_page_config(
    page_title="Analytics Dashboard - Restaurantes",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Ocultar la navegación automática de páginas
hide_pages = """
<style>
    [data-testid="stSidebarNav"] {
        display: none;
    }
    .css-1d391kg {
        display: none;
    }
</style>
"""
st.markdown(hide_pages, unsafe_allow_html=True)

def main():
    st.title("📊 Analytics Dashboard - Sistema de Restaurantes")
    st.markdown("---")

    # Sidebar
    st.sidebar.header("🔧 Configuración")
    
    # Selector de fuente de datos
    data_source = st.sidebar.selectbox(
        "🗄️ Fuente de Datos:",
        ["Todos", "PostgreSQL", "MongoDB"]
    )
    
    # Selector de análisis
    analysis_type = st.sidebar.selectbox(
        "Tipo de Análisis:",
        [
            "🎯 KPIs Principales",
            "📈 Tendencias Temporales",     
            "🌍 Análisis Geográfico",       
            "🍽️ Productos y Categorías",    
            "⏰ Horarios Pico",             
            "🕸️ Red de Influencia (Neo4j)",
            "🛒 Análisis de Co-compras (Neo4j)",
            "🚚 Rutas y Entregas (Neo4j)"
        ]
    )
    
    # Botón para limpiar cache
    if st.sidebar.button("🔄 Refrescar Datos"):
         st.cache_data.clear()
         for key in list(st.session_state.keys()):
             if key.startswith('cache_'):
                 del st.session_state[key]
         st.success("Cache limpiado correctamente")
         st.rerun()
    
    # Routing a páginas
    if analysis_type == "🎯 KPIs Principales":
        main_kpis.show_page(data_source)
    
    elif analysis_type == "📈 Tendencias Temporales":
        temporal_trends.show_page(data_source)
    
    elif analysis_type == "🌍 Análisis Geográfico":
        geographic_analysis.show_page(data_source)
    
    elif analysis_type == "🍽️ Productos y Categorías":
        product_analysis.show_page(data_source)
    
    elif analysis_type == "⏰ Horarios Pico":
        peak_hours.show_page(data_source)
    
    elif analysis_type == "🕸️ Red de Influencia (Neo4j)":
        influence_network.show_page(data_source)
        
    elif analysis_type == "🛒 Análisis de Co-compras (Neo4j)":
        copurchase_network.show_page(data_source)       
        
    elif analysis_type == "🚚 Rutas y Entregas (Neo4j)": 
        delivery_network.show_page(data_source)
        
if __name__ == "__main__":
    main()