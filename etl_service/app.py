import time
import signal
import sys
import os
from etl_job import run_etl

# FORZAR FLUSH DE STDOUT PARA DOCKER
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

class AnalyticsService:
    def __init__(self):
        self.running = True
        self.etl_executed = False
        self.etl_success = False
        self.max_retries = 30  # 30 intentos = 5 minutos máximo
        self.retry_interval = 10  # 10 segundos entre intentos
    
    def log(self, message):
        """Log con flush forzado para Docker"""
        print(message, flush=True)
    
    def signal_handler(self, signum, frame):
        """Manejar señales para shutdown graceful"""
        self.log(f"\n Señal recibida ({signum}), cerrando servicio...")
        self.running = False
    
    def setup_signal_handlers(self):
        """Configurar manejadores de señales"""
        signal.signal(signal.SIGINT, self.signal_handler)   # Ctrl+C
        signal.signal(signal.SIGTERM, self.signal_handler)  # Docker stop
    
    def check_environment(self):
        """Verificar variables de entorno críticas"""
        required_vars = [
            'POSTGRES_HOST',
            'POSTGRES_USER', 
            'POSTGRES_PASSWORD',
            'POSTGRES_DB',
            'MONGO_URI'
        ]
        
        missing = []
        for var in required_vars:
            if not os.getenv(var):
                missing.append(var)
        
        if missing:
            self.log(f" Variables de entorno faltantes: {missing}")
            return False
        else:
            self.log(" Variables de entorno OK")
            return True
    
    def wait_for_dependencies(self):
        """Esperar a que las dependencias estén disponibles"""
        self.log(" Esperando a que las dependencias estén disponibles...")
        
        for attempt in range(1, self.max_retries + 1):
            if not self.running:  # Si se cancela con Ctrl+C
                return False
                
            self.log(f" Intento {attempt}/{self.max_retries} - Verificando conexiones...")
            
            try:
                # Test básico de conexiones
                from connection import HiveConnection
                from extractors import PostgresExtractor, MongoExtractor
                
                # Test Hive connection
                hive_conn = HiveConnection()
                if hive_conn.connect():
                    self.log(" Hive Metastore: Conectado")
                    hive_conn.close()
                    
                    # Test source connections
                    try:
                        postgres_extractor = PostgresExtractor()
                        postgres_extractor.connect()
                        self.log(" PostgreSQL fuente: Conectado")
                        postgres_extractor.close()
                    except Exception as e:
                        self.log(f" PostgreSQL fuente: {e}")
                    
                    try:
                        mongo_extractor = MongoExtractor()
                        mongo_extractor.connect()
                        self.log(" MongoDB: Conectado")
                        mongo_extractor.close()
                    except Exception as e:
                        self.log(f" MongoDB: {e}")
                    
                    self.log(" Todas las dependencias están disponibles!")
                    return True
                else:
                    raise Exception("Hive connection test failed")
                    
            except Exception as e:
                self.log(f" Intento {attempt} falló: {e}")
                
                if attempt < self.max_retries:
                    self.log(f" Esperando {self.retry_interval} segundos antes del siguiente intento...")
                    time.sleep(self.retry_interval)
                else:
                    self.log(f" Se agotaron los {self.max_retries} intentos. Las dependencias no están disponibles.")
                    return False
        
        return False
    
    def run_etl_once(self):
        """Ejecutar ETL una sola vez con reintentos en caso de falla"""
        max_etl_retries = 3
        
        for attempt in range(1, max_etl_retries + 1):
            if not self.running:
                return False
                
            self.log(f" Ejecutando ETL - Intento {attempt}/{max_etl_retries}")
            
            try:
                result = run_etl()
                
                if result['success']:
                    self.log("\n ETL completado exitosamente!")
                    self.log(f" Pedidos procesados: {result['pedidos_procesados']}")
                    self.log(f" Reservas procesadas: {result['reservas_procesadas']}")
                    self.log(f" Detalles procesados: {result['detalles_procesados']}")
                    self.etl_success = True
                    return True
                else:
                    raise Exception(f"ETL falló: {result['message']}")
                    
            except Exception as e:
                self.log(f" ETL intento {attempt} falló: {e}")
                
                if attempt < max_etl_retries:
                    self.log(f" Reintentando ETL en {self.retry_interval} segundos...")
                    time.sleep(self.retry_interval)
                else:
                    self.log(" ETL falló después de todos los reintentos")
                    self.etl_success = False
                    return False
        
        return False
    
    def get_status_message(self):
        """Obtener mensaje de estado actual del servicio"""
        if not self.etl_executed:
            return "ETL pendiente de ejecución"
        elif self.etl_success:
            return "ETL completado exitosamente"
        else:
            return "ETL falló - requiere intervención"
    
    def run(self):
        """Ejecutar servicio analytics"""
        self.log(" Iniciando Analytics Service para Hive...")
        self.log(f" Python version: {sys.version}")
        self.log(f" Modo: ETL único + mantener vivo")
        
        # Verificar entorno
        if not self.check_environment():
            self.log(" Faltan variables de entorno críticas, terminando...")
            return
        
        # Configurar señales
        self.setup_signal_handlers()
        
        # ESPERAR DEPENDENCIAS
        self.log("\n" + "="*60)
        self.log(" FASE 1: Esperando dependencias...")
        self.log("="*60)
        
        if not self.wait_for_dependencies():
            self.log(" No se pudieron conectar las dependencias, terminando...")
            return
        
        # EJECUTAR ETL UNA SOLA VEZ
        self.log("\n" + "="*60)
        self.log(" FASE 2: Ejecutando ETL...")
        self.log("="*60)
        
        self.etl_executed = self.run_etl_once()
        
        # MOSTRAR RESULTADO Y MANTENER SERVICIO VIVO
        self.log("\n" + "="*60)
        self.log(" FASE 3: Manteniendo servicio vivo...")
        self.log(f" Estado: {self.get_status_message()}")
        self.log(" Use Ctrl+C o docker stop para terminar")
        self.log("="*60)
        
        # Loop infinito sin ejecutar ETL
        heartbeat_counter = 0
        while self.running:
            try:
                time.sleep(30)  # Heartbeat cada 30 segundos
                heartbeat_counter += 1
                
                # Log periódico (cada 5 minutos = 10 heartbeats)
                if heartbeat_counter % 10 == 0:
                    status = self.get_status_message()
                    current_time = time.strftime("%Y-%m-%d %H:%M:%S")
                    self.log(f"💓 [{current_time}] Servicio activo - {status}")
                    
            except KeyboardInterrupt:
                break
        
        self.log("\n Analytics Service terminado correctamente")


