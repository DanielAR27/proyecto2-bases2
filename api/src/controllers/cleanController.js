const PedidoModel = require('../models/pedidoMongoModel');
const ReservaModel = require('../models/reservationMongoModel');
const RestauranteModel = require('../models/restaurantMongoModel');
const redisClient = require('../config/redis');

const cleanController = {
  async cleanByUser(req, res) {
    const id_usuario = parseInt(req.params.id);

    try {
      const deletedReservas = await ReservaModel.deleteMany({ id_usuario });
      const deletedPedidos = await PedidoModel.deleteMany({ id_usuario });

      // Buscar y eliminar cada restaurante del usuario para activar el middleware
      const restaurantes = await RestauranteModel.find({ id_admin: id_usuario });

      let count = 0;
      for (const restaurante of restaurantes) {
        await RestauranteModel.findOneAndDelete({ id_restaurante: restaurante.id_restaurante });
        count++;
      }

      // Invalidar TODO el caché relacionado con el usuario eliminado
      await redisClient.del(`user:${id_usuario}`);
      
      // Invalidar caché de reservas
      await redisClient.del('reservas:all');
      
      // Invalidar caché de pedidos
      await redisClient.del('pedidos:all');
      
      // Invalidar caché de restaurantes
      await redisClient.del('restaurants:all');
      
      // Invalidar caché de menús
      await redisClient.del('menus:all');
      
      // Invalidar caché de productos
      await redisClient.del('products:all');

      res.status(200).json({
        message: 'Datos del usuario eliminados',
        reservas_eliminadas: deletedReservas.deletedCount,
        pedidos_eliminados: deletedPedidos.deletedCount,
        restaurantes_eliminados: count
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al limpiar datos del usuario.' });
    }
  }
};

module.exports = cleanController;