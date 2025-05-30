// src/models/productMongoModel.js

const mongoose = require('mongoose');
const pedidoModel = require('./pedidoMongoModel');

const productSchema = new mongoose.Schema({
  id_producto: {
    type: Number,
    unique: true,
    sparse: true // No es obligatorio tenerlo desde el principio
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  categoria: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    default: 'Producto sin descripción',
    trim: true
  },
  precio: {
    type: Number,
    required: true
  },
  id_menu: {
    type: Number,
    required: true
  }
});

// Eliminar de los detalles de un pedido un producto si se borra un producto.
productSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await pedidoModel.updateMany(
      {},
      { $pull: { detalles: { id_producto: doc.id_producto } } }
    );
  }
});

// Generar id_producto automáticamente si no se asigna
productSchema.pre('save', async function (next) {
  if (!this.id_producto) {
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: 'productos' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id_producto = counter?.seq || counter?.value?.seq;
  }
  next();
});

const ProductModelMongo = mongoose.model('Producto', productSchema);
module.exports = ProductModelMongo;
