FROM python:3.10-slim

# Instalar dependencias básicas
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Variables de entorno para Java y Spark
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH
ENV SPARK_HOME=/usr/local/lib/python3.10/site-packages/pyspark
ENV PYTHONPATH=$SPARK_HOME/python:$PYTHONPATH

# Crear directorio de trabajo
WORKDIR /app

# Copiar e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY . .

# Comando por defecto - ejecutar análisis
CMD ["python", "main.py"]