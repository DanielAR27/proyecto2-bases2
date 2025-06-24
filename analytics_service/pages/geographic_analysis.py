# pages/geographic_analysis.py

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from utils.data_loader import load_data_cached
from utils.filters import get_data_source_filter
from datetime import datetime
from io import BytesIO

def show_page(data_source):
    """
    Página de Análisis Geográfico
    
    Args:
        data_source (str): Fuente de datos seleccionada ("Todos", "PostgreSQL", "MongoDB")
    """
    st.header(f"🌍 Análisis Geográfico - {data_source}")
    
    # Filtro de fuente de datos
    source_filter = get_data_source_filter(data_source)
    
    # Crear dos pestañas para separar los análisis
    tab1, tab2 = st.tabs(["🏢 Por Ubicación de Restaurantes", "👥 Por Origen de Clientes"])
    
    with tab1:
        _show_restaurant_analysis(source_filter, data_source)
    
    with tab2:
        _show_client_analysis(source_filter, data_source)

def _show_restaurant_analysis(source_filter, data_source):
    """Análisis por ubicación de restaurantes"""
    st.subheader("📍 Actividad por Provincia donde están los Restaurantes")
    
    # Análisis 1: Por ubicación real de restaurantes
    query_restaurantes = f"""
    SELECT 
        fp.provincia_restaurante as provincia,
        COUNT(fp.id_pedido) as total_pedidos,
        COALESCE(SUM(fp.total_pedido), 0) as ingresos_totales,
        ROUND(AVG(fp.total_pedido), 2) as ticket_promedio,
        COUNT(DISTINCT fp.id_restaurante) as restaurantes_activos,
        COUNT(DISTINCT fp.id_usuario) as clientes_atendidos,
        ROUND(
            SUM(CASE WHEN fp.provincia_cliente != fp.provincia_restaurante THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
            1
        ) as pct_clientes_externos
    FROM warehouse.fact_pedidos fp
    WHERE fp.provincia_restaurante IS NOT NULL 
      AND fp.provincia_restaurante != 'Sin Ubicación'
      AND fp.total_pedido > 0 {source_filter}
    GROUP BY fp.provincia_restaurante
    ORDER BY SUM(fp.total_pedido) DESC
    """
    
    restaurantes_df = load_data_cached(query_restaurantes, f'cache_geo_restaurantes_{data_source.lower()}')
    
    if not restaurantes_df.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Gráfico de barras - Ingresos por provincia
            fig_ingresos = px.bar(
                restaurantes_df, 
                x='provincia', 
                y='ingresos_totales',
                title='💰 Ingresos por Provincia (Restaurantes)',
                labels={'ingresos_totales': 'Ingresos (CRC)', 'provincia': 'Provincia'},
                color='ingresos_totales',
                color_continuous_scale='Blues'
            )
            fig_ingresos.update_layout(height=400)
            st.plotly_chart(fig_ingresos, use_container_width=True)
        
        with col2:
            # Gráfico de dona - Distribución de pedidos
            fig_pedidos = px.pie(
                restaurantes_df, 
                values='total_pedidos', 
                names='provincia',
                title='📦 Distribución de Pedidos (por Provincia de Restaurantes)'
            )
            fig_pedidos.update_layout(height=400)
            st.plotly_chart(fig_pedidos, use_container_width=True)
        
        # KPIs principales
        st.subheader("📊 Métricas por Provincia de Restaurantes")
        
        # Formatear números para mejor visualización
        restaurantes_display = restaurantes_df.copy()
        restaurantes_display['ingresos_totales'] = restaurantes_display['ingresos_totales'].apply(lambda x: f"CRC {x:,.0f}")
        restaurantes_display['ticket_promedio'] = restaurantes_display['ticket_promedio'].apply(lambda x: f"CRC {x:,.0f}")
        restaurantes_display['pct_clientes_externos'] = restaurantes_display['pct_clientes_externos'].apply(lambda x: f"{x:.1f}%")
        
        # Renombrar columnas para mayor claridad
        restaurantes_display = restaurantes_display.rename(columns={
            'provincia': 'Provincia',
            'total_pedidos': 'Total Pedidos',
            'ingresos_totales': 'Ingresos Totales',
            'ticket_promedio': 'Ticket Promedio',
            'restaurantes_activos': 'Restaurantes Activos',
            'clientes_atendidos': 'Clientes Únicos Atendidos',
            'pct_clientes_externos': '% Clientes de Otras Provincias'
        })
        
        st.dataframe(restaurantes_display, use_container_width=True)
        
        # Insights automáticos
        st.info(f"""
        💡 **Insights clave:**
        - **Provincia líder:** {restaurantes_df.iloc[0]['provincia']} con CRC {restaurantes_df.iloc[0]['ingresos_totales']:,.0f} en ingresos
        - **Total restaurantes activos:** {restaurantes_df['restaurantes_activos'].sum()}
        - **Provincia más visitada por externos:** {restaurantes_df.loc[restaurantes_df['pct_clientes_externos'].idxmax(), 'provincia']} ({restaurantes_df['pct_clientes_externos'].max():.1f}%)
        """)
        
        # Sección de exportación para restaurantes
        _show_export_section(restaurantes_df, data_source, "restaurantes")

