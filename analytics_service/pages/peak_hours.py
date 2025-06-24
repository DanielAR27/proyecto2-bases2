# pages/peak_hours.py

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
    Página de Análisis de Horarios Pico
    
    Args:
        data_source (str): Fuente de datos seleccionada ("Todos", "PostgreSQL", "MongoDB")
    """
    st.header(f"⏰ Análisis de Horarios Pico - {data_source}")
    
    # Filtro de fuente de datos
    source_filter = get_data_source_filter(data_source)
    
    # Crear tabs para separar análisis por día vs por hora
    tab1, tab2, tab3 = st.tabs(["📅 Por Día de Semana", "🕐 Por Hora del Día", "⚡ Horarios Pico"])
    
    with tab1:
        _show_day_analysis(source_filter, data_source)
    
    with tab2:
        _show_hour_analysis(source_filter, data_source)
    
    with tab3:
        _show_peak_analysis(source_filter, data_source)

def _show_day_analysis(source_filter, data_source):
    """Análisis por día de la semana"""
    st.subheader("📊 Análisis por Día de la Semana")
    
    query_days = f"""
    SELECT 
        dt.dia_semana,
        CASE 
            WHEN dt.dia_semana = 1 THEN 'Lunes'
            WHEN dt.dia_semana = 2 THEN 'Martes'
            WHEN dt.dia_semana = 3 THEN 'Miércoles'
            WHEN dt.dia_semana = 4 THEN 'Jueves'
            WHEN dt.dia_semana = 5 THEN 'Viernes'
            WHEN dt.dia_semana = 6 THEN 'Sábado'
            WHEN dt.dia_semana = 7 THEN 'Domingo'
        END as nombre_dia,
        dt.es_fin_semana,
        COUNT(fp.id_pedido) as pedidos,
        COALESCE(SUM(fp.total_pedido), 0) as ingresos,
        ROUND(AVG(fp.total_pedido), 2) as ticket_promedio
    FROM warehouse.fact_pedidos fp
    JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
    WHERE fp.total_pedido > 0 {source_filter}
    GROUP BY dt.dia_semana, dt.es_fin_semana
    ORDER BY dt.dia_semana
    """
    
    days_df = load_data_cached(query_days, f'cache_days_{data_source.lower()}')
    
    if not days_df.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Pedidos por día de la semana
            fig_dias = px.bar(
                days_df,
                x='nombre_dia',
                y='pedidos',
                color='es_fin_semana',
                title='📅 Pedidos por Día de la Semana',
                labels={'pedidos': 'Cantidad de Pedidos', 'nombre_dia': 'Día'},
                color_discrete_map={True: '#ff7f0e', False: '#1f77b4'}
            )
            fig_dias.update_layout(height=400)
            st.plotly_chart(fig_dias, use_container_width=True)
        
        with col2:
            # Ingresos por día
            fig_ingresos_dia = px.line(
                days_df,
                x='nombre_dia',
                y='ingresos',
                title='💰 Ingresos por Día de la Semana',
                markers=True,
                labels={'ingresos': 'Ingresos (CRC)', 'nombre_dia': 'Día'}
            )
            fig_ingresos_dia.update_layout(height=400)
            st.plotly_chart(fig_ingresos_dia, use_container_width=True)
        
        # Análisis fin de semana vs días laborables
        st.subheader("📊 Comparativa Fin de Semana vs Días Laborables")
        
        weekend_summary = days_df.groupby('es_fin_semana').agg({
            'pedidos': 'sum',
            'ingresos': 'sum',
            'ticket_promedio': 'mean'
        }).reset_index()
        
        weekend_summary['tipo'] = weekend_summary['es_fin_semana'].map({
            True: 'Fin de Semana', 
            False: 'Días Laborables'
        })
        
        col1, col2 = st.columns(2)
        
        with col1:
            fig_weekend = px.bar(
                weekend_summary,
                x='tipo',
                y='pedidos',
                title='📦 Pedidos: Fin de Semana vs Laborables',
                color='tipo',
                color_discrete_map={'Fin de Semana': '#ff7f0e', 'Días Laborables': '#1f77b4'}
            )
            st.plotly_chart(fig_weekend, use_container_width=True)
        
        with col2:
            fig_ticket = px.bar(
                weekend_summary,
                x='tipo',
                y='ticket_promedio',
                title='🎫 Ticket Promedio: Fin de Semana vs Laborables',
                color='tipo',
                color_discrete_map={'Fin de Semana': '#2ca02c', 'Días Laborables': '#d62728'}
            )
            st.plotly_chart(fig_ticket, use_container_width=True)
        
        # Tabla detallada
        st.subheader("📋 Datos Detallados por Día")
        
        days_display = days_df.copy()
        days_display['ingresos'] = days_display['ingresos'].apply(lambda x: f"CRC {x:,.0f}")
        days_display['ticket_promedio'] = days_display['ticket_promedio'].apply(lambda x: f"CRC {x:,.2f}")
        days_display['es_fin_semana'] = days_display['es_fin_semana'].map({True: 'Sí', False: 'No'})
        
        days_display = days_display.rename(columns={
            'nombre_dia': 'Día',
            'pedidos': 'Pedidos',
            'ingresos': 'Ingresos',
            'ticket_promedio': 'Ticket Promedio',
            'es_fin_semana': 'Fin de Semana'
        }).drop('dia_semana', axis=1)
        
        st.dataframe(days_display, use_container_width=True)
        
        # Insights automáticos
        if not days_df.empty:
            mejor_dia = days_df.loc[days_df['pedidos'].idxmax(), 'nombre_dia']
            peor_dia = days_df.loc[days_df['pedidos'].idxmin(), 'nombre_dia']
            
            st.info(f"""
            💡 **Insights por día:**
            - **Día con más pedidos:** {mejor_dia} ({days_df.loc[days_df['pedidos'].idxmax(), 'pedidos']:,} pedidos)
            - **Día con menos pedidos:** {peor_dia} ({days_df.loc[days_df['pedidos'].idxmin(), 'pedidos']:,} pedidos)
            - **Total pedidos fin de semana:** {weekend_summary[weekend_summary['es_fin_semana'] == True]['pedidos'].sum():,}
            - **Total pedidos laborables:** {weekend_summary[weekend_summary['es_fin_semana'] == False]['pedidos'].sum():,}
            """)
        
        # Exportación para días
        _show_export_section(days_df, data_source, "dias")

def _show_hour_analysis(source_filter, data_source):
    """Análisis por hora del día"""
    st.subheader("🕐 Análisis por Hora del Día")
    
    query_hours = f"""
    SELECT 
        dt.hora,
        CASE 
            WHEN dt.hora BETWEEN 6 AND 11 THEN 'Mañana (6-11)'
            WHEN dt.hora BETWEEN 12 AND 17 THEN 'Tarde (12-17)'
            WHEN dt.hora BETWEEN 18 AND 23 THEN 'Noche (18-23)'
            ELSE 'Madrugada (0-5)'
        END as periodo_dia,
        COUNT(fp.id_pedido) as pedidos,
        COALESCE(SUM(fp.total_pedido), 0) as ingresos,
        ROUND(AVG(fp.total_pedido), 2) as ticket_promedio,
        COUNT(DISTINCT fp.id_usuario) as usuarios_activos
    FROM warehouse.fact_pedidos fp
    JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
    WHERE fp.total_pedido > 0 {source_filter}
    GROUP BY dt.hora
    ORDER BY dt.hora
    """
    
    hours_df = load_data_cached(query_hours, f'cache_hours_detail_{data_source.lower()}')
    
    if not hours_df.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Pedidos por hora (gráfico de línea)
            fig_hours_line = px.line(
                hours_df,
                x='hora',
                y='pedidos',
                title='📈 Pedidos por Hora del Día',
                labels={'pedidos': 'Cantidad de Pedidos', 'hora': 'Hora (24h)'},
                markers=True
            )
            fig_hours_line.update_layout(height=400)
            fig_hours_line.update_xaxes(dtick=2)  # Mostrar cada 2 horas
            st.plotly_chart(fig_hours_line, use_container_width=True)
        
        with col2:
            # Heatmap de actividad por hora
            fig_hours_bar = px.bar(
                hours_df,
                x='hora',
                y='pedidos',
                color='pedidos',
                title='🔥 Intensidad de Pedidos por Hora',
                labels={'pedidos': 'Cantidad de Pedidos', 'hora': 'Hora (24h)'},
                color_continuous_scale='Reds'
            )
            fig_hours_bar.update_layout(height=400)
            st.plotly_chart(fig_hours_bar, use_container_width=True)
        
        # Análisis por período del día
        st.subheader("🌅 Actividad por Período del Día")
        
        periodo_summary = hours_df.groupby('periodo_dia').agg({
            'pedidos': 'sum',
            'ingresos': 'sum',
            'usuarios_activos': 'sum'
        }).reset_index()
        
        col1, col2 = st.columns(2)
        
        with col1:
            fig_periodo = px.pie(
                periodo_summary,
                values='pedidos',
                names='periodo_dia',
                title='📊 Distribución de Pedidos por Período'
            )
            fig_periodo.update_layout(height=400)
            st.plotly_chart(fig_periodo, use_container_width=True)
        
        with col2:
            fig_ingresos_periodo = px.bar(
                periodo_summary,
                x='periodo_dia',
                y='ingresos',
                title='💰 Ingresos por Período del Día',
                color='ingresos',
                color_continuous_scale='Greens'
            )
            fig_ingresos_periodo.update_layout(height=400)
            st.plotly_chart(fig_ingresos_periodo, use_container_width=True)
        
        # Top 5 horas más activas
        st.subheader("🏆 Top 5 Horas Más Activas")
        top_hours = hours_df.nlargest(5, 'pedidos')[['hora', 'pedidos', 'ingresos', 'usuarios_activos']].copy()
        top_hours['hora_formato'] = top_hours['hora'].apply(lambda x: f"{x:02d}:00")
        top_hours['ingresos'] = top_hours['ingresos'].apply(lambda x: f"CRC {x:,.0f}")
        
        display_cols = ['hora_formato', 'pedidos', 'ingresos', 'usuarios_activos']
        top_hours_display = top_hours[display_cols].rename(columns={
            'hora_formato': 'Hora',
            'pedidos': 'Pedidos',
            'ingresos': 'Ingresos',
            'usuarios_activos': 'Usuarios Activos'
        })
        
        st.dataframe(top_hours_display, use_container_width=True)
        
        # Insights por hora
        if not hours_df.empty:
            hora_pico = hours_df.loc[hours_df['pedidos'].idxmax(), 'hora']
            hora_tranquila = hours_df.loc[hours_df['pedidos'].idxmin(), 'hora']
            
            st.info(f"""
            💡 **Insights por hora:**
            - **Hora pico:** {hora_pico:02d}:00 ({hours_df.loc[hours_df['pedidos'].idxmax(), 'pedidos']:,} pedidos)
            - **Hora más tranquila:** {hora_tranquila:02d}:00 ({hours_df.loc[hours_df['pedidos'].idxmin(), 'pedidos']:,} pedidos)
            - **Período más activo:** {periodo_summary.loc[periodo_summary['pedidos'].idxmax(), 'periodo_dia']}
            """)
        
        # Exportación para horas
        _show_export_section(hours_df, data_source, "horas")

def _show_peak_analysis(source_filter, data_source):
    """Análisis de horarios pico predefinidos"""
    st.subheader("⚡ Análisis de Horarios Pico Predefinidos")
    
    query_peak = f"""
    SELECT 
        dt.es_horario_pico,
        CASE 
            WHEN dt.es_horario_pico = true THEN 'Horario Pico'
            ELSE 'Horario Normal'
        END as tipo_horario,
        COUNT(fp.id_pedido) as pedidos,
        COALESCE(SUM(fp.total_pedido), 0) as ingresos,
        ROUND(AVG(fp.total_pedido), 2) as ticket_promedio,
        COUNT(DISTINCT fp.id_usuario) as usuarios_activos,
        COUNT(DISTINCT dt.hora) as horas_diferentes
    FROM warehouse.fact_pedidos fp
    JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
    WHERE fp.total_pedido > 0 {source_filter}
    GROUP BY dt.es_horario_pico
    ORDER BY dt.es_horario_pico DESC
    """
    
    peak_df = load_data_cached(query_peak, f'cache_peak_analysis_{data_source.lower()}')
    
    if not peak_df.empty:
        # Métricas principales
        col1, col2, col3, col4 = st.columns(4)
        
        if len(peak_df) >= 2:
            pico = peak_df[peak_df['es_horario_pico'] == True].iloc[0] if any(peak_df['es_horario_pico']) else None
            normal = peak_df[peak_df['es_horario_pico'] == False].iloc[0] if any(~peak_df['es_horario_pico']) else None
            
            if pico is not None:
                with col1:
                    st.metric(
                        "🔥 Pedidos en Pico",
                        f"{pico['pedidos']}",
                        delta=f"vs {normal['pedidos'] if normal is not None else 0} normal"
                    )
                
                with col2:
                    st.metric(
                        "💰 Ingresos en Pico", 
                        f"CRC {pico['ingresos']:,.0f}",
                        delta=f"CRC {(pico['ingresos'] - (normal['ingresos'] if normal is not None else 0)):+,.0f}"
                    )
                
                with col3:
                    st.metric(
                        "🎫 Ticket Pico",
                        f"CRC {pico['ticket_promedio']:,.0f}",
                        delta=f"CRC {(pico['ticket_promedio'] - (normal['ticket_promedio'] if normal is not None else 0)):+,.0f}"
                    )
                
                with col4:
                    participacion_pico = (pico['pedidos'] / (pico['pedidos'] + (normal['pedidos'] if normal is not None else 0))) * 100
                    st.metric(
                        "📊 % Participación Pico",
                        f"{participacion_pico:.1f}%",
                        delta=f"{pico['horas_diferentes']} horas pico"
                    )
        
        # Gráficos comparativos
        col1, col2 = st.columns(2)
        
        with col1:
            fig_peak_pedidos = px.bar(
                peak_df,
                x='tipo_horario',
                y='pedidos',
                title='📦 Pedidos: Pico vs Normal',
                color='tipo_horario',
                color_discrete_map={'Horario Pico': '#e74c3c', 'Horario Normal': '#3498db'}
            )
            fig_peak_pedidos.update_layout(height=400)
            st.plotly_chart(fig_peak_pedidos, use_container_width=True)
        
        with col2:
            fig_peak_ingresos = px.bar(
                peak_df,
                x='tipo_horario',
                y='ingresos',
                title='💰 Ingresos: Pico vs Normal',
                color='tipo_horario',
                color_discrete_map={'Horario Pico': '#e67e22', 'Horario Normal': '#27ae60'}
            )
            fig_peak_ingresos.update_layout(height=400)
            st.plotly_chart(fig_peak_ingresos, use_container_width=True)
        
        # Detalle de qué horas están marcadas como pico
        st.subheader("🕐 ¿Qué Horas están Marcadas como Pico?")
        
        query_peak_hours = f"""
        SELECT DISTINCT
            dt.hora,
            dt.es_horario_pico,
            COUNT(fp.id_pedido) as pedidos_en_esta_hora
        FROM warehouse.fact_pedidos fp
        JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        WHERE fp.total_pedido > 0 {source_filter}
        GROUP BY dt.hora, dt.es_horario_pico
        ORDER BY dt.hora
        """
        
        peak_hours_df = load_data_cached(query_peak_hours, f'cache_peak_hours_detail_{data_source.lower()}')
        
        if not peak_hours_df.empty:
            # Crear una visualización que muestre todas las horas y cuáles son pico
            peak_hours_df['tipo'] = peak_hours_df['es_horario_pico'].map({
                True: 'Hora Pico', 
                False: 'Hora Normal'
            })
            
            fig_peak_timeline = px.bar(
                peak_hours_df,
                x='hora',
                y='pedidos_en_esta_hora',
                color='tipo',
                title='⏰ Timeline: Horas Pico vs Normales',
                labels={'pedidos_en_esta_hora': 'Pedidos', 'hora': 'Hora (24h)'},
                color_discrete_map={'Hora Pico': '#e74c3c', 'Hora Normal': '#95a5a6'}
            )
            fig_peak_timeline.update_layout(height=400)
            fig_peak_timeline.update_xaxes(dtick=1)  # Mostrar todas las horas
            st.plotly_chart(fig_peak_timeline, use_container_width=True)
            
            # Lista de horas pico
            horas_pico = peak_hours_df[peak_hours_df['es_horario_pico'] == True]['hora'].tolist()
            if horas_pico:
                horas_pico_str = ', '.join([f"{h:02d}:00" for h in sorted(horas_pico)])
                st.info(f"🔥 **Horas marcadas como pico:** {horas_pico_str}")
            else:
                st.warning("⚠️ No hay horas marcadas como pico en los datos actuales")
        
        # Exportación para análisis pico
        _show_export_section(peak_df, data_source, "pico")

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
            file_name=f'analisis_horarios_{analysis_type}_{data_source.lower()}.csv',
            mime='text/csv'
        )
    
    with col2:
        # Excel
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Hoja principal con datos
            data_df.to_excel(writer, sheet_name=f'{analysis_type.title()}_Datos', index=False)
            
            # Hoja de resumen según el tipo
            if analysis_type == "dias":
                summary_data = {
                    'Métrica': [
                        'Total Días Analizados',
                        'Total Pedidos',
                        'Total Ingresos (CRC)',
                        'Día con Más Pedidos',
                        'Día con Menos Pedidos',
                        'Ticket Promedio (CRC)'
                    ],
                    'Valor': [
                        len(data_df),
                        f"{data_df['pedidos'].sum():,}",
                        f"{data_df['ingresos'].sum():,.0f}",
                        data_df.loc[data_df['pedidos'].idxmax(), 'nombre_dia'],
                        data_df.loc[data_df['pedidos'].idxmin(), 'nombre_dia'],
                        f"{data_df['ticket_promedio'].mean():,.2f}"
                    ]
                }
            elif analysis_type == "horas":
                summary_data = {
                    'Métrica': [
                        'Total Horas Analizadas',
                        'Total Pedidos',
                        'Total Ingresos (CRC)',
                        'Hora Pico',
                        'Hora Más Tranquila',
                        'Usuarios Activos Totales'
                    ],
                    'Valor': [
                        len(data_df),
                        f"{data_df['pedidos'].sum():,}",
                        f"{data_df['ingresos'].sum():,.0f}",
                        f"{data_df.loc[data_df['pedidos'].idxmax(), 'hora']:02d}:00",
                        f"{data_df.loc[data_df['pedidos'].idxmin(), 'hora']:02d}:00",
                        f"{data_df['usuarios_activos'].sum():,}"
                    ]
                }
            else:  # pico
                summary_data = {
                    'Métrica': [
                        'Tipos de Horarios',
                        'Total Pedidos',
                        'Total Ingresos (CRC)',
                        'Ticket Promedio (CRC)',
                        'Usuarios Activos Totales'
                    ],
                    'Valor': [
                        len(data_df),
                        f"{data_df['pedidos'].sum():,}",
                        f"{data_df['ingresos'].sum():,.0f}",
                        f"{data_df['ticket_promedio'].mean():,.2f}",
                        f"{data_df['usuarios_activos'].sum():,}"
                    ]
                }
            
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Resumen_Ejecutivo', index=False)
        
        st.download_button(
            label="📊 Descargar Excel",
            data=buffer.getvalue(),
            file_name=f'analisis_horarios_{analysis_type}_{data_source.lower()}.xlsx',
            mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    
    with col3:
        # PDF
        if st.button(f"📋 Generar PDF - {analysis_type}", key=f"pdf_{analysis_type}"):
            pdf_data = _generate_hours_pdf(data_df, data_source, analysis_type)
            st.download_button(
                label="💾 Descargar PDF",
                data=pdf_data,
                file_name=f'reporte_horarios_{analysis_type}_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
                mime='application/pdf',
                key=f"download_pdf_{analysis_type}"
            )

def _generate_hours_pdf(data_df, data_source, analysis_type):
    """Generar reporte PDF de análisis de horarios"""
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
    story.append(Paragraph(f"Analisis de Horarios - {analysis_type.title()} - {data_source}", title_style))
    story.append(Spacer(1, 20))
    
    # Fecha de generación
    date_style = ParagraphStyle('DateStyle', parent=styles['Normal'], fontSize=10, alignment=1)
    story.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}", date_style))
    story.append(Spacer(1, 30))
    
    if not data_df.empty:
        # Resumen ejecutivo
        story.append(Paragraph("Resumen Ejecutivo:", styles['Heading2']))
        
        if analysis_type == "dias":
            resumen_data = [
                ['Metrica', 'Valor'],
                ['Total Dias', str(len(data_df))],
                ['Total Pedidos', f"{data_df['pedidos'].sum():,}"],
                ['Total Ingresos', format_currency(data_df['ingresos'].sum())],
                ['Dia con Mas Pedidos', data_df.loc[data_df['pedidos'].idxmax(), 'nombre_dia']],
                ['Dia con Menos Pedidos', data_df.loc[data_df['pedidos'].idxmin(), 'nombre_dia']],
                ['Ticket Promedio', format_currency(data_df['ticket_promedio'].mean())]
            ]
        elif analysis_type == "horas":
            resumen_data = [
                ['Metrica', 'Valor'],
                ['Total Horas', str(len(data_df))],
                ['Total Pedidos', f"{data_df['pedidos'].sum():,}"],
                ['Total Ingresos', format_currency(data_df['ingresos'].sum())],
                ['Hora Pico', f"{data_df.loc[data_df['pedidos'].idxmax(), 'hora']:02d}:00"],
                ['Hora Tranquila', f"{data_df.loc[data_df['pedidos'].idxmin(), 'hora']:02d}:00"],
                ['Usuarios Activos', f"{data_df['usuarios_activos'].sum():,}"]
            ]
        else:  # pico
            resumen_data = [
                ['Metrica', 'Valor'],
                ['Tipos Horarios', str(len(data_df))],
                ['Total Pedidos', f"{data_df['pedidos'].sum():,}"],
                ['Total Ingresos', format_currency(data_df['ingresos'].sum())],
                ['Ticket Promedio', format_currency(data_df['ticket_promedio'].mean())],
                ['Usuarios Activos', f"{data_df['usuarios_activos'].sum():,}"]
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
        
        # Tabla de datos detallados
        story.append(Paragraph("Datos Detallados:", styles['Heading2']))
        
        if analysis_type == "dias":
            table_data = [['Dia', 'Pedidos', 'Ingresos (CRC)', 'Ticket Prom', 'Fin Semana']]
            for _, row in data_df.iterrows():
                table_data.append([
                    str(row['nombre_dia']),
                    f"{int(row['pedidos']):,}",
                    f"{int(row['ingresos']):,}",
                    f"{row['ticket_promedio']:,.2f}",
                    'Si' if row['es_fin_semana'] else 'No'
                ])
        elif analysis_type == "horas":
            table_data = [['Hora', 'Pedidos', 'Ingresos (CRC)', 'Usuarios', 'Periodo']]
            for _, row in data_df.head(12).iterrows():  # Solo 12 horas para PDF
                table_data.append([
                    f"{int(row['hora']):02d}:00",
                    f"{int(row['pedidos']):,}",
                    f"{int(row['ingresos']):,}",
                    f"{int(row['usuarios_activos']):,}",
                    str(row['periodo_dia'])[:10]
                ])
        else:  # pico
            table_data = [['Tipo Horario', 'Pedidos', 'Ingresos (CRC)', 'Ticket Prom', 'Usuarios']]
            for _, row in data_df.iterrows():
                table_data.append([
                    str(row['tipo_horario']),
                    f"{int(row['pedidos']):,}",
                    f"{int(row['ingresos']):,}",
                    f"{row['ticket_promedio']:,.2f}",
                    f"{int(row['usuarios_activos']):,}"
                ])
        
        data_table = Table(table_data, colWidths=[1.2*inch, 1*inch, 1.2*inch, 1*inch, 1*inch])
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