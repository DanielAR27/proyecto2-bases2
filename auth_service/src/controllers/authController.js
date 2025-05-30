// src/controllers/authController.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserDAO = require('../dao/userDAO');

const authController = {

  // Verificar si un token JWT es válido
  verifyToken: (req, res) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'No hay token.' });

    try {
      const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
      res.json({ usuario: decoded });
    } catch (error) {
      /* istanbul ignore next*/
      res.status(401).json({ error: 'Token inválido o expirado.' });
    }
  },

  // Registrar un nuevo usuario
  register: async (req, res) => {
    try {
      const { nombre, email, contrasena, rol } = req.body;

      if (!nombre || !email || !contrasena || !rol) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
      }

      if (!['cliente', 'administrador'].includes(rol)) {
        return res.status(400).json({ error: "El rol debe ser 'cliente' o 'administrador'." });
      }

      const usuarioExistente = await UserDAO.findByEmail(email);
      if (usuarioExistente) {
        return res.status(400).json({ error: 'El email ya está registrado.' });
      }

      const salt = await bcrypt.genSalt(10);
      const contrasena_hash = await bcrypt.hash(contrasena, salt);

      const nuevoUsuario = await UserDAO.createUser({ nombre, email, contrasena_hash, rol });

      console.log("")
      delete nuevoUsuario.contrasena_hash;

      res.status(201).json({
        message: 'Usuario registrado exitosamente.',
        usuario: nuevoUsuario,
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Iniciar sesión
  login: async (req, res) => {
    try {
      const { email, contrasena } = req.body;

      if (!email || !contrasena) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
      }

      const usuario = await UserDAO.findByEmail(email);
      if (!usuario) {
        return res.status(400).json({ error: 'Credenciales inválidas.' });
      }

      const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
      if (!contrasenaValida) {
        return res.status(400).json({ error: 'Credenciales inválidas.' });
      }

      const payload = {
        id_usuario: usuario.id_usuario || usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

      res.json({
        message: 'Inicio de sesión exitoso.',
        token,
        usuario: payload,
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },
};

module.exports = authController;
