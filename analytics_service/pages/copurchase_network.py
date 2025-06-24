# pages/copurchase_network.py

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
from io import BytesIO

# Importar las funciones del analyzer
from graph_analytics.copurchase_analyzer import (
    get_copurchase_metrics,
    get_top_copurchases,
    get_strongest_product_relationships,
    get_product_recommendations
)

def show_page(data_source):
    """
    Página principal para análisis de co-compras con Neo4j
    
    Args:
        data_source (str): Fuente de datos seleccionada por el usuario
    """
    
    st.header("🛒 Análisis de Co-compras de Productos")
    st.markdown("*Análisis basado en datos de Neo4j - Productos que se compran juntos*")
    
    # Verificar si hay datos disponibles
    try:
        # Test rápido para ver si hay datos
        test_data = get_copurchase_metrics(data_source)
        if test_data.empty:
            st.warning("⚠️ No se encontraron datos de co-compras en Neo4j para la fuente seleccionada.")
            st.info("Asegúrese de que los datos han sido sincronizados y que existen relaciones COMPRADO_CON.")
            return
    except Exception as e:
        st.error(f"❌ Error conectando a Neo4j: {str(e)}")
        st.info("Verifique que Neo4j esté ejecutándose y que las credenciales sean correctas.")
        return
    
    # Pestañas para organizar el contenido
    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 Métricas Generales", 
        "🏆 Top Co-compras", 
        "💪 Relaciones Fuertes",
        "🔍 Buscador de Recomendaciones"
    ])
    
    # === TAB 1: MÉTRICAS GENERALES ===
    with tab1:
        st.subheader("📊 Métricas Generales de Co-compras")
        
        # Obtener métricas
        metrics_data = get_copurchase_metrics(data_source)
        
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            
            # Mostrar métricas en columnas
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric(
                    label="🛍️ Total Productos",
                    value=f"{metrics['total_productos']:,}"
                )
            
            with col2:
                st.metric(
                    label="🔗 Relaciones Co-compra",
                    value=f"{metrics['total_relaciones_copurchase']:,}"
                )
            
            with col3:
                st.metric(
                    label="📦 Productos con Co-compras",
                    value=f"{metrics['productos_con_copurchases']:,}",
                    delta=f"{(metrics['productos_con_copurchases']/metrics['total_productos']*100):.1f}% del total" if metrics['total_productos'] > 0 else "0%"
                )
            
            with col4:
                st.metric(
                    label="📈 Frecuencia Máxima",
                    value=f"{metrics['frecuencia_maxima']:,}"
                )
            
            # Información adicional
            st.markdown("---")
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.info(f"**📊 Frecuencia Promedio:** {metrics['frecuencia_promedio']:.2f}")
            
            with col2:
                st.info(f"**🎯 Support Promedio:** {metrics['support_promedio']:.4f}")
            
            with col3:
                coverage_rate = (metrics['productos_con_copurchases'] / metrics['total_productos']) * 100 if metrics['total_productos'] > 0 else 0
                st.info(f"**📈 Cobertura de Co-compras:** {coverage_rate:.1f}%")
        else:
            st.warning("No se pudieron obtener las métricas generales.")
    
    # === TAB 2: TOP CO-COMPRAS ===
    with tab2:
        st.subheader("🏆 Productos Más Comprados Juntos")
        
        # Controles
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown("*Productos ordenados por frecuencia de co-compra*")
        with col2:
            limit = st.selectbox("📊 Mostrar top:", [10, 20, 30], index=1)
        
        # Obtener datos
        copurchase_data = get_top_copurchases(data_source, limit=limit)
        
        if not copurchase_data.empty:
            # Crear columna combinada para visualización
            copurchase_data['par_productos'] = copurchase_data['producto1'] + ' + ' + copurchase_data['producto2']
            
            # Gráfico de barras
            fig = px.bar(
                copurchase_data.head(15),  # Top 15 para que se vea bien
                x='frecuencia',
                y='par_productos',
                color='confidence_p1_to_p2',
                color_continuous_scale='viridis',
                title=f"Top 15 Pares de Productos Más Co-comprados ({data_source})",
                labels={
                    'frecuencia': 'Frecuencia de Co-compra',
                    'par_productos': 'Par de Productos',
                    'confidence_p1_to_p2': 'Confidence'
                }
            )
            
            fig.update_layout(
                height=600,
                yaxis={'categoryorder': 'total ascending'}
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Tabla detallada
            st.subheader("📋 Detalle de Top Co-compras")
            
            # Formatear tabla
            display_data = copurchase_data[['producto1', 'producto2', 'frecuencia', 'support', 'confidence_p1_to_p2', 'fuente_datos']].copy()
            display_data.columns = ['Producto 1', 'Producto 2', 'Frecuencia', 'Support', 'Confidence', 'Fuente']
            display_data['Support'] = display_data['Support'].round(4)
            display_data['Confidence'] = display_data['Confidence'].round(3)
            
            st.dataframe(
                display_data,
                use_container_width=True,
                hide_index=True
            )
            
        else:
            st.info("No se encontraron datos de co-compras en la fuente seleccionada.")
    
    # === TAB 3: RELACIONES FUERTES ===
    with tab3:
        st.subheader("💪 Relaciones de Co-compra Más Fuertes")
        
        # Controles
        col1, col2 = st.columns(2)
        with col1:
            min_confidence = st.slider(
                "🎯 Confidence mínimo:", 
                min_value=0.1, 
                max_value=1.0, 
                value=0.3, 
                step=0.1,
                help="Solo mostrar relaciones con confidence mayor o igual al valor seleccionado"
            )
        with col2:
            strong_limit = st.selectbox("📊 Mostrar:", [10, 15, 25], index=1)
        
        # Obtener datos
        strong_data = get_strongest_product_relationships(data_source, min_confidence=min_confidence, limit=strong_limit)
        
        if not strong_data.empty:
            # Gráfico de dispersión confidence vs frecuencia
            fig_scatter = px.scatter(
                strong_data,
                x='confidence',
                y='frecuencia',
                size='support',
                color='fuerza_relacion',
                hover_data=['producto_origen', 'producto_destino'],
                title=f"Relaciones por Confidence y Frecuencia (min confidence: {min_confidence})",
                labels={
                    'confidence': 'Confidence',
                    'frecuencia': 'Frecuencia de Co-compra',
                    'fuerza_relacion': 'Fuerza de Relación'
                },
                color_discrete_map={
                    'Muy Alta': '#ff4444',
                    'Alta': '#ffaa00',
                    'Media': '#44ff44',
                    'Baja': '#cccccc'
                }
            )
            
            fig_scatter.update_layout(height=500)
            st.plotly_chart(fig_scatter, use_container_width=True)
            
            # Tabla de relaciones fuertes
            st.subheader("📋 Detalle de Relaciones Fuertes")
            
            display_strong = strong_data[['producto_origen', 'producto_destino', 'frecuencia', 'confidence', 'fuerza_relacion', 'fuente_datos']].copy()
            display_strong.columns = ['Producto Origen', 'Producto Destino', 'Frecuencia', 'Confidence', 'Fuerza', 'Fuente']
            display_strong['Confidence'] = display_strong['Confidence'].round(3)
            
            st.dataframe(
                display_strong,
                use_container_width=True,
                hide_index=True
            )
            
        else:
            st.info(f"No se encontraron relaciones con confidence ≥ {min_confidence} en la fuente seleccionada.")
    
    # === TAB 4: BUSCADOR DE RECOMENDACIONES ===
    with tab4:
        st.subheader("🔍 Buscador de Recomendaciones de Productos")
        
        # Obtener lista de productos para el selector
        all_products = get_top_copurchases(data_source, limit=100)  # Obtener más productos
        
        if not all_products.empty:
            # Crear lista única de productos
            products_list = sorted(set(list(all_products['producto1']) + list(all_products['producto2'])))
            
            col1, col2 = st.columns([3, 1])
            
            with col1:
                selected_product = st.selectbox(
                    "🛍️ Selecciona un producto:",
                    options=products_list,
                    help="Selecciona un producto para ver qué otros productos se compran frecuentemente con él"
                )
            
            with col2:
                rec_limit = st.selectbox("📊 Número de recomendaciones:", [5, 10, 15], index=0)
            
            if selected_product:
                # Obtener recomendaciones
                recommendations = get_product_recommendations(selected_product, data_source, limit=rec_limit)
                
                if not recommendations.empty:
                    st.success(f"✅ Encontradas {len(recommendations)} recomendaciones para '{selected_product}'")
                    
                    # Gráfico de barras de recomendaciones
                    fig_rec = px.bar(
                        recommendations,
                        x='confidence',
                        y='producto_recomendado',
                        color='nivel_recomendacion',
                        title=f"Recomendaciones para '{selected_product}'",
                        labels={
                            'confidence': 'Confidence',
                            'producto_recomendado': 'Producto Recomendado',
                            'nivel_recomendacion': 'Nivel de Recomendación'
                        },
                        color_discrete_map={
                            'Muy recomendado': '#28a745',
                            'Recomendado': '#17a2b8',
                            'Moderadamente recomendado': '#ffc107',
                            'Débilmente recomendado': '#6c757d'
                        }
                    )
                    
                    fig_rec.update_layout(
                        height=400,
                        yaxis={'categoryorder': 'total ascending'}
                    )
                    
                    st.plotly_chart(fig_rec, use_container_width=True)
                    
                    # Tabla de recomendaciones
                    st.subheader("📋 Detalle de Recomendaciones")
                    
                    display_rec = recommendations[['producto_recomendado', 'categoria_recomendado', 'frecuencia', 'confidence', 'nivel_recomendacion', 'fuente_datos']].copy()
                    display_rec.columns = ['Producto Recomendado', 'Categoría', 'Frecuencia', 'Confidence', 'Nivel', 'Fuente']
                    display_rec['Confidence'] = display_rec['Confidence'].round(3)
                    
                    st.dataframe(
                        display_rec,
                        use_container_width=True,
                        hide_index=True
                    )
                    
                    # Insights automáticos
                    st.markdown("---")
                    st.subheader("💡 Insights Automáticos")
                    
                    best_rec = recommendations.iloc[0]
                    avg_confidence = recommendations['confidence'].mean()
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.info(f"""
                        **🎯 Mejor Recomendación:**
                        - {best_rec['producto_recomendado']}
                        - Confidence: {best_rec['confidence']:.1%}
                        - Frecuencia: {best_rec['frecuencia']} co-compras
                        """)
                    
                    with col2:
                        categorias_rec = recommendations['categoria_recomendado'].value_counts()
                        top_categoria = categorias_rec.index[0] if len(categorias_rec) > 0 else "N/A"
                        
                        st.info(f"""
                        **📊 Análisis General:**
                        - Confidence promedio: {avg_confidence:.1%}
                        - Categoría más recomendada: {top_categoria}
                        - Total de recomendaciones: {len(recommendations)}
                        """)
                        
                else:
                    st.warning(f"No se encontraron recomendaciones para '{selected_product}' en la fuente seleccionada.")
        else:
            st.info("No hay productos disponibles para generar recomendaciones. Verifica que existan datos de co-compras.")
    
    # Sección de exportación
    _show_export_section(data_source)
    
def _show_export_section(data_source):
    """Sección de exportación de reportes de co-compras"""
    st.markdown("---")
    st.subheader("📤 Exportar Reporte de Co-compras")
    
    col1, col2, col3 = st.columns(3)
    
    # Obtener todos los datos para exportación
    try:
        metrics_data = get_copurchase_metrics(data_source)
        copurchase_data = get_top_copurchases(data_source, limit=100)  # Más datos para export
        strong_data = get_strongest_product_relationships(data_source, min_confidence=0.3, limit=50)
        
        with col1:
            # CSV Export
            csv_data = _prepare_csv_data(metrics_data, copurchase_data, strong_data)
            st.download_button(
                label="📄 Descargar CSV",
                data=csv_data,
                file_name=f'reporte_copurchases_{data_source.lower()}_{datetime.now().strftime("%Y%m%d")}.csv',
                mime='text/csv'
            )
        
        with col2:
            # Excel Export
            if st.button("📊 Generar Excel"):
                excel_data = _generate_excel_report(metrics_data, copurchase_data, strong_data, data_source)
                st.download_button(
                    label="💾 Descargar Excel",
                    data=excel_data,
                    file_name=f'reporte_copurchases_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx',
                    mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
        
        with col3:
            # PDF Export
            if st.button("📋 Generar PDF"):
                pdf_data = _generate_pdf_report(metrics_data, copurchase_data, strong_data, data_source)
                st.download_button(
                    label="💾 Descargar PDF",
                    data=pdf_data,
                    file_name=f'reporte_copurchases_{data_source.lower()}_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
                    mime='application/pdf'
                )
                
    except Exception as e:
        st.error(f"Error preparando datos para exportación: {str(e)}")

def _prepare_csv_data(metrics_data, copurchase_data, strong_data):
    """Preparar datos consolidados para CSV"""
    
    # Crear un resumen ejecutivo
    summary_lines = ["REPORTE DE CO-COMPRAS DE PRODUCTOS", "="*50, ""]
    
    if not metrics_data.empty:
        metrics = metrics_data.iloc[0]
        summary_lines.extend([
            "MÉTRICAS GENERALES:",
            f"Total Productos: {metrics['total_productos']:,}",
            f"Relaciones de Co-compra: {metrics['total_relaciones_copurchase']:,}",
            f"Productos con Co-compras: {metrics['productos_con_copurchases']:,}",
            f"Frecuencia Promedio: {metrics['frecuencia_promedio']:.2f}",
            f"Frecuencia Máxima: {metrics['frecuencia_maxima']:,}",
            f"Support Promedio: {metrics['support_promedio']:.4f}",
            ""
        ])
    
    # Agregar top co-compras
    if not copurchase_data.empty:
        top_pairs = copurchase_data.head(10)
        summary_lines.append("TOP 10 CO-COMPRAS:")
        for _, row in top_pairs.iterrows():
            summary_lines.append(f"{row['producto1']} + {row['producto2']}: {row['frecuencia']} veces (confidence: {row['confidence_p1_to_p2']:.3f})")
        summary_lines.append("")
    
    # Convertir a CSV string
    csv_content = "\n".join(summary_lines)
    
    # Agregar tabla de datos detallados
    if not copurchase_data.empty:
        csv_content += "\n\nDATOS DETALLADOS DE CO-COMPRAS:\n"
        csv_content += copurchase_data.to_csv(index=False)
    
    if not strong_data.empty:
        csv_content += "\n\nRELACIONES FUERTES:\n"
        csv_content += strong_data.to_csv(index=False)
    
    return csv_content.encode('utf-8')

def _generate_excel_report(metrics_data, copurchase_data, strong_data, data_source):
    """Generar reporte completo en Excel"""
    
    buffer = BytesIO()
    
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        
        # Hoja 1: Resumen Ejecutivo
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            
            summary_data = {
                'Métrica': [
                    'Total de Productos',
                    'Relaciones de Co-compra',
                    'Productos con Co-compras',
                    'Frecuencia Promedio',
                    'Frecuencia Máxima',
                    'Support Promedio',
                    'Support Máximo',
                    'Cobertura (%)',
                    'Fuente de Datos'
                ],
                'Valor': [
                    f"{metrics['total_productos']:,}",
                    f"{metrics['total_relaciones_copurchase']:,}",
                    f"{metrics['productos_con_copurchases']:,}",
                    f"{metrics['frecuencia_promedio']:.2f}",
                    f"{metrics['frecuencia_maxima']:,}",
                    f"{metrics['support_promedio']:.4f}",
                    f"{metrics['support_maximo']:.4f}",
                    f"{(metrics['productos_con_copurchases'] / metrics['total_productos'] * 100):.1f}%" if metrics['total_productos'] > 0 else "0.0%",
                    data_source
                ]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Resumen_Ejecutivo', index=False)
        
        # Hoja 2: Top Co-compras
        if not copurchase_data.empty:
            copurchase_copy = copurchase_data.copy()
            copurchase_copy.columns = ['Producto 1', 'Producto 2', 'Categoría 1', 'Categoría 2', 'Fuente', 'Frecuencia', 'Support', 'Confidence']
            copurchase_copy.to_excel(writer, sheet_name='Top_Copurchases', index=False)
        
        # Hoja 3: Relaciones Fuertes
        if not strong_data.empty:
            strong_copy = strong_data.copy()
            strong_copy = strong_copy[['producto_origen', 'producto_destino', 'frecuencia', 'confidence', 'fuerza_relacion', 'fuente_datos']]
            strong_copy.columns = ['Producto Origen', 'Producto Destino', 'Frecuencia', 'Confidence', 'Fuerza Relación', 'Fuente']
            strong_copy.to_excel(writer, sheet_name='Relaciones_Fuertes', index=False)
    
    return buffer.getvalue()

def _generate_pdf_report(metrics_data, copurchase_data, strong_data, data_source):
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
            alignment=1,  # Center
            textColor=colors.darkblue
        )
        story.append(Paragraph(f"Reporte de Co-compras - {data_source}", title_style))
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
                ['Total de Productos', f"{metrics['total_productos']:,}"],
                ['Relaciones de Co-compra', f"{metrics['total_relaciones_copurchase']:,}"],
                ['Productos con Co-compras', f"{metrics['productos_con_copurchases']:,}"],
                ['Frecuencia Promedio', f"{metrics['frecuencia_promedio']:.2f}"],
                ['Support Promedio', f"{metrics['support_promedio']:.4f}"],
                ['Cobertura', f"{(metrics['productos_con_copurchases'] / metrics['total_productos'] * 100):.1f}%" if metrics['total_productos'] > 0 else "0.0%"]
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
        
        # Top 10 Co-compras
        if not copurchase_data.empty:
            top_copurchases = copurchase_data.head(10)
            
            story.append(Paragraph("🏆 Top 10 Co-compras", styles['Heading2']))
            story.append(Spacer(1, 10))
            
            copurchase_table_data = [['#', 'Producto 1', 'Producto 2', 'Frecuencia', 'Confidence']]
            for i, (_, row) in enumerate(top_copurchases.iterrows(), 1):
                copurchase_table_data.append([
                    str(i),
                    row['producto1'][:25] + '...' if len(row['producto1']) > 25 else row['producto1'],
                    row['producto2'][:25] + '...' if len(row['producto2']) > 25 else row['producto2'],
                    f"{row['frecuencia']:,}",
                    f"{row['confidence_p1_to_p2']:.3f}"
                ])
            
            copurchase_table = Table(copurchase_table_data, colWidths=[0.5*inch, 2*inch, 2*inch, 0.8*inch, 0.7*inch])
            copurchase_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkorange),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightyellow),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8)
            ]))
            
            story.append(copurchase_table)
            story.append(Spacer(1, 30))
        
        # Conclusiones
        story.append(Paragraph("🎯 Conclusiones y Recomendaciones", styles['Heading2']))
        story.append(Spacer(1, 15))
        
        conclusions = []
        
        if not metrics_data.empty:
            metrics = metrics_data.iloc[0]
            coverage_rate = (metrics['productos_con_copurchases'] / metrics['total_productos'] * 100) if metrics['total_productos'] > 0 else 0
            
            conclusions.extend([
                f"• El catálogo incluye {metrics['total_productos']:,} productos totales",
                f"• {metrics['productos_con_copurchases']:,} productos ({coverage_rate:.1f}%) participan en co-compras",
                f"• Se identificaron {metrics['total_relaciones_copurchase']:,} relaciones de co-compra",
                f"• La frecuencia promedio de co-compra es {metrics['frecuencia_promedio']:.2f}"
            ])
            
            # Recomendaciones basadas en datos
            if coverage_rate < 30:
                conclusions.append("• 🔴 Baja cobertura: Revisar estrategias de promoción cruzada")
            elif coverage_rate < 60:
                conclusions.append("• 🟡 Cobertura moderada: Optimizar recomendaciones de productos")
            else:
                conclusions.append("• 🟢 Excelente cobertura: Mantener estrategias de cross-selling")
        
        for conclusion in conclusions:
            story.append(Paragraph(conclusion, styles['Normal']))
            story.append(Spacer(1, 8))
        
        doc.build(story)
        return buffer.getvalue()
        
    except ImportError:
        # Si reportlab no está disponible
        buffer = BytesIO()
        content = f"""
        REPORTE DE CO-COMPRAS - {data_source}
        Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}
        
        Este reporte requiere la librería 'reportlab' para generar PDF.
        Por favor, instale: pip install reportlab
        
        Use la exportación a Excel para obtener un reporte completo.
        """
        buffer.write(content.encode('utf-8'))
        return buffer.getvalue()