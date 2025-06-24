import os
import psycopg2
from datetime import datetime


class PostgresExtractor:
    def __init__(self):
        self.conn = None
    
    def connect(self):
        try:
            self.conn = psycopg2.connect(
                host=os.getenv('POSTGRES_HOST'),
                port=os.getenv('POSTGRES_PORT'),
                database=os.getenv('POSTGRES_DB'),
                user=os.getenv('POSTGRES_USER'),
                password=os.getenv('POSTGRES_PASSWORD')
            )
            print(" Conexión a PostgreSQL establecida")
        except Exception as e:
            print(f" Error conectando a PostgreSQL: {e}")
            raise

    def extract_pedidos(self):
        """
        Extraer pedidos con manejo mejorado de valores NULL
        """
        if not self.conn:
            self.connect()
            
        cursor = self.conn.cursor()
        
        query = """
        SELECT 
            p.id_pedido,
            p.id_usuario,
            p.id_restaurante,
            p.id_repartidor,
            p.fecha_hora,
            p.estado,
            p.tipo,
            COALESCE(SUM(dp.subtotal), 0) as total_pedido,
            COALESCE(SUM(dp.cantidad), 0) as cantidad_items,
            -- COORDENADAS DE USUARIO
            u.latitud as usuario_latitud,
            u.longitud as usuario_longitud,
            -- COORDENADAS DE RESTAURANTE  
            r.latitud as restaurante_latitud,
            r.longitud as restaurante_longitud
        FROM Pedido p
        LEFT JOIN Detalle_Pedido dp ON p.id_pedido = dp.id_pedido
        LEFT JOIN Usuario u ON p.id_usuario = u.id_usuario
        LEFT JOIN Restaurante r ON p.id_restaurante = r.id_restaurante
        GROUP BY p.id_pedido, p.id_usuario, p.id_restaurante, 
                p.id_repartidor, p.fecha_hora, p.estado, p.tipo,
                u.latitud, u.longitud, r.latitud, r.longitud
        ORDER BY p.fecha_hora DESC
        LIMIT 1000
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        pedidos = []
        for i, row in enumerate(rows):            
            # Crear diccionario del pedido con manejo de NULL
            pedido = {
                'id_pedido': row[0],
                'id_usuario': row[1], 
                'id_restaurante': row[2],
                'id_repartidor': row[3],  # Puede ser NULL
                'fecha_hora': row[4],
                'estado': row[5] if row[5] else 'unknown',
                'tipo': row[6] if row[6] else 'unknown',
                'total_pedido': float(row[7]) if row[7] is not None else 0.0,
                'cantidad_items': row[8] if row[8] is not None else 0,
                'usuario_latitud': float(row[9]) if row[9] is not None else None,
                'usuario_longitud': float(row[10]) if row[10] is not None else None,
                'restaurante_latitud': float(row[11]) if row[11] is not None else None,
                'restaurante_longitud': float(row[12]) if row[12] is not None else None,
                'fuente_datos': 'postgres'
            }
            
            # Validación de fecha_hora
            if pedido['fecha_hora'] is None:
                print(f"     Pedido {pedido['id_pedido']} sin fecha_hora, saltando...")
                continue
            
            # Convertir datetime a string si es necesario
            if isinstance(pedido['fecha_hora'], datetime):
                pedido['fecha_hora'] = pedido['fecha_hora'].isoformat()
            
            pedidos.append(pedido)
        
        cursor.close()         
        return pedidos

    def extract_reservas(self):
        """
        Extraer reservas (para futura implementación)
        """
        if not self.conn:
            self.connect()
            
        cursor = self.conn.cursor()
        
        query = """
        SELECT id_reserva, id_usuario, id_restaurante, 
               fecha_hora, estado
        FROM Reserva
        ORDER BY fecha_hora DESC
        LIMIT 1000
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        reservas = []
        for row in rows:
            reserva = {
                'id_reserva': row[0],
                'id_usuario': row[1],
                'id_restaurante': row[2], 
                'fecha_hora': row[3].isoformat() if row[3] else None,
                'estado': row[4] if row[4] else 'unknown',
                'fuente_datos': 'postgres'
            }
            
            # Validar fecha_hora
            if reserva['fecha_hora'] is None:
                continue
                
            reservas.append(reserva)
            
        cursor.close()
        return reservas
    
    def extract_detalle_pedidos(self):
        """
        Extraer detalles de pedidos (para futura implementación)
        """
        if not self.conn:
            self.connect()
            
        cursor = self.conn.cursor()
        
        query = """
        SELECT 
            -- IDs principales
            dp.id_pedido,
            dp.id_producto,
            
            -- Métricas del detalle
            dp.cantidad,
            dp.subtotal,
            pr.precio as precio_unitario,  -- precio actual del catálogo
            
            -- Info del producto
            pr.nombre as nombre_producto,
            pr.categoria as categoria_producto,
            pr.precio as precio_producto,
            pr.id_menu,
            
            -- Info del pedido (contexto)
            p.fecha_hora,
            p.id_usuario,
            p.id_restaurante,
            p.id_repartidor,
            p.estado as estado_pedido,
            p.tipo as tipo_pedido,
            
            -- Coordenadas para provincias
            u.latitud as usuario_latitud,
            u.longitud as usuario_longitud,
            r.latitud as restaurante_latitud,
            r.longitud as restaurante_longitud
            
        FROM Detalle_Pedido dp
        JOIN Pedido p ON dp.id_pedido = p.id_pedido
        JOIN Producto pr ON dp.id_producto = pr.id_producto
        JOIN Menu m ON pr.id_menu = m.id_menu
        JOIN Restaurante r ON p.id_restaurante = r.id_restaurante
        LEFT JOIN Usuario u ON p.id_usuario = u.id_usuario
        ORDER BY p.fecha_hora DESC, dp.id_pedido, dp.id_producto
        LIMIT 5000
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        detalles = []
        for row in rows:
            detalle = {
                'id_pedido': row[0],
                'id_producto': row[1],
                'cantidad': row[2],
                'subtotal': float(row[3]) if row[3] is not None else 0.0,
                'precio_unitario': float(row[4]) if row[4] is not None else 0.0,
                'nombre_producto': row[5] if row[5] else 'Producto sin nombre',
                'categoria_producto': row[6] if row[6] else 'Sin categoría',
                'precio_producto': float(row[7]) if row[7] is not None else 0.0,
                'id_menu': row[8],
                'fecha_hora': row[9].isoformat() if row[9] else None,
                'id_usuario': row[10],
                'id_restaurante': row[11], 
                'id_repartidor': row[12],  # Puede ser NULL
                'estado_pedido': row[13] if row[13] else 'unknown',
                'tipo_pedido': row[14] if row[14] else 'unknown',
                'usuario_latitud': float(row[15]) if row[15] is not None else None,
                'usuario_longitud': float(row[16]) if row[16] is not None else None,
                'restaurante_latitud': float(row[17]) if row[17] is not None else None,
                'restaurante_longitud': float(row[18]) if row[18] is not None else None,
                'fuente_datos': 'postgres'
            }
            
            # Validar fecha_hora
            if detalle['fecha_hora'] is None:
                continue
                
            detalles.append(detalle)
            
        cursor.close()
        return detalles
    
    def close(self):
        """
        Cerrar conexión a PostgreSQL
        """
        if self.conn:
            try:
                self.conn.close()
                print(" Conexión PostgreSQL cerrada")
            except Exception as e:
                print(f" Error cerrando conexión PostgreSQL: {e}")
            finally:
                self.conn = None