def _show_client_analysis(source_filter, data_source):
    """Análisis por origen de clientes"""
    st.subheader("🏠 Actividad por Provincia de Origen de Clientes")
    
    # Análisis 2: Por origen de clientes
    query_clientes = f"""
    SELECT 
        fp.provincia_cliente as provincia,
        COUNT(fp.id_pedido) as total_pedidos,
        COALESCE(SUM(fp.total_pedido), 0) as ingresos_generados,
        ROUND(AVG(fp.total_pedido), 2) as ticket_promedio,
        COUNT(DISTINCT fp.id_usuario) as usuarios_activos,
        COUNT(DISTINCT fp.id_restaurante) as restaurantes_utilizados,
        ROUND(
            SUM(CASE WHEN fp.provincia_cliente != fp.provincia_restaurante THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
            1
        ) as pct_pedidos_externos
    FROM warehouse.fact_pedidos fp
    WHERE fp.provincia_cliente IS NOT NULL 
      AND fp.provincia_cliente != 'Sin Ubicación'
      AND fp.total_pedido > 0 {source_filter}
    GROUP BY fp.provincia_cliente
    ORDER BY SUM(fp.total_pedido) DESC
    """
    
    clientes_df = load_data_cached(query_clientes, f'cache_geo_clientes_{data_source.lower()}')
    
    if not clientes_df.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Gráfico de barras - Gasto por provincia de clientes
            fig_gasto = px.bar(
                clientes_df, 
                x='provincia', 
                y='ingresos_generados',
                title='💳 Gasto Total por Provincia (Clientes)',
                labels={'ingresos_generados': 'Gasto Total (CRC)', 'provincia': 'Provincia'},
                color='ingresos_generados',
                color_continuous_scale='Greens'
            )
            fig_gasto.update_layout(height=400)
            st.plotly_chart(fig_gasto, use_container_width=True)
        
        with col2:
            # Gráfico de barras - Pedidos externos vs locales
            externa_data = []
            for _, row in clientes_df.iterrows():
                externa_data.append({
                    'provincia': row['provincia'],
                    'tipo': 'Pedidos Locales',
                    'cantidad': row['total_pedidos'] * (100 - row['pct_pedidos_externos']) / 100
                })
                externa_data.append({
                    'provincia': row['provincia'],
                    'tipo': 'Pedidos Externos', 
                    'cantidad': row['total_pedidos'] * row['pct_pedidos_externos'] / 100
                })
            
            externa_df = pd.DataFrame(externa_data)
            
            fig_externa = px.bar(
                externa_df,
                x='provincia',
                y='cantidad',
                color='tipo',
                title='🌍 Pedidos Locales vs Externos por Provincia',
                labels={'cantidad': 'Cantidad de Pedidos', 'provincia': 'Provincia'},
                color_discrete_map={'Pedidos Locales': '#2E86AB', 'Pedidos Externos': '#A23B72'}
            )
            fig_externa.update_layout(height=400)
            st.plotly_chart(fig_externa, use_container_width=True)
        
        # Tabla detallada
        st.subheader("📋 Métricas por Provincia de Clientes")
        
        clientes_display = clientes_df.copy()
        clientes_display['ingresos_generados'] = clientes_display['ingresos_generados'].apply(lambda x: f"CRC {x:,.0f}")
        clientes_display['ticket_promedio'] = clientes_display['ticket_promedio'].apply(lambda x: f"CRC {x:,.0f}")
        clientes_display['pct_pedidos_externos'] = clientes_display['pct_pedidos_externos'].apply(lambda x: f"{x:.1f}%")
        
        clientes_display = clientes_display.rename(columns={
            'provincia': 'Provincia',
            'total_pedidos': 'Total Pedidos',
            'ingresos_generados': 'Gasto Total',
            'ticket_promedio': 'Ticket Promedio',
            'usuarios_activos': 'Usuarios Activos',
            'restaurantes_utilizados': 'Restaurantes Utilizados',
            'pct_pedidos_externos': '% Pedidos Fuera de su Provincia'
        })
        
        st.dataframe(clientes_display, use_container_width=True)
        
        # Insights automáticos
        st.info(f"""
        💡 **Insights clave:**
        - **Clientes que más gastan:** {clientes_df.iloc[0]['provincia']} con CRC {clientes_df.iloc[0]['ingresos_generados']:,.0f}
        - **Total usuarios activos:** {clientes_df['usuarios_activos'].sum()}
        - **Provincia más "viajera":** {clientes_df.loc[clientes_df['pct_pedidos_externos'].idxmax(), 'provincia']} ({clientes_df['pct_pedidos_externos'].max():.1f}% pedidos externos)
        """)
        
        # Sección de exportación para clientes
        _show_export_section(clientes_df, data_source, "clientes")
    
    # Análisis de flujos entre provincias
    _show_flows_analysis(source_filter, data_source)

