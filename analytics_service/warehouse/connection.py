import os
import psycopg2
import json
from typing import List, Dict, Any


class WarehouseConnection:
    def __init__(self):
        self.conn = None
    
    def connect(self):
        """Conectar al Data Warehouse PostgreSQL"""
        try:
            self.conn = psycopg2.connect(
                host=os.getenv('WAREHOUSE_POSTGRES_HOST'),
                port=os.getenv('WAREHOUSE_POSTGRES_PORT', 5432),
                database=os.getenv('WAREHOUSE_POSTGRES_DB'),
                user=os.getenv('WAREHOUSE_POSTGRES_USER'),
                password=os.getenv('WAREHOUSE_POSTGRES_PASSWORD')
            )
            self.conn.autocommit = True  # Para stored procedures
            print("✅ Conectado al Data Warehouse")
        except Exception as e:
            print(f"❌ Error conectando al warehouse: {e}")
            raise
    
    def load_pedidos(self, pedidos: List[Dict[str, Any]]) -> int:
        """Cargar pedidos con debug"""
        if not self.conn:
            self.connect()
        
        try:
            # DEBUG: Ver qué datos están llegando
            print(f"🔍 Warehouse recibió {len(pedidos)} pedidos")
            if pedidos:
                print("🔍 Primeras 3 fechas recibidas en warehouse:")
                for i, p in enumerate(pedidos[:3]):
                    fecha = p.get('fecha_hora')
                    print(f"  {i+1}. ID {p.get('id_pedido')}: {repr(fecha)} (tipo: {type(fecha)})")
            
            # Convertir a JSON para stored procedure
            pedidos_json = json.dumps(pedidos, default=str)
            
            # DEBUG: Ver cómo queda el JSON
            print(f"🔍 JSON sample (primeros 200 chars): {pedidos_json[:200]}...")
            
            cursor = self.conn.cursor()
            cursor.execute(
                "SELECT warehouse.batch_upsert_pedidos(%s)",
                (pedidos_json,)
            )
            
            result = cursor.fetchone()[0]
            cursor.close()
            
            print(f"✅ Procesados {result} pedidos en warehouse")
            return result
            
        except Exception as e:
            print(f"❌ Error cargando pedidos: {e}")
            raise
    
    def load_reservas(self, reservas: List[Dict[str, Any]]) -> int:
        """
        Cargar reservas usando stored procedure batch_upsert_reservas
        
        Args:
            reservas: Lista de diccionarios con datos de reservas
            
        Returns:
            Número de reservas procesadas
        """
        if not self.conn:
            self.connect()
        
        try:
            # Convertir a JSON para stored procedure
            reservas_json = json.dumps(reservas, default=str)
            
            cursor = self.conn.cursor()
            cursor.execute(
                "SELECT warehouse.batch_upsert_reservas(%s)",
                (reservas_json,)
            )
            
            result = cursor.fetchone()[0]
            cursor.close()
            
            print(f"✅ Procesadas {result} reservas en warehouse")
            return result
            
        except Exception as e:
            print(f"❌ Error cargando reservas: {e}")
            raise
    
    def refresh_cubos(self) -> str:
        """
        Refrescar todos los cubos OLAP usando stored procedure
        
        Returns:
            Resultado del refresh de cubos
        """
        if not self.conn:
            self.connect()
        
        try:
            cursor = self.conn.cursor()
            cursor.execute("SELECT warehouse.refresh_all_cubos()")
            
            result = cursor.fetchone()[0]
            cursor.close()
            
            print("✅ Cubos OLAP refrescados:")
            print(result)
            return result
            
        except Exception as e:
            print(f"❌ Error refrescando cubos: {e}")
            raise
    
    def test_connection(self) -> bool:
        """
        Probar la conexión al warehouse
        
        Returns:
            True si la conexión es exitosa
        """
        try:
            if not self.conn:
                self.connect()
            
            cursor = self.conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            
            print("✅ Warehouse connection test: OK")
            return True
            
        except Exception as e:
            print(f"❌ Warehouse connection test failed: {e}")
            return False
    
    def close(self):
        """Cerrar conexión al warehouse"""
        if self.conn:
            self.conn.close()
            print("🔌 Conexión al warehouse cerrada")