# pages/temporal_trends.py

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
from utils.data_loader import load_data_cached
from utils.filters import get_data_source_filter
from datetime import datetime
from io import BytesIO

def show_page(data_source):
    """
    Página de Tendencias Temporales
    
    Args:
        data_source (str): Fuente de datos seleccionada ("Todos", "PostgreSQL", "MongoDB")
    """
    st.header(f"📈 Tendencias Temporales - {data_source}")
    
    # Filtro de fuente de datos
    source_filter = get_data_source_filter(data_source)
    
    # Selector de período
    col1, col2 = st.columns(2)
    with col1:
        time_grouping = st.selectbox(
            "Agrupar por:",
            ["Día", "Mes", "Trimestre"]
        )
    
    # Query según agrupación
    query_trends = _build_trends_query(time_grouping, source_filter)
    
    # Cargar datos
    trends_df = load_data_cached(query_trends, f'cache_trends_{time_grouping.lower()}_{data_source.lower()}')
    
    if not trends_df.empty:
        # Mostrar gráficos
        _show_trends_charts(trends_df, time_grouping)
        
        # Tabla de datos
        st.subheader("📋 Datos Detallados")
        st.dataframe(trends_df, use_container_width=True)
        
        # Sección de exportación
        _show_export_section(trends_df, data_source, time_grouping)
    else:
        st.warning("No se encontraron datos para mostrar tendencias temporales")

def _build_trends_query(time_grouping, source_filter):
    """Construir query según el tipo de agrupación temporal"""
    
    if time_grouping == "Día":
        return f"""
        SELECT 
            dt.fecha as periodo,
            COUNT(fp.id_pedido) as pedidos,
            COALESCE(SUM(fp.total_pedido), 0) as ingresos,
            ROUND(AVG(fp.total_pedido), 2) as ticket_promedio,
            COALESCE(SUM(fp.cantidad_items), 0) as items
        FROM warehouse.fact_pedidos fp
        JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        WHERE fp.total_pedido > 0 {source_filter}
        GROUP BY dt.fecha
        ORDER BY dt.fecha
        """
    elif time_grouping == "Mes":
        return f"""
        SELECT 
            CONCAT(dt.anio, '-', LPAD(dt.mes, 2, '0')) as periodo,
            COUNT(fp.id_pedido) as pedidos,
            COALESCE(SUM(fp.total_pedido), 0) as ingresos,
            ROUND(AVG(fp.total_pedido), 2) as ticket_promedio,
            COALESCE(SUM(fp.cantidad_items), 0) as items
        FROM warehouse.fact_pedidos fp
        JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        WHERE fp.total_pedido > 0 {source_filter}
        GROUP BY dt.anio, dt.mes
        ORDER BY dt.anio, dt.mes
        """
    else:  # Trimestre
        return f"""
        SELECT 
            CONCAT(dt.anio, '-Q', dt.trimestre) as periodo,
            COUNT(fp.id_pedido) as pedidos,
            COALESCE(SUM(fp.total_pedido), 0) as ingresos,
            ROUND(AVG(fp.total_pedido), 2) as ticket_promedio,
            COALESCE(SUM(fp.cantidad_items), 0) as items
        FROM warehouse.fact_pedidos fp
        JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        WHERE fp.total_pedido > 0 {source_filter}
        GROUP BY dt.anio, dt.trimestre
        ORDER BY dt.anio, dt.trimestre
        """

