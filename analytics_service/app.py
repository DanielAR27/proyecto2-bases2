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
        self.max_retries = 30  # 30 intentos = 5 minutos máximo
        self.retry_interval = 10  # 10 segundos entre intentos
    
    def log(self, message):
        """Log con flush forzado para Docker"""
        print(message, flush=True)
    
    def signal_handler(self, signum, frame):
        """Manejar señales para shutdown graceful"""
        self.log(f"\n🛑 Señal recibida ({signum}), cerrando servicio...")
        self.running = False
    
    def setup_signal_handlers(self):
        """Configurar manejadores de señales"""
        signal.signal(signal.SIGINT, self.signal_handler)   # Ctrl+C
        signal.signal(signal.SIGTERM, self.signal_handler)  # Docker stop
    
    def check_environment(self):
        """Verificar variables de entorno críticas"""
        required_vars = [
            'WAREHOUSE_POSTGRES_HOST',
            'WAREHOUSE_POSTGRES_USER', 
            'WAREHOUSE_POSTGRES_PASSWORD',
            'WAREHOUSE_POSTGRES_DB',
            'POSTGRES_HOST',
            'MONGO_URI'
        ]
        
        missing = []
        for var in required_vars:
            if not os.getenv(var):
                missing.append(var)
        
        if missing:
            self.log(f"❌ Variables de entorno faltantes: {missing}")
            return False
        else:
            self.log("✅ Variables de entorno OK")
            return True
    
    def wait_for_dependencies(self):
        """Esperar a que las dependencias estén disponibles"""
        self.log("🔄 Esperando a que las dependencias estén disponibles...")
        
        for attempt in range(1, self.max_retries + 1):
            if not self.running:  # Si se cancela con Ctrl+C
                return False
                
            self.log(f"🔍 Intento {attempt}/{self.max_retries} - Verificando conexiones...")
            
            try:
                # Test básico de ETL (solo verificación de conexiones)
                from warehouse import WarehouseConnection
                from extractors import PostgresExtractor, MongoExtractor
                
                # Test warehouse connection
                warehouse = WarehouseConnection()
                if warehouse.test_connection():
                    self.log("✅ Warehouse PostgreSQL: Conectado")
                    warehouse.close()
                    
                    # Test source connections
                    try:
                        postgres_extractor = PostgresExtractor()
                        postgres_extractor.connect()
                        self.log("✅ PostgreSQL fuente: Conectado")
                        postgres_extractor.close()
                    except Exception as e:
                        self.log(f"⚠️ PostgreSQL fuente: {e}")
                    
                    try:
                        mongo_extractor = MongoExtractor()
                        mongo_extractor.connect()
                        self.log("✅ MongoDB: Conectado")
                        mongo_extractor.close()
                    except Exception as e:
                        self.log(f"⚠️ MongoDB: {e}")
                    
                    self.log("🎉 Todas las dependencias están disponibles!")
                    return True
                else:
                    raise Exception("Warehouse connection test failed")
                    
            except Exception as e:
                self.log(f"❌ Intento {attempt} falló: {e}")
                
                if attempt < self.max_retries:
                    self.log(f"⏳ Esperando {self.retry_interval} segundos antes del siguiente intento...")
                    time.sleep(self.retry_interval)
                else:
                    self.log(f"💥 Se agotaron los {self.max_retries} intentos. Las dependencias no están disponibles.")
                    return False
        
        return False
    
    def run_etl_with_retry(self):
        """Ejecutar ETL con reintentos en caso de falla"""
        max_etl_retries = 3
        
        for attempt in range(1, max_etl_retries + 1):
            if not self.running:
                return False
                
            self.log(f"🔄 Ejecutando ETL - Intento {attempt}/{max_etl_retries}")
            
            try:
                result = run_etl()
                
                if result['success']:
                    self.log("\n✅ ETL completado exitosamente")
                    self.log(f"📊 Pedidos procesados: {result['pedidos_procesados']}")
                    self.log(f"📊 Reservas procesadas: {result['reservas_procesadas']}")
                    return True
                else:
                    raise Exception(f"ETL falló: {result['message']}")
                    
            except Exception as e:
                self.log(f"❌ ETL intento {attempt} falló: {e}")
                
                if attempt < max_etl_retries:
                    self.log(f"⏳ Reintentando ETL en {self.retry_interval} segundos...")
                    time.sleep(self.retry_interval)
                else:
                    self.log("💥 ETL falló después de todos los reintentos")
                    return False
        
        return False
    
    def run(self):
        """Ejecutar servicio analytics"""
        self.log("🚀 Iniciando Analytics Service...")
        self.log(f"🐍 Python version: {sys.version}")
        self.log(f"📋 Modo: ETL con retry + mantener vivo")
        
        # Verificar entorno
        if not self.check_environment():
            self.log("💥 Faltan variables de entorno críticas, terminando...")
            return
        
        # Configurar señales
        self.setup_signal_handlers()
        
        # ESPERAR DEPENDENCIAS
        self.log("\n" + "="*50)
        self.log("🔄 Esperando dependencias...")
        self.log("="*50)
        
        if not self.wait_for_dependencies():
            self.log("💥 No se pudieron conectar las dependencias, terminando...")
            return
        
        # EJECUTAR ETL CON RETRY
        self.log("\n" + "="*50)
        self.log("🔄 Ejecutando ETL...")
        self.log("="*50)
        
        self.etl_executed = self.run_etl_with_retry()
        
        if not self.etl_executed:
            self.log("⚠️ ETL no se completó exitosamente, pero el servicio continuará...")
        
        # MANTENER SERVICIO VIVO
        self.log("\n" + "="*50)
        self.log("💤 Manteniendo servicio vivo...")
        self.log("💡 Usa Ctrl+C o docker stop para terminar")
        self.log("="*50)
        
        # Loop infinito
        heartbeat_counter = 0
        while self.running:
            try:
                time.sleep(30)
                heartbeat_counter += 1
                
                # Log periódico (cada 5 minutos)
                if heartbeat_counter % 10 == 0:
                    status = "ETL completado" if self.etl_executed else "ETL pendiente"
                    self.log(f"💓 Servicio activo - {status}")
                    
            except KeyboardInterrupt:
                break
        
        self.log("\n👋 Analytics Service terminado")


def main():
    """Punto de entrada principal"""
    print("🎬 Analytics Service iniciando...", flush=True)
    
    try:
        service = AnalyticsService()
        service.run()
    except Exception as e:
        print(f"💥 Error fatal: {e}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()