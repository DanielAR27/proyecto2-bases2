# pages/main_kpis.py

import streamlit as st
import plotly.graph_objects as go
from utils.data_loader import load_data_cached
from utils.filters import get_data_source_filter

def show_page(data_source):
    """
    Página de KPIs Principales del Negocio
    
    Args:
        data_source (str): Fuente de datos seleccionada ("Todos", "PostgreSQL", "MongoDB")
    """
    st.header(f"🎯 KPIs Principales del Negocio - {data_source}")
    
    # Filtro de fuente de datos
    source_filter = get_data_source_filter(data_source)
    
    # Query para KPIs generales
    query_kpis = f"""
    SELECT 
        COUNT(DISTINCT dt.fecha) as dias_activos,
        COUNT(fp.id_pedido) as pedidos_totales,
        COALESCE(SUM(fp.total_pedido), 0) as ingresos_totales,
        ROUND(AVG(fp.total_pedido), 2) as ticket_promedio_general,
        SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) as pedidos_entregados,
        COALESCE(SUM(fp.cantidad_items), 0) as items_totales
    FROM warehouse.fact_pedidos fp
    JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
    WHERE fp.total_pedido > 0 {source_filter}
    """
    
    # Cargar datos
    kpis_df = load_data_cached(query_kpis, f'cache_kpis_{data_source.lower()}')
    
    if not kpis_df.empty:
        kpi = kpis_df.iloc[0]
        
        # Mostrar métricas en columnas
        _show_kpi_metrics(kpi)
        
        # Sección de exportación
        _show_export_section(kpis_df, data_source)
    else:
        st.warning("No se encontraron datos para mostrar KPIs")

def _show_kpi_metrics(kpi):
    """Mostrar métricas principales en columnas"""
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "💰 Ingresos Totales", 
            f"₡{kpi['ingresos_totales']:,.0f}",
            delta=f"{kpi['pedidos_totales']} pedidos"
        )
    
    with col2:
        tasa_entrega = (kpi['pedidos_entregados'] / kpi['pedidos_totales'] * 100) if kpi['pedidos_totales'] > 0 else 0
        st.metric(
            "📦 Tasa de Entrega", 
            f"{tasa_entrega:.1f}%",
            delta=f"{kpi['pedidos_entregados']} entregados"
        )
    
    with col3:
        st.metric(
            "🎫 Ticket Promedio", 
            f"₡{kpi['ticket_promedio_general']:,.0f}",
            delta=f"{kpi['items_totales']} items"
        )
    
    with col4:
        pedidos_por_dia = kpi['pedidos_totales'] / kpi['dias_activos'] if kpi['dias_activos'] > 0 else 0
        st.metric(
            "📅 Pedidos/Día", 
            f"{pedidos_por_dia:.1f}",
            delta=f"{kpi['dias_activos']} días activos"
        )

