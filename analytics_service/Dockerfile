FROM python:3.10-slim

# Instalar dependencias básicas
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Variables de entorno
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Crear carpeta y copiar archivos
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Exponer puerto de Streamlit
EXPOSE 8501

CMD ["streamlit", "run", "main.py", "--server.address", "0.0.0.0", "--server.port", "8501"]