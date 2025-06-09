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
    
    def close(self):
        if self.conn:
            self.conn.close()