def _show_trends_charts(trends_df, time_grouping):
    """Mostrar gráficos de tendencias"""
    
    # Gráfico de tendencias múltiples
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=('Pedidos por Período', 'Ingresos por Período', 
                      'Ticket Promedio', 'Items Vendidos'),
        specs=[[{"secondary_y": False}, {"secondary_y": False}],
               [{"secondary_y": False}, {"secondary_y": False}]]
    )
    
    # Pedidos
    fig.add_trace(
        go.Scatter(x=trends_df['periodo'], y=trends_df['pedidos'], 
                  mode='lines+markers', name='Pedidos',
                  line=dict(color='#1f77b4', width=3)),
        row=1, col=1
    )
    
    # Ingresos
    fig.add_trace(
        go.Scatter(x=trends_df['periodo'], y=trends_df['ingresos'], 
                  mode='lines+markers', name='Ingresos',
                  line=dict(color='#ff7f0e', width=3)),
        row=1, col=2
    )
    
    # Ticket promedio
    fig.add_trace(
        go.Scatter(x=trends_df['periodo'], y=trends_df['ticket_promedio'], 
                  mode='lines+markers', name='Ticket Promedio',
                  line=dict(color='#2ca02c', width=3)),
        row=2, col=1
    )
    
    # Items
    fig.add_trace(
        go.Scatter(x=trends_df['periodo'], y=trends_df['items'], 
                  mode='lines+markers', name='Items',
                  line=dict(color='#d62728', width=3)),
        row=2, col=2
    )
    
    fig.update_layout(height=600, showlegend=False, title_text=f"Tendencias por {time_grouping}")
    st.plotly_chart(fig, use_container_width=True)
    
    # Métricas de resumen
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_pedidos = trends_df['pedidos'].sum()
        st.metric("📦 Total Pedidos", f"{total_pedidos:,}")
    
    with col2:
        total_ingresos = trends_df['ingresos'].sum()
        st.metric("💰 Total Ingresos", f"CRC {total_ingresos:,.0f}")
    
    with col3:
        promedio_ticket = trends_df['ticket_promedio'].mean()
        st.metric("🎫 Ticket Promedio", f"CRC {promedio_ticket:,.2f}")
    
    with col4:
        total_items = trends_df['items'].sum()
        st.metric("📊 Total Items", f"{total_items:,}")

