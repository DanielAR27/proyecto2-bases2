FROM apache/airflow:2.7.0

USER root

# Instalar Docker CLI y docker-compose
RUN apt-get update && \
    apt-get install -y docker.io curl && \
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose && \
    rm -rf /var/lib/apt/lists/*

USER airflow

# Copiar requirements y instalar dependencias Python
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt

# Configurar Airflow
ENV AIRFLOW__CORE__LOAD_EXAMPLES=False
ENV AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION=False