def _show_export_section(data_df, data_source):
    """Sección de exportación de reportes"""
    st.markdown("---")
    st.subheader("📤 Exportar Reporte")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        csv = data_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📄 Descargar CSV",
            data=csv,
            file_name=f'kpis_principales_{data_source.lower()}.csv',
            mime='text/csv'
        )
    
    with col2:
        # Generar Excel
        from io import BytesIO
        import pandas as pd
        
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Hoja principal con datos
            data_df.to_excel(writer, sheet_name='KPIs_Principales', index=False)
            
            # Hoja adicional con resumen
            if not data_df.empty:
                kpi = data_df.iloc[0]
                summary_data = {
                    'Métrica': [
                        'Días Activos',
                        'Pedidos Totales', 
                        'Ingresos Totales (₡)',
                        'Ticket Promedio (₡)',
                        'Pedidos Entregados',
                        'Items Totales',
                        'Tasa de Entrega (%)',
                        'Pedidos por Día'
                    ],
                    'Valor': [
                        kpi['dias_activos'],
                        kpi['pedidos_totales'],
                        f"{kpi['ingresos_totales']:,.0f}",
                        f"{kpi['ticket_promedio_general']:,.2f}",
                        kpi['pedidos_entregados'],
                        kpi['items_totales'],
                        f"{(kpi['pedidos_entregados'] / kpi['pedidos_totales'] * 100):.1f}" if kpi['pedidos_totales'] > 0 else "0.0",
                        f"{(kpi['pedidos_totales'] / kpi['dias_activos']):.1f}" if kpi['dias_activos'] > 0 else "0.0"
                    ]
                }
                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name='Resumen_Ejecutivo', index=False)
        
        st.download_button(
            label="📊 Descargar Excel",
            data=buffer.getvalue(),
            file_name=f'kpis_principales_{data_source.lower()}.xlsx',
            mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    
    with col3:
        # Generar PDF
        from datetime import datetime
        
        def generate_kpis_pdf(kpi_data, data_source):
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.lib import colors
            
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1*inch)
            styles = getSampleStyleSheet()
            story = []
            
            # Título
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=30,
                alignment=1  # Center
            )
            story.append(Paragraph(f"Reporte KPIs Principales - {data_source}", title_style))
            story.append(Spacer(1, 20))
            
            # Fecha de generación
            date_style = ParagraphStyle(
                'DateStyle',
                parent=styles['Normal'],
                fontSize=10,
                alignment=1
            )
            story.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}", date_style))
            story.append(Spacer(1, 30))
            
            if not kpi_data.empty:
                kpi = kpi_data.iloc[0]
                
                # Tabla de KPIs
                kpi_table_data = [
                    ['Métrica', 'Valor'],
                    ['Días Activos', f"{kpi['dias_activos']}"],
                    ['Pedidos Totales', f"{kpi['pedidos_totales']:,}"],
                    ['Ingresos Totales', f"CRC {kpi['ingresos_totales']:,.0f}"],
                    ['Ticket Promedio', f"CRC {kpi['ticket_promedio_general']:,.2f}"],
                    ['Pedidos Entregados', f"{kpi['pedidos_entregados']:,}"],
                    ['Items Totales', f"{kpi['items_totales']:,}"],
                    ['Tasa de Entrega', f"{(kpi['pedidos_entregados'] / kpi['pedidos_totales'] * 100):.1f}%" if kpi['pedidos_totales'] > 0 else "0.0%"],
                    ['Pedidos por Día', f"{(kpi['pedidos_totales'] / kpi['dias_activos']):.1f}" if kpi['dias_activos'] > 0 else "0.0"]
                ]
                
                table = Table(kpi_table_data, colWidths=[3*inch, 2*inch])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(table)
                story.append(Spacer(1, 30))
                
                # Conclusiones
                story.append(Paragraph("Conclusiones:", styles['Heading2']))
                conclusions = [
                    f"• El negocio ha estado activo durante {kpi['dias_activos']} días",
                    f"• Se han procesado un total de {kpi['pedidos_totales']:,} pedidos",
                    f"• Los ingresos totales ascienden a CRC {kpi['ingresos_totales']:,.0f}",
                    f"• La tasa de entrega exitosa es del {(kpi['pedidos_entregados'] / kpi['pedidos_totales'] * 100):.1f}%" if kpi['pedidos_totales'] > 0 else "• No hay datos suficientes para calcular tasa de entrega"
                ]
                
                for conclusion in conclusions:
                    story.append(Paragraph(conclusion, styles['Normal']))
                    story.append(Spacer(1, 10))
            
            doc.build(story)
            return buffer.getvalue()
        
        if st.button("📋 Generar PDF"):
            pdf_data = generate_kpis_pdf(data_df, data_source)
            st.download_button(
                label="💾 Descargar PDF",
                data=pdf_data,
                file_name=f'reporte_kpis_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
                mime='application/pdf'
            )