def _show_export_section(trends_df, data_source, time_grouping):
    """Sección de exportación de reportes"""
    st.markdown("---")
    st.subheader("📤 Exportar Reporte")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        # CSV
        csv = trends_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📄 Descargar CSV",
            data=csv,
            file_name=f'tendencias_temporales_{time_grouping.lower()}_{data_source.lower()}.csv',
            mime='text/csv'
        )
    
    with col2:
        # Excel con múltiples hojas
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Hoja principal con datos
            trends_df.to_excel(writer, sheet_name='Tendencias_Datos', index=False)
            
            # Hoja de resumen
            summary_data = {
                'Métrica': [
                    'Períodos Analizados',
                    'Total Pedidos',
                    'Total Ingresos (CRC)',
                    'Ticket Promedio (CRC)',
                    'Total Items',
                    'Mejor Período (Ingresos)',
                    'Peor Período (Ingresos)',
                    'Crecimiento Promedio (%)'
                ],
                'Valor': [
                    len(trends_df),
                    f"{trends_df['pedidos'].sum():,}",
                    f"{trends_df['ingresos'].sum():,.0f}",
                    f"{trends_df['ticket_promedio'].mean():,.2f}",
                    f"{trends_df['items'].sum():,}",
                    trends_df.loc[trends_df['ingresos'].idxmax(), 'periodo'] if not trends_df.empty else 'N/A',
                    trends_df.loc[trends_df['ingresos'].idxmin(), 'periodo'] if not trends_df.empty else 'N/A',
                    f"{_calculate_growth_rate(trends_df['ingresos']):.1f}" if len(trends_df) > 1 else 'N/A'
                ]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Resumen_Ejecutivo', index=False)
            
            # Hoja de estadísticas por métrica
            stats_data = {
                'Métrica': ['Pedidos', 'Ingresos', 'Ticket Promedio', 'Items'],
                'Promedio': [
                    trends_df['pedidos'].mean(),
                    trends_df['ingresos'].mean(),
                    trends_df['ticket_promedio'].mean(),
                    trends_df['items'].mean()
                ],
                'Máximo': [
                    trends_df['pedidos'].max(),
                    trends_df['ingresos'].max(),
                    trends_df['ticket_promedio'].max(),
                    trends_df['items'].max()
                ],
                'Mínimo': [
                    trends_df['pedidos'].min(),
                    trends_df['ingresos'].min(),
                    trends_df['ticket_promedio'].min(),
                    trends_df['items'].min()
                ]
            }
            stats_df = pd.DataFrame(stats_data)
            stats_df.to_excel(writer, sheet_name='Estadisticas', index=False)
        
        st.download_button(
            label="📊 Descargar Excel",
            data=buffer.getvalue(),
            file_name=f'tendencias_temporales_{time_grouping.lower()}_{data_source.lower()}.xlsx',
            mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    
    with col3:
        # PDF
        if st.button("📋 Generar PDF"):
            pdf_data = _generate_trends_pdf(trends_df, data_source, time_grouping)
            st.download_button(
                label="💾 Descargar PDF",
                data=pdf_data,
                file_name=f'reporte_tendencias_{time_grouping.lower()}_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
                mime='application/pdf'
            )

def _calculate_growth_rate(values):
    """Calcular tasa de crecimiento promedio"""
    if len(values) < 2:
        return 0
    
    # Calcular crecimiento período a período
    growth_rates = []
    for i in range(1, len(values)):
        if values.iloc[i-1] > 0:
            growth = ((values.iloc[i] - values.iloc[i-1]) / values.iloc[i-1]) * 100
            growth_rates.append(growth)
    
    return sum(growth_rates) / len(growth_rates) if growth_rates else 0

def _generate_trends_pdf(trends_df, data_source, time_grouping):
    """Generar reporte PDF de tendencias temporales"""
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
    story.append(Paragraph(f"Reporte de Tendencias Temporales - {data_source}", title_style))
    story.append(Paragraph(f"Agrupacion por: {time_grouping}", styles['Heading2']))
    story.append(Spacer(1, 20))
    
    # Fecha de generación
    date_style = ParagraphStyle('DateStyle', parent=styles['Normal'], fontSize=10, alignment=1)
    story.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}", date_style))
    story.append(Spacer(1, 30))
    
    if not trends_df.empty:
        # Resumen ejecutivo
        story.append(Paragraph("Resumen Ejecutivo:", styles['Heading2']))
        
        total_pedidos = trends_df['pedidos'].sum()
        total_ingresos = trends_df['ingresos'].sum()
        promedio_ticket = trends_df['ticket_promedio'].mean()
        total_items = trends_df['items'].sum()
        crecimiento = _calculate_growth_rate(trends_df['ingresos'])
        
        resumen_data = [
            ['Metrica', 'Valor'],
            ['Periodos Analizados', str(len(trends_df))],
            ['Total Pedidos', f"{total_pedidos:,}"],
            ['Total Ingresos', format_currency(total_ingresos)],
            ['Ticket Promedio', format_currency(promedio_ticket)],
            ['Total Items', f"{total_items:,}"],
            ['Crecimiento Promedio', f"{crecimiento:.1f}%"]
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
        
        # Tabla de datos (solo primeros 15 registros para no sobrecargar)
        story.append(Paragraph("Datos Detallados (Primeros 15 registros):", styles['Heading2']))
        
        display_data = trends_df.head(15).copy()
        table_data = [['Periodo', 'Pedidos', 'Ingresos (CRC)', 'Ticket Prom (CRC)', 'Items']]
        
        for _, row in display_data.iterrows():
            table_data.append([
                str(row['periodo']),
                f"{int(row['pedidos']):,}",
                f"{int(row['ingresos']):,}",
                f"{row['ticket_promedio']:,.2f}",
                f"{int(row['items']):,}"
            ])
        
        data_table = Table(table_data, colWidths=[1.2*inch, 0.8*inch, 1.2*inch, 1.2*inch, 0.8*inch])
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
        story.append(Spacer(1, 30))
        
        # Análisis y conclusiones
        story.append(Paragraph("Analisis:", styles['Heading2']))
        
        mejor_periodo = trends_df.loc[trends_df['ingresos'].idxmax()]
        peor_periodo = trends_df.loc[trends_df['ingresos'].idxmin()]
        
        analisis = [
            f"• El periodo analizado abarca {len(trends_df)} {time_grouping.lower()}s",
            f"• El mejor periodo fue {mejor_periodo['periodo']} con {format_currency(mejor_periodo['ingresos'])} en ingresos",
            f"• El periodo con menores ingresos fue {peor_periodo['periodo']} con {format_currency(peor_periodo['ingresos'])}",
            f"• La tasa de crecimiento promedio es de {crecimiento:.1f}% por periodo",
            f"• Se procesaron un total de {total_pedidos:,} pedidos generando {format_currency(total_ingresos)}"
        ]
        
        for punto in analisis:
            story.append(Paragraph(punto, styles['Normal']))
            story.append(Spacer(1, 10))
    
    doc.build(story)
    return buffer.getvalue()