// src/models/menuMongoModel.js

const mongoose = require('mongoose');
const productModel = require('./productMongoModel');

const menuSchema = new mongoose.Schema({
  id_menu: {
    type: Number,
    unique: true,
    sparse: true // No es obligatorio tenerlo desde el principio
  },
  id_restaurante: {
    type: Number,
    required: true,
  },
  nombre: {
    type: String,
    required: true,
    maxlength: 100,
  },
  descripcion: {
    type: String,
    maxlength: 1000,
  },
  fecha_creacion: {
    type: Date,
    default: Date.now,
  },
});

// Eliminar productos si se borra un menú.
menuSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const productos = await productModel.find({ id_menu: doc.id_menu });

    for (const producto of productos) {
      await productModel.findOneAndDelete({ id_producto: producto.id_producto });
    }
  }
});

// Generar id_menu automáticamente si no se asigna
menuSchema.pre('save', async function (next) {
  if (!this.id_menu) {
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: 'menus' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id_menu = counter?.seq || counter?.value?.seq;
  }
  next();
});

const MenuModelMongo = mongoose.model('Menu', menuSchema);

module.exports = MenuModelMongo;
