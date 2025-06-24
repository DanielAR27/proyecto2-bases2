# pages/influence_network.py

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime
from io import BytesIO

# Importar las funciones del analyzer
from graph_analytics.influence_analyzer import (
    get_user_influence_network,
    get_influence_metrics,
    get_influence_distribution
)

def show_page(data_source):
    """
    Página principal para análisis de red de influencia con Neo4j
    
    Args:
        data_source (str): Fuente de datos seleccionada por el usuario
    """
    
    st.header("🕸️ Red de Influencia de Usuarios")
    st.markdown("*Análisis basado en datos de Neo4j - Relaciones de referencia entre usuarios*")
    
    # Verificar si hay datos disponibles
    try:
        # Test rápido para ver si hay datos
        test_data = get_influence_metrics(data_source)
        if test_data.empty:
            st.warning("⚠️ No se encontraron datos de influencia en Neo4j para la fuente seleccionada.")
            st.info("Asegúrate de que los datos han sido sincronizados desde las bases de datos relacionales.")
            return
    except Exception as e:
        st.error(f"❌ Error conectando a Neo4j: {str(e)}")
        st.info("Verifica que Neo4j esté ejecutándose y que las credenciales sean correctas.")
        return
    
    # Pestañas para organizar el contenido
    tab1, tab2, tab3 = st.tabs([
        "📊 Métricas Generales", 
        "👥 Top Influencers", 
        "📈 Distribución"
    ])
    
    # === TAB 1: MÉTRICAS GENERALES ===
    with tab1:
        st.subheader("📊 Métricas Generales de Influencia")
        
        # Obtener métricas
        metrics_data = get_influence_metrics(data_source)
        
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            
            # Mostrar métricas en columnas
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric(
                    label="👥 Total Usuarios",
                    value=f"{metrics['total_usuarios']:,}"
                )
            
            with col2:
                st.metric(
                    label="🔗 Usuarios con Referidos",
                    value=f"{metrics['usuarios_con_referidos']:,}",
                    delta=f"{(metrics['usuarios_con_referidos']/metrics['total_usuarios']*100):.1f}% del total"
                )
            
            with col3:
                st.metric(
                    label="📈 Promedio Referidos/Usuario",
                    value=f"{metrics['promedio_referidos_por_usuario']:.2f}"
                )
            
            with col4:
                st.metric(
                    label="🏆 Máximo Referidos",
                    value=f"{metrics['max_referidos']:,}"
                )
            
            # Información adicional
            st.markdown("---")
            col1, col2 = st.columns(2)
            
            with col1:
                st.info(f"**📊 Total de Referencias:** {metrics['total_referencias']:,}")
            
            with col2:
                engagement_rate = (metrics['usuarios_con_referidos'] / metrics['total_usuarios']) * 100
                st.info(f"**💪 Tasa de Engagement:** {engagement_rate:.1f}%")
        else:
            st.warning("No se pudieron obtener las métricas generales.")
    
    # === TAB 2: TOP INFLUENCERS ===
    with tab2:
        st.subheader("👥 Usuarios Más Influyentes")
        
        # Controles
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown("*Usuarios ordenados por número de referidos*")
        with col2:
            limit = st.selectbox("📊 Mostrar top:", [10, 20, 50], index=1)
        
        # Obtener datos
        influence_data = get_user_influence_network(data_source, limit=limit)
        
        if not influence_data.empty:
            # Filtrar solo usuarios con referidos
            users_with_refs = influence_data[influence_data['total_referidos'] > 0]
            
            if not users_with_refs.empty:
                # Gráfico de barras
                fig = px.bar(
                    users_with_refs.head(15),  # Top 15 para que se vea bien
                    x='total_referidos',
                    y='nombre',
                    color='nivel_influencia',
                    color_discrete_map={
                        'Alto': '#ff4444',
                        'Medio': '#ffaa00', 
                        'Bajo': '#44ff44'
                    },
                    title=f"Top 15 Usuarios Más Influyentes ({data_source})",
                    labels={
                        'total_referidos': 'Número de Referidos',
                        'nombre': 'Usuario',
                        'nivel_influencia': 'Nivel de Influencia'
                    }
                )
                
                fig.update_layout(
                    height=600,
                    yaxis={'categoryorder': 'total ascending'}
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                # Tabla detallada
                st.subheader("📋 Detalle de Top Influencers")
                
                # Formatear tabla
                display_data = users_with_refs[['nombre', 'total_referidos', 'nivel_influencia', 'fuente_datos']].copy()
                display_data.columns = ['Usuario', 'Total Referidos', 'Nivel', 'Fuente de Datos']
                
                st.dataframe(
                    display_data,
                    use_container_width=True,
                    hide_index=True
                )
                
            else:
                st.info("No se encontraron usuarios con referidos en la fuente seleccionada.")
        else:
            st.warning("No se pudieron obtener los datos de influencia.")
        
    # === TAB 3: DISTRIBUCIÓN ===
    with tab3:
        st.subheader("📈 Distribución de Niveles de Influencia")
        
        # Obtener distribución
        distribution = get_influence_distribution(data_source)
        
        if not distribution.empty:
            col1, col2 = st.columns(2)
            
            with col1:
                # Gráfico de pastel
                fig_pie = px.pie(
                    distribution,
                    values='cantidad_usuarios',
                    names='nivel_influencia',
                    title="Distribución por Nivel de Influencia",
                    color='nivel_influencia',
                    color_discrete_map={
                        'Alto': '#ff4444',
                        'Medio': '#ffaa00',
                        'Bajo': '#44ff44',
                        'Sin referidos': '#cccccc'
                    }
                )
                st.plotly_chart(fig_pie, use_container_width=True)
            
            with col2:
                # Gráfico de barras
                fig_bar = px.bar(
                    distribution,
                    x='nivel_influencia',
                    y='cantidad_usuarios',
                    title="Cantidad de Usuarios por Nivel",
                    color='nivel_influencia',
                    color_discrete_map={
                        'Alto': '#ff4444',
                        'Medio': '#ffaa00',
                        'Bajo': '#44ff44',
                        'Sin referidos': '#cccccc'
                    }
                )
                st.plotly_chart(fig_bar, use_container_width=True)
            
            # Tabla de distribución
            st.subheader("📊 Resumen de Distribución")
            display_dist = distribution.copy()
            display_dist.columns = ['Nivel de Influencia', 'Cantidad de Usuarios', 'Porcentaje']
            display_dist['Porcentaje'] = display_dist['Porcentaje'].astype(str) + '%'
            
            st.dataframe(display_dist, use_container_width=True, hide_index=True)
            
        else:
            st.warning("No se pudo obtener la distribución de influencia.")
            
    # Sección de exportación
    _show_export_section(data_source)
    
def _show_export_section(data_source):
    """Sección de exportación de reportes de influencia"""
    st.markdown("---")
    st.subheader("📤 Exportar Reporte de Influencia")
    
    col1, col2, col3 = st.columns(3)
    
    # Obtener todos los datos para exportación
    try:
        metrics_data = get_influence_metrics(data_source)
        influence_data = get_user_influence_network(data_source, limit=100)  # Más datos para export
        distribution_data = get_influence_distribution(data_source)
        
        with col1:
            # CSV Export
            csv_data = _prepare_csv_data(metrics_data, influence_data, distribution_data)
            st.download_button(
                label="📄 Descargar CSV",
                data=csv_data,
                file_name=f'reporte_influencia_{data_source.lower()}_{datetime.now().strftime("%Y%m%d")}.csv',
                mime='text/csv'
            )
        
        with col2:
            # Excel Export
            if st.button("📊 Generar Excel"):
                excel_data = _generate_excel_report(metrics_data, influence_data, distribution_data, data_source)
                st.download_button(
                    label="💾 Descargar Excel",
                    data=excel_data,
                    file_name=f'reporte_influencia_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx',
                    mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
        
        with col3:
            # PDF Export
            if st.button("📋 Generar PDF"):
                pdf_data = _generate_pdf_report(metrics_data, influence_data, distribution_data, data_source)
                st.download_button(
                    label="💾 Descargar PDF",
                    data=pdf_data,
                    file_name=f'reporte_influencia_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
                    mime='application/pdf'
                )
                
    except Exception as e:
        st.error(f"Error preparando datos para exportación: {str(e)}")

def _prepare_csv_data(metrics_data, influence_data, distribution_data):
    """Preparar datos consolidados para CSV"""
    
    # Crear un resumen ejecutivo
    summary_lines = ["REPORTE DE RED DE INFLUENCIA", "="*50, ""]
    
    if not metrics_data.empty:
        metrics = metrics_data.iloc[0]
        summary_lines.extend([
            "MÉTRICAS GENERALES:",
            f"Total Usuarios: {metrics['total_usuarios']:,}",
            f"Usuarios con Referidos: {metrics['usuarios_con_referidos']:,}",
            f"Promedio Referidos por Usuario: {metrics['promedio_referidos_por_usuario']:.2f}",
            f"Máximo Referidos: {metrics['max_referidos']:,}",
            f"Total Referencias: {metrics['total_referencias']:,}",
            ""
        ])
    
    # Agregar distribución
    if not distribution_data.empty:
        summary_lines.append("DISTRIBUCIÓN POR NIVELES:")
        for _, row in distribution_data.iterrows():
            summary_lines.append(f"{row['nivel_influencia']}: {row['cantidad_usuarios']} usuarios ({row['porcentaje']}%)")
        summary_lines.append("")
    
    # Agregar top influencers
    if not influence_data.empty:
        top_users = influence_data[influence_data['total_referidos'] > 0].head(10)
        summary_lines.append("TOP 10 USUARIOS MÁS INFLUYENTES:")
        for _, row in top_users.iterrows():
            summary_lines.append(f"{row['nombre']}: {row['total_referidos']} referidos ({row['nivel_influencia']})")
        summary_lines.append("")
    
    # Convertir a CSV string
    csv_content = "\n".join(summary_lines)
    
    # Agregar tabla de datos detallados
    if not influence_data.empty:
        csv_content += "\n\nDATOS DETALLADOS DE USUARIOS:\n"
        csv_content += influence_data.to_csv(index=False)
    
    return csv_content.encode('utf-8')

def _generate_excel_report(metrics_data, influence_data, distribution_data, data_source):
    """Generar reporte completo en Excel"""
    
    buffer = BytesIO()
    
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        
        # Hoja 1: Resumen Ejecutivo
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            
            summary_data = {
                'Métrica': [
                    'Total de Usuarios',
                    'Usuarios con Referidos',
                    'Promedio de Referidos por Usuario',
                    'Máximo de Referidos',
                    'Total de Referencias',
                    'Tasa de Engagement (%)',
                    'Fuente de Datos'
                ],
                'Valor': [
                    f"{metrics['total_usuarios']:,}",
                    f"{metrics['usuarios_con_referidos']:,}",
                    f"{metrics['promedio_referidos_por_usuario']:.2f}",
                    f"{metrics['max_referidos']:,}",
                    f"{metrics['total_referencias']:,}",
                    f"{(metrics['usuarios_con_referidos'] / metrics['total_usuarios'] * 100):.1f}%" if metrics['total_usuarios'] > 0 else "0.0%",
                    data_source
                ]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Resumen_Ejecutivo', index=False)
        
        # Hoja 2: Top Influencers
        if not influence_data.empty:
            top_influencers = influence_data[influence_data['total_referidos'] > 0].copy()
            top_influencers.columns = ['ID Usuario', 'Nombre', 'Fuente', 'Total Referidos', 'Nivel Influencia']
            top_influencers.to_excel(writer, sheet_name='Top_Influencers', index=False)
        
        # Hoja 3: Distribución por Niveles
        if not distribution_data.empty:
            dist_copy = distribution_data.copy()
            dist_copy.columns = ['Nivel de Influencia', 'Cantidad Usuarios', 'Porcentaje']
            dist_copy.to_excel(writer, sheet_name='Distribucion_Niveles', index=False)
                
        # Hoja 4: Todos los Usuarios
        if not influence_data.empty:
            all_users = influence_data.copy()
            all_users.columns = ['ID Usuario', 'Nombre', 'Fuente', 'Total Referidos', 'Nivel Influencia']
            all_users.to_excel(writer, sheet_name='Todos_Usuarios', index=False)
    
    return buffer.getvalue()

def _generate_pdf_report(metrics_data, influence_data, distribution_data, data_source):
    """Generar reporte en PDF"""
    
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
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
            alignment=1,  # Center
            textColor=colors.darkblue
        )
        story.append(Paragraph(f"Reporte de Red de Influencia - {data_source}", title_style))
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
                ['Total de Usuarios', f"{metrics['total_usuarios']:,}"],
                ['Usuarios con Referidos', f"{metrics['usuarios_con_referidos']:,}"],
                ['Promedio Referidos/Usuario', f"{metrics['promedio_referidos_por_usuario']:.2f}"],
                ['Máximo de Referidos', f"{metrics['max_referidos']:,}"],
                ['Total de Referencias', f"{metrics['total_referencias']:,}"],
                ['Tasa de Engagement', f"{(metrics['usuarios_con_referidos'] / metrics['total_usuarios'] * 100):.1f}%" if metrics['total_usuarios'] > 0 else "0.0%"]
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
        
        # Distribución por niveles
        if not distribution_data.empty:
            story.append(Paragraph("📈 Distribución por Niveles de Influencia", styles['Heading2']))
            story.append(Spacer(1, 10))
            
            dist_table_data = [['Nivel', 'Cantidad', 'Porcentaje']]
            for _, row in distribution_data.iterrows():
                dist_table_data.append([
                    row['nivel_influencia'],
                    f"{row['cantidad_usuarios']:,}",
                    f"{row['porcentaje']}%"
                ])
            
            dist_table = Table(dist_table_data, colWidths=[2*inch, 1.5*inch, 1.5*inch])
            dist_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(dist_table)
            story.append(Spacer(1, 30))
        
        # Top 10 Influencers
        if not influence_data.empty:
            top_users = influence_data[influence_data['total_referidos'] > 0].head(10)
            
            if not top_users.empty:
                story.append(Paragraph("🏆 Top 10 Usuarios Más Influyentes", styles['Heading2']))
                story.append(Spacer(1, 10))
                
                top_table_data = [['Posición', 'Usuario', 'Total Referidos', 'Nivel', 'Fuente']]
                for i, (_, row) in enumerate(top_users.iterrows(), 1):
                    top_table_data.append([
                        str(i),
                        row['nombre'][:30] + '...' if len(row['nombre']) > 30 else row['nombre'],
                        f"{row['total_referidos']:,}",
                        row['nivel_influencia'],
                        row['fuente_datos']
                    ])
                
                top_table = Table(top_table_data, colWidths=[0.8*inch, 2.2*inch, 1*inch, 1*inch, 1*inch])
                top_table.setStyle(TableStyle([
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
                
                story.append(top_table)
                story.append(Spacer(1, 30))
        
        # Conclusiones
        story.append(Paragraph("🎯 Conclusiones y Recomendaciones", styles['Heading2']))
        story.append(Spacer(1, 15))
        
        conclusions = []
        
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            engagement_rate = (metrics['usuarios_con_referidos'] / metrics['total_usuarios'] * 100) if metrics['total_usuarios'] > 0 else 0
            
            conclusions.extend([
                f"• La red de influencia incluye {metrics['total_usuarios']:,} usuarios totales",
                f"• {metrics['usuarios_con_referidos']:,} usuarios ({engagement_rate:.1f}%) han referido al menos un usuario",
                f"• El promedio de referidos por usuario activo es de {metrics['promedio_referidos_por_usuario']:.2f}",
                f"• El usuario más influyente ha referido {metrics['max_referidos']:,} usuarios"
            ])
            
            # Recomendaciones basadas en datos
            if engagement_rate < 20:
                conclusions.append("• 🔴 Baja tasa de engagement: Implementar programas de incentivos para referidos")
            elif engagement_rate < 40:
                conclusions.append("• 🟡 Tasa de engagement moderada: Optimizar el programa de referidos existente")
            else:
                conclusions.append("• 🟢 Excelente tasa de engagement: Mantener y expandir estrategias actuales")
        
        for conclusion in conclusions:
            story.append(Paragraph(conclusion, styles['Normal']))
            story.append(Spacer(1, 8))
        
        doc.build(story)
        return buffer.getvalue()
        
    except ImportError:
        # Si reportlab no está disponible, crear un PDF simple con texto
        buffer = BytesIO()
        content = f"""
        REPORTE DE RED DE INFLUENCIA - {data_source}
        Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}
        
        Este reporte requiere la librería 'reportlab' para generar PDF.
        Por favor, instale: pip install reportlab
        
        Use la exportación a Excel para obtener un reporte completo.
        """
        buffer.write(content.encode('utf-8'))
        return buffer.getvalue()