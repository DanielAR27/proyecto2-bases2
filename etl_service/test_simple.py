from connection import HiveConnection

def test_simple_select():
    """Test simple: solo hacer SELECT de dim_tiempo"""
    print("🧪 Test simple: SELECT de dim_tiempo")
    
    # Crear conexión
    hive_conn = HiveConnection()
    
    try:
        # Conectar
        print("📡 Conectando a Hive...")
        if hive_conn.connect():

            hive_conn.initialize_warehouse()

            print("✅ Conexión establecida")

            hive_conn.use_database("warehouse")
            hive_conn.show_tables("warehouse")
            
            # Primero, insertar un registro para crear archivos físicos
            print("🔧 Creando archivos físicos con INSERT inicial...")
            hive_conn.spark.sql("""
                INSERT INTO dim_tiempo VALUES 
                (1, '2024-01-01', 12, 0, 2024, 1, 1, 1, 2, false, true)
            """)
            print("✅ Registro inicial insertado")
            
            # Hacer SELECT simple
            print("🔍 Ejecutando SELECT * FROM dim_tiempo...")
            result_df = hive_conn.spark.sql("SELECT * FROM dim_tiempo")
            
            # Recoger resultados
            print("📥 Recogiendo resultados...")
            rows = result_df.collect()
            
            print(f"📊 Resultados: {len(rows)} filas")
            
            if rows:
                print("Primeras filas:")
                for i, row in enumerate(rows[:5]):  # Solo primeras 5
                    print(f"  {i+1}. {row}")
            else:
                print("⚠️ Tabla vacía")
                
        else:
            print("❌ No se pudo conectar")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        
    finally:
        hive_conn.close()

if __name__ == "__main__":
    test_simple_select()