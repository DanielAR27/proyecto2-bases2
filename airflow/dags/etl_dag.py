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
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

# Crear DAG
dag = DAG(
    'etl_cada_6_horas',
    default_args=default_args,
    description='Ejecutar ETL cada 6 horas usando contenedor existente',
    schedule_interval='0 */6 * * * *',  # Cada 6 horas '*/5 * * * *' (Se puede cambiar a 5 minutos)
    catchup=False,  # No ejecutar tareas pasadas
    max_active_runs=1,  # Solo una ejecución a la vez
    tags=['etl', 'data-pipeline'],
)

# Tarea: Ejecutar ETL en contenedor existente
run_etl = BashOperator(
    task_id='run_etl_service',
    bash_command='docker exec -e AIRFLOW_MODE=true etl_service python app.py',
    dag=dag,
)