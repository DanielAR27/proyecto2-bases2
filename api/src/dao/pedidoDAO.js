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
             RETURNING id_producto, cantidad, subtotal`,
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
        detalles: detalles.map(detalle => ({
          ...detalle,
          subtotal: parseFloat(detalle.subtotal)
        }))
      });
      const savedPedido = await pedido.save();
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_pedido: savedPedido.id_pedido,
        id_usuario: savedPedido.id_usuario,
        id_restaurante: savedPedido.id_restaurante,
        estado: savedPedido.estado,
        tipo: savedPedido.tipo,
        fecha_hora: savedPedido.fecha_hora,
        detalles: savedPedido.detalles.map(detalle => ({
          id_producto: detalle.id_producto,
          cantidad: detalle.cantidad,
          subtotal: parseFloat(detalle.subtotal)
        }))
      };
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
          id_producto: detalle.id_producto,
          cantidad: detalle.cantidad,
          subtotal: parseFloat(detalle.subtotal)
        }));
      }
      
      return pedidos;
    } else if (dbType === 'mongo') {
      const pedidos = await PedidoModelMongo.find()
        .sort({ fecha_hora: -1 })
        .lean();
      
      // Retornar en formato consistente con PostgreSQL
      return pedidos.map(pedido => ({
        id_pedido: pedido.id_pedido,
        id_usuario: pedido.id_usuario,
        id_restaurante: pedido.id_restaurante,
        id_repartidor: pedido.id_repartidor || null,
        estado: pedido.estado,
        tipo: pedido.tipo,
        fecha_hora: pedido.fecha_hora,
        detalles: pedido.detalles ? pedido.detalles.map(detalle => ({
          id_producto: detalle.id_producto,
          cantidad: detalle.cantidad,
          subtotal: parseFloat(detalle.subtotal)
        })) : []
      }));
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
        id_producto: detalle.id_producto,
        cantidad: detalle.cantidad,
        subtotal: parseFloat(detalle.subtotal)
      }));

      return { ...pedido.rows[0], detalles: detallesConvertidos };
    } else if (dbType === 'mongo') {
      const pedido = await PedidoModelMongo.findOne({ id_pedido }).lean();
      
      if (!pedido) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_pedido: pedido.id_pedido,
        id_usuario: pedido.id_usuario,
        id_restaurante: pedido.id_restaurante,
        id_repartidor: pedido.id_repartidor || null,
        estado: pedido.estado,
        tipo: pedido.tipo,
        fecha_hora: pedido.fecha_hora,
        detalles: pedido.detalles ? pedido.detalles.map(detalle => ({
          id_producto: detalle.id_producto,
          cantidad: detalle.cantidad,
          subtotal: parseFloat(detalle.subtotal)
        })) : []
      };
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
      const resultado = await PedidoModelMongo.findOneAndDelete({ id_pedido });
      return resultado !== null;
    }
  },

  // Asignar repartidor a un pedido
  async assignDriver(id_pedido, id_repartidor) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Pedido 
         SET id_repartidor = $1
         WHERE id_pedido = $2
         RETURNING id_pedido, id_usuario, id_restaurante, id_repartidor, estado, tipo, fecha_hora`,
        [id_repartidor, id_pedido]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const pedido = await PedidoModelMongo.findOneAndUpdate(
        { id_pedido },
        { id_repartidor },
        { new: true, runValidators: true }
      ).lean();
      
      if (!pedido) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_pedido: pedido.id_pedido,
        id_usuario: pedido.id_usuario,
        id_restaurante: pedido.id_restaurante,
        id_repartidor: pedido.id_repartidor,
        estado: pedido.estado,
        tipo: pedido.tipo,
        fecha_hora: pedido.fecha_hora
      };
    }
  },

  // Obtener pedidos asignados a un repartidor
  async findByDriver(id_repartidor) {
    if (dbType === 'postgres') {
      const pedidosResult = await pool.query(
        `SELECT * FROM Pedido 
         WHERE id_repartidor = $1 
         AND estado IN ('pendiente', 'en preparacion', 'listo')
         ORDER BY fecha_hora ASC`,
        [id_repartidor]
      );
      
      const pedidos = pedidosResult.rows;
      
      // Agregar detalles a cada pedido
      for (const pedido of pedidos) {
        const detallesResult = await pool.query(
          `SELECT id_producto, cantidad, subtotal
           FROM Detalle_Pedido WHERE id_pedido = $1`,
          [pedido.id_pedido]
        );
        
        pedido.detalles = detallesResult.rows.map(detalle => ({
          id_producto: detalle.id_producto,
          cantidad: detalle.cantidad,
          subtotal: parseFloat(detalle.subtotal)
        }));
      }
      
      return pedidos;
    } else if (dbType === 'mongo') {
      const pedidos = await PedidoModelMongo.find({ 
        id_repartidor,
        estado: { $in: ['pendiente', 'en preparacion', 'listo'] }
      })
      .sort({ fecha_hora: 1 })
      .lean();

      // Retornar en formato consistente con PostgreSQL
      return pedidos.map(pedido => ({
        id_pedido: pedido.id_pedido,
        id_usuario: pedido.id_usuario,
        id_restaurante: pedido.id_restaurante,
        id_repartidor: pedido.id_repartidor,
        estado: pedido.estado,
        tipo: pedido.tipo,
        fecha_hora: pedido.fecha_hora,
        detalles: pedido.detalles ? pedido.detalles.map(detalle => ({
          id_producto: detalle.id_producto,
          cantidad: detalle.cantidad,
          subtotal: parseFloat(detalle.subtotal)
        })) : []
      }));
    }
  },

  // Obtener pedidos pendientes sin repartidor asignado
  async findUnassignedOrders() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT * FROM Pedido 
         WHERE id_repartidor IS NULL 
         AND estado = 'pendiente'
         ORDER BY fecha_hora ASC`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      const pedidos = await PedidoModelMongo.find({
        $or: [
          { id_repartidor: { $exists: false } },
          { id_repartidor: null }
        ],
        estado: 'pendiente'
      })
      .sort({ fecha_hora: 1 })
      .lean();

      // Retornar en formato consistente con PostgreSQL
      return pedidos.map(pedido => ({
        id_pedido: pedido.id_pedido,
        id_usuario: pedido.id_usuario,
        id_restaurante: pedido.id_restaurante,
        id_repartidor: pedido.id_repartidor || null,
        estado: pedido.estado,
        tipo: pedido.tipo,
        fecha_hora: pedido.fecha_hora
      }));
    }
  },

  // Actualizar estado de entrega
  async updateDeliveryStatus(id_pedido, estado) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Pedido 
         SET estado = $1
         WHERE id_pedido = $2
         RETURNING id_pedido, id_usuario, id_restaurante, id_repartidor, estado, tipo, fecha_hora`,
        [estado, id_pedido]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const pedido = await PedidoModelMongo.findOneAndUpdate(
        { id_pedido },
        { estado },
        { new: true, runValidators: true }
      ).lean();
      
      if (!pedido) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_pedido: pedido.id_pedido,
        id_usuario: pedido.id_usuario,
        id_restaurante: pedido.id_restaurante,
        id_repartidor: pedido.id_repartidor || null,
        estado: pedido.estado,
        tipo: pedido.tipo,
        fecha_hora: pedido.fecha_hora
      };
    }
  }
};

module.exports = PedidoDAO;