def main():
   """Punto de entrada principal"""
   print(" Analytics Service (Hive) iniciando...", flush=True)
   
   # Detectar modo de ejecución
   airflow_mode = os.getenv('AIRFLOW_MODE', 'false').lower() == 'true'
   
   try:
       service = AnalyticsService()
       
       if airflow_mode:
           # MODO AIRFLOW: Ejecutar ETL una vez y terminar
           print(" Modo Airflow: Ejecutando ETL una vez...", flush=True)
           
           # Verificar entorno
           if not service.check_environment():
               print(" Faltan variables de entorno críticas, terminando...", flush=True)
               sys.exit(1)
           
           # Esperar dependencias
           if not service.wait_for_dependencies():
               print(" No se pudieron conectar las dependencias, terminando...", flush=True)
               sys.exit(1)
           
           # Ejecutar ETL una sola vez
           success = service.run_etl_once()
           
           if success:
               print(" ETL completado exitosamente en modo Airflow", flush=True)
               sys.exit(0)
           else:
               print(" ETL falló en modo Airflow", flush=True)
               sys.exit(1)
       else:
           # MODO SERVICIO: Comportamiento actual (mantener vivo)
           print(" Modo Servicio: ETL + mantener vivo...", flush=True)
           service.run()
           
   except Exception as e:
       print(f" Error fatal: {e}", flush=True)
       sys.exit(1)


if __name__ == "__main__":
   main()
