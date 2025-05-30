const pool = require('../db/db_postgres');
const ProductModelMongo = require('../models/productMongoModel');
const dbType = process.env.DB_TYPE || 'postgres';

const ProductDAO = {
  // Crear producto
  async createProduct({ nombre, categoria, descripcion, precio, id_menu }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `INSERT INTO Producto (nombre, categoria, descripcion, precio, id_menu)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_producto, nombre, categoria, descripcion, precio, id_menu`,
        [nombre, categoria, descripcion || 'Producto sin descripción', precio, id_menu]
      );
      const producto = result.rows[0];
      if (producto) {
        producto.precio = parseFloat(producto.precio);
      }
      return producto;
    } else if (dbType === 'mongo') {
      const producto = new ProductModelMongo({
        nombre,
        categoria,
        descripcion,
        precio,
        id_menu
      });
      return await producto.save();
    }
  },

  // Obtener todos los productos
  async getAllProducts() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_producto, nombre, categoria, descripcion, precio, id_menu FROM Producto`
      );
      return result.rows.map(producto => ({
        ...producto,
        precio: parseFloat(producto.precio)
      }));
    } else if (dbType === 'mongo') {
      return await ProductModelMongo.find({}, 'id_producto nombre categoria descripcion precio id_menu').lean();
    }
  },

  // Buscar producto por ID
  async findById(id_producto) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_producto, nombre, categoria, descripcion, precio, id_menu
         FROM Producto
         WHERE id_producto = $1`,
        [id_producto]
      );
      const producto = result.rows[0];
      if (producto) {
        producto.precio = parseFloat(producto.precio);
      }
      return producto;
    } else if (dbType === 'mongo') {
      return await ProductModelMongo.findOne({ id_producto }).lean();
    }
  },

  // Actualizar producto
  async updateProduct(id_producto, { nombre, categoria, descripcion, precio }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Producto
         SET nombre = $1, categoria = $2, descripcion = $3, precio = $4
         WHERE id_producto = $5
         RETURNING id_producto, nombre, categoria, descripcion, precio, id_menu`,
        [nombre, categoria, descripcion, precio, id_producto]
      );
      const producto = result.rows[0];
      if (producto) {
        producto.precio = parseFloat(producto.precio);
      }
      return producto;
    } else if (dbType === 'mongo') {
      return await ProductModelMongo.findOneAndUpdate(
        { id_producto },
        { nombre, categoria, descripcion, precio },
        { new: true, runValidators: true }
      ).lean();
    }
  },

  // Eliminar producto
  async deleteProduct(id_producto) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `DELETE FROM Producto
         WHERE id_producto = $1
         RETURNING id_producto`,
        [id_producto]
      );
      return result.rowCount > 0;
    } else if (dbType === 'mongo') {
      return await ProductModelMongo.findOneAndDelete({ id_producto });
    }
  },
};

module.exports = ProductDAO;