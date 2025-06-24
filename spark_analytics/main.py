#!/usr/bin/env python3

import os
import sys
import time
from datetime import datetime
from hive_connection import HiveConnection

# FORZAR FLUSH DE STDOUT PARA DOCKER
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

def print_separator(title):
    """Imprime un separador con título para organizar la salida"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def print_dataframe(df, title, max_rows=20):
    """Imprime un DataFrame de pandas con formato mejorado"""
    print(f"\n{title}")
    print("-" * 60)
    
    if df.empty:
        print("No hay datos disponibles")
        return
    
    # Mostrar información básica
    print(f"Total de registros: {len(df)}")
    
    # Mostrar los datos
    if len(df) > max_rows:
        print(f"Mostrando primeros {max_rows} registros:")
        print(df.head(max_rows).to_string(index=False))
        print(f"... y {len(df) - max_rows} registros más")
    else:
        print(df.to_string(index=False))


def analisis_tendencias_consumo(hive):
    """
    Análisis 1: Tendencias de consumo
    - Evolución de ventas por categoría de producto
    - Productos más populares por período
    - Patrones de consumo por tipo de pedido
    """
    print_separator("ANÁLISIS 1: TENDENCIAS DE CONSUMO")
    
    try:
        # 1.1 Tendencias de consumo por categoría mensual
        print("\n1.1 Evolución de ventas por categoría de producto (mensual)")
        query1 = """
        SELECT 
            dc.nombre_categoria,
            dt.anio,
            dt.mes,
            COUNT(*) as total_ventas,
            CAST(SUM(fdp.subtotal) AS DOUBLE) as ingresos_categoria,
            SUM(fdp.cantidad) as unidades_vendidas,
            CAST(AVG(fdp.precio_unitario) AS DOUBLE) as precio_promedio
        FROM fact_detalle_pedidos fdp
        JOIN dim_tiempo dt ON fdp.tiempo_id = dt.tiempo_id
        JOIN dim_categorias dc ON fdp.categoria_id = dc.categoria_id
        WHERE dc.nombre_categoria IS NOT NULL
        GROUP BY dc.nombre_categoria, dt.anio, dt.mes
        ORDER BY dt.anio DESC, dt.mes DESC, total_ventas DESC
        """
        df1 = hive.query(query1)
        print_dataframe(df1, "Tendencias por Categoría", 15)
        
        # 1.2 Top productos por ingresos anuales
        print("\n1.2 Top 10 productos más vendidos por ingresos")
        query2 = """
        SELECT 
        dt.anio,
        dp.nombre as nombre_producto,
        dc.nombre_categoria,
        COUNT(*) as total_ventas,
        CAST(SUM(fdp.subtotal) AS DOUBLE) as ingresos_totales,
        SUM(fdp.cantidad) as unidades_vendidas
        FROM fact_detalle_pedidos fdp
        JOIN dim_tiempo dt ON fdp.tiempo_id = dt.tiempo_id
        JOIN dim_productos dp ON fdp.id_producto = dp.producto_id
        JOIN dim_categorias dc ON fdp.categoria_id = dc.categoria_id
        GROUP BY dt.anio, dp.nombre, dc.nombre_categoria
        ORDER BY dt.anio DESC, ingresos_totales DESC
        LIMIT 10
        """
        df2 = hive.query(query2)
        print_dataframe(df2, "Top 10 Productos por Ingresos")
        
        # 1.3 Análisis de patrones por tipo de pedido
        print("\n1.3 Patrones de consumo por tipo de pedido")
        query3 = """
        SELECT 
            dt.mes,
            dt.anio,
            SUM(CASE WHEN fp.tipo = 'en restaurante' THEN 1 ELSE 0 END) as pedidos_restaurante,
            SUM(CASE WHEN fp.tipo = 'para recoger' THEN 1 ELSE 0 END) as pedidos_recoger,
            COUNT(*) as total_pedidos,
            ROUND((SUM(CASE WHEN fp.tipo = 'en restaurante' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as pct_restaurante,
            ROUND((SUM(CASE WHEN fp.tipo = 'para recoger' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as pct_recoger,
            CAST(AVG(fp.total_pedido) AS DOUBLE) as ticket_promedio
        FROM fact_pedidos fp
        JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        GROUP BY dt.mes, dt.anio
        ORDER BY dt.anio DESC, dt.mes DESC
        """
        df3 = hive.query(query3)
        print_dataframe(df3, "Patrones por Tipo de Pedido")
        
        # 1.4 Crecimiento de categorías año a año
        print("\n1.4 Crecimiento de categorías de productos")
        query4 = """
        WITH categorias_anuales AS (
            SELECT 
                dc.nombre_categoria,
                dt.anio,
                COUNT(*) as ventas_anuales,
                CAST(SUM(fdp.subtotal) AS DOUBLE) as ingresos_anuales
            FROM fact_detalle_pedidos fdp
            JOIN dim_tiempo dt ON fdp.tiempo_id = dt.tiempo_id
            JOIN dim_categorias dc ON fdp.categoria_id = dc.categoria_id
            WHERE dc.nombre_categoria IS NOT NULL
            GROUP BY dc.nombre_categoria, dt.anio
        ),
        crecimiento AS (
            SELECT 
                nombre_categoria,
                anio,
                ventas_anuales,
                ingresos_anuales,
                LAG(ventas_anuales) OVER (PARTITION BY nombre_categoria ORDER BY anio) as ventas_ano_anterior,
                LAG(ingresos_anuales) OVER (PARTITION BY nombre_categoria ORDER BY anio) as ingresos_ano_anterior
            FROM categorias_anuales
        )
        SELECT 
            nombre_categoria,
            anio,
            ventas_anuales,
            ingresos_anuales,
            ventas_ano_anterior,
            CASE 
                WHEN ventas_ano_anterior IS NOT NULL AND ventas_ano_anterior > 0 THEN
                    ROUND(((ventas_anuales - ventas_ano_anterior) * 100.0 / ventas_ano_anterior), 2)
                ELSE NULL
            END as crecimiento_ventas_pct
        FROM crecimiento
        ORDER BY nombre_categoria, anio
        """
        df4 = hive.query(query4)
        print_dataframe(df4, "Crecimiento por Categorías")
        
    except Exception as e:
        print(f"Error en análisis de tendencias de consumo: {e}")


def analisis_horarios_pico(hive):
    """
    Análisis 2: Horarios pico
    - Distribución de pedidos por hora del día
    - Comparación entre días de semana vs fin de semana
    - Horarios de mayor actividad por provincia
    """
    print_separator("ANÁLISIS 2: HORARIOS PICO")
    
    try:
        # 2.1 Patrones por día de la semana
        print("\n2.1 Actividad por día de la semana")
        query1 = """
        SELECT 
            dt.dia_semana,
            CASE 
                WHEN dt.dia_semana = 1 THEN 'Domingo'
                WHEN dt.dia_semana = 2 THEN 'Lunes'
                WHEN dt.dia_semana = 3 THEN 'Martes'
                WHEN dt.dia_semana = 4 THEN 'Miércoles'
                WHEN dt.dia_semana = 5 THEN 'Jueves'
                WHEN dt.dia_semana = 6 THEN 'Viernes'
                WHEN dt.dia_semana = 7 THEN 'Sábado'
                ELSE 'Desconocido'
            END as nombre_dia,
            dt.es_fin_semana,
            COUNT(fp.id_pedido) as pedidos_totales,
            CAST(SUM(fp.total_pedido) AS DOUBLE) as ingresos_totales,
            CAST(AVG(fp.total_pedido) AS DOUBLE) as ticket_promedio
        FROM dim_tiempo dt
        LEFT JOIN fact_pedidos fp ON dt.tiempo_id = fp.tiempo_id
        GROUP BY dt.dia_semana, dt.es_fin_semana
        HAVING COUNT(fp.id_pedido) > 0
        ORDER BY dt.dia_semana
        """
        df1 = hive.query(query1)
        print_dataframe(df1, "Actividad por Día de Semana")
        
        # 2.2 Comparación fin de semana vs días laborables
        print("\n2.2 Comparación: Fin de semana vs Días laborables")
        query2 = """
        SELECT 
            CASE WHEN dt.es_fin_semana THEN 'Fin de Semana' ELSE 'Días Laborables' END as tipo_dia,
            COUNT(DISTINCT dt.fecha) as dias_analizados,
            COUNT(fp.id_pedido) as pedidos_totales,
            ROUND(COUNT(fp.id_pedido) / COUNT(DISTINCT dt.fecha), 2) as promedio_pedidos_por_dia,
            CAST(SUM(fp.total_pedido) AS DOUBLE) as ingresos_totales,
            CAST(AVG(fp.total_pedido) AS DOUBLE) as ticket_promedio,
            SUM(fp.cantidad_items) as items_totales
        FROM dim_tiempo dt
        LEFT JOIN fact_pedidos fp ON dt.tiempo_id = fp.tiempo_id
        WHERE fp.id_pedido IS NOT NULL
        GROUP BY dt.es_fin_semana
        ORDER BY dt.es_fin_semana
        """
        df2 = hive.query(query2)
        print_dataframe(df2, "Fin de Semana vs Laborables")
        
        # 2.3 Actividad por provincia y tipo de día
        print("\n2.3 Horarios pico por provincia")
        query3 = """
        SELECT 
            fp.provincia_restaurante as provincia,
            CASE WHEN dt.es_fin_semana THEN 'Fin de Semana' ELSE 'Laborables' END as tipo_dia,
            COUNT(fp.id_pedido) as pedidos_totales,
            CAST(SUM(fp.total_pedido) AS DOUBLE) as ingresos_totales,
            COUNT(DISTINCT dt.fecha) as dias_con_actividad
        FROM fact_pedidos fp
        JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        WHERE fp.provincia_restaurante IS NOT NULL
          AND fp.provincia_restaurante != 'Sin Ubicación'
        GROUP BY fp.provincia_restaurante, dt.es_fin_semana
        ORDER BY fp.provincia_restaurante, dt.es_fin_semana
        """
        df3 = hive.query(query3)
        print_dataframe(df3, "Actividad por Provincia y Tipo de Día")
        
        # 2.4 Análisis de estados de pedidos en horarios pico
        print("\n2.4 Eficiencia en horarios pico (estados de pedidos)")
        query4 = """
        SELECT 
            CASE WHEN dt.es_fin_semana THEN 'Fin de Semana' ELSE 'Laborables' END as tipo_dia,
            SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) as entregados,
            SUM(CASE WHEN fp.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN fp.estado = 'en preparacion' THEN 1 ELSE 0 END) as en_preparacion,
            SUM(CASE WHEN fp.estado = 'listo' THEN 1 ELSE 0 END) as listos,
            COUNT(fp.id_pedido) as total,
            ROUND((SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) * 100.0 / COUNT(fp.id_pedido)), 2) as tasa_entrega_pct,
            ROUND((SUM(CASE WHEN fp.estado = 'pendiente' THEN 1 ELSE 0 END) * 100.0 / COUNT(fp.id_pedido)), 2) as tasa_pendientes_pct
        FROM fact_pedidos fp
        JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        GROUP BY dt.es_fin_semana
        ORDER BY dt.es_fin_semana
        """
        df4 = hive.query(query4)
        print_dataframe(df4, "Eficiencia en Horarios Pico")
        
    except Exception as e:
        print(f"Error en análisis de horarios pico: {e}")


def analisis_crecimiento_mensual(hive):
    """
    Análisis 3: Crecimiento mensual
    - Evolución de ingresos mes a mes
    - Crecimiento de usuarios activos
    - Análisis de expansión geográfica
    """
    print_separator("ANÁLISIS 3: CRECIMIENTO MENSUAL")
    
    try:
        # 3.1 Evolución de ingresos y pedidos mensual
        print("\n3.1 Evolución mensual de ingresos y pedidos")
        query1 = """
        WITH metricas_mensuales AS (
            SELECT 
                dt.anio,
                dt.mes,
                COUNT(fp.id_pedido) as pedidos_mes,
                CAST(SUM(fp.total_pedido) AS DOUBLE) as ingresos_mes,
                CAST(AVG(fp.total_pedido) AS DOUBLE) as ticket_promedio_mes,
                SUM(fp.cantidad_items) as items_mes
            FROM fact_pedidos fp
            JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
            GROUP BY dt.anio, dt.mes
        ),
        crecimiento_mensual AS (
            SELECT 
                anio,
                mes,
                pedidos_mes,
                ingresos_mes,
                ticket_promedio_mes,
                items_mes,
                LAG(pedidos_mes) OVER (ORDER BY anio, mes) as pedidos_mes_anterior,
                LAG(ingresos_mes) OVER (ORDER BY anio, mes) as ingresos_mes_anterior
            FROM metricas_mensuales
        )
        SELECT 
            anio,
            mes,
            pedidos_mes,
            ingresos_mes,
            ticket_promedio_mes,
            items_mes,
            pedidos_mes_anterior,
            ingresos_mes_anterior,
            CASE 
                WHEN pedidos_mes_anterior IS NOT NULL AND pedidos_mes_anterior > 0 THEN
                    ROUND(((pedidos_mes - pedidos_mes_anterior) * 100.0 / pedidos_mes_anterior), 2)
                ELSE NULL
            END as crecimiento_pedidos_pct,
            CASE 
                WHEN ingresos_mes_anterior IS NOT NULL AND ingresos_mes_anterior > 0 THEN
                    ROUND(((ingresos_mes - ingresos_mes_anterior) * 100.0 / ingresos_mes_anterior), 2)
                ELSE NULL
            END as crecimiento_ingresos_pct
        FROM crecimiento_mensual
        ORDER BY anio, mes
        """
        df1 = hive.query(query1)
        print_dataframe(df1, "Evolución Mensual de Ingresos")
        
        # 3.2 Crecimiento de actividad por zona geográfica
        print("\n3.2 Expansión geográfica mensual")
        query2 = """
        SELECT 
            dt.anio,
            dt.mes,
            fp.provincia_restaurante as provincia,
            COUNT(DISTINCT CONCAT(fp.id_restaurante, '_', fp.fuente_datos)) as restaurantes_activos,
            COUNT(DISTINCT CONCAT(fp.id_usuario, '_', fp.fuente_datos)) as usuarios_activos,
            COUNT(fp.id_pedido) as total_transacciones,
            CAST(SUM(fp.total_pedido) AS DOUBLE) as volumen_negocio,
            CAST(AVG(fp.total_pedido) AS DOUBLE) as ticket_promedio,
            ROUND((SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) * 100.0 / COUNT(fp.id_pedido)), 2) as tasa_completitud_pct
        FROM fact_pedidos fp
        JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        WHERE fp.provincia_restaurante IS NOT NULL 
          AND fp.provincia_restaurante != 'Sin Ubicación'
        GROUP BY dt.anio, dt.mes, fp.provincia_restaurante
        ORDER BY dt.anio DESC, dt.mes DESC, volumen_negocio DESC
        """
        df2 = hive.query(query2)
        print_dataframe(df2, "Crecimiento por Zona Geográfica", 25)
        
        # 3.3 Análisis de flujos inter-provinciales
        print("\n3.3 Análisis de flujos inter-provinciales")
        query3 = """
        SELECT 
            dt.anio,
            dt.mes,
            CASE 
                WHEN fp.provincia_cliente = fp.provincia_restaurante THEN 'Local'
                WHEN fp.provincia_cliente = 'Sin Ubicación' OR fp.provincia_restaurante = 'Sin Ubicación' THEN 'Sin Info'
                ELSE 'Inter-Provincial'
            END as tipo_flujo,
            COUNT(fp.id_pedido) as pedidos_totales,
            CAST(SUM(fp.total_pedido) AS DOUBLE) as valor_total,
            CAST(AVG(fp.total_pedido) AS DOUBLE) as ticket_promedio,
            COUNT(DISTINCT CONCAT(fp.id_usuario, '_', fp.fuente_datos)) as usuarios_participantes
        FROM fact_pedidos fp
        JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        WHERE fp.provincia_cliente IS NOT NULL 
          AND fp.provincia_restaurante IS NOT NULL
        GROUP BY dt.anio, dt.mes, tipo_flujo
        ORDER BY dt.anio DESC, dt.mes DESC, tipo_flujo
        """
        df3 = hive.query(query3)
        print_dataframe(df3, "Flujos Inter-provinciales")
        
        # 3.4 Consolidado de crecimiento trimestral
        print("\n3.4 Resumen de crecimiento trimestral")
        query4 = """
        WITH trimestral AS (
            SELECT 
                dt.anio,
                dt.trimestre,
                COUNT(fp.id_pedido) as pedidos_trimestre,
                CAST(SUM(fp.total_pedido) AS DOUBLE) as ingresos_trimestre,
                CAST(AVG(fp.total_pedido) AS DOUBLE) as ticket_promedio_trim,
                COUNT(DISTINCT dt.fecha) as dias_activos
            FROM fact_pedidos fp
            JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
            GROUP BY dt.anio, dt.trimestre
        ),
        crecimiento_trim AS (
            SELECT 
                anio,
                trimestre,
                pedidos_trimestre,
                ingresos_trimestre,
                ticket_promedio_trim,
                dias_activos,
                LAG(pedidos_trimestre) OVER (ORDER BY anio, trimestre) as pedidos_trim_anterior,
                LAG(ingresos_trimestre) OVER (ORDER BY anio, trimestre) as ingresos_trim_anterior
            FROM trimestral
        )
        SELECT 
            anio,
            CASE 
                WHEN trimestre = 1 THEN 'Q1 (Ene-Mar)'
                WHEN trimestre = 2 THEN 'Q2 (Abr-Jun)'
                WHEN trimestre = 3 THEN 'Q3 (Jul-Sep)'
                WHEN trimestre = 4 THEN 'Q4 (Oct-Dic)'
                ELSE 'Desconocido'
            END as periodo,
            pedidos_trimestre,
            ingresos_trimestre,
            ticket_promedio_trim,
            dias_activos,
            CASE 
                WHEN pedidos_trim_anterior IS NOT NULL AND pedidos_trim_anterior > 0 THEN
                    ROUND(((pedidos_trimestre - pedidos_trim_anterior) * 100.0 / pedidos_trim_anterior), 2)
                ELSE NULL
            END as crecimiento_pedidos_pct,
            CASE 
                WHEN ingresos_trim_anterior IS NOT NULL AND ingresos_trim_anterior > 0 THEN
                    ROUND(((ingresos_trimestre - ingresos_trim_anterior) * 100.0 / ingresos_trim_anterior), 2)
                ELSE NULL
            END as crecimiento_ingresos_pct
        FROM crecimiento_trim
        ORDER BY anio, trimestre
        """
        df4 = hive.query(query4)
        print_dataframe(df4, "Crecimiento Trimestral")
        
    except Exception as e:
        print(f"Error en análisis de crecimiento mensual: {e}")


def analisis_resumen_ejecutivo(hive):
    """
    Resumen ejecutivo con métricas clave
    """
    print_separator("RESUMEN EJECUTIVO")
    
    try:
        # Métricas generales del negocio
        print("\nMétricas Generales del Negocio")
        query1 = """
        SELECT 
            COUNT(DISTINCT dt.fecha) as dias_con_datos,
            COUNT(fp.id_pedido) as pedidos_totales,
            CAST(SUM(fp.total_pedido) AS DOUBLE) as ingresos_totales,
            CAST(AVG(fp.total_pedido) AS DOUBLE) as ticket_promedio_general,
            SUM(fp.cantidad_items) as items_totales,
            SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) as pedidos_completados,
            ROUND((SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) * 100.0 / COUNT(fp.id_pedido)), 2) as tasa_completitud_global
        FROM fact_pedidos fp
        JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
        """
        df1 = hive.query(query1)
        print_dataframe(df1, "Métricas Generales")
        
        # Top provincias por volumen
        print("\nRanking de Provincias por Volumen de Negocio")
        query2 = """
        SELECT 
            fp.provincia_restaurante as provincia,
            COUNT(fp.id_pedido) as transacciones_totales,
            CAST(SUM(fp.total_pedido) AS DOUBLE) as volumen_total,
            COUNT(DISTINCT CONCAT(fp.id_restaurante, '_', fp.fuente_datos)) as restaurantes_activos,
            COUNT(DISTINCT CONCAT(fp.id_usuario, '_', fp.fuente_datos)) as usuarios_activos,
            CAST(AVG(fp.total_pedido) AS DOUBLE) as ticket_promedio,
            ROUND((SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) * 100.0 / COUNT(fp.id_pedido)), 2) as tasa_completitud_promedio
        FROM fact_pedidos fp
        WHERE fp.provincia_restaurante IS NOT NULL
          AND fp.provincia_restaurante != 'Sin Ubicación'
        GROUP BY fp.provincia_restaurante
        ORDER BY volumen_total DESC
        """
        df2 = hive.query(query2)
        print_dataframe(df2, "Ranking de Provincias")
        
        # Estado actual de reservas
        print("\nAnálisis de Reservas")
        query3 = """
        SELECT 
            COUNT(fr.id_reserva) as reservas_totales,
            SUM(CASE WHEN fr.estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
            SUM(CASE WHEN fr.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN fr.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
            ROUND((SUM(CASE WHEN fr.estado = 'confirmada' THEN 1 ELSE 0 END) * 100.0 / COUNT(fr.id_reserva)), 2) as tasa_confirmacion_promedio
        FROM fact_reservas fr
        """
        df3 = hive.query(query3)
        print_dataframe(df3, "Estado de Reservas")
        
    except Exception as e:
        print(f"Error en resumen ejecutivo: {e}")


def main():
    """Función principal del análisis"""
    print("Iniciando Analytics Service")
    print(f"Fecha y hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Inicializar conexión a Hive
    hive = HiveConnection(max_retries=15, wait_seconds=10)
    
    try:
        # Establecer conexión
        if not hive.connect():
            print("No se pudo establecer conexión con Hive Metastore")
            sys.exit(1)
        
        # Usar la base de datos del warehouse
        hive.use_database("warehouse")
        print("Conectado a warehouse database")
        
        # Ejecutar los tres análisis principales
        analisis_tendencias_consumo(hive)
        analisis_horarios_pico(hive)
        analisis_crecimiento_mensual(hive)
        
        # Resumen ejecutivo
        analisis_resumen_ejecutivo(hive)
        
        print_separator("ANÁLISIS COMPLETADO")
        print("Todos los análisis han sido ejecutados exitosamente")
        print(f"Finalizado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"Error general en el análisis: {e}")
        sys.exit(1)
    
    finally:
        # Cerrar conexión
        hive.close()


if __name__ == "__main__":
    main()
    
    # Mantener el contenedor vivo
    print("\nServicio en espera. Presione Ctrl+C para salir...")
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\nCerrando servicio analytics...")