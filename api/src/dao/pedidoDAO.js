const pool = require('../db/db_postgres');
const PedidoModelMongo = require('../models/pedidoMongoModel');
const dbType = process.env.DB_TYPE || 'postgres';

const PedidoDAO = {
  // Crear pedido con detalles
  async createPedido({ id_usuario, id_restaurante, estado, tipo, detalles }) {
    if (dbType === 'postgres') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const pedidoResult = await client.query(
          `INSERT INTO Pedido (id_usuario, id_restaurante, estado, tipo)
           VALUES ($1, $2, $3, $4)
           RETURNING id_pedido, id_usuario, id_restaurante, estado, tipo, fecha_hora`,
          [id_usuario, id_restaurante, estado, tipo]
        );

        const pedido = pedidoResult.rows[0];
        pedido.detalles = [];

        for (const detalle of detalles) {
          const { id_producto, cantidad, subtotal } = detalle;
          const detalleResult = await client.query(
            `INSERT INTO Detalle_Pedido (id_pedido, id_producto, cantidad, subtotal)
             VALUES ($1, $2, $3, $4)
             RETURNING id_detalle, id_producto, cantidad, subtotal`,
            [pedido.id_pedido, id_producto, cantidad, subtotal]
          );
          
          // Convertir subtotal a número
          const detalleItem = detalleResult.rows[0];
          detalleItem.subtotal = parseFloat(detalleItem.subtotal);
          
          pedido.detalles.push(detalleItem);
        }

        await client.query('COMMIT');
        return pedido;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

    } else if (dbType === 'mongo') {
      const pedido = new PedidoModelMongo({
        id_usuario,
        id_restaurante,
        estado,
        tipo,
        detalles
      });
      return await pedido.save();
    }
  },

  // Obtener todos los pedidos con sus detalles
  async getAllPedidos() {
    if (dbType === 'postgres') {
      // Primero obtenemos todos los pedidos
      const pedidosResult = await pool.query(
        `SELECT * FROM Pedido ORDER BY fecha_hora DESC`
      );
      
      const pedidos = pedidosResult.rows;
      
      // Para cada pedido, obtenemos sus detalles
      for (const pedido of pedidos) {
        const detallesResult = await pool.query(
          `SELECT id_producto, cantidad, subtotal
           FROM Detalle_Pedido WHERE id_pedido = $1`,
          [pedido.id_pedido]
        );
        
        // Convertir subtotal a número en cada detalle
        pedido.detalles = detallesResult.rows.map(detalle => ({
          ...detalle,
          subtotal: parseFloat(detalle.subtotal)
        }));
      }
      
      return pedidos;
    } else if (dbType === 'mongo') {
      return await PedidoModelMongo.find().lean();
    }
  },

  // Obtener pedido por ID
  async findById(id_pedido) {
    if (dbType === 'postgres') {
      const pedido = await pool.query(
        `SELECT * FROM Pedido WHERE id_pedido = $1`,
        [id_pedido]
      );
      if (!pedido.rows.length) return null;

      const detalles = await pool.query(
        `SELECT id_producto, cantidad, subtotal
         FROM Detalle_Pedido WHERE id_pedido = $1`,
        [id_pedido]
      );
      
      // Convertir subtotal a número en cada detalle
      const detallesConvertidos = detalles.rows.map(detalle => ({
        ...detalle,
        subtotal: parseFloat(detalle.subtotal)
      }));

      return { ...pedido.rows[0], detalles: detallesConvertidos };
    } else if (dbType === 'mongo') {
      return await PedidoModelMongo.findOne({ id_pedido }).lean();
    }
  },

  // Eliminar pedido (y sus detalles automáticamente si es SQL)
  async deletePedido(id_pedido) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `DELETE FROM Pedido WHERE id_pedido = $1 RETURNING id_pedido`,
        [id_pedido]
      );
      return result.rowCount > 0;
    } else if (dbType === 'mongo') {
      return await PedidoModelMongo.findOneAndDelete({ id_pedido });
    }
  }
};

module.exports = PedidoDAO;