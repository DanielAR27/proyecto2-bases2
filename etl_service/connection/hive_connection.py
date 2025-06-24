import time
from pyspark.sql import SparkSession

class HiveConnection:
    def __init__(self, max_retries=10, wait_seconds=10):
        self.max_retries = max_retries
        self.wait_seconds = wait_seconds
        self.spark = None
    
    def connect(self):
        """Establece conexión con Hive Metastore con reintentos automáticos"""
        print("⏳ Iniciando intentos de conexión a Hive Metastore...")

        for attempt in range(1, self.max_retries + 1):
            try:
                self.spark = SparkSession.builder \
                    .appName("HiveConnectionRetry") \
                    .config("spark.sql.catalogImplementation", "hive") \
                    .config("spark.hadoop.hive.metastore.uris", "thrift://hive-metastore:9083") \
                    .config("spark.sql.warehouse.dir", "/opt/hive/data/warehouse") \
                    .config("spark.hadoop.hive.metastore.warehouse.dir", "/opt/hive/data/warehouse") \
                    .enableHiveSupport() \
                    .getOrCreate()

                # Ocultar logs molestos
                self.spark.sparkContext.setLogLevel("ERROR")

                print(" Conexión establecida con Hive Metastore.")
                return True

            except Exception as e:
                print(f" Intento {attempt} fallido: {str(e).splitlines()[0]}")
                if attempt < self.max_retries:
                    print(f" Reintentando en {self.wait_seconds} segundos...")
                    time.sleep(self.wait_seconds)
                else:
                    print(" No se pudo conectar al Hive Metastore después de varios intentos.")
                    raise
        
        return False
    
    def show_databases(self):
        """Muestra las bases de datos disponibles"""
        if not self.spark:
            raise Exception("No hay conexión activa. Llama a connect() primero.")
        
        print(" Bases de datos existentes:")
        self.spark.sql("SHOW DATABASES").show()
    
    def show_tables(self, database="default"):
        """Muestra las tablas de una base de datos específica"""
        if not self.spark:
            raise Exception("No hay conexión activa. Llama a connect() primero.")
        
        print(f" Tablas en la base de datos '{database}':")
        self.spark.sql(f"USE {database}")
        self.spark.sql("SHOW TABLES").show()
    
    
    def use_database(self, db_name):
        """Cambia a una base de datos específica"""
        if not self.spark:
            raise Exception("No hay conexión activa. Llama a connect() primero.")
        
        print(f" Cambiando a base de datos '{db_name}'...")
        self.spark.sql(f"USE {db_name}")
    
    def close(self):
        """Cierra la conexión con Spark"""
        if self.spark:
            self.spark.stop()
            self.spark = None
            print(" Conexión cerrada correctamente.")
    
    def get_spark_session(self):
        """Retorna la sesión de Spark activa"""
        return self.spark