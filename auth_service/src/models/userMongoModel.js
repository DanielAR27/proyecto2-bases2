// src/models/userMongoModel.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id_usuario: {
    type: Number,
    unique: true,
    sparse: true, // No todos los documentos tienen que tenerlo al inicio
  },
  nombre: {
    type: String,
    required: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100,
  },
  contrasena_hash: {
    type: String,
    required: true,
  },
  rol: {
    type: String,
    enum: ['cliente', 'administrador'],
    required: true,
  },
  fecha_registro: {
    type: Date,
    default: Date.now,
  },
});

// Generar id_usuario automáticamente si no se asigna
userSchema.pre('save', async function (next) {
  if (!this.id_usuario) {
    const counter = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: 'usuarios' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id_usuario = counter?.seq || counter?.value?.seq;
  }
  next();
});

const UserModelMongo = mongoose.model('Usuario', userSchema);

module.exports = UserModelMongo;
