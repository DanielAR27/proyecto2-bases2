import os
from pyspark.sql import SparkSession


def get_spark_session(app_name="AnalyticsSparkJob"):
    """
    Crear sesión de Spark configurada para el proyecto
    """
    spark = SparkSession.builder \
        .appName(app_name) \
        .config("spark.sql.adaptive.enabled", "true") \
        .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
        .config("spark.jars.packages", "org.postgresql:postgresql:42.7.0") \
        .getOrCreate()
    
    spark.sparkContext.setLogLevel("WARN")  # Menos logs verbosos
    return spark


def get_warehouse_jdbc_props():
    """
    Propiedades JDBC para conectar al Data Warehouse
    """
    return {
        "url": f"jdbc:postgresql://{os.getenv('WAREHOUSE_POSTGRES_HOST')}:{os.getenv('WAREHOUSE_POSTGRES_PORT', 5432)}/{os.getenv('WAREHOUSE_POSTGRES_DB')}",
        "driver": "org.postgresql.Driver",
        "user": os.getenv('WAREHOUSE_POSTGRES_USER'),
        "password": os.getenv('WAREHOUSE_POSTGRES_PASSWORD')
    }


def read_fact_table(spark, table_name):
    """
    Leer tabla de hechos del warehouse
    
    Args:
        spark: SparkSession
        table_name: Nombre de la tabla (ej: "warehouse.fact_pedidos")
    
    Returns:
        DataFrame de Spark
    """
    jdbc_props = get_warehouse_jdbc_props()
    
    return spark.read \
        .format("jdbc") \
        .option("url", jdbc_props["url"]) \
        .option("dbtable", table_name) \
        .option("driver", jdbc_props["driver"]) \
        .option("user", jdbc_props["user"]) \
        .option("password", jdbc_props["password"]) \
        .load()


def write_to_warehouse(df, table_name, mode="overwrite"):
    """
    Escribir DataFrame al warehouse
    
    Args:
        df: DataFrame de Spark
        table_name: Nombre de la tabla destino
        mode: "overwrite", "append", etc.
    """
    jdbc_props = get_warehouse_jdbc_props()
    
    df.write \
        .format("jdbc") \
        .option("url", jdbc_props["url"]) \
        .option("dbtable", table_name) \
        .option("driver", jdbc_props["driver"]) \
        .option("user", jdbc_props["user"]) \
        .option("password", jdbc_props["password"]) \
        .mode(mode) \
        .save()