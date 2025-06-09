const axios = require("axios");

module.exports = async (req, res, next) => {
  const token = req.header("Authorization");

  // Si no hay token, "solo continuar sin usuario"
  if (!token) {
    req.user = null; // Esto permite evaluar después si hay user
    return next();
  }

  try {
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/auth/verify`, {
      headers: {
        Authorization: token
      }
    });

    req.usuario = response.data.usuario;
    next();
  } catch (error) {
    console.error("Error al verificar token con auth_service:", error.message);
    // También permitir continuar sin usuario
    req.usuario = null;
    next();
  }
};
