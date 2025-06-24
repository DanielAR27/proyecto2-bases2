import os
from pymongo import MongoClient


class MongoExtractor:
    def __init__(self):
        self.client = None
        self.db = None
    
    def connect(self):
        self.client = MongoClient(os.getenv('MONGO_URI'))
        self.db = self.client.get_default_database()
    

    def extract_pedidos(self):
        if self.db is None:
            self.connect()
            
        try:
            # Pipeline con $lookup para coordenadas
            pipeline = [
                # 1. JOIN con usuarios para coordenadas
                {
                    '$lookup': {
                        'from': 'usuarios',
                        'localField': 'id_usuario',
                        'foreignField': 'id_usuario',
                        'as': 'usuario_info'
                    }
                },
                # 2. JOIN con restaurantes para coordenadas  
                {
                    '$lookup': {
                        'from': 'restaurantes',
                        'localField': 'id_restaurante', 
                        'foreignField': 'id_restaurante',
                        'as': 'restaurante_info'
                    }
                },
                # 3. Calcular campos derivados
                {
                    '$addFields': {
                        'total_pedido': {'$sum': '$detalles.subtotal'},
                        'cantidad_items': {'$sum': '$detalles.cantidad'},
                        # Extraer coordenadas del primer elemento del array (o null si vacío)
                        'usuario_latitud': {'$arrayElemAt': ['$usuario_info.latitud', 0]},
                        'usuario_longitud': {'$arrayElemAt': ['$usuario_info.longitud', 0]},
                        'restaurante_latitud': {'$arrayElemAt': ['$restaurante_info.latitud', 0]},
                        'restaurante_longitud': {'$arrayElemAt': ['$restaurante_info.longitud', 0]}
                    }
                },
                # 4. Proyectar solo campos necesarios (optimización)
                {
                    '$project': {
                        'id_pedido': 1,
                        'id_usuario': 1,
                        'id_restaurante': 1,
                        'id_repartidor': 1,
                        'fecha_hora': 1,
                        'estado': 1,
                        'tipo': 1,
                        'total_pedido': 1,
                        'cantidad_items': 1,
                        'usuario_latitud': 1,
                        'usuario_longitud': 1,
                        'restaurante_latitud': 1,
                        'restaurante_longitud': 1,
                        '_id': 0  # Excluir _id para eficiencia
                    }
                },
                # 5. Ordenar por fecha
                {'$sort': {'fecha_hora': -1}}
            ]
            
            cursor = self.db.pedidos.aggregate(pipeline)
            
            pedidos = []
            
            for doc in cursor:
                # Validar datos críticos
                if doc.get('fecha_hora') is None:
                    continue
                
                # Verificar consistencia de coordenadas
                usuario_lat = doc.get('usuario_latitud')
                usuario_lng = doc.get('usuario_longitud') 
                restaurante_lat = doc.get('restaurante_latitud')
                restaurante_lng = doc.get('restaurante_longitud')
                
                
                # CONSISTENCIA: Asegurar tipos correctos
                pedido_data = {
                    'id_pedido': doc.get('id_pedido'),
                    'id_usuario': doc.get('id_usuario'),
                    'id_restaurante': doc.get('id_restaurante'), 
                    'id_repartidor': doc.get('id_repartidor'),
                    'fecha_hora': doc.get('fecha_hora'),  # Sin procesar, tal como viene
                    'estado': doc.get('estado'),
                    'tipo': doc.get('tipo'),
                    'total_pedido': float(doc.get('total_pedido', 0)),
                    'cantidad_items': int(doc.get('cantidad_items', 0)),
                    # COORDENADAS: Convertir a float o mantener None
                    'usuario_latitud': float(usuario_lat) if usuario_lat is not None else None,
                    'usuario_longitud': float(usuario_lng) if usuario_lng is not None else None,
                    'restaurante_latitud': float(restaurante_lat) if restaurante_lat is not None else None,
                    'restaurante_longitud': float(restaurante_lng) if restaurante_lng is not None else None,
                    'fuente_datos': 'mongo'
                }
                
                pedidos.append(pedido_data)
            
            return pedidos
            
        except Exception as e:
            print(f"Error extrayendo pedidos de MongoDB: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return []

    def extract_reservas(self):
        if self.db is None:
            self.connect()
            
        try:
            cursor = self.db.reservas.find().sort('fecha_hora', -1)
            
            reservas = []
            for doc in cursor:
                reservas.append({
                    'id_reserva': doc.get('id_reserva'),
                    'id_usuario': doc.get('id_usuario'),
                    'id_restaurante': doc.get('id_restaurante'),
                    'fecha_hora': doc.get('fecha_hora'),
                    'estado': doc.get('estado'),
                    'fuente_datos': 'mongo'
                })
                
            return reservas
            
        except Exception as e:
            print(f"Error extrayendo reservas de MongoDB: {e}")
            return []
        
    def extract_detalle_pedidos(self):
        if self.db is None:
            self.connect()
            
        try:
            pipeline = [
                # 1. Desenrollar el array de detalles (1 doc por producto)
                {'$unwind': '$detalles'},
                
                # 2. JOIN con productos para obtener info del catálogo
                {
                    '$lookup': {
                        'from': 'productos',
                        'localField': 'detalles.id_producto',
                        'foreignField': 'id_producto',
                        'as': 'producto_info'
                    }
                },
                
                # 3. JOIN con usuarios para coordenadas
                {
                    '$lookup': {
                        'from': 'usuarios',
                        'localField': 'id_usuario',
                        'foreignField': 'id_usuario',
                        'as': 'usuario_info'
                    }
                },
                
                # 4. JOIN con restaurantes para coordenadas
                {
                    '$lookup': {
                        'from': 'restaurantes',
                        'localField': 'id_restaurante',
                        'foreignField': 'id_restaurante',
                        'as': 'restaurante_info'
                    }
                },
                
                # 5. Calcular campos derivados
                {
                    '$addFields': {
                        # Info del producto (primer elemento del lookup)
                        'nombre_producto': {'$arrayElemAt': ['$producto_info.nombre', 0]},
                        'categoria_producto': {'$arrayElemAt': ['$producto_info.categoria', 0]},
                        'precio_producto': {'$arrayElemAt': ['$producto_info.precio', 0]},
                        'id_menu': {'$arrayElemAt': ['$producto_info.id_menu', 0]},
                        
                        # Coordenadas
                        'usuario_latitud': {'$arrayElemAt': ['$usuario_info.latitud', 0]},
                        'usuario_longitud': {'$arrayElemAt': ['$usuario_info.longitud', 0]},
                        'restaurante_latitud': {'$arrayElemAt': ['$restaurante_info.latitud', 0]},
                        'restaurante_longitud': {'$arrayElemAt': ['$restaurante_info.longitud', 0]},
                        
                        # Calcular precio unitario (subtotal / cantidad)
                        'precio_unitario': {
                            '$cond': {
                                'if': {'$gt': ['$detalles.cantidad', 0]},
                                'then': {'$divide': ['$detalles.subtotal', '$detalles.cantidad']},
                                'else': 0
                            }
                        }
                    }
                },
                
                # 6. Proyectar campos finales
                {
                    '$project': {
                        'id_pedido': 1,
                        'id_producto': '$detalles.id_producto',
                        'cantidad': '$detalles.cantidad',
                        'subtotal': '$detalles.subtotal',
                        'precio_unitario': 1,
                        'nombre_producto': 1,
                        'categoria_producto': 1,
                        'precio_producto': 1,
                        'id_menu': 1,
                        'fecha_hora': 1,
                        'id_usuario': 1,
                        'id_restaurante': 1,
                        'id_repartidor': 1,
                        'estado_pedido': '$estado',
                        'tipo_pedido': '$tipo',
                        'usuario_latitud': 1,
                        'usuario_longitud': 1,
                        'restaurante_latitud': 1,
                        'restaurante_longitud': 1,
                        '_id': 0
                    }
                },
                
                # 7. Ordenar
                {'$sort': {'fecha_hora': -1, 'id_pedido': 1}}
            ]
            
            cursor = self.db.pedidos.aggregate(pipeline)
            
            detalles = []
            for doc in cursor:
                # Validar datos críticos
                if doc.get('fecha_hora') is None:
                    continue
                    
                detalle_data = {
                    'id_pedido': doc.get('id_pedido'),
                    'id_producto': doc.get('id_producto'),
                    'cantidad': int(doc.get('cantidad', 0)),
                    'subtotal': float(doc.get('subtotal', 0)),
                    'precio_unitario': float(doc.get('precio_unitario', 0)),
                    'nombre_producto': doc.get('nombre_producto'),
                    'categoria_producto': doc.get('categoria_producto'),
                    'precio_producto': float(doc.get('precio_producto', 0)) if doc.get('precio_producto') else None,
                    'id_menu': doc.get('id_menu'),
                    'fecha_hora': doc.get('fecha_hora'),
                    'id_usuario': doc.get('id_usuario'),
                    'id_restaurante': doc.get('id_restaurante'),
                    'id_repartidor': doc.get('id_repartidor'),
                    'estado_pedido': doc.get('estado_pedido'),
                    'tipo_pedido': doc.get('tipo_pedido'),
                    'usuario_latitud': float(doc.get('usuario_latitud')) if doc.get('usuario_latitud') is not None else None,
                    'usuario_longitud': float(doc.get('usuario_longitud')) if doc.get('usuario_longitud') is not None else None,
                    'restaurante_latitud': float(doc.get('restaurante_latitud')) if doc.get('restaurante_latitud') is not None else None,
                    'restaurante_longitud': float(doc.get('restaurante_longitud')) if doc.get('restaurante_longitud') is not None else None,
                    'fuente_datos': 'mongo'
                }
                
                detalles.append(detalle_data)
            
            return detalles
            
        except Exception as e:
            print(f"Error extrayendo detalles de pedidos de MongoDB: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return []
        
    def close(self):
        if self.client:
            self.client.close()
