// src/models/repartidorMongoModel.js

const mongoose = require('mongoose');

const repartidorSchema = new mongoose.Schema({
  id_repartidor: {
    type: Number,
    unique: true,
    sparse: true // No es obligatorio tenerlo desde el principio
  },
  nombre: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  telefono: {
    type: String,
    maxlength: 20,
    trim: true
  },
  vehiculo: {
    type: String,
    maxlength: 50,
    trim: true
  },
  latitud_actual: {
    type: Number,
    min: -90,
    max: 90
  },
  longitud_actual: {
    type: Number,
    min: -180,
    max: 180
  },
  estado: {
    type: String,
    enum: ['disponible', 'ocupado', 'desconectado'],
    default: 'disponible',
    required: true
  },
  fecha_registro: {
    type: Date,
    default: Date.now
  }
});

// Índices para optimizar búsquedas geográficas
repartidorSchema.index({ latitud_actual: 1, longitud_actual: 1 });
repartidorSchema.index({ estado: 1 });

// Generar id_repartidor automáticamente si no se asigna
repartidorSchema.pre('save', async function (next) {
  if (!this.id_repartidor) {
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: 'repartidores' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id_repartidor = counter?.seq || counter?.value?.seq;
  }
  next();
});

const RepartidorModelMongo = mongoose.model('Repartidor', repartidorSchema, 'repartidores');

module.exports = RepartidorModelMongo;