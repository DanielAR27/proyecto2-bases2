from pyspark.sql import functions as F
from pyspark.sql.window import Window
from spark.config.spark_session import get_spark_session, read_fact_table, write_to_warehouse


def analizar_tendencias_consumo():
    """
    Análisis de tendencias de consumo usando Spark
    - Productos más vendidos por período
    - Crecimiento de categorías
    - Patrones estacionales
    """
    print(" Iniciando análisis de tendencias de consumo...")
    
    # Crear sesión Spark
    spark = get_spark_session("TendenciasConsumo")
    
    try:
        # Leer datos de fact tables
        print(" Leyendo datos del warehouse...")
        
        fact_detalles = read_fact_table(spark, "warehouse.fact_detalle_pedidos")
        dim_tiempo = read_fact_table(spark, "warehouse.dim_tiempo")
        
        print(f" Cargados {fact_detalles.count()} registros de detalle de pedidos")
        
        # JOIN con dimensión tiempo para análisis temporal
        datos_completos = fact_detalles.alias("fd") \
            .join(dim_tiempo.alias("dt"), "tiempo_id") \
            .select(
                "fd.*",
                "dt.fecha",
                "dt.anio", 
                "dt.mes",
                "dt.trimestre",
                "dt.dia_semana"
            )
        
        # ANÁLISIS 1: Top productos por mes
        print(" Calculando top productos por mes...")
        
        top_productos_mes = datos_completos \
            .groupBy("anio", "mes", "id_producto", "categoria_id") \
            .agg(
                F.sum("cantidad").alias("total_vendido"),
                F.sum("subtotal").alias("ingresos_producto"),
                F.count("*").alias("veces_pedido"),
                F.avg("precio_unitario").alias("precio_promedio")
            ) \
            .withColumn("ranking_mes", 
                F.row_number().over(
                    Window.partitionBy("anio", "mes")
                    .orderBy(F.desc("total_vendido"))
                )
            ) \
            .filter(F.col("ranking_mes") <= 20)  # Top 20 por mes
        
        # ANÁLISIS 2: Crecimiento por categoría
        print(" Calculando crecimiento por categoría...")
        
        crecimiento_categoria = datos_completos \
            .groupBy("anio", "mes", "categoria_id") \
            .agg(
                F.sum("subtotal").alias("ingresos_categoria"),
                F.sum("cantidad").alias("unidades_vendidas"),
                F.countDistinct("id_producto").alias("productos_unicos")
            ) \
            .withColumn("mes_anterior",
                F.lag("ingresos_categoria", 1).over(
                    Window.partitionBy("categoria_id")
                    .orderBy("anio", "mes")
                )
            ) \
            .withColumn("crecimiento_pct",
                F.when(F.col("mes_anterior").isNotNull() & (F.col("mes_anterior") > 0),
                    ((F.col("ingresos_categoria") - F.col("mes_anterior")) / F.col("mes_anterior") * 100)
                ).otherwise(None)
            )
        
        # ANÁLISIS 3: Patrones por día de semana
        print(" Analizando patrones por día de semana...")
        
        patrones_dia_semana = datos_completos \
            .groupBy("dia_semana", "categoria_id") \
            .agg(
                F.avg("subtotal").alias("gasto_promedio"),
                F.sum("cantidad").alias("total_unidades"),
                F.count("*").alias("total_transacciones")
            ) \
            .withColumn("ranking_dia",
                F.row_number().over(
                    Window.partitionBy("dia_semana")
                    .orderBy(F.desc("total_transacciones"))
                )
            )
        
        # Guardar resultados
        print(" Guardando resultados...")
        
        write_to_warehouse(
            top_productos_mes, 
            "warehouse.spark_top_productos_mes",
            mode="overwrite"
        )
        
        write_to_warehouse(
            crecimiento_categoria,
            "warehouse.spark_crecimiento_categoria", 
            mode="overwrite"
        )
        
        write_to_warehouse(
            patrones_dia_semana,
            "warehouse.spark_patrones_dia_semana",
            mode="overwrite"
        )
        
        # Mostrar algunos resultados
        print("\n RESUMEN DE RESULTADOS:")
        print("="*50)
        
        print("\n Top 5 productos del último mes:")
        top_productos_mes \
            .filter(F.col("ranking_mes") <= 5) \
            .orderBy(F.desc("anio"), F.desc("mes"), "ranking_mes") \
            .select("anio", "mes", "id_producto", "total_vendido", "ingresos_producto") \
            .show(5)
        
        print("\n Crecimiento por categoría (últimos registros):")
        crecimiento_categoria \
            .filter(F.col("crecimiento_pct").isNotNull()) \
            .orderBy(F.desc("anio"), F.desc("mes")) \
            .select("anio", "mes", "categoria_id", "crecimiento_pct") \
            .show(10)
        
        print(" Análisis de tendencias completado exitosamente")
        
        return {
            "success": True,
            "message": "Tendencias de consumo analizadas",
            "registros_procesados": fact_detalles.count()
        }
        
    except Exception as e:
        print(f" Error en análisis de tendencias: {e}")
        return {
            "success": False,
            "error": str(e)
        }
        
    finally:
        spark.stop()


if __name__ == "__main__":
    # Para testing directo
    result = analizar_tendencias_consumo()
    print(f"\n Resultado: {result}")