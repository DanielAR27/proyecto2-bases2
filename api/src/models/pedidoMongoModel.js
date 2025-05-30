// src/models/pedidoMongoModel.js

const mongoose = require('mongoose');

const detallePedidoSchema = new mongoose.Schema({
  id_producto: {
    type: Number,
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
  id_pedido: {
    type: Number,
    unique: true,
    sparse: true // No es obligatorio tenerlo desde el principio
  },
  id_usuario: {
    type: Number,
    required: true
  },
  id_restaurante: {
    type: Number,
    required: true
  },
  fecha_hora: {
    type: Date,
    default: Date.now
  },
  estado: {
    type: String,
    enum: ['pendiente', 'en preparacion', 'listo', 'entregado'],
    required: true
  },
  tipo: {
    type: String,
    enum: ['en restaurante', 'para recoger'],
    required: true
  },
  detalles: {
    type: [detallePedidoSchema],
    required: true,
    validate: d => Array.isArray(d) && d.length > 0
  }
});

// Generar id_pedido automáticamente si no se asigna
pedidoSchema.pre('save', async function (next) {
  if (!this.id_pedido) {
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: 'pedidos' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id_pedido = counter?.seq || counter?.value?.seq;
  }
  next();
});

const PedidoModelMongo = mongoose.model('Pedido', pedidoSchema);
module.exports = PedidoModelMongo;
