#!/usr/bin/env python3
import time
from pyhive import hive

def wait_for_hive(host='hive', port=10000, max_retries=30):
    """Espera a que Hive esté listo para aceptar conexiones"""
    print(f"Esperando a que Hive esté disponible en {host}:{port}...")
    
    for attempt in range(max_retries):
        try:
            # Intentar conexión simple sin autenticación
            conn = hive.Connection(
                host=host,
                port=port,
                username='hive',
                auth='NONE',
                configuration={'hive.server2.authentication': 'NONE'}
            )
            cursor = conn.cursor()
            cursor.execute("SHOW DATABASES")
            cursor.fetchall()
            cursor.close()
            conn.close()
            print("Hive está listo!")
            return True
        except Exception as e:
            print(f"Intento {attempt + 1}/{max_retries}: Esperando que Hive inicie...")
            if attempt < max_retries - 1:
                time.sleep(5)
    
    return False

def test_connection():
    """Prueba básica de conexión"""
    try:
        print("\nProbando conexión básica...")
        conn = hive.Connection(
            host='hive',
            port=10000,
            username='hive',
            auth='NONE'
        )
        cursor = conn.cursor()
        
        # Mostrar bases de datos existentes
        cursor.execute("SHOW DATABASES")
        databases = cursor.fetchall()
        print(f"✓ Bases de datos existentes: {[db[0] for db in databases]}")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error en conexión básica: {str(e)}")
        return False

def create_sample_data():
    """Crea una tabla de ejemplo e inserta algunos datos"""
    try:
        # Establecer conexión
        print("\nConectando a Hive para crear datos de ejemplo...")
        conn = hive.Connection(
            host='hive',
            port=10000,
            username='hive',
            auth='NONE'
        )
        cursor = conn.cursor()
        print("✓ Conexión establecida con éxito!")
        
        # Crear base de datos si no existe
        print("\nVerificando base de datos de prueba...")
        cursor.execute("SHOW DATABASES LIKE 'test_db'")
        if cursor.fetchone():
            print("Volumen sirve - La base de datos 'test_db' ya existe!")
            cursor.execute("USE test_db")
            cursor.execute("SHOW TABLES LIKE 'empleados'")
            if cursor.fetchone():
                print("La tabla 'empleados' también persiste en el volumen!")
                cursor.execute("SELECT COUNT(*) FROM empleados")
                count = cursor.fetchone()[0]
                print(f"Encontrados {count} registros existentes en la tabla")
        else:
            print("Primera ejecución - Creando base de datos 'test_db'...")
            cursor.execute("CREATE DATABASE test_db")
            cursor.execute("USE test_db")
            print("Base de datos 'test_db' creada")
        
        # Verificar si la tabla existe
        print("\nVerificando tabla 'empleados'...")
        cursor.execute("SHOW TABLES LIKE 'empleados'")
        if cursor.fetchone():
            print("Volumen sirve - La tabla 'empleados' ya existe!")
            cursor.execute("SELECT COUNT(*) FROM empleados")
            count = cursor.fetchone()[0]
            print(f"ℹLa tabla tiene {count} registros")
            
            # Mostrar los datos existentes
            print("\nDatos existentes en la tabla:")
            cursor.execute("SELECT * FROM empleados ORDER BY id")
            print("-" * 60)
            print(f"{'ID':<5} {'Nombre':<20} {'Departamento':<15} {'Salario':<10}")
            print("-" * 60)
            
            rows = cursor.fetchall()
            for row in rows:
                print(f"{row[0]:<5} {row[1]:<20} {row[2]:<15} ${row[3]:,.2f}")
        else:
            print("Primera ejecución - Creando tabla 'empleados'...")
            create_table_query = """
            CREATE TABLE empleados (
                id INT,
                nombre STRING,
                departamento STRING,
                salario DOUBLE
            )
            STORED AS TEXTFILE
            """
            cursor.execute(create_table_query)
            print("✓ Tabla 'empleados' creada exitosamente")
            
            # Insertar datos solo si es la primera vez
            print("\nInsertando datos de ejemplo...")
            datos = [
                (1, 'Juan Pérez', 'Ventas', 45000.00),
                (2, 'María García', 'IT', 60000.00),
                (3, 'Carlos López', 'RRHH', 40000.00),
                (4, 'Ana Martínez', 'IT', 65000.00),
                (5, 'Pedro Rodríguez', 'Ventas', 42000.00)
            ]
            
            for dato in datos:
                query = f"INSERT INTO empleados VALUES ({dato[0]}, '{dato[1]}', '{dato[2]}', {dato[3]})"
                cursor.execute(query)
                print(f"  + Insertado: {dato}")
            
            print("✓ Datos insertados correctamente")
        
        # Consultar datos
        print("\nConsultando datos insertados...")
        cursor.execute("SELECT * FROM empleados ORDER BY id")
        
        print("\nContenido de la tabla 'empleados':")
        print("-" * 60)
        print(f"{'ID':<5} {'Nombre':<20} {'Departamento':<15} {'Salario':<10}")
        print("-" * 60)
        
        rows = cursor.fetchall()
        for row in rows:
            print(f"{row[0]:<5} {row[1]:<20} {row[2]:<15} ${row[3]:,.2f}")
        
        # Consulta agregada
        print("\nEstadísticas por departamento:")
        cursor.execute("""
            SELECT 
                departamento,
                COUNT(*) as num_empleados,
                AVG(salario) as salario_promedio
            FROM empleados
            GROUP BY departamento
            ORDER BY departamento
        """)
        
        print("-" * 50)
        print(f"{'Departamento':<15} {'Empleados':<12} {'Salario Promedio':<15}")
        print("-" * 50)
        
        rows = cursor.fetchall()
        for row in rows:
            print(f"{row[0]:<15} {row[1]:<12} ${row[2]:,.2f}")
        
        # Mostrar información adicional
        print("\nInformación adicional:")
        cursor.execute("DESCRIBE empleados")
        print("\nEstructura de la tabla:")
        for col in cursor.fetchall():
            print(f"  - {col[0]}: {col[1]}")
        
        # Cerrar conexión
        cursor.close()
        conn.close()
        print("\n✓ Conexión cerrada correctamente")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def main():
    print("🚀 Iniciando cliente PyHive...")
    print("=" * 60)
    
    # Esperar a que Hive esté listo
    if not wait_for_hive():
        print("No se pudo conectar a Hive después de varios intentos")
        return
    
    # Probar conexión básica
    if not test_connection():
        print("La conexión básica falló")
        return
    
    # Crear datos de ejemplo
    try:
        create_sample_data()
        print("\n" + "=" * 60)
        print("¡Proceso completado exitosamente!")
        print("=" * 60)
    except Exception as e:
        print(f"\nError durante la ejecución: {str(e)}")

if __name__ == "__main__":
    main()