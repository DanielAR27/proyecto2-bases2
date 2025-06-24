from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

# Configuración del DAG
default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'start_date': datetime(2025, 6, 15),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 2,  # Más reintentos para HTTP calls
    'retry_delay': timedelta(minutes=5),
}

# Crear DAG para reindex
reindex_dag = DAG(
    'reindex_productos_cada_6_horas',
    default_args=default_args,
    description='Reindexar productos en Elasticsearch cada 6 horas',
    schedule_interval='0 */6 * * * *',  # Cada 6 horas '*/5 * * * *' (Se puede cambiar a 5 minutos)
    catchup=False,  # No ejecutar tareas pasadas
    max_active_runs=1,  # Solo una ejecución a la vez
    tags=['reindex', 'elasticsearch', 'search'],
)

# Tarea: Reindexar productos via HTTP (Llamada interna)
reindex_products = BashOperator(
    task_id='reindex_elasticsearch_products',
    bash_command="""
    curl -X POST 'http://search_service1:5500/search/reindex-internal' \
         -H 'Content-Type: application/json' \
         -H 'accept: application/json' \
         -f \
         --max-time 300 \
         --retry 3 \
         --retry-delay 10
    """,
    dag=reindex_dag,
)