def _show_flows_analysis(source_filter, data_source):
    """Análisis de flujos entre provincias"""
    st.subheader("🔄 Matriz de Flujos Entre Provincias")
    
    query_flujos = f"""
    SELECT 
        fp.provincia_cliente as origen,
        fp.provincia_restaurante as destino,
        COUNT(fp.id_pedido) as pedidos,
        ROUND(SUM(fp.total_pedido), 2) as valor_flujo
    FROM warehouse.fact_pedidos fp
    WHERE fp.provincia_cliente IS NOT NULL 
      AND fp.provincia_restaurante IS NOT NULL
      AND fp.provincia_cliente != 'Sin Ubicación'
      AND fp.provincia_restaurante != 'Sin Ubicación'
      AND fp.total_pedido > 0 {source_filter}
    GROUP BY fp.provincia_cliente, fp.provincia_restaurante
    HAVING COUNT(fp.id_pedido) > 0
    ORDER BY valor_flujo DESC
    """
    
    flujos_df = load_data_cached(query_flujos, f'cache_geo_flujos_{data_source.lower()}')
    
    if not flujos_df.empty:
        # Crear matriz pivot para mejor visualización
        matriz_pedidos = flujos_df.pivot(index='origen', columns='destino', values='pedidos').fillna(0)
        
        st.write("**Pedidos por flujo Origen → Destino:**")
        st.dataframe(matriz_pedidos, use_container_width=True)
        
        # Top 10 flujos más importantes
        st.write("**🔥 Top 10 Flujos más Importantes (por valor):**")
        top_flujos = flujos_df.head(10).copy()
        top_flujos['valor_flujo'] = top_flujos['valor_flujo'].apply(lambda x: f"CRC {x:,.0f}")
        top_flujos['flujo'] = top_flujos['origen'] + ' → ' + top_flujos['destino']
        
        flujos_display = top_flujos[['flujo', 'pedidos', 'valor_flujo']].rename(columns={
            'flujo': 'Flujo',
            'pedidos': 'Pedidos',
            'valor_flujo': 'Valor Total'
        })
        
        st.dataframe(flujos_display, use_container_width=True)
        
        # Exportación de flujos
        _show_export_section(flujos_df, data_source, "flujos")

