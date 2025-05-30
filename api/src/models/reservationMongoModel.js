// src/models/reservationMongoModel.js

const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  id_reserva: {
    type: Number,
    unique: true,
    sparse: true,
  },
  id_usuario: {
    type: Number,
    required: true,
  },
  id_restaurante: {
    type: Number,
    required: true,
  },
  fecha_hora: {
    type: Date,
    required: true,
  },
  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'cancelada'],
    required: true,
  },
  fecha_creacion: {
    type: Date,
    default: Date.now,
  },
});

// Generar id_reserva automáticamente si no se asigna
reservationSchema.pre('save', async function (next) {
  if (!this.id_reserva) {
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: 'reservas' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id_reserva = counter?.seq || counter?.value?.seq;
  }
  next();
});

const ReservationModelMongo = mongoose.model('Reserva', reservationSchema);

module.exports = ReservationModelMongo;
