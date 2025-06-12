-- init_hive_schema.sql
CREATE DATABASE IF NOT EXISTS warehouse;

USE warehouse;

CREATE TABLE IF NOT EXISTS empleados (
  id INT,
  nombre STRING,
  salario DOUBLE
)
STORED AS PARQUET;
