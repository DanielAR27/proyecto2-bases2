from pyspark.sql import SparkSession
from datetime import datetime
import builtins


class HiveOperations:
    def __init__(self, spark_session):
        self.spark = spark_session
        self.tiempo_cache = {}  # Cache simple para tiempo_ids
        
    def get_or_create_tiempo_id(self, fecha_hora):
        """
        Obtener o crear tiempo_id con cache básico
        """
        if not fecha_hora:
            raise ValueError("fecha_hora no puede ser None")
            
        # Extraer componentes de fecha
        if isinstance(fecha_hora, str):
            fecha_hora = datetime.fromisoformat(fecha_hora.replace('Z', '+00:00'))
        
        fecha_solo = fecha_hora.date()
        hora_solo = fecha_hora.hour
        minuto_solo = fecha_hora.minute
        
        # Crear clave de cache
        cache_key = f"{fecha_solo}_{hora_solo}_{minuto_solo}"
        
        # Verificar cache primero
        if cache_key in self.tiempo_cache:
            return self.tiempo_cache[cache_key]
        
        anio = fecha_hora.year
        mes = fecha_hora.month
        dia = fecha_hora.day
        trimestre = (mes - 1) // 3 + 1
        dia_semana = fecha_hora.weekday() + 1
        es_fin_semana = dia_semana in [6, 7]
        es_horario_pico = hora_solo in range(11, 15) or hora_solo in range(18, 22)
        
        # Crear tiempo_id único
        tiempo_id = int(fecha_hora.timestamp())
        
        # Verificar si ya existe
        existing_query = f"""
        SELECT tiempo_id FROM warehouse.dim_tiempo 
        WHERE fecha = '{fecha_solo}' AND hora = {hora_solo} AND minuto = {minuto_solo}
        LIMIT 1
        """
        
        try:
            existing_df = self.spark.sql(existing_query)
            if existing_df.count() > 0:
                existing_tiempo_id = existing_df.collect()[0][0]
                self.tiempo_cache[cache_key] = existing_tiempo_id
                return existing_tiempo_id
        except Exception:
            pass
        
        # Si no existe, insertarlo
        insert_query = f"""
        INSERT INTO warehouse.dim_tiempo 
        VALUES ({tiempo_id}, '{fecha_solo}', {hora_solo}, {minuto_solo}, {anio}, {mes}, {dia}, {trimestre}, {dia_semana}, {es_fin_semana}, {es_horario_pico})
        """
        
        try:
            self.spark.sql(insert_query)
            self.tiempo_cache[cache_key] = tiempo_id
            return tiempo_id
        except Exception:
            # Si falla, intentar obtener el existente
            try:
                existing_df = self.spark.sql(existing_query)
                if existing_df.count() > 0:
                    existing_tiempo_id = existing_df.collect()[0][0]
                    self.tiempo_cache[cache_key] = existing_tiempo_id
                    return existing_tiempo_id
            except Exception:
                pass
            
            # Como último recurso
            self.tiempo_cache[cache_key] = tiempo_id
            return tiempo_id

    def get_provincia_from_coords(self, lat, lng):
        """
        Mapear coordenadas a provincia de Costa Rica
        """
        if lat is None or lng is None:
            return 'Sin Ubicación'
        
        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return 'Sin Ubicación'
        
        # Rangos de provincias de Costa Rica
        if 9.6 <= lat <= 10.1 and -85.0 <= lng <= -84.0:
            return 'San José'
        elif 9.7 <= lat <= 10.2 and -84.4 <= lng <= -83.6:
            return 'Cartago'
        elif 9.9 <= lat <= 10.5 and -84.6 <= lng <= -84.0:
            return 'Heredia'
        elif 10.0 <= lat <= 10.9 and -85.0 <= lng <= -84.1:
            return 'Alajuela'
        elif 10.2 <= lat <= 11.2 and -86.0 <= -84.5:
            return 'Guanacaste'
        elif 8.5 <= lat <= 11.0 and -85.9 <= lng <= -84.4:
            return 'Puntarenas'
        elif 8.5 <= lat <= 11.2 and -84.2 <= lng <= -82.5:
            return 'Limón'
        else:
            return 'Sin Ubicación'

    def _get_or_create_categoria_id(self, categoria_nombre):
        """
        Obtener o crear categoria_id con manejo de categorías en Hive
        """
        if not categoria_nombre or categoria_nombre.strip() == '':
            categoria_nombre = 'Especialidad'
        
        # Verificar si la categoría ya existe
        check_query = f"""
        SELECT categoria_id 
        FROM warehouse.dim_categorias 
        WHERE nombre_categoria = {self.safe_sql_value(categoria_nombre, True)}
        LIMIT 1
        """
        
        try:
            existing_df = self.spark.sql(check_query)
            if existing_df.count() > 0:
                return existing_df.collect()[0][0]
        except Exception:
            pass
        
        # Si no existe, crear nueva categoría
        categoria_id = abs(hash(categoria_nombre)) % 1000000  # Generar ID único
        
        try:
            insert_query = f"""
            INSERT INTO warehouse.dim_categorias
            (categoria_id, nombre_categoria)
            VALUES (
                {self.safe_sql_value(categoria_id)},
                {self.safe_sql_value(categoria_nombre, True)}
            )
            """
            
            self.spark.sql(insert_query)
        except Exception as e:
            print(f"️ Error insertando categoría {categoria_nombre}: {e}")
        
        return categoria_id

    def add_producto(self, id_producto, nombre, categoria, precio, id_menu, id_restaurante, fuente_datos):
        """
        Insertar producto (insert) con detección por id_producto + fuente_datos
        """
        try:
            
            # Obtener o crear categoria_id
            categoria_id = self._get_or_create_categoria_id(categoria)
            
            # Verificar si el producto ya existe (por id_producto + fuente_datos)
            check_query = f"""
            SELECT producto_id, nombre, categoria_id, precio_actual, precio_promedio, 
                id_menu, id_restaurante, fuente_datos
            FROM warehouse.dim_productos 
            WHERE producto_id = {self.safe_sql_value(id_producto)} 
            AND fuente_datos = {self.safe_sql_value(fuente_datos, True)}
            LIMIT 1
            """
            
            existing_df = self.spark.sql(check_query)
            producto_existe = existing_df.count() > 0
            
            if not producto_existe:                
                # Producto nuevo - insertarlo
                print(f"       Producto {id_producto} ({fuente_datos}) es nuevo, insertando...")
                
                insert_query = f"""
                INSERT INTO warehouse.dim_productos
                (producto_id, nombre, categoria_id, precio_actual, precio_promedio, 
                id_menu, id_restaurante, activo, fecha_ultima_actualizacion, fuente_datos)
                VALUES (
                    {self.safe_sql_value(id_producto)},
                    {self.safe_sql_value(nombre, True)},
                    {self.safe_sql_value(categoria_id)},
                    {self.safe_sql_value(precio)},
                    {self.safe_sql_value(precio)},
                    {self.safe_sql_value(id_menu)},
                    {self.safe_sql_value(id_restaurante)},
                    true,
                    '{datetime.now().isoformat()}',
                    {self.safe_sql_value(fuente_datos, True)}
                )
                """
                self.spark.sql(insert_query)
                print(f"       Producto {id_producto} ({fuente_datos}) insertado exitosamente")
            
            return categoria_id
            
        except Exception as e:
            print(f" Error en add_producto para producto {id_producto} ({fuente_datos}): {e}")
            # Retornar categoria_id por defecto en caso de error
            return self._get_or_create_categoria_id(categoria)

    def safe_sql_value(self, value, is_string=False):
        """
        Convertir valor a string SQL seguro
        """
        if value is None:
            return "NULL"
        
        if is_string:
            escaped_value = str(value).replace("'", "''")
            return f"'{escaped_value}'"
        
        return str(value)

    def batch_upsert_pedidos(self, pedidos_list):
        """
        Insertar pedidos con optimizaciones básicas
        """
        if not pedidos_list:
            print("  ️ Lista de pedidos vacía")
            return 0
        
        print(f"   Procesando {len(pedidos_list)} pedidos con optimizaciones...")
        
        # === PASO 1: FILTRAR DUPLICADOS ===
        print("     Verificando duplicados existentes...")
        
        # Crear lista de (id_pedido, fuente_datos) para verificar
        check_pairs = []
        for pedido in pedidos_list:
            id_pedido = pedido.get('id_pedido')
            fuente = pedido.get('fuente_datos', 'unknown')
            check_pairs.append(f"({id_pedido}, '{fuente}')")
        
        if check_pairs:
            check_query = f"""
            SELECT id_pedido, fuente_datos 
            FROM warehouse.fact_pedidos 
            WHERE (id_pedido, fuente_datos) IN ({', '.join(check_pairs)})
            """
            
            try:
                existing_df = self.spark.sql(check_query)
                existing_pairs = set()
                for row in existing_df.collect():
                    existing_pairs.add((row[0], row[1]))
                
                # Filtrar pedidos nuevos
                pedidos_nuevos = []
                for pedido in pedidos_list:
                    key = (pedido.get('id_pedido'), pedido.get('fuente_datos', 'unknown'))
                    if key not in existing_pairs:
                        pedidos_nuevos.append(pedido)
                
                print(f"     {len(existing_pairs)} duplicados encontrados, {len(pedidos_nuevos)} pedidos nuevos")
                
            except Exception as e:
                print(f"    ️ Error verificando duplicados: {e}")
                pedidos_nuevos = pedidos_list  # Continuar con todos si falla
        else:
            pedidos_nuevos = pedidos_list
        
        if not pedidos_nuevos:
            print("     No hay pedidos nuevos para insertar")
            return 0
        
        # === PASO 2: PROCESAR EN LOTES ===
        print(f"     Insertando {len(pedidos_nuevos)} pedidos en lotes...")
        
        batch_size = 50  # Lotes de 50 pedidos
        count_processed = 0
        
        for i in range(0, len(pedidos_nuevos), batch_size):
            batch = pedidos_nuevos[i:i + batch_size]
            end_idx = i + len(batch)
            
            print(f"       Procesando lote {i//batch_size + 1}: pedidos {i+1} a {end_idx}")
            
            try:
                batch_count = self._process_pedidos_batch(batch)
                count_processed += batch_count
                print(f"       Lote procesado: {batch_count} pedidos")
                
            except Exception as e:
                print(f"       Error en lote: {e}")
                # Fallback: procesar individualmente
                print(f"       Procesando individualmente...")
                for pedido in batch:
                    try:
                        individual_count = self._process_pedido_individual(pedido)
                        count_processed += individual_count
                    except Exception as individual_error:
                        print(f"         Error individual: {individual_error}")
                        continue
        
        print(f"   Procesamiento completado: {count_processed} pedidos insertados")
        return count_processed

    def batch_upsert_reservas(self, reservas_list):
        """
        Insertar reservas con optimizaciones básicas
        """
        if not reservas_list:
            print("  ️ Lista de reservas vacía")
            return 0
        
        print(f"   Procesando {len(reservas_list)} reservas con optimizaciones...")
        
        # === PASO 1: FILTRAR DUPLICADOS ===
        print("     Verificando duplicados existentes...")
        
        # Crear lista de (id_reserva, fuente_datos) para verificar
        check_pairs = []
        for reserva in reservas_list:
            id_reserva = reserva.get('id_reserva')
            fuente = reserva.get('fuente_datos', 'unknown')
            check_pairs.append(f"({id_reserva}, '{fuente}')")
        
        if check_pairs:
            check_query = f"""
            SELECT id_reserva, fuente_datos 
            FROM warehouse.fact_reservas 
            WHERE (id_reserva, fuente_datos) IN ({', '.join(check_pairs)})
            """
            
            try:
                existing_df = self.spark.sql(check_query)
                existing_pairs = set()
                for row in existing_df.collect():
                    existing_pairs.add((row[0], row[1]))
                
                # Filtrar reservas nuevas
                reservas_nuevas = []
                for reserva in reservas_list:
                    key = (reserva.get('id_reserva'), reserva.get('fuente_datos', 'unknown'))
                    if key not in existing_pairs:
                        reservas_nuevas.append(reserva)
                
                print(f"     {len(existing_pairs)} duplicados encontrados, {len(reservas_nuevas)} reservas nuevas")
                
            except Exception as e:
                print(f"    ️ Error verificando duplicados: {e}")
                reservas_nuevas = reservas_list  # Continuar con todas si falla
        else:
            reservas_nuevas = reservas_list
        
        if not reservas_nuevas:
            print("     No hay reservas nuevas para insertar")
            return 0
        
        # === PASO 2: PROCESAR EN LOTES ===
        print(f"     Insertando {len(reservas_nuevas)} reservas en lotes...")
        
        batch_size = 50  # Lotes de 50 reservas
        count_processed = 0
        
        for i in range(0, len(reservas_nuevas), batch_size):
            batch = reservas_nuevas[i:i + batch_size]
            end_idx = i + len(batch)
            
            print(f"       Procesando lote {i//batch_size + 1}: reservas {i+1} a {end_idx}")
            
            try:
                batch_count = self._process_reservas_batch(batch)
                count_processed += batch_count
                print(f"       Lote procesado: {batch_count} reservas")
                
            except Exception as e:
                print(f"       Error en lote: {e}")
                # Fallback: procesar individualmente
                print(f"       Procesando individualmente...")
                for reserva in batch:
                    try:
                        individual_count = self._process_reserva_individual(reserva)
                        count_processed += individual_count
                    except Exception as individual_error:
                        print(f"         Error individual: {individual_error}")
                        continue
        
        print(f"   Procesamiento completado: {count_processed} reservas insertadas")
        return count_processed

    def batch_upsert_detalle_pedidos(self, detalles_list):
        """
        Insertar detalles de pedidos con optimizaciones básicas
        """
        if not detalles_list:
            print("  ️ Lista de detalles vacía")
            return 0
        
        print(f"   Procesando {len(detalles_list)} detalles de pedidos con optimizaciones...")
        
        # === PASO 1: FILTRAR DUPLICADOS ===
        print("     Verificando duplicados existentes...")
        
        # Crear lista de (id_pedido, id_producto, fuente_datos) para verificar
        check_tuples = []
        for detalle in detalles_list:
            id_pedido = detalle.get('id_pedido')
            id_producto = detalle.get('id_producto')
            fuente = detalle.get('fuente_datos', 'unknown')
            check_tuples.append(f"({id_pedido}, {id_producto}, '{fuente}')")
        
        if check_tuples:
            check_query = f"""
            SELECT id_pedido, id_producto, fuente_datos 
            FROM warehouse.fact_detalle_pedidos 
            WHERE (id_pedido, id_producto, fuente_datos) IN ({', '.join(check_tuples)})
            """
            
            try:
                existing_df = self.spark.sql(check_query)
                existing_tuples = set()
                for row in existing_df.collect():
                    existing_tuples.add((row[0], row[1], row[2]))
                
                # Filtrar detalles nuevos
                detalles_nuevos = []
                for detalle in detalles_list:
                    key = (detalle.get('id_pedido'), detalle.get('id_producto'), detalle.get('fuente_datos', 'unknown'))
                    if key not in existing_tuples:
                        detalles_nuevos.append(detalle)
                
                print(f"     {len(existing_tuples)} duplicados encontrados, {len(detalles_nuevos)} detalles nuevos")
                
            except Exception as e:
                print(f"    ️ Error verificando duplicados: {e}")
                detalles_nuevos = detalles_list  # Continuar con todos si falla
        else:
            detalles_nuevos = detalles_list
        
        if not detalles_nuevos:
            print("     No hay detalles nuevos para insertar")
            return 0
        
        # === PASO 2: PROCESAR EN LOTES ===
        print(f"     Insertando {len(detalles_nuevos)} detalles en lotes...")
        
        batch_size = 50  # Lotes de 50 detalles
        count_processed = 0
        
        for i in range(0, len(detalles_nuevos), batch_size):
            batch = detalles_nuevos[i:i + batch_size]
            end_idx = i + len(batch)
            
            print(f"       Procesando lote {i//batch_size + 1}: detalles {i+1} a {end_idx}")
            
            try:
                batch_count = self._process_detalles_batch(batch)
                count_processed += batch_count
                print(f"       Lote procesado: {batch_count} detalles")
                
            except Exception as e:
                print(f"       Error en lote: {e}")
                # Fallback: procesar individualmente
                print(f"       Procesando individualmente...")
                for detalle in batch:
                    try:
                        individual_count = self._process_detalle_individual(detalle)
                        count_processed += individual_count
                    except Exception as individual_error:
                        print(f"         Error individual: {individual_error}")
                        continue
        
        print(f"   Procesamiento completado: {count_processed} detalles insertados")
        return count_processed

    def _process_pedidos_batch(self, batch):
        """
        Procesar un lote de pedidos con multi-value INSERT
        """
        values_list = []
        
        for pedido in batch:
            # Validar fecha_hora
            fecha_hora = pedido.get('fecha_hora')
            if not fecha_hora:
                continue
            
            # Obtener tiempo_id (con cache)
            try:
                tiempo_id = self.get_or_create_tiempo_id(fecha_hora)
            except Exception:
                continue
            
            # Calcular provincias
            provincia_cliente = self.get_provincia_from_coords(
                pedido.get('usuario_latitud'), 
                pedido.get('usuario_longitud')
            )
            
            provincia_restaurante = self.get_provincia_from_coords(
                pedido.get('restaurante_latitud'), 
                pedido.get('restaurante_longitud')
            )
                        
            # Crear valores para este pedido
            valores = f"""(
                {self.safe_sql_value(pedido.get('id_pedido'))},
                {self.safe_sql_value(tiempo_id)},
                {self.safe_sql_value(pedido.get('id_usuario'))},
                {self.safe_sql_value(pedido.get('id_restaurante'))},
                {self.safe_sql_value(pedido.get('id_repartidor'))},
                {self.safe_sql_value(pedido.get('estado', 'unknown'), True)},
                {self.safe_sql_value(pedido.get('tipo', 'unknown'), True)},
                {self.safe_sql_value(pedido.get('total_pedido', 0.0))},
                {self.safe_sql_value(pedido.get('cantidad_items', 0))},
                {self.safe_sql_value(pedido.get('usuario_latitud'))},
                {self.safe_sql_value(pedido.get('usuario_longitud'))},
                {self.safe_sql_value(pedido.get('restaurante_latitud'))},
                {self.safe_sql_value(pedido.get('restaurante_longitud'))},
                {self.safe_sql_value(provincia_cliente, True)},
                {self.safe_sql_value(provincia_restaurante, True)},
                {self.safe_sql_value(str(fecha_hora), True)},
                {self.safe_sql_value(str(datetime.now()), True)},
                {self.safe_sql_value(pedido.get('fuente_datos', 'unknown'), True)}
            )"""
            
            values_list.append(valores)
        
        if not values_list:
            return 0
        
        # Construir query de inserción multi-value
        insert_query = f"""
        INSERT INTO warehouse.fact_pedidos
        (id_pedido, tiempo_id, id_usuario, id_restaurante, id_repartidor, estado, tipo, 
         total_pedido, cantidad_items, usuario_latitud, usuario_longitud, 
         restaurante_latitud, restaurante_longitud, provincia_cliente, provincia_restaurante,
         fecha_creacion, fecha_etl, fuente_datos)
        VALUES {', '.join(values_list)}
        """
        
        # Ejecutar inserción
        self.spark.sql(insert_query)
        return len(values_list)


    def _process_reservas_batch(self, batch):
        """
        Procesar un lote de reservas con multi-value INSERT
        """
        values_list = []
        
        for reserva in batch:
            # Validar fecha_hora
            fecha_hora = reserva.get('fecha_hora')
            if not fecha_hora:
                continue
            
            # Obtener tiempo_id (con cache)
            try:
                tiempo_id = self.get_or_create_tiempo_id(fecha_hora)
            except Exception:
                continue
                        
            # Crear valores para esta reserva
            valores = f"""(
                {self.safe_sql_value(reserva.get('id_reserva'))},
                {self.safe_sql_value(tiempo_id)},
                {self.safe_sql_value(reserva.get('id_usuario'))},
                {self.safe_sql_value(reserva.get('id_restaurante'))},
                {self.safe_sql_value(reserva.get('estado', 'unknown'), True)},
                {self.safe_sql_value(str(fecha_hora), True)},
                {self.safe_sql_value(str(datetime.now()), True)},
                {self.safe_sql_value(reserva.get('fuente_datos', 'unknown'), True)}
            )"""
            
            values_list.append(valores)
        
        if not values_list:
            return 0
        
        # Construir query de inserción multi-value
        insert_query = f"""
        INSERT INTO warehouse.fact_reservas
        (id_reserva, tiempo_id, id_usuario, id_restaurante, estado, 
        fecha_creacion, fecha_etl, fuente_datos)
        VALUES {', '.join(values_list)}
        """
        
        # Ejecutar inserción
        self.spark.sql(insert_query)
        return len(values_list)

    def _process_detalles_batch(self, batch):
        """
        Procesar un lote de detalles de pedidos con multi-value INSERT
        """
        values_list = []
        
        for detalle in batch:
            # Validar fecha_hora
            fecha_hora = detalle.get('fecha_hora')
            if not fecha_hora:
                continue
            
            # Obtener tiempo_id (con cache)
            try:
                tiempo_id = self.get_or_create_tiempo_id(fecha_hora)
            except Exception:
                continue
            
            # Add producto y obtener categoria_id
            categoria_id = self.add_producto(
                detalle.get('id_producto'),
                detalle.get('nombre_producto'),
                detalle.get('categoria_producto'),
                detalle.get('precio_producto'),
                detalle.get('id_menu'),
                detalle.get('id_restaurante'),
                detalle.get('fuente_datos')
            )
            
            # Calcular provincias
            provincia_cliente = self.get_provincia_from_coords(
                detalle.get('usuario_latitud'), 
                detalle.get('usuario_longitud')
            )
            
            provincia_restaurante = self.get_provincia_from_coords(
                detalle.get('restaurante_latitud'), 
                detalle.get('restaurante_longitud')
            )
            
            # Crear valores para este detalle
            valores = f"""(
                {self.safe_sql_value(detalle.get('id_pedido'))},
                {self.safe_sql_value(detalle.get('id_producto'))},
                {self.safe_sql_value(tiempo_id)},
                {self.safe_sql_value(categoria_id)},
                {self.safe_sql_value(detalle.get('id_usuario'))},
                {self.safe_sql_value(detalle.get('id_restaurante'))},
                {self.safe_sql_value(detalle.get('id_repartidor'))},
                {self.safe_sql_value(detalle.get('estado_pedido', 'unknown'), True)},
                {self.safe_sql_value(detalle.get('tipo_pedido', 'unknown'), True)},
                {self.safe_sql_value(detalle.get('cantidad', 0))},
                {self.safe_sql_value(detalle.get('precio_unitario', 0.0))},
                {self.safe_sql_value(detalle.get('subtotal', 0.0))},
                {self.safe_sql_value(provincia_cliente, True)},
                {self.safe_sql_value(provincia_restaurante, True)},
                {self.safe_sql_value(str(fecha_hora), True)},
                {self.safe_sql_value(str(datetime.now()), True)},
                {self.safe_sql_value(detalle.get('fuente_datos', 'unknown'), True)}
            )"""
            
            values_list.append(valores)
        
        if not values_list:
            return 0
        
        # Construir query de inserción multi-value
        insert_query = f"""
        INSERT INTO warehouse.fact_detalle_pedidos
        (id_pedido, id_producto, tiempo_id, categoria_id, id_usuario, id_restaurante, id_repartidor,
        estado_pedido, tipo_pedido, cantidad, precio_unitario, subtotal, 
        provincia_cliente, provincia_restaurante, fecha_creacion, fecha_etl, fuente_datos)
        VALUES {', '.join(values_list)}
        """
        
        # Ejecutar inserción
        self.spark.sql(insert_query)
        return len(values_list)

    def _process_pedido_individual(self, pedido):
        """
        Procesar un pedido individual (fallback)
        """
        # Validar fecha_hora
        fecha_hora = pedido.get('fecha_hora')
        if not fecha_hora:
            return 0
        
        # Obtener tiempo_id
        tiempo_id = self.get_or_create_tiempo_id(fecha_hora)
        
        # Calcular provincias
        provincia_cliente = self.get_provincia_from_coords(
            pedido.get('usuario_latitud'), 
            pedido.get('usuario_longitud')
        )
        
        provincia_restaurante = self.get_provincia_from_coords(
            pedido.get('restaurante_latitud'), 
            pedido.get('restaurante_longitud')
        )
        
        # Preparar datos para inserción
        if isinstance(fecha_hora, str):
            fecha_obj = datetime.fromisoformat(fecha_hora.replace('Z', '+00:00'))
        else:
            fecha_obj = fecha_hora
        
        anio = fecha_obj.year
        mes = fecha_obj.month
        
        # Construir query de inserción individual
        insert_query = f"""
        INSERT INTO warehouse.fact_pedidos PARTITION(anio={anio}, mes={mes})
        (id_pedido, tiempo_id, id_usuario, id_restaurante, id_repartidor, estado, tipo, 
         total_pedido, cantidad_items, usuario_latitud, usuario_longitud, 
         restaurante_latitud, restaurante_longitud, provincia_cliente, provincia_restaurante,
         fecha_creacion, fecha_etl, fuente_datos)
        VALUES (
            {self.safe_sql_value(pedido.get('id_pedido'))},
            {self.safe_sql_value(tiempo_id)},
            {self.safe_sql_value(pedido.get('id_usuario'))},
            {self.safe_sql_value(pedido.get('id_restaurante'))},
            {self.safe_sql_value(pedido.get('id_repartidor'))},
            {self.safe_sql_value(pedido.get('estado', 'unknown'), True)},
            {self.safe_sql_value(pedido.get('tipo', 'unknown'), True)},
            {self.safe_sql_value(pedido.get('total_pedido', 0.0))},
            {self.safe_sql_value(pedido.get('cantidad_items', 0))},
            {self.safe_sql_value(pedido.get('usuario_latitud'))},
            {self.safe_sql_value(pedido.get('usuario_longitud'))},
            {self.safe_sql_value(pedido.get('restaurante_latitud'))},
            {self.safe_sql_value(pedido.get('restaurante_longitud'))},
            {self.safe_sql_value(provincia_cliente, True)},
            {self.safe_sql_value(provincia_restaurante, True)},
            {self.safe_sql_value(str(fecha_hora), True)},
            {self.safe_sql_value(str(datetime.now()), True)},
            {self.safe_sql_value(pedido.get('fuente_datos', 'unknown'), True)}
        )
        """
        
        # Ejecutar inserción
        self.spark.sql(insert_query)
        return 1
    
    def _process_reserva_individual(self, reserva):
        """
        Procesar una reserva individual (fallback)
        """
        # Validar fecha_hora
        fecha_hora = reserva.get('fecha_hora')
        if not fecha_hora:
            return 0
        
        # Obtener tiempo_id
        tiempo_id = self.get_or_create_tiempo_id(fecha_hora)
        
        # Preparar datos para inserción
        if isinstance(fecha_hora, str):
            fecha_obj = datetime.fromisoformat(fecha_hora.replace('Z', '+00:00'))
        else:
            fecha_obj = fecha_hora
        
        anio = fecha_obj.year
        mes = fecha_obj.month
        
        # Construir query de inserción individual
        insert_query = f"""
        INSERT INTO warehouse.fact_reservas PARTITION(anio={anio}, mes={mes})
        (id_reserva, tiempo_id, id_usuario, id_restaurante, estado,
        fecha_creacion, fecha_etl, fuente_datos)
        VALUES (
            {self.safe_sql_value(reserva.get('id_reserva'))},
            {self.safe_sql_value(tiempo_id)},
            {self.safe_sql_value(reserva.get('id_usuario'))},
            {self.safe_sql_value(reserva.get('id_restaurante'))},
            {self.safe_sql_value(reserva.get('estado', 'unknown'), True)},
            {self.safe_sql_value(str(fecha_hora), True)},
            {self.safe_sql_value(str(datetime.now()), True)},
            {self.safe_sql_value(reserva.get('fuente_datos', 'unknown'), True)}
        )
        """
        
        # Ejecutar inserción
        self.spark.sql(insert_query)
        return 1
    
    def _process_detalle_individual(self, detalle):
        """
        Procesar un detalle individual (fallback)
        """
        # Validar fecha_hora
        fecha_hora = detalle.get('fecha_hora')
        if not fecha_hora:
            return 0
        
        # Obtener tiempo_id
        tiempo_id = self.get_or_create_tiempo_id(fecha_hora)
        
        # Sync producto y obtener categoria_id
        categoria_id = self.add_producto(
            detalle.get('id_producto'),
            detalle.get('nombre_producto'),
            detalle.get('categoria_producto'),
            detalle.get('precio_producto'),
            detalle.get('id_menu'),
            detalle.get('id_restaurante'),
            detalle.get('fuente_datos')
        )
        
        # Calcular provincias
        provincia_cliente = self.get_provincia_from_coords(
            detalle.get('usuario_latitud'), 
            detalle.get('usuario_longitud')
        )
        
        provincia_restaurante = self.get_provincia_from_coords(
            detalle.get('restaurante_latitud'), 
            detalle.get('restaurante_longitud')
        )
        
        # Construir query de inserción individual
        insert_query = f"""
        INSERT INTO warehouse.fact_detalle_pedidos
        (id_pedido, id_producto, tiempo_id, categoria_id, id_usuario, id_restaurante, id_repartidor,
        estado_pedido, tipo_pedido, cantidad, precio_unitario, subtotal,
        provincia_cliente, provincia_restaurante, fecha_creacion, fecha_etl, fuente_datos)
        VALUES (
            {self.safe_sql_value(detalle.get('id_pedido'))},
            {self.safe_sql_value(detalle.get('id_producto'))},
            {self.safe_sql_value(tiempo_id)},
            {self.safe_sql_value(categoria_id)},
            {self.safe_sql_value(detalle.get('id_usuario'))},
            {self.safe_sql_value(detalle.get('id_restaurante'))},
            {self.safe_sql_value(detalle.get('id_repartidor'))},
            {self.safe_sql_value(detalle.get('estado_pedido', 'unknown'), True)},
            {self.safe_sql_value(detalle.get('tipo_pedido', 'unknown'), True)},
            {self.safe_sql_value(detalle.get('cantidad', 0))},
            {self.safe_sql_value(detalle.get('precio_unitario', 0.0))},
            {self.safe_sql_value(detalle.get('subtotal', 0.0))},
            {self.safe_sql_value(provincia_cliente, True)},
            {self.safe_sql_value(provincia_restaurante, True)},
            {self.safe_sql_value(str(fecha_hora), True)},
            {self.safe_sql_value(str(datetime.now()), True)},
            {self.safe_sql_value(detalle.get('fuente_datos', 'unknown'), True)}
        )
        """
        
        # Ejecutar inserción
        self.spark.sql(insert_query)
        return 1