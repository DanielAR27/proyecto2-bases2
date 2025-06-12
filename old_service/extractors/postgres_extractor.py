import os
import psycopg2


class PostgresExtractor:
    def __init__(self):
        self.conn = None
    
    def connect(self):
        self.conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST'),
            port=os.getenv('POSTGRES_PORT'),
            database=os.getenv('POSTGRES_DB'),
            user=os.getenv('POSTGRES_USER'),
            password=os.getenv('POSTGRES_PASSWORD')
        )

    def extract_pedidos(self):
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
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        pedidos = []
        for row in rows:
            pedidos.append({
                'id_pedido': row[0],
                'id_usuario': row[1], 
                'id_restaurante': row[2],
                'id_repartidor': row[3],
                'fecha_hora': row[4],
                'estado': row[5],
                'tipo': row[6],
                'total_pedido': float(row[7]),
                'cantidad_items': row[8],
                'usuario_latitud': row[9],
                'usuario_longitud': row[10],
                'restaurante_latitud': row[11],
                'restaurante_longitud': row[12],
                'fuente_datos': 'postgres'
            })
            
        cursor.close()
        return pedidos    

    def extract_reservas(self):
        if not self.conn:
            self.connect()
            
        cursor = self.conn.cursor()
        
        query = """
        SELECT id_reserva, id_usuario, id_restaurante, 
               fecha_hora, estado
        FROM Reserva
        ORDER BY fecha_hora DESC
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        reservas = []
        for row in rows:
            reservas.append({
                'id_reserva': row[0],
                'id_usuario': row[1],
                'id_restaurante': row[2], 
                'fecha_hora': row[3],
                'estado': row[4],
                'fuente_datos': 'postgres'
            })
            
        cursor.close()
        return reservas
    
    def extract_detalle_pedidos(self):
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
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        detalles = []
        for row in rows:
            detalles.append({
                'id_pedido': row[0],
                'id_producto': row[1],
                'cantidad': row[2],
                'subtotal': float(row[3]),
                'precio_unitario': float(row[4]),
                'nombre_producto': row[5],
                'categoria_producto': row[6],
                'precio_producto': float(row[7]),
                'id_menu': row[8],
                'fecha_hora': row[9],
                'id_usuario': row[10],
                'id_restaurante': row[11], 
                'id_repartidor': row[12],
                'estado_pedido': row[13],
                'tipo_pedido': row[14],
                'usuario_latitud': row[15],
                'usuario_longitud': row[16],
                'restaurante_latitud': row[17],
                'restaurante_longitud': row[18],
                'fuente_datos': 'postgres'
            })
            
        cursor.close()
        print(f"{len(detalles)} detalles de pedidos extraídos de PostgreSQL")
        return detalles
    
    def close(self):
        if self.conn:
            self.conn.close()