def _show_export_section(data_df, data_source, analysis_type):
    """Sección de exportación de reportes"""
    st.markdown("---")
    st.subheader(f"📤 Exportar Reporte - {analysis_type.title()}")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        # CSV
        csv = data_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📄 Descargar CSV",
            data=csv,
            file_name=f'analisis_geografico_{analysis_type}_{data_source.lower()}.csv',
            mime='text/csv'
        )
    
    with col2:
        # Excel
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Hoja principal con datos
            data_df.to_excel(writer, sheet_name=f'{analysis_type.title()}_Datos', index=False)
            
            # Hoja de resumen según el tipo
            if analysis_type == "restaurantes":
                summary_data = {
                    'Métrica': [
                        'Total Provincias',
                        'Total Pedidos',
                        'Total Ingresos (CRC)',
                        'Restaurantes Activos',
                        'Clientes Únicos',
                        'Provincia Líder',
                        'Mayor % Externos'
                    ],
                    'Valor': [
                        len(data_df),
                        f"{data_df['total_pedidos'].sum():,}",
                        f"{data_df['ingresos_totales'].sum():,.0f}",
                        f"{data_df['restaurantes_activos'].sum():,}",
                        f"{data_df['clientes_atendidos'].sum():,}",
                        data_df.iloc[0]['provincia'],
                        f"{data_df['pct_clientes_externos'].max():.1f}%"
                    ]
                }
            elif analysis_type == "clientes":
                summary_data = {
                    'Métrica': [
                        'Total Provincias',
                        'Total Pedidos',
                        'Total Gasto (CRC)',
                        'Usuarios Activos',
                        'Restaurantes Utilizados',
                        'Provincia que Más Gasta',
                        'Mayor % Pedidos Externos'
                    ],
                    'Valor': [
                        len(data_df),
                        f"{data_df['total_pedidos'].sum():,}",
                        f"{data_df['ingresos_generados'].sum():,.0f}",
                        f"{data_df['usuarios_activos'].sum():,}",
                        f"{data_df['restaurantes_utilizados'].sum():,}",
                        data_df.iloc[0]['provincia'],
                        f"{data_df['pct_pedidos_externos'].max():.1f}%"
                    ]
                }
            else:  # flujos
                summary_data = {
                    'Métrica': [
                        'Total Flujos',
                        'Total Pedidos',
                        'Total Valor (CRC)',
                        'Flujo Principal',
                        'Valor Flujo Principal (CRC)'
                    ],
                    'Valor': [
                        len(data_df),
                        f"{data_df['pedidos'].sum():,}",
                        f"{data_df['valor_flujo'].sum():,.0f}",
                        f"{data_df.iloc[0]['origen']} → {data_df.iloc[0]['destino']}",
                        f"{data_df.iloc[0]['valor_flujo']:,.0f}"
                    ]
                }
            
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Resumen_Ejecutivo', index=False)
        
        st.download_button(
            label="📊 Descargar Excel",
            data=buffer.getvalue(),
            file_name=f'analisis_geografico_{analysis_type}_{data_source.lower()}.xlsx',
            mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    
    with col3:
        # PDF
        if st.button(f"📋 Generar PDF - {analysis_type}", key=f"pdf_{analysis_type}"):
            pdf_data = _generate_geographic_pdf(data_df, data_source, analysis_type)
            st.download_button(
                label="💾 Descargar PDF",
                data=pdf_data,
                file_name=f'reporte_geografico_{analysis_type}_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
                mime='application/pdf',
                key=f"download_pdf_{analysis_type}"
            )

def _generate_geographic_pdf(data_df, data_source, analysis_type):
    """Generar reporte PDF de análisis geográfico"""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1*inch)
    styles = getSampleStyleSheet()
    story = []
    
    # Función helper para formatear moneda
    def format_currency(amount):
        return f"CRC {amount:,.0f}"
    
    # Título
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=1
    )
    story.append(Paragraph(f"Analisis Geografico - {analysis_type.title()} - {data_source}", title_style))
    story.append(Spacer(1, 20))
    
    # Fecha de generación
    date_style = ParagraphStyle('DateStyle', parent=styles['Normal'], fontSize=10, alignment=1)
    story.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}", date_style))
    story.append(Spacer(1, 30))
    
    if not data_df.empty:
        # Resumen ejecutivo
        story.append(Paragraph("Resumen Ejecutivo:", styles['Heading2']))
        
        if analysis_type == "restaurantes":
            resumen_data = [
                ['Metrica', 'Valor'],
                ['Total Provincias', str(len(data_df))],
                ['Total Pedidos', f"{data_df['total_pedidos'].sum():,}"],
                ['Total Ingresos', format_currency(data_df['ingresos_totales'].sum())],
                ['Restaurantes Activos', f"{data_df['restaurantes_activos'].sum():,}"],
                ['Clientes Unicos', f"{data_df['clientes_atendidos'].sum():,}"],
                ['Provincia Lider', data_df.iloc[0]['provincia']]
            ]
        elif analysis_type == "clientes":
            resumen_data = [
                ['Metrica', 'Valor'],
                ['Total Provincias', str(len(data_df))],
                ['Total Pedidos', f"{data_df['total_pedidos'].sum():,}"],
                ['Total Gasto', format_currency(data_df['ingresos_generados'].sum())],
                ['Usuarios Activos', f"{data_df['usuarios_activos'].sum():,}"],
                ['Restaurantes Utilizados', f"{data_df['restaurantes_utilizados'].sum():,}"],
                ['Provincia que Mas Gasta', data_df.iloc[0]['provincia']]
            ]
        else:  # flujos
            resumen_data = [
                ['Metrica', 'Valor'],
                ['Total Flujos', str(len(data_df))],
                ['Total Pedidos', f"{data_df['pedidos'].sum():,}"],
                ['Total Valor', format_currency(data_df['valor_flujo'].sum())],
                ['Flujo Principal', f"{data_df.iloc[0]['origen']} -> {data_df.iloc[0]['destino']}"],
                ['Valor Flujo Principal', format_currency(data_df.iloc[0]['valor_flujo'])]
            ]
        
        resumen_table = Table(resumen_data, colWidths=[2.5*inch, 2.5*inch])
        resumen_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(resumen_table)
        story.append(Spacer(1, 30))
        
        # Tabla de datos detallados (primeros 10)
        story.append(Paragraph("Datos Detallados (Top 10):", styles['Heading2']))
        
        display_data = data_df.head(10).copy()
        
        if analysis_type == "restaurantes":
            table_data = [['Provincia', 'Pedidos', 'Ingresos (CRC)', 'Restaurantes', '% Externos']]
            for _, row in display_data.iterrows():
                table_data.append([
                    str(row['provincia']),
                    f"{int(row['total_pedidos']):,}",
                    f"{int(row['ingresos_totales']):,}",
                    f"{int(row['restaurantes_activos'])}",
                    f"{row['pct_clientes_externos']:.1f}%"
                ])
        elif analysis_type == "clientes":
            table_data = [['Provincia', 'Pedidos', 'Gasto (CRC)', 'Usuarios', '% Externos']]
            for _, row in display_data.iterrows():
                table_data.append([
                    str(row['provincia']),
                    f"{int(row['total_pedidos']):,}",
                    f"{int(row['ingresos_generados']):,}",
                    f"{int(row['usuarios_activos'])}",
                    f"{row['pct_pedidos_externos']:.1f}%"
                ])
        else:  # flujos
            table_data = [['Origen', 'Destino', 'Pedidos', 'Valor (CRC)']]
            for _, row in display_data.iterrows():
                table_data.append([
                    str(row['origen']),
                    str(row['destino']),
                    f"{int(row['pedidos']):,}",
                    f"{int(row['valor_flujo']):,}"
                ])
        
        data_table = Table(table_data, colWidths=[1.2*inch, 1.2*inch, 1*inch, 1.2*inch, 0.8*inch] if analysis_type != "flujos" else [1.5*inch, 1.5*inch, 1*inch, 1.5*inch])
        data_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(data_table)
    
    doc.build(story)
    return buffer.getvalue()