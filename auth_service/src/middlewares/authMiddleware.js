// src/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const token = req.header('Authorization');
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No hay token.' });
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.usuario = decoded; // Se guarda el usuario decodificado en el request
    next(); // Continuamos
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { verificarToken };
