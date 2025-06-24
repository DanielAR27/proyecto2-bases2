# pages/delivery_network.py

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
from io import BytesIO

# Importar las funciones del analyzer
from graph_analytics.route_optimizer import (
    get_delivery_metrics,
    get_top_delivery_drivers,
    get_top_restaurants_by_orders,
    get_driver_efficiency_analysis
)

def show_page(data_source):
    """
    Página principal para análisis de rutas y entregas con Neo4j
    
    Args:
        data_source (str): Fuente de datos seleccionada por el usuario
    """
    
    st.header("🚚 Análisis de Rutas y Entregas")
    st.markdown("*Análisis basado en datos de Neo4j - Repartidores, restaurantes y eficiencia operativa*")
    
    # Verificar si hay datos disponibles
    try:
        # Test rápido para ver si hay datos
        test_data = get_delivery_metrics(data_source)
        if test_data.empty:
            st.warning("⚠️ No se encontraron datos de entregas en Neo4j para la fuente seleccionada.")
            st.info("Asegúrate de que los datos de repartidores, restaurantes y pedidos han sido sincronizados.")
            return
    except Exception as e:
        st.error(f"❌ Error conectando a Neo4j: {str(e)}")
        st.info("Verifica que Neo4j esté ejecutándose y que las credenciales sean correctas.")
        return
    
    # Pestañas para organizar el contenido
    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 Métricas Generales", 
        "🏆 Top Repartidores", 
        "🍽️ Top Restaurantes",
        "⚡ Análisis de Eficiencia"
    ])
    
    # === TAB 1: MÉTRICAS GENERALES ===
    with tab1:
        st.subheader("📊 Métricas Generales del Sistema de Entregas")
        
        # Obtener métricas
        metrics_data = get_delivery_metrics(data_source)
        
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            
            # Mostrar métricas en columnas
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric(
                    label="🚚 Total Repartidores",
                    value=f"{metrics['total_repartidores']:,}"
                )
            
            with col2:
                st.metric(
                    label="🍽️ Total Restaurantes",
                    value=f"{metrics['total_restaurantes']:,}"
                )
            
            with col3:
                st.metric(
                    label="👥 Total Usuarios",
                    value=f"{metrics['total_usuarios']:,}"
                )
            
            with col4:
                st.metric(
                    label="📦 Total Pedidos",
                    value=f"{metrics['total_pedidos']:,}"
                )
            
            # Segunda fila de métricas
            st.markdown("---")
            col1, col2, col3 = st.columns(3)
            
            with col1:
                tasa_asignacion = (metrics['pedidos_asignados'] / metrics['total_pedidos'] * 100) if metrics['total_pedidos'] > 0 else 0
                st.metric(
                    label="📋 Pedidos Asignados",
                    value=f"{metrics['pedidos_asignados']:,}",
                    delta=f"{tasa_asignacion:.1f}% del total"
                )
            
            with col2:
                tasa_restaurante = (metrics['pedidos_con_restaurante'] / metrics['total_pedidos'] * 100) if metrics['total_pedidos'] > 0 else 0
                st.metric(
                    label="🏪 Pedidos con Restaurante",
                    value=f"{metrics['pedidos_con_restaurante']:,}",
                    delta=f"{tasa_restaurante:.1f}% del total"
                )
            
            with col3:
                promedio_pedidos_repartidor = metrics['pedidos_asignados'] / metrics['total_repartidores'] if metrics['total_repartidores'] > 0 else 0
                st.metric(
                    label="📈 Promedio Pedidos/Repartidor",
                    value=f"{promedio_pedidos_repartidor:.1f}"
                )
            
            # Gráfico de distribución
            st.markdown("---")
            st.subheader("📊 Distribución del Sistema")
            
            # Crear datos para gráfico
            distribution_data = {
                'Categoría': ['Repartidores', 'Restaurantes', 'Usuarios'],
                'Cantidad': [metrics['total_repartidores'], metrics['total_restaurantes'], metrics['total_usuarios']],
                'Color': ['#ff6b6b', '#4ecdc4', '#45b7d1']
            }
            
            fig_dist = px.bar(
                distribution_data,
                x='Categoría',
                y='Cantidad',
                color='Categoría',
                title="Distribución de Entidades en el Sistema",
                color_discrete_map={
                    'Repartidores': '#ff6b6b',
                    'Restaurantes': '#4ecdc4', 
                    'Usuarios': '#45b7d1'
                }
            )
            
            fig_dist.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig_dist, use_container_width=True)
            
        else:
            st.warning("No se pudieron obtener las métricas generales.")
    
    # === TAB 2: TOP REPARTIDORES ===
    with tab2:
        st.subheader("🏆 Repartidores Más Activos")
        
        # Controles
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown("*Repartidores ordenados por número de pedidos asignados*")
        with col2:
            limit = st.selectbox("📊 Mostrar top:", [10, 20, 30], index=1, key="drivers_limit")
        
        # Obtener datos
        drivers_data = get_top_delivery_drivers(data_source, limit=limit)
        
        if not drivers_data.empty:
            # Filtrar solo repartidores con pedidos
            active_drivers = drivers_data[drivers_data['total_pedidos_asignados'] > 0]
            
            if not active_drivers.empty:
                # Gráfico de barras
                fig = px.bar(
                    active_drivers.head(15),  # Top 15 para que se vea bien
                    x='total_pedidos_asignados',
                    y='nombre_repartidor',
                    color='fuente_datos',
                    title=f"Top 15 Repartidores Más Activos ({data_source})",
                    labels={
                        'total_pedidos_asignados': 'Pedidos Asignados',
                        'nombre_repartidor': 'Repartidor',
                        'fuente_datos': 'Fuente de Datos'
                    },
                    color_discrete_map={
                        'postgres': '#1f77b4',
                        'mongo': '#ff7f0e'
                    }
                )
                
                fig.update_layout(
                    height=600,
                    yaxis={'categoryorder': 'total ascending'}
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                # Tabla detallada
                st.subheader("📋 Detalle de Repartidores")
                
                # Formatear tabla
                display_data = active_drivers[['nombre_repartidor', 'total_pedidos_asignados', 'fuente_datos', 'latitud', 'longitud']].copy()
                display_data.columns = ['Repartidor', 'Pedidos Asignados', 'Fuente', 'Latitud', 'Longitud']
                display_data['Latitud'] = display_data['Latitud'].round(6)
                display_data['Longitud'] = display_data['Longitud'].round(6)
                
                st.dataframe(
                    display_data,
                    use_container_width=True,
                    hide_index=True
                )
                
                # Estadísticas adicionales
                st.markdown("---")
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.info(f"**🥇 Líder:** {active_drivers.iloc[0]['nombre_repartidor']} ({active_drivers.iloc[0]['total_pedidos_asignados']} pedidos)")
                
                with col2:
                    promedio = active_drivers['total_pedidos_asignados'].mean()
                    st.info(f"**📊 Promedio:** {promedio:.1f} pedidos por repartidor activo")
                
                with col3:
                    total_activos = len(active_drivers)
                    total_repartidores = len(drivers_data)
                    tasa_actividad = (total_activos / total_repartidores * 100) if total_repartidores > 0 else 0
                    st.info(f"**⚡ Actividad:** {tasa_actividad:.1f}% de repartidores activos")
                
            else:
                st.info("No se encontraron repartidores con pedidos asignados en la fuente seleccionada.")
        else:
            st.warning("No se pudieron obtener los datos de repartidores.")
    
    # === TAB 3: TOP RESTAURANTES ===
    with tab3:
        st.subheader("🍽️ Restaurantes Más Populares")
        
        # Controles
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown("*Restaurantes ordenados por número de pedidos recibidos*")
        with col2:
            rest_limit = st.selectbox("📊 Mostrar top:", [10, 20, 30], index=1, key="restaurants_limit")
        
        # Obtener datos
        restaurants_data = get_top_restaurants_by_orders(data_source, limit=rest_limit)
        
        if not restaurants_data.empty:
            # Filtrar solo restaurantes con pedidos
            active_restaurants = restaurants_data[restaurants_data['total_pedidos_recibidos'] > 0]
            
            if not active_restaurants.empty:
                # Gráfico de barras horizontal
                fig = px.bar(
                    active_restaurants.head(15),  # Top 15 para que se vea bien
                    x='total_pedidos_recibidos',
                    y='nombre_restaurante',
                    color='fuente_datos',
                    title=f"Top 15 Restaurantes Más Populares ({data_source})",
                    labels={
                        'total_pedidos_recibidos': 'Pedidos Recibidos',
                        'nombre_restaurante': 'Restaurante',
                        'fuente_datos': 'Fuente de Datos'
                    },
                    color_discrete_map={
                        'postgres': '#1f77b4',
                        'mongo': '#ff7f0e'
                    }
                )
                
                fig.update_layout(
                    height=600,
                    yaxis={'categoryorder': 'total ascending'}
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                # Gráfico de pastel para top 10
                st.subheader("📊 Distribución Top 10 Restaurantes")
                
                top_10_restaurants = active_restaurants.head(10)
                
                fig_pie = px.pie(
                    top_10_restaurants,
                    values='total_pedidos_recibidos',
                    names='nombre_restaurante',
                    title="Distribución de Pedidos - Top 10 Restaurantes"
                )
                
                fig_pie.update_traces(textposition='inside', textinfo='percent+label')
                fig_pie.update_layout(height=500)
                
                st.plotly_chart(fig_pie, use_container_width=True)
                
                # Tabla detallada
                st.subheader("📋 Detalle de Restaurantes")
                
                display_rest = active_restaurants[['nombre_restaurante', 'total_pedidos_recibidos', 'fuente_datos', 'latitud', 'longitud']].copy()
                display_rest.columns = ['Restaurante', 'Pedidos Recibidos', 'Fuente', 'Latitud', 'Longitud']
                display_rest['Latitud'] = display_rest['Latitud'].round(6)
                display_rest['Longitud'] = display_rest['Longitud'].round(6)
                
                st.dataframe(
                    display_rest,
                    use_container_width=True,
                    hide_index=True
                )
                
            else:
                st.info("No se encontraron restaurantes con pedidos en la fuente seleccionada.")
        else:
            st.warning("No se pudieron obtener los datos de restaurantes.")
    
    # === TAB 4: ANÁLISIS DE EFICIENCIA ===
    with tab4:
        st.subheader("⚡ Análisis de Eficiencia de Repartidores")
        
        # Obtener datos de eficiencia
        efficiency_data = get_driver_efficiency_analysis(data_source)
        
        if not efficiency_data.empty:
            # Filtrar repartidores con datos relevantes
            efficient_drivers = efficiency_data[
                (efficiency_data['pedidos_asignados'] > 0) | 
                (efficiency_data['usuarios_en_rango'] > 0)
            ].copy()
            
            if not efficient_drivers.empty:
                # Gráfico de dispersión: eficiencia vs pedidos
                fig_scatter = px.scatter(
                    efficient_drivers,
                    x='distancia_promedio_km',
                    y='pedidos_asignados',
                    size='usuarios_en_rango',
                    color='eficiencia_pedidos_por_km',
                    hover_data=['nombre_repartidor', 'eficiencia_pedidos_por_km'],
                    title="Eficiencia: Distancia Promedio vs Pedidos Asignados",
                    labels={
                        'distancia_promedio_km': 'Distancia Promedio (km)',
                        'pedidos_asignados': 'Pedidos Asignados',
                        'usuarios_en_rango': 'Usuarios en Rango',
                        'eficiencia_pedidos_por_km': 'Pedidos por Km'
                    },
                    color_continuous_scale='viridis'
                )
                
                fig_scatter.update_layout(height=500)
                st.plotly_chart(fig_scatter, use_container_width=True)
                
                # Ranking de eficiencia
                st.subheader("🏆 Ranking de Eficiencia (Pedidos por Km)")
                
                top_efficient = efficient_drivers[efficient_drivers['eficiencia_pedidos_por_km'] > 0].head(10)
                
                if not top_efficient.empty:
                    fig_eff = px.bar(
                        top_efficient,
                        x='eficiencia_pedidos_por_km',
                        y='nombre_repartidor',
                        title="Top 10 Repartidores Más Eficientes",
                        labels={
                            'eficiencia_pedidos_por_km': 'Pedidos por Kilómetro',
                            'nombre_repartidor': 'Repartidor'
                        },
                        color='eficiencia_pedidos_por_km',
                        color_continuous_scale='greens'
                    )
                    
                    fig_eff.update_layout(
                        height=400,
                        yaxis={'categoryorder': 'total ascending'}
                    )
                    
                    st.plotly_chart(fig_eff, use_container_width=True)
                
                # Tabla de análisis detallado
                st.subheader("📋 Análisis Detallado de Eficiencia")
                
                display_eff = efficient_drivers[['nombre_repartidor', 'pedidos_asignados', 'usuarios_en_rango', 
                                               'distancia_promedio_km', 'eficiencia_pedidos_por_km', 'fuente_datos']].copy()
                display_eff.columns = ['Repartidor', 'Pedidos', 'Usuarios en Rango', 'Distancia Prom. (km)', 'Eficiencia (P/km)', 'Fuente']
                display_eff['Distancia Prom. (km)'] = display_eff['Distancia Prom. (km)'].round(2)
                display_eff['Eficiencia (P/km)'] = display_eff['Eficiencia (P/km)'].round(2)
                
                st.dataframe(
                    display_eff,
                    use_container_width=True,
                    hide_index=True
                )
                
                # Insights automáticos
                st.markdown("---")
                st.subheader("💡 Insights de Eficiencia")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    # Repartidor más eficiente
                    if len(top_efficient) > 0:
                        best_driver = top_efficient.iloc[0]
                        st.success(f"""
                        **🥇 Más Eficiente:**
                        - {best_driver['nombre_repartidor']}
                        - {best_driver['eficiencia_pedidos_por_km']:.2f} pedidos/km
                        - {best_driver['pedidos_asignados']} pedidos totales
                        """)
                
                with col2:
                    # Estadísticas generales
                    avg_efficiency = efficient_drivers['eficiencia_pedidos_por_km'].mean()
                    avg_distance = efficient_drivers['distancia_promedio_km'].mean()
                    
                    st.info(f"""
                    **📊 Promedios:**
                    - Eficiencia promedio: {avg_efficiency:.2f} P/km
                    - Distancia promedio: {avg_distance:.2f} km
                    - Repartidores analizados: {len(efficient_drivers)}
                    """)
                
            else:
                st.info("No se encontraron datos de eficiencia para analizar.")
        else:
            st.warning("No se pudieron obtener los datos de eficiencia.")
    
    # Sección de exportación
    _show_export_section(data_source)
    
    # Footer con información técnica
    st.markdown("---")
    st.markdown("""
    **ℹ️ Información Técnica:**
    - 🔗 **Fuente**: Neo4j Graph Database
    - 📊 **Relaciones**: ASIGNADO (Pedido->Repartidor), PROVIENE (Pedido->Restaurante)
    - 🎯 **Métricas**: Eficiencia calculada como pedidos asignados / distancia promedio
    - 🔄 **Cache**: Los datos se almacenan temporalmente para mejor rendimiento
    """)

def _show_export_section(data_source):
    """Sección de exportación de reportes de entregas"""
    st.markdown("---")
    st.subheader("📤 Exportar Reporte de Entregas")
    
    col1, col2, col3 = st.columns(3)
    
    # Obtener todos los datos para exportación
    try:
        metrics_data = get_delivery_metrics(data_source)
        drivers_data = get_top_delivery_drivers(data_source, limit=100)
        restaurants_data = get_top_restaurants_by_orders(data_source, limit=100)
        efficiency_data = get_driver_efficiency_analysis(data_source)
        
        with col1:
            # CSV Export
            csv_data = _prepare_csv_data(metrics_data, drivers_data, restaurants_data, efficiency_data)
            st.download_button(
                label="📄 Descargar CSV",
                data=csv_data,
                file_name=f'reporte_entregas_{data_source.lower()}_{datetime.now().strftime("%Y%m%d")}.csv',
                mime='text/csv'
            )
        
        with col2:
            # Excel Export
            if st.button("📊 Generar Excel"):
                excel_data = _generate_excel_report(metrics_data, drivers_data, restaurants_data, efficiency_data, data_source)
                st.download_button(
                    label="💾 Descargar Excel",
                    data=excel_data,
                    file_name=f'reporte_entregas_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx',
                    mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
        
        with col3:
            # PDF Export
            if st.button("📋 Generar PDF"):
                pdf_data = _generate_pdf_report(metrics_data, drivers_data, restaurants_data, efficiency_data, data_source)
                st.download_button(
                    label="💾 Descargar PDF",
                    data=pdf_data,
                    file_name=f'reporte_entregas_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
                    mime='application/pdf'
                )
                
    except Exception as e:
        st.error(f"Error preparando datos para exportación: {str(e)}")

def _prepare_csv_data(metrics_data, drivers_data, restaurants_data, efficiency_data):
    """Preparar datos consolidados para CSV"""
    
    summary_lines = ["REPORTE DE ENTREGAS Y RUTAS", "="*50, ""]
    
    if not metrics_data.empty:
        metrics = metrics_data.iloc[0]
        summary_lines.extend([
            "MÉTRICAS GENERALES:",
            f"Total Repartidores: {metrics['total_repartidores']:,}",
            f"Total Restaurantes: {metrics['total_restaurantes']:,}",
            f"Total Usuarios: {metrics['total_usuarios']:,}",
            f"Total Pedidos: {metrics['total_pedidos']:,}",
            f"Pedidos Asignados: {metrics['pedidos_asignados']:,}",
            f"Tasa de Asignación: {(metrics['pedidos_asignados']/metrics['total_pedidos']*100):.1f}%" if metrics['total_pedidos'] > 0 else "0%",
            ""
        ])
    
    # Top repartidores
    if not drivers_data.empty:
        active_drivers = drivers_data[drivers_data['total_pedidos_asignados'] > 0].head(10)
        summary_lines.append("TOP 10 REPARTIDORES:")
        for _, row in active_drivers.iterrows():
            summary_lines.append(f"{row['nombre_repartidor']}: {row['total_pedidos_asignados']} pedidos")
        summary_lines.append("")
    
    # Top restaurantes
    if not restaurants_data.empty:
        active_restaurants = restaurants_data[restaurants_data['total_pedidos_recibidos'] > 0].head(10)
        summary_lines.append("TOP 10 RESTAURANTES:")
        for _, row in active_restaurants.iterrows():
            summary_lines.append(f"{row['nombre_restaurante']}: {row['total_pedidos_recibidos']} pedidos")
        summary_lines.append("")
    
    csv_content = "\n".join(summary_lines)
    
    # Agregar datos detallados
    if not drivers_data.empty:
        csv_content += "\n\nDATOS DETALLADOS DE REPARTIDORES:\n"
        csv_content += drivers_data.to_csv(index=False)
    
    if not restaurants_data.empty:
        csv_content += "\n\nDATOS DETALLADOS DE RESTAURANTES:\n"
        csv_content += restaurants_data.to_csv(index=False)
    
    if not efficiency_data.empty:
        csv_content += "\n\nANÁLISIS DE EFICIENCIA:\n"
        csv_content += efficiency_data.to_csv(index=False)
    
    return csv_content.encode('utf-8')

def _generate_excel_report(metrics_data, drivers_data, restaurants_data, efficiency_data, data_source):
    """Generar reporte completo en Excel"""
    
    buffer = BytesIO()
    
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        
        # Hoja 1: Resumen Ejecutivo
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            
            summary_data = {
                'Métrica': [
                    'Total de Repartidores',
                    'Total de Restaurantes', 
                    'Total de Usuarios',
                    'Total de Pedidos',
                    'Pedidos Asignados',
                    'Pedidos con Restaurante',
                    'Tasa de Asignación (%)',
                    'Promedio Pedidos/Repartidor',
                    'Fuente de Datos'
                ],
                'Valor': [
                    f"{metrics['total_repartidores']:,}",
                    f"{metrics['total_restaurantes']:,}",
                    f"{metrics['total_usuarios']:,}",
                    f"{metrics['total_pedidos']:,}",
                    f"{metrics['pedidos_asignados']:,}",
                    f"{metrics['pedidos_con_restaurante']:,}",
                    f"{(metrics['pedidos_asignados']/metrics['total_pedidos']*100):.1f}%" if metrics['total_pedidos'] > 0 else "0%",
                    f"{(metrics['pedidos_asignados']/metrics['total_repartidores']):.1f}" if metrics['total_repartidores'] > 0 else "0",
                    data_source
                ]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Resumen_Ejecutivo', index=False)
        
        # Hoja 2: Top Repartidores
        if not drivers_data.empty:
            drivers_copy = drivers_data.copy()
            drivers_copy.columns = ['ID', 'Nombre', 'Fuente', 'Latitud', 'Longitud', 'Pedidos Asignados']
            drivers_copy.to_excel(writer, sheet_name='Top_Repartidores', index=False)
        
        # Hoja 3: Top Restaurantes  
        if not restaurants_data.empty:
            restaurants_copy = restaurants_data.copy()
            restaurants_copy.columns = ['ID', 'Nombre', 'Fuente', 'Latitud', 'Longitud', 'Pedidos Recibidos']
            restaurants_copy.to_excel(writer, sheet_name='Top_Restaurantes', index=False)
        
        # Hoja 4: Análisis de Eficiencia
        if not efficiency_data.empty:
            efficiency_copy = efficiency_data.copy()
            efficiency_copy = efficiency_copy[['nombre_repartidor', 'pedidos_asignados', 'usuarios_en_rango', 
                                            'distancia_promedio_km', 'eficiencia_pedidos_por_km', 'fuente_datos']]
            efficiency_copy.columns = ['Repartidor', 'Pedidos', 'Usuarios Rango', 'Dist. Prom. (km)', 'Eficiencia (P/km)', 'Fuente']
            efficiency_copy.to_excel(writer, sheet_name='Analisis_Eficiencia', index=False)
    
    return buffer.getvalue()

def _generate_pdf_report(metrics_data, drivers_data, restaurants_data, efficiency_data, data_source):
    """Generar reporte en PDF"""
    
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*inch)
        styles = getSampleStyleSheet()
        story = []
        
        # Título principal
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            alignment=1,
            textColor=colors.darkblue
        )
        story.append(Paragraph(f"Reporte de Entregas y Rutas - {data_source}", title_style))
        story.append(Spacer(1, 20))
        
        # Fecha y fuente
        date_style = ParagraphStyle(
            'DateStyle',
            parent=styles['Normal'],
            fontSize=12,
            alignment=1
        )
        story.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}", date_style))
        story.append(Paragraph(f"Fuente: Neo4j Graph Database", date_style))
        story.append(Spacer(1, 30))
        
        # Métricas generales
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            
            story.append(Paragraph("📊 Métricas Generales", styles['Heading2']))
            story.append(Spacer(1, 10))
            
            metrics_table_data = [
                ['Métrica', 'Valor'],
                ['Total Repartidores', f"{metrics['total_repartidores']:,}"],
                ['Total Restaurantes', f"{metrics['total_restaurantes']:,}"],
                ['Total Pedidos', f"{metrics['total_pedidos']:,}"],
                ['Pedidos Asignados', f"{metrics['pedidos_asignados']:,}"],
                ['Tasa de Asignación', f"{(metrics['pedidos_asignados']/metrics['total_pedidos']*100):.1f}%" if metrics['total_pedidos'] > 0 else "0%"]
            ]
            
            metrics_table = Table(metrics_table_data, colWidths=[3*inch, 2*inch])
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightblue),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(metrics_table)
            story.append(Spacer(1, 30))
        
        # Top 10 Repartidores
        if not drivers_data.empty:
            top_drivers = drivers_data[drivers_data['total_pedidos_asignados'] > 0].head(10)
            
            if not top_drivers.empty:
                story.append(Paragraph("🏆 Top 10 Repartidores", styles['Heading2']))
                story.append(Spacer(1, 10))
                
                drivers_table_data = [['#', 'Repartidor', 'Pedidos', 'Fuente']]
                for i, (_, row) in enumerate(top_drivers.iterrows(), 1):
                    drivers_table_data.append([
                        str(i),
                        row['nombre_repartidor'][:25] + '...' if len(row['nombre_repartidor']) > 25 else row['nombre_repartidor'],
                        f"{row['total_pedidos_asignados']:,}",
                        row['fuente_datos']
                    ])
                
                drivers_table = Table(drivers_table_data, colWidths=[0.5*inch, 2.5*inch, 1*inch, 1*inch])
                drivers_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.darkorange),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.lightyellow),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('FONTSIZE', (0, 1), (-1, -1), 9)
                ]))
                
                story.append(drivers_table)
                story.append(Spacer(1, 30))
        
        # Top 10 Restaurantes
        if not restaurants_data.empty:
            top_restaurants = restaurants_data[restaurants_data['total_pedidos_recibidos'] > 0].head(10)
            
            if not top_restaurants.empty:
                story.append(Paragraph("🍽️ Top 10 Restaurantes", styles['Heading2']))
                story.append(Spacer(1, 10))
                
                restaurants_table_data = [['#', 'Restaurante', 'Pedidos', 'Fuente']]
                for i, (_, row) in enumerate(top_restaurants.iterrows(), 1):
                    restaurants_table_data.append([
                        str(i),
                        row['nombre_restaurante'][:25] + '...' if len(row['nombre_restaurante']) > 25 else row['nombre_restaurante'],
                        f"{row['total_pedidos_recibidos']:,}",
                        row['fuente_datos']
                    ])
                
                restaurants_table = Table(restaurants_table_data, colWidths=[0.5*inch, 2.5*inch, 1*inch, 1*inch])
                restaurants_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('FONTSIZE', (0, 1), (-1, -1), 9)
                ]))
                
                story.append(restaurants_table)
                story.append(Spacer(1, 30))
        
        # Conclusiones
        story.append(Paragraph("🎯 Conclusiones y Recomendaciones", styles['Heading2']))
        story.append(Spacer(1, 15))
        
        conclusions = []
        
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            tasa_asignacion = (metrics['pedidos_asignados'] / metrics['total_pedidos'] * 100) if metrics['total_pedidos'] > 0 else 0
            
            conclusions.extend([
                f"• El sistema cuenta con {metrics['total_repartidores']:,} repartidores y {metrics['total_restaurantes']:,} restaurantes",
                f"• Se procesaron {metrics['total_pedidos']:,} pedidos totales",
                f"• {metrics['pedidos_asignados']:,} pedidos fueron asignados a repartidores ({tasa_asignacion:.1f}%)",
                f"• Promedio de {(metrics['pedidos_asignados']/metrics['total_repartidores']):.1f} pedidos por repartidor" if metrics['total_repartidores'] > 0 else "• Sin datos de promedio"
            ])
            
            # Recomendaciones basadas en datos
            if tasa_asignacion < 50:
                conclusions.append("• 🔴 Baja tasa de asignación: Revisar disponibilidad de repartidores")
            elif tasa_asignacion < 80:
                conclusions.append("• 🟡 Tasa de asignación moderada: Optimizar algoritmos de asignación")
            else:
                conclusions.append("• 🟢 Excelente tasa de asignación: Mantener eficiencia operativa")
        
        for conclusion in conclusions:
            story.append(Paragraph(conclusion, styles['Normal']))
            story.append(Spacer(1, 8))
        
        doc.build(story)
        return buffer.getvalue()
        
    except ImportError:
        # Si reportlab no está disponible
        buffer = BytesIO()
        content = f"""
        REPORTE DE ENTREGAS Y RUTAS - {data_source}
        Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}
        
        Este reporte requiere la librería 'reportlab' para generar PDF.
        Por favor, instale: pip install reportlab
        
        Use la exportación a Excel para obtener un reporte completo.
        """
        buffer.write(content.encode('utf-8'))
        return buffer.getvalue()