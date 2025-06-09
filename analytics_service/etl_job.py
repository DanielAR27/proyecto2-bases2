from extractors import PostgresExtractor, MongoExtractor
from warehouse import WarehouseConnection

def run_etl():
    """
    Ejecutar proceso ETL completo:
    1. Extraer datos de PostgreSQL y MongoDB
    2. Cargar al Data Warehouse usando stored procedures
    3. Refrescar cubos OLAP
    """
    print("🚀 Iniciando proceso ETL...")
    
    # Inicializar extractores y warehouse
    postgres_extractor = PostgresExtractor()
    mongo_extractor = MongoExtractor()
    warehouse = WarehouseConnection()
    
    try:
        # Test warehouse connection
        print("\n📡 Probando conexión al warehouse...")
        if not warehouse.test_connection():
            raise Exception("No se pudo conectar al warehouse")
        
        # === EXTRAER PEDIDOS ===
        print("\n📥 Extrayendo pedidos...")
        
        print("  - Extrayendo pedidos de PostgreSQL...")
        postgres_pedidos = postgres_extractor.extract_pedidos()
        print(f"    ✅ {len(postgres_pedidos)} pedidos extraídos de PostgreSQL")
        
        print("  - Extrayendo pedidos de MongoDB...")
        mongo_pedidos = mongo_extractor.extract_pedidos()
        print(f"    ✅ {len(mongo_pedidos)} pedidos extraídos de MongoDB")
        
        # Combinar pedidos
        all_pedidos = postgres_pedidos + mongo_pedidos
        print(f"  📊 Total pedidos: {len(all_pedidos)}")
        
        # === EXTRAER RESERVAS ===
        print("\n📥 Extrayendo reservas...")
        
        print("  - Extrayendo reservas de PostgreSQL...")
        postgres_reservas = postgres_extractor.extract_reservas()
        print(f"    ✅ {len(postgres_reservas)} reservas extraídas de PostgreSQL")
        
        print("  - Extrayendo reservas de MongoDB...")
        mongo_reservas = mongo_extractor.extract_reservas()
        print(f"    ✅ {len(mongo_reservas)} reservas extraídas de MongoDB")
        
        # Combinar reservas
        all_reservas = postgres_reservas + mongo_reservas
        print(f"  📊 Total reservas: {len(all_reservas)}")
        
        # === CARGAR AL WAREHOUSE ===
        print("\n📤 Cargando datos al warehouse...")
        
        if all_pedidos:
            pedidos_procesados = warehouse.load_pedidos(all_pedidos)
            print(f"  ✅ {pedidos_procesados} pedidos cargados al warehouse")
        else:
            print("  ⚠️ No hay pedidos para cargar")
        
        if all_reservas:
            reservas_procesadas = warehouse.load_reservas(all_reservas)
            print(f"  ✅ {reservas_procesadas} reservas cargadas al warehouse")
        else:
            print("  ⚠️ No hay reservas para cargar")
        
        # === REFRESCAR CUBOS OLAP ===
        print("\n🔄 Refrescando cubos OLAP...")
        cubes_result = warehouse.refresh_cubos()
        
        print("\n🎉 ETL completado exitosamente!")
        
        return {
            'success': True,
            'pedidos_procesados': len(all_pedidos),
            'reservas_procesadas': len(all_reservas),
            'message': 'ETL ejecutado correctamente'
        }
        
    except Exception as e:
        print(f"\n❌ Error en ETL: {e}")
        return {
            'success': False,
            'error': str(e),
            'message': 'ETL falló'
        }
        
    finally:
        # Cerrar conexiones
        print("\n🔌 Cerrando conexiones...")
        postgres_extractor.close()
        mongo_extractor.close()
        warehouse.close()


if __name__ == "__main__":
    # Para testing directo
    result = run_etl()
    print(f"\n📋 Resultado final: {result}")