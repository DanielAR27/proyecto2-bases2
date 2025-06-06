-- Este archivo sirve para inicializar la base de datos al hacer 
-- docker compose up.
CREATE DATABASE apidb;

\connect apidb;

-- Crear las tablas dentro de la base de datos
CREATE TABLE Usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contrasena_hash TEXT NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('cliente', 'administrador')) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT NOW(),
    -- Nuevos campos para geolocalización
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    direccion_completa TEXT,
    -- Nuevo campo para asignar referido (opcional)
    id_referido INT DEFAULT NULL,
    FOREIGN KEY (id_referido) REFERENCES Usuario(id_usuario) ON DELETE SET NULL
);

CREATE TABLE Restaurante (
    id_restaurante SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    id_admin INT NOT NULL,
    -- Nuevos campos para geolocalización
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    FOREIGN KEY (id_admin) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
);

-- Nueva tabla Repartidor
CREATE TABLE Repartidor (
    id_repartidor SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    vehiculo VARCHAR(50),
    latitud_actual DECIMAL(10, 8),
    longitud_actual DECIMAL(11, 8),
    estado VARCHAR(20) CHECK (estado IN ('disponible', 'ocupado', 'desconectado')) DEFAULT 'disponible',
    fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Menu (
    id_menu SERIAL PRIMARY KEY,
    id_restaurante INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    FOREIGN KEY (id_restaurante) REFERENCES Restaurante(id_restaurante) ON DELETE CASCADE
);

CREATE TABLE Producto (
    id_producto SERIAL PRIMARY KEY,
    id_menu INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    descripcion TEXT DEFAULT 'Producto sin descripción',
    FOREIGN KEY (id_menu) REFERENCES Menu(id_menu) ON DELETE CASCADE
);

CREATE TABLE Reserva (
    id_reserva SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_restaurante INT NOT NULL,
    fecha_hora TIMESTAMP NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_restaurante) REFERENCES Restaurante(id_restaurante) ON DELETE CASCADE
);

CREATE TABLE Pedido (
    id_pedido SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_restaurante INT NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    estado VARCHAR(20) CHECK (estado IN ('pendiente', 'en preparacion', 'listo', 'entregado')) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('en restaurante', 'para recoger')) NOT NULL,
    -- Nuevo campo para asignar repartidor (opcional)
    id_repartidor INT DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_restaurante) REFERENCES Restaurante(id_restaurante) ON DELETE CASCADE,
    FOREIGN KEY (id_repartidor) REFERENCES Repartidor(id_repartidor) ON DELETE SET NULL
);

CREATE TABLE Detalle_Pedido (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    FOREIGN KEY (id_pedido) REFERENCES Pedido(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES Producto(id_producto) ON DELETE CASCADE
);