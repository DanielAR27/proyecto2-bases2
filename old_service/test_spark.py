import sys
import os
from spark.config.spark_session import get_spark_session, get_warehouse_jdbc_props, read_fact_table


def test_spark_basic():
    """Test básico de Spark"""
    print("Probando configuración básica de Spark...")
    
    try:
        spark = get_spark_session("TestSpark")
        print("Spark session creada correctamente")
        
        # Test básico con datos dummy
        data = [("Alice", 25), ("Bob", 30), ("Charlie", 35)]
        columns = ["name", "age"]
        df = spark.createDataFrame(data, columns)
        
        print(f"DataFrame creado con {df.count()} filas")
        df.show()
        
        spark.stop()
        return True
        
    except Exception as e:
        print(f"Error en test básico: {e}")
        return False


def test_warehouse_connection():
    """Test de conexión al warehouse"""
    print("Probando conexión JDBC al warehouse...")
    
    try:
        props = get_warehouse_jdbc_props()
        print(f"URL: {props['url']}")
        print(f"User: {props['user']}")
        
        spark = get_spark_session("TestWarehouse")
        
        # Probar lectura de tabla simple
        df = spark.read \
            .format("jdbc") \
            .option("url", props["url"]) \
            .option("dbtable", "warehouse.dim_tiempo") \
            .option("driver", props["driver"]) \
            .option("user", props["user"]) \
            .option("password", props["password"]) \
            .load()
        
        count = df.count()
        print(f"Tabla dim_tiempo tiene {count} registros")
        
        if count > 0:
            print("Primeras 5 filas:")
            df.show(5)
        
        spark.stop()
        return True
        
    except Exception as e:
        print(f"Error conectando al warehouse: {e}")
        return False


def test_fact_tables():
    """Test de lectura de fact tables"""
    print("Probando lectura de fact tables...")
    
    try:
        spark = get_spark_session("TestFactTables")
        
        # Test fact_pedidos
        try:
            pedidos_df = read_fact_table(spark, "warehouse.fact_pedidos")
            pedidos_count = pedidos_df.count()
            print(f"fact_pedidos: {pedidos_count} registros")
        except Exception as e:
            print(f"Error leyendo fact_pedidos: {e}")
        
        # Test fact_detalle_pedidos
        try:
            detalles_df = read_fact_table(spark, "warehouse.fact_detalle_pedidos")
            detalles_count = detalles_df.count()
            print(f"fact_detalle_pedidos: {detalles_count} registros")
        except Exception as e:
            print(f"Error leyendo fact_detalle_pedidos: {e}")
        
        # Test fact_reservas
        try:
            reservas_df = read_fact_table(spark, "warehouse.fact_reservas")
            reservas_count = reservas_df.count()
            print(f"fact_reservas: {reservas_count} registros")
        except Exception as e:
            print(f"Error leyendo fact_reservas: {e}")
        
        spark.stop()
        return True
        
    except Exception as e:
        print(f"Error en test de fact tables: {e}")
        return False


def test_environment():
    """Test de variables de entorno"""
    print("Verificando variables de entorno...")
    
    required_vars = [
        'WAREHOUSE_POSTGRES_HOST',
        'WAREHOUSE_POSTGRES_USER',
        'WAREHOUSE_POSTGRES_PASSWORD',
        'WAREHOUSE_POSTGRES_DB'
    ]
    
    missing = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"{var}: OK")
        else:
            print(f"{var}: MISSING")
            missing.append(var)
    
    if missing:
        print(f"Variables faltantes: {missing}")
        return False
    
    return True


def run_all_tests():
    """Ejecutar todos los tests"""
    print("="*50)
    print("TESTS DE SPARK")
    print("="*50)
    
    tests = [
        ("Environment", test_environment),
        ("Spark Basic", test_spark_basic),
        ("Warehouse Connection", test_warehouse_connection),
        ("Fact Tables", test_fact_tables)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"Test {test_name} falló: {e}")
            results[test_name] = False
    
    print("\n" + "="*50)
    print("RESUMEN DE TESTS")
    print("="*50)
    
    for test_name, result in results.items():
        status = "PASS" if result else "FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    print(f"\nResultado general: {'TODOS PASARON' if all_passed else 'ALGUNOS FALLARON'}")
    
    return all_passed


if __name__ == "__main__":
    run_all_tests()