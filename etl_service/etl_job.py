from extractors import PostgresExtractor, MongoExtractor
from connection import HiveConnection
from warehouse import HiveOperations
import traceback
import json


def run_etl():
    """
    Ejecutar proceso ETL completo - VERSIÓN DEBUG PARA PEDIDOS
    1. Extraer datos de PostgreSQL 
    2. Cargar al Data Warehouse Hive usando Spark SQL
    3. Refrescar cubos OLAP
    """
    print(" Iniciando proceso ETL - VERSIÓN DEBUG...")
    print(" Configuración: Solo pedidos de PostgreSQL")
    
    # Inicializar extractores y conexiones
    postgres_extractor = PostgresExtractor()
    mongo_extractor = MongoExtractor()
    # mongo_extractor = MongoExtractor()  # Comentado por ahora
    hive_conn = HiveConnection()
    hive_ops = None
    
    try:
        # === CONECTAR A HIVE ===
        print("\n📡 Conectando a Hive Metastore...")
        if not hive_conn.connect():
            raise Exception("No se pudo conectar a Hive Metastore")
        
        # Obtener sesión de Spark y crear operaciones
        spark_session = hive_conn.get_spark_session()
        hive_ops = HiveOperations(spark_session)
        
        print(" Conexión a Hive establecida")
                
        # === EXTRAER PEDIDOS ===
        print("\n Extrayendo pedidos...")
        
        print("  - Extrayendo pedidos de PostgreSQL...")
        postgres_pedidos = postgres_extractor.extract_pedidos()
        print(f"     {len(postgres_pedidos)} pedidos extraídos de PostgreSQL")
    
        print("  - Extrayendo pedidos de MongoDB...")
        mongo_pedidos = mongo_extractor.extract_pedidos()
        print(f"     {len(mongo_pedidos)} pedidos extraídos de MongoDB")
        
        # Combinar pedidos
        all_pedidos = postgres_pedidos + mongo_pedidos
        print(f"   Total pedidos: {len(all_pedidos)}")
        
        # === EXTRAER RESERVAS ===
        print("\n Extrayendo reservas...")
        
        print("  - Extrayendo reservas de PostgreSQL...")
        postgres_reservas = postgres_extractor.extract_reservas()
        print(f"     {len(postgres_reservas)} reservas extraídas de PostgreSQL")
        
        print("  - Extrayendo reservas de MongoDB...")
        mongo_reservas = mongo_extractor.extract_reservas()
        print(f"     {len(mongo_reservas)} reservas extraídas de MongoDB")
        
        # Combinar reservas
        all_reservas = postgres_reservas + mongo_reservas
        print(f"   Total reservas: {len(all_reservas)}")

        # === EXTRAER DETALLE PEDIDOS ===
        print("\n Extrayendo detalle de pedidos...")
        
        print("  - Extrayendo detalles de pedidos de PostgreSQL...")
        postgres_detalles = postgres_extractor.extract_detalle_pedidos()
        print(f"     {len(postgres_detalles)} detalles extraídos de PostgreSQL")
        
        print("  - Extrayendo detalles de pedidos de MongoDB...")
        mongo_detalles = mongo_extractor.extract_detalle_pedidos()
        print(f"     {len(mongo_detalles)} detalles extraídos de MongoDB")
        
        # Combinar detalles
        all_detalles = postgres_detalles + mongo_detalles
        print(f"   Total detalles de pedidos: {len(all_detalles)}")
        
        # === CARGAR AL WAREHOUSE HIVE ===
        print("\n Cargando datos al warehouse Hive...")
        
        pedidos_procesados = 0
        if all_pedidos:
            print("  - Procesando pedidos...")
            pedidos_procesados = hive_ops.batch_upsert_pedidos(all_pedidos)
            print(f"   {pedidos_procesados} pedidos cargados al warehouse")
        else:
            print("   No hay pedidos para cargar")
        
        reservas_procesadas = 0
        if all_reservas:
            print("  - Procesando reservas...")
            reservas_procesadas = hive_ops.batch_upsert_reservas(all_reservas)
            print(f"   {reservas_procesadas} reservas cargadas al warehouse")
        else:
            print("   No hay reservas para cargar")
        
        detalles_procesados = 0
        if all_detalles:
            print("  - Procesando detalles de pedidos...")
            detalles_procesados = hive_ops.batch_upsert_detalle_pedidos(all_detalles)
            print(f"   {detalles_procesados} detalles de pedidos cargados al warehouse")
        else:
            print("   No hay detalles de pedidos para cargar")
        
        print("\n ETL completado exitosamente!")
        
        return {
            'success': True,
            'pedidos_procesados': pedidos_procesados,
            'reservas_procesadas': reservas_procesadas,
            'detalles_procesados': detalles_procesados,
            'message': 'ETL ejecutado correctamente con Hive'
        }
        
    except Exception as e:
        print(f"\n Error en ETL: {e}")
        print(f" Traceback completo:")
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e),
            'message': 'ETL falló'
        }
        
    finally:
        # Cerrar conexiones
        print("\n Cerrando conexiones...")
        try:
            postgres_extractor.close()
            # mongo_extractor.close()  # Comentado por ahora
            if hive_conn:
                hive_conn.close()
        except Exception as e:
            print(f" Error cerrando conexiones: {e}")


if __name__ == "__main__":
    # Para testing directo
    print("="*60)
    print(" EJECUTANDO ETL EN MODO DEBUG")
    print("="*60)
    
    result = run_etl()
    
    print("\n" + "="*60)
    print(f" RESULTADO FINAL:")
    print(f"   Success: {result.get('success', False)}")
    print(f"   Pedidos procesados: {result.get('pedidos_procesados', 0)}")
    print(f"   Mensaje: {result.get('message', 'Sin mensaje')}")
    if result.get('error'):
        print(f"   Error: {result.get('error')}")
    print("="*60)