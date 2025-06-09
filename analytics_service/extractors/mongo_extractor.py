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
            problematic_count = 0
            coordenadas_completas = 0
            coordenadas_parciales = 0
            
            for i, doc in enumerate(cursor):
                fecha_hora = doc.get('fecha_hora')
                
                # Debug detallado de cada pedido (solo primeros 5)
                if i < 5:
                    print(f"🔍 Pedido {i+1}:")
                    print(f"  - id_pedido: {doc.get('id_pedido')}")
                    print(f"  - fecha_hora: {fecha_hora} (tipo: {type(fecha_hora)})")
                    print(f"  - usuario coords: {doc.get('usuario_latitud')}, {doc.get('usuario_longitud')}")
                    print(f"  - restaurante coords: {doc.get('restaurante_latitud')}, {doc.get('restaurante_longitud')}")
                
                # Verificar fecha problemática
                if fecha_hora is None or fecha_hora == '' or str(fecha_hora).lower() == 'null':
                    problematic_count += 1
                    print(f"⚠️ PROBLEMA - Pedido {doc.get('id_pedido', 'unknown')}: fecha_hora = {repr(fecha_hora)}")
                
                # Verificar consistencia de coordenadas
                usuario_lat = doc.get('usuario_latitud')
                usuario_lng = doc.get('usuario_longitud') 
                restaurante_lat = doc.get('restaurante_latitud')
                restaurante_lng = doc.get('restaurante_longitud')
                
                # Contar completitud de coordenadas
                if all(coord is not None for coord in [usuario_lat, usuario_lng, restaurante_lat, restaurante_lng]):
                    coordenadas_completas += 1
                elif any(coord is not None for coord in [usuario_lat, usuario_lng, restaurante_lat, restaurante_lng]):
                    coordenadas_parciales += 1
                
                # CONSISTENCIA: Asegurar tipos correctos
                pedido_data = {
                    'id_pedido': doc.get('id_pedido'),
                    'id_usuario': doc.get('id_usuario'),
                    'id_restaurante': doc.get('id_restaurante'), 
                    'id_repartidor': doc.get('id_repartidor'),
                    'fecha_hora': fecha_hora,  # Sin procesar, tal como viene
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
            
            # REPORTE DE CONSISTENCIA
            print(f"📊 MongoDB pedidos extraídos: {len(pedidos)}")
            print(f"⚠️ Pedidos con fecha problemática: {problematic_count}")
            print(f"🗺️ Coordenadas completas: {coordenadas_completas}/{len(pedidos)}")
            print(f"🗺️ Coordenadas parciales: {coordenadas_parciales}/{len(pedidos)}")
            print(f"🗺️ Sin coordenadas: {len(pedidos) - coordenadas_completas - coordenadas_parciales}/{len(pedidos)}")
            
            # Debug: mostrar las primeras 3 fechas y coordenadas
            if pedidos:
                print("🔍 Primeras 3 fechas a enviar al warehouse:")
                for i, p in enumerate(pedidos[:3]):
                    print(f"  {i+1}. ID {p['id_pedido']}: {repr(p['fecha_hora'])} (tipo: {type(p['fecha_hora'])})")
                    print(f"      Usuario coords: {p.get('usuario_latitud')}, {p.get('usuario_longitud')}")
                    print(f"      Restaurant coords: {p.get('restaurante_latitud')}, {p.get('restaurante_longitud')}")
            
            return pedidos
            
        except Exception as e:
            print(f"❌ Error extrayendo pedidos de MongoDB: {e}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
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
                
            print(f"✅ {len(reservas)} reservas extraídas de MongoDB")
            return reservas
            
        except Exception as e:
            print(f"❌ Error extrayendo reservas de MongoDB: {e}")
            return []
        
    def close(self):
        if self.client:
            self.client.close()
