# pages/product_analysis.py

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
    Página de Análisis de Productos y Categorías
    
    Args:
        data_source (str): Fuente de datos seleccionada ("Todos", "PostgreSQL", "MongoDB")
    """
    st.header(f"🍽️ Análisis de Productos y Categorías - {data_source}")
    
    # Filtro de fuente de datos
    source_filter = get_data_source_filter(data_source)
    # Para productos usamos fact_detalle_pedidos que también tiene fuente_datos
    source_filter = source_filter.replace("fp.fuente_datos", "fdp.fuente_datos")
    
    # Crear pestañas para diferentes análisis
    tab1, tab2, tab3 = st.tabs(["📊 Por Categorías", "🍽️ Productos Individuales", "💰 Análisis de Precios"])
    
    with tab1:
        _show_category_analysis(source_filter, data_source)
    
    with tab2:
        _show_product_analysis(source_filter, data_source)
    
    with tab3:
        _show_price_analysis(source_filter, data_source)

def _show_category_analysis(source_filter, data_source):
    """Análisis por categorías de productos"""
    st.subheader("📊 Análisis por Categorías")
    
    # Consulta directa a tablas base
    query_products = f"""
    SELECT 
        dc.nombre_categoria,
        COUNT(fdp.id_producto) as ventas_totales,
        COALESCE(SUM(fdp.subtotal), 0) as ingresos,
        COALESCE(SUM(fdp.cantidad), 0) as unidades,
        ROUND(AVG(fdp.precio_unitario), 2) as precio_promedio,
        COUNT(DISTINCT fdp.id_producto) as productos_unicos,
        ROUND(AVG(fdp.cantidad), 2) as cantidad_promedio_por_venta
    FROM warehouse.fact_detalle_pedidos fdp
    JOIN warehouse.dim_categorias dc ON fdp.categoria_id = dc.categoria_id
    WHERE fdp.subtotal > 0 {source_filter}
    GROUP BY dc.nombre_categoria
    ORDER BY SUM(fdp.subtotal) DESC
    """
    
    products_df = load_data_cached(query_products, f'cache_products_{data_source.lower()}')
    
    if not products_df.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Ingresos por categoría
            fig_cat_ingresos = px.bar(
                products_df,
                x='nombre_categoria',
                y='ingresos',
                title='💰 Ingresos por Categoría',
                labels={'ingresos': 'Ingresos (CRC)', 'nombre_categoria': 'Categoría'},
                color='ingresos',
                color_continuous_scale='Blues'
            )
            fig_cat_ingresos.update_layout(height=400)
            st.plotly_chart(fig_cat_ingresos, use_container_width=True)
        
        with col2:
            # Unidades vendidas por categoría
            fig_units = px.pie(
                products_df,
                values='unidades',
                names='nombre_categoria',
                title='📊 Unidades Vendidas por Categoría'
            )
            fig_units.update_layout(height=400)
            st.plotly_chart(fig_units, use_container_width=True)
        
        # Métricas de resumen
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            total_categorias = len(products_df)
            st.metric("📂 Total Categorías", total_categorias)
        
        with col2:
            total_ingresos = products_df['ingresos'].sum()
            st.metric("💰 Ingresos Totales", f"CRC {total_ingresos:,.0f}")
        
        with col3:
            total_unidades = products_df['unidades'].sum()
            st.metric("📦 Unidades Vendidas", f"{total_unidades:,}")
        
        with col4:
            total_productos = products_df['productos_unicos'].sum()
            st.metric("🍽️ Productos Únicos", f"{total_productos:,}")
        
        # Tabla detallada
        st.subheader("📋 Detalle por Categorías")
        products_display = products_df.copy()
        products_display['ingresos'] = products_display['ingresos'].apply(lambda x: f"CRC {x:,.0f}")
        products_display['precio_promedio'] = products_display['precio_promedio'].apply(lambda x: f"CRC {x:,.2f}")
        
        # Renombrar columnas
        products_display = products_display.rename(columns={
            'nombre_categoria': 'Categoría',
            'ventas_totales': 'Ventas Totales',
            'ingresos': 'Ingresos',
            'unidades': 'Unidades',
            'precio_promedio': 'Precio Promedio',
            'productos_unicos': 'Productos Únicos',
            'cantidad_promedio_por_venta': 'Cantidad Prom/Venta'
        })
        
        st.dataframe(products_display, use_container_width=True)
        
        # Insights automáticos
        if not products_df.empty:
            categoria_lider = products_df.iloc[0]['nombre_categoria']
            categoria_mas_productos = products_df.loc[products_df['productos_unicos'].idxmax(), 'nombre_categoria']
            categoria_mayor_precio = products_df.loc[products_df['precio_promedio'].idxmax(), 'nombre_categoria']
            
            st.info(f"""
            💡 **Insights clave:**
            - **Categoría líder en ingresos:** {categoria_lider} con CRC {products_df.iloc[0]['ingresos']:,.0f}
            - **Categoría con más productos:** {categoria_mas_productos} ({products_df.loc[products_df['productos_unicos'].idxmax(), 'productos_unicos']} productos únicos)
            - **Categoría de mayor precio promedio:** {categoria_mayor_precio} (CRC {products_df.loc[products_df['precio_promedio'].idxmax(), 'precio_promedio']:,.2f})
            """)
        
        # Exportación para categorías
        _show_export_section(products_df, data_source, "categorias")

def _show_product_analysis(source_filter, data_source):
    """Análisis de productos individuales"""
    st.subheader("🍽️ Top Productos Individuales")
    
    query_individual = f"""
    SELECT 
        dp.nombre,
        dc.nombre_categoria,
        COUNT(fdp.id_producto) as ventas_totales,
        COALESCE(SUM(fdp.subtotal), 0) as ingresos,
        COALESCE(SUM(fdp.cantidad), 0) as unidades_vendidas,
        ROUND(AVG(fdp.precio_unitario), 2) as precio_promedio,
        ROUND(AVG(fdp.cantidad), 2) as cantidad_promedio_por_pedido
    FROM warehouse.fact_detalle_pedidos fdp
    JOIN warehouse.dim_productos dp ON fdp.id_producto = dp.producto_id
    JOIN warehouse.dim_categorias dc ON fdp.categoria_id = dc.categoria_id
    WHERE fdp.subtotal > 0 {source_filter}
    GROUP BY dp.nombre, dc.nombre_categoria
    ORDER BY SUM(fdp.subtotal) DESC
    LIMIT 20
    """
    
    individual_df = load_data_cached(query_individual, f'cache_products_individual_{data_source.lower()}')
    
    if not individual_df.empty:
        # Selector para ordenamiento
        col1, col2 = st.columns(2)
        with col1:
            sort_by = st.selectbox(
                "Ordenar por:",
                ["ingresos", "unidades_vendidas", "ventas_totales", "precio_promedio"],
                format_func=lambda x: {
                    "ingresos": "Ingresos",
                    "unidades_vendidas": "Unidades Vendidas", 
                    "ventas_totales": "Número de Ventas",
                    "precio_promedio": "Precio Promedio"
                }[x]
            )
        
        # Reordenar según selección
        sorted_df = individual_df.sort_values(sort_by, ascending=False).head(15)
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Top productos por métrica seleccionada
            fig_top = px.bar(
                sorted_df,
                x=sort_by,
                y='nombre',
                orientation='h',
                title=f'Top 15 Productos por {sort_by.replace("_", " ").title()}',
                labels={sort_by: sort_by.replace("_", " ").title(), 'nombre': 'Producto'},  # ← CAMBIO
                color=sort_by,
                color_continuous_scale='Viridis'
            )
            fig_top.update_layout(height=600, yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig_top, use_container_width=True)
        
        with col2:
            # Distribución por categoría de top productos
            category_dist = sorted_df['nombre_categoria'].value_counts()
            
            fig_cat_dist = px.pie(
                values=category_dist.values,
                names=category_dist.index,
                title='Distribución de Categorías en Top 15'
            )
            fig_cat_dist.update_layout(height=300)
            st.plotly_chart(fig_cat_dist, use_container_width=True)
            
            # Estadísticas del top 15
            st.subheader("📈 Estadísticas Top 15")
            st.metric("💰 Ingresos Promedio", f"CRC {sorted_df['ingresos'].mean():,.0f}")
            st.metric("📦 Unidades Promedio", f"{sorted_df['unidades_vendidas'].mean():.1f}")
            st.metric("🎯 Ventas Promedio", f"{sorted_df['ventas_totales'].mean():.1f}")
        
        # Tabla de top productos
        st.subheader("🏆 Top 20 Productos Detallado")
        
        individual_display = individual_df.copy()
        individual_display['ingresos'] = individual_display['ingresos'].apply(lambda x: f"CRC {x:,.0f}")
        individual_display['precio_promedio'] = individual_display['precio_promedio'].apply(lambda x: f"CRC {x:,.2f}")
        
        individual_display = individual_display.rename(columns={
            'nombre': 'Producto',
            'nombre_categoria': 'Categoría',
            'ventas_totales': 'Núm. Ventas',
            'ingresos': 'Ingresos',
            'unidades_vendidas': 'Unidades',
            'precio_promedio': 'Precio Prom.',
            'cantidad_promedio_por_pedido': 'Cant. Prom/Pedido'
        })
        
        st.dataframe(individual_display, use_container_width=True)
        
        # Exportación para productos individuales
        _show_export_section(individual_df, data_source, "productos")

def _show_price_analysis(source_filter, data_source):
    """Análisis de precios"""
    st.subheader("💰 Análisis de Precios y Rentabilidad")
    
    query_prices = f"""
    SELECT 
        dc.nombre_categoria,
        MIN(fdp.precio_unitario) as precio_minimo,
        MAX(fdp.precio_unitario) as precio_maximo,
        ROUND(AVG(fdp.precio_unitario), 2) as precio_promedio,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fdp.precio_unitario), 2) as precio_mediano,
        COUNT(DISTINCT fdp.id_producto) as productos_en_categoria,
        COALESCE(SUM(fdp.subtotal), 0) as ingresos_categoria,
        ROUND(MAX(fdp.precio_unitario) - MIN(fdp.precio_unitario), 2) as rango_precios
    FROM warehouse.fact_detalle_pedidos fdp
    JOIN warehouse.dim_categorias dc ON fdp.categoria_id = dc.categoria_id
    WHERE fdp.subtotal > 0 {source_filter}
    GROUP BY dc.nombre_categoria
    ORDER BY AVG(fdp.precio_unitario) DESC
    """
    
    prices_df = load_data_cached(query_prices, f'cache_prices_{data_source.lower()}')
    
    if not prices_df.empty:
        col1, col2 = st.columns(2)
        
        with col1:
            # Rango de precios por categoría
            fig_range = go.Figure()
            
            for _, row in prices_df.iterrows():
                fig_range.add_trace(go.Scatter(
                    x=[row['precio_minimo'], row['precio_maximo']],
                    y=[row['nombre_categoria'], row['nombre_categoria']],
                    mode='lines+markers',
                    name=row['nombre_categoria'],
                    line=dict(width=8),
                    marker=dict(size=10)
                ))
                
                # Agregar precio promedio
                fig_range.add_trace(go.Scatter(
                    x=[row['precio_promedio']],
                    y=[row['nombre_categoria']],
                    mode='markers',
                    name=f"{row['nombre_categoria']} (Promedio)",
                    marker=dict(size=12, symbol='diamond', color='red'),
                    showlegend=False
                ))
            
            fig_range.update_layout(
                title='💰 Rango de Precios por Categoría',
                xaxis_title='Precio (CRC)',
                yaxis_title='Categoría',
                height=400,
                showlegend=False
            )
            st.plotly_chart(fig_range, use_container_width=True)
        
        with col2:
            # Distribución de precios promedio
            fig_dist = px.bar(
                prices_df,
                x='precio_promedio',
                y='nombre_categoria',
                orientation='h',
                title='📊 Precio Promedio por Categoría',
                labels={'precio_promedio': 'Precio Promedio (CRC)', 'nombre_categoria': 'Categoría'},
                color='precio_promedio',
                color_continuous_scale='RdYlBu_r'
            )
            fig_dist.update_layout(height=400, yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig_dist, use_container_width=True)
        
        # Análisis de dispersión precio vs ingresos
        st.subheader("📈 Relación Precio vs Ingresos")
        
        fig_scatter = px.scatter(
            prices_df,
            x='precio_promedio',
            y='ingresos_categoria',
            size='productos_en_categoria',
            color='nombre_categoria',
            title='Precio Promedio vs Ingresos por Categoría',
            labels={
                'precio_promedio': 'Precio Promedio (CRC)',
                'ingresos_categoria': 'Ingresos Totales (CRC)',
                'productos_en_categoria': 'Núm. Productos'
            },
            hover_data=['rango_precios']
        )
        fig_scatter.update_layout(height=500)
        st.plotly_chart(fig_scatter, use_container_width=True)
        
        # Tabla de análisis de precios
        st.subheader("💰 Análisis Detallado de Precios")
        
        prices_display = prices_df.copy()
        for col in ['precio_minimo', 'precio_maximo', 'precio_promedio', 'precio_mediano', 'rango_precios']:
            prices_display[col] = prices_display[col].apply(lambda x: f"CRC {x:,.2f}")
        prices_display['ingresos_categoria'] = prices_display['ingresos_categoria'].apply(lambda x: f"CRC {x:,.0f}")
        
        prices_display = prices_display.rename(columns={
            'nombre_categoria': 'Categoría',
            'precio_minimo': 'Precio Mín.',
            'precio_maximo': 'Precio Máx.',
            'precio_promedio': 'Precio Prom.',
            'precio_mediano': 'Precio Mediano',
            'productos_en_categoria': 'Núm. Productos',
            'ingresos_categoria': 'Ingresos',
            'rango_precios': 'Rango Precios'
        })
        
        st.dataframe(prices_display, use_container_width=True)
        
        # Insights de precios
        if not prices_df.empty:
            cat_mas_cara = prices_df.loc[prices_df['precio_promedio'].idxmax(), 'nombre_categoria']
            cat_mas_barata = prices_df.loc[prices_df['precio_promedio'].idxmin(), 'nombre_categoria']
            cat_mayor_rango = prices_df.loc[prices_df['rango_precios'].idxmax(), 'nombre_categoria']
            
            st.info(f"""
            💡 **Insights de precios:**
            - **Categoría más cara:** {cat_mas_cara} (CRC {prices_df.loc[prices_df['precio_promedio'].idxmax(), 'precio_promedio']:,.2f} promedio)
            - **Categoría más económica:** {cat_mas_barata} (CRC {prices_df.loc[prices_df['precio_promedio'].idxmin(), 'precio_promedio']:,.2f} promedio)
            - **Mayor variabilidad:** {cat_mayor_rango} (rango de CRC {prices_df.loc[prices_df['rango_precios'].idxmax(), 'rango_precios']:,.2f})
            """)
        
        # Exportación para precios
        _show_export_section(prices_df, data_source, "precios")

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
            file_name=f'analisis_productos_{analysis_type}_{data_source.lower()}.csv',
            mime='text/csv'
        )
    
    with col2:
        # Excel
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Hoja principal con datos
            data_df.to_excel(writer, sheet_name=f'{analysis_type.title()}_Datos', index=False)
            
            # Hoja de resumen según el tipo
            if analysis_type == "categorias":
                summary_data = {
                    'Métrica': [
                        'Total Categorías',
                        'Total Ingresos (CRC)',
                        'Total Unidades',
                        'Productos Únicos',
                        'Categoría Líder',
                        'Precio Promedio General (CRC)'
                    ],
                    'Valor': [
                        len(data_df),
                        f"{data_df['ingresos'].sum():,.0f}",
                        f"{data_df['unidades'].sum():,}",
                        f"{data_df['productos_unicos'].sum():,}",
                        data_df.iloc[0]['nombre_categoria'],
                        f"{data_df['precio_promedio'].mean():,.2f}"
                    ]
                }
            elif analysis_type == "productos":
                summary_data = {
                    'Métrica': [
                        'Total Productos Top 20',
                        'Total Ingresos (CRC)',
                        'Total Unidades',
                        'Total Ventas',
                        'Producto Líder',
                        'Precio Promedio (CRC)'
                    ],
                    'Valor': [
                        len(data_df),
                        f"{data_df['ingresos'].sum():,.0f}",
                        f"{data_df['unidades_vendidas'].sum():,}",
                        f"{data_df['ventas_totales'].sum():,}",
                        data_df.iloc[0]['nombre'],
                        f"{data_df['precio_promedio'].mean():,.2f}"
                    ]
                }
            else:  # precios
                summary_data = {
                    'Métrica': [
                        'Total Categorías',
                        'Precio Promedio General (CRC)',
                        'Precio Máximo (CRC)',
                        'Precio Mínimo (CRC)',
                        'Categoría Más Cara',
                        'Total Ingresos (CRC)'
                    ],
                    'Valor': [
                        len(data_df),
                        f"{data_df['precio_promedio'].mean():,.2f}",
                        f"{data_df['precio_maximo'].max():,.2f}",
                        f"{data_df['precio_minimo'].min():,.2f}",
                        data_df.loc[data_df['precio_promedio'].idxmax(), 'nombre_categoria'],
                        f"{data_df['ingresos_categoria'].sum():,.0f}"
                    ]
                }
            
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Resumen_Ejecutivo', index=False)
        
        st.download_button(
            label="📊 Descargar Excel",
            data=buffer.getvalue(),
            file_name=f'analisis_productos_{analysis_type}_{data_source.lower()}.xlsx',
            mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    
    with col3:
        # PDF
        if st.button(f"📋 Generar PDF - {analysis_type}", key=f"pdf_{analysis_type}"):
            pdf_data = _generate_products_pdf(data_df, data_source, analysis_type)
            st.download_button(
                label="💾 Descargar PDF",
                data=pdf_data,
                file_name=f'reporte_productos_{analysis_type}_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
                mime='application/pdf',
                key=f"download_pdf_{analysis_type}"
            )

def _generate_products_pdf(data_df, data_source, analysis_type):
    """Generar reporte PDF de análisis de productos"""
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
        return f"CRC {amount:,.2f}" if isinstance(amount, float) else f"CRC {amount:,.0f}"
    
    # Título
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=1
    )
    story.append(Paragraph(f"Analisis de Productos - {analysis_type.title()} - {data_source}", title_style))
    story.append(Spacer(1, 20))
    
    # Fecha de generación
    date_style = ParagraphStyle('DateStyle', parent=styles['Normal'], fontSize=10, alignment=1)
    story.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}", date_style))
    story.append(Spacer(1, 30))
    
    if not data_df.empty:
        # Resumen ejecutivo
        story.append(Paragraph("Resumen Ejecutivo:", styles['Heading2']))
        
        if analysis_type == "categorias":
            resumen_data = [
                ['Metrica', 'Valor'],
                ['Total Categorias', str(len(data_df))],
                ['Total Ingresos', format_currency(data_df['ingresos'].sum())],
                ['Total Unidades', f"{data_df['unidades'].sum():,}"],
                ['Productos Unicos', f"{data_df['productos_unicos'].sum():,}"],
                ['Categoria Lider', data_df.iloc[0]['nombre_categoria']],
                ['Precio Promedio General', format_currency(data_df['precio_promedio'].mean())]
            ]
        elif analysis_type == "productos":
            resumen_data = [
                ['Metrica', 'Valor'],
                ['Total Productos Top 20', str(len(data_df))],
                ['Total Ingresos', format_currency(data_df['ingresos'].sum())],
                ['Total Unidades', f"{data_df['unidades_vendidas'].sum():,}"],
                ['Total Ventas', f"{data_df['ventas_totales'].sum():,}"],
                ['Producto Lider', data_df.iloc[0]['nombre']],
                ['Precio Promedio', format_currency(data_df['precio_promedio'].mean())]
            ]
        else:  # precios
            resumen_data = [
                ['Metrica', 'Valor'],
                ['Total Categorias', str(len(data_df))],
                ['Precio Promedio General', format_currency(data_df['precio_promedio'].mean())],
                ['Precio Maximo', format_currency(data_df['precio_maximo'].max())],
                ['Precio Minimo', format_currency(data_df['precio_minimo'].min())],
                ['Categoria Mas Cara', data_df.loc[data_df['precio_promedio'].idxmax(), 'nombre_categoria']],
                ['Total Ingresos', format_currency(data_df['ingresos_categoria'].sum())]
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
        
        if analysis_type == "categorias":
            table_data = [['Categoria', 'Ingresos (CRC)', 'Unidades', 'Productos', 'Precio Prom']]
            for _, row in display_data.iterrows():
                table_data.append([
                    str(row['nombre_categoria'])[:15],
                    f"{int(row['ingresos']):,}",
                    f"{int(row['unidades']):,}",
                    f"{int(row['productos_unicos'])}",
                    f"{row['precio_promedio']:,.2f}"
                ])
        elif analysis_type == "productos":
            table_data = [['Producto', 'Categoria', 'Ingresos (CRC)', 'Unidades']]
            for _, row in display_data.iterrows():
                table_data.append([
                    str(row['nombre'])[:20],
                    str(row['nombre_categoria'])[:15],
                    f"{int(row['ingresos']):,}",
                    f"{int(row['unidades_vendidas']):,}"
                ])
        else:  # precios
            table_data = [['Categoria', 'Precio Min', 'Precio Max', 'Precio Prom', 'Productos']]
            for _, row in display_data.iterrows():
                table_data.append([
                    str(row['nombre_categoria'])[:15],
                    f"{row['precio_minimo']:,.2f}",
                    f"{row['precio_maximo']:,.2f}",
                    f"{row['precio_promedio']:,.2f}",
                    f"{int(row['productos_en_categoria'])}"
                ])
        
        data_table = Table(table_data, colWidths=[1.5*inch, 1.2*inch, 1.2*inch, 1*inch, 1*inch])
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