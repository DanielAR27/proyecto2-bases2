// src/models/restaurantMongoModel.js

const mongoose = require('mongoose');
const menuModel = require('./menuMongoModel');
const reservationModel = require('./reservationMongoModel');
const pedidoModel = require('./pedidoMongoModel');


const restaurantSchema = new mongoose.Schema({
  id_restaurante: {
    type: Number,
    unique: true,
    sparse: true // No es obligatorio tenerlo desde el principio
  },
  nombre: {
    type: String,
    required: true,
    maxlength: 100
  },
  direccion: {
    type: String,
    required: true,
    maxlength: 200
  },
  id_admin: {
    type: Number,
    required: true
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
});

// Borrado en cascada de menús (con productos), reservas y pedidos
restaurantSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const id_restaurante = doc.id_restaurante;

    // Eliminar menús uno por uno para activar el middleware de menú que borra productos
    const menus = await menuModel.find({ id_restaurante });
    for (const menu of menus) {
      await menuModel.findOneAndDelete({ id_menu: menu.id_menu });
    }

    await Promise.all([
      reservationModel.deleteMany({ id_restaurante }),
      pedidoModel.deleteMany({ id_restaurante })
    ]);
  }
});

// Generar id_restaurante automáticamente si no se asigna
restaurantSchema.pre('save', async function (next) {
  if (!this.id_restaurante) {
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: 'restaurantes' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id_restaurante = counter?.seq || counter?.value?.seq;
  }
  next();
});

const RestaurantModelMongo = mongoose.model('Restaurante', restaurantSchema);

module.exports = RestaurantModelMongo;
