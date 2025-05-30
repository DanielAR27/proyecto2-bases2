// tests/unit/product.unit.test.js
const productController = require('../../src/controllers/productController');
const ProductDAO = require('../../src/dao/productDAO');
const redisClient = require('../../src/config/redis');
const axios = require('axios');

// Mock completos
jest.mock('../../src/dao/productDAO');
jest.mock('../../src/config/redis');
jest.mock('axios');

describe('ProductController Unit Tests', () => {
  let req, res;
  
  beforeEach(() => {
    // Reset todos los mocks
    jest.clearAllMocks();
    
    // Mock de process.env
    process.env.SEARCH_SERVICE_URL = 'http://search-service.test';
    
    // Mock request y response
    req = {
      body: {},
      params: {},
      usuario: { id_usuario: 1, rol: 'administrador' },
      headers: { authorization: 'Bearer test-token' }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Mock redis
    redisClient.get.mockResolvedValue(null);
    redisClient.set.mockResolvedValue('OK');
    redisClient.del.mockResolvedValue(1);
    
    // Mock axios
    axios.post.mockResolvedValue({ data: { message: 'Producto indexado' } });
    axios.put.mockResolvedValue({ data: { message: 'Producto actualizado' } });
    axios.delete.mockResolvedValue({ data: { message: 'Producto eliminado' } });
    
    // Silenciar console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    console.error.mockRestore();
  });

  // TESTS CREAR PRODUCTO
  describe('createProduct', () => {
    test('crea producto exitosamente con datos válidos', async () => {
      // Arrange
      req.body = {
        nombre: 'Producto Test',
        categoria: 'Categoría Test',
        descripcion: 'Descripción test',
        precio: 1000,
        id_menu: 1
      };
      
      const mockProducto = { 
        id_producto: 1, 
        ...req.body 
      };
      
      ProductDAO.createProduct.mockResolvedValue(mockProducto);
      
      // Act
      await productController.createProduct(req, res);
      
      // Assert
      expect(ProductDAO.createProduct).toHaveBeenCalledWith(req.body);
      expect(axios.post).toHaveBeenCalledWith(
        `${process.env.SEARCH_SERVICE_URL}/search/product`,
        mockProducto,
        expect.objectContaining({
          headers: { Authorization: req.headers.authorization }
        })
      );
      expect(redisClient.del).toHaveBeenCalledWith('products:all');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Producto creado.',
        producto: mockProducto
      });
    });
    
    test('maneja error al indexar en búsqueda sin interrumpir flujo', async () => {
      // Arrange
      req.body = {
        nombre: 'Producto Test',
        categoria: 'Categoría Test',
        descripcion: 'Descripción test',
        precio: 1000,
        id_menu: 1
      };
      
      const mockProducto = { id_producto: 1, ...req.body };
      
      ProductDAO.createProduct.mockResolvedValue(mockProducto);
      axios.post.mockRejectedValue(new Error('Error de conexión'));
      
      // Act
      await productController.createProduct(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(console.error).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Producto creado.',
        producto: mockProducto
      });
    });
    
    test('retorna 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';
      
      // Act
      await productController.createProduct(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Solo administradores pueden crear productos.' 
      });
      expect(ProductDAO.createProduct).not.toHaveBeenCalled();
    });
    
    test('retorna 400 si faltan campos requeridos', async () => {
      // Arrange - Missing categoria
      req.body = { 
        nombre: 'Producto Test',
        precio: 1000,
        id_menu: 1
      };
      
      // Act
      await productController.createProduct(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Faltan campos requeridos.' 
      });
      
      // Arrange - Missing precio
      req.body = { 
        nombre: 'Producto Test',
        categoria: 'Categoría Test',
        id_menu: 1
      };
      
      // Act
      await productController.createProduct(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // TESTS OBTENER TODOS LOS PRODUCTOS
  describe('getAllProducts', () => {
    test('retorna productos desde la base de datos y guarda en caché', async () => {
      // Arrange
      const mockProductos = [
        { id_producto: 1, nombre: 'Producto 1', categoria: 'Cat 1', precio: 1000 },
        { id_producto: 2, nombre: 'Producto 2', categoria: 'Cat 2', precio: 2000 }
      ];
      
      ProductDAO.getAllProducts.mockResolvedValue(mockProductos);
      
      // Act
      await productController.getAllProducts(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('products:all');
      expect(ProductDAO.getAllProducts).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalledWith(
        'products:all', 
        JSON.stringify(mockProductos), 
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(mockProductos);
    });
    
    test('retorna productos desde caché si están disponibles', async () => {
      // Arrange
      const cachedProductos = [
        { id_producto: 1, nombre: 'Producto Caché', categoria: 'Cat', precio: 1000 }
      ];
      
      redisClient.get.mockResolvedValue(JSON.stringify(cachedProductos));
      
      // Act
      await productController.getAllProducts(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('products:all');
      expect(ProductDAO.getAllProducts).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedProductos);
    });
  });

  // TESTS OBTENER PRODUCTO POR ID
  describe('getProductById', () => {
    test('retorna producto desde base de datos y guarda en caché', async () => {
      // Arrange
      req.params.id = '1';
      const mockProducto = { 
        id_producto: 1, 
        nombre: 'Producto Test', 
        categoria: 'Cat',
        precio: 1000
      };
      
      ProductDAO.findById.mockResolvedValue(mockProducto);
      
      // Act
      await productController.getProductById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('product:1');
      expect(ProductDAO.findById).toHaveBeenCalledWith('1');
      expect(redisClient.set).toHaveBeenCalledWith(
        'product:1', 
        JSON.stringify(mockProducto), 
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(mockProducto);
    });
    
    test('retorna producto desde caché si disponible', async () => {
      // Arrange
      req.params.id = '1';
      const cachedProducto = { 
        id_producto: 1, 
        nombre: 'Producto Caché',
        categoria: 'Cat',
        precio: 1000
      };
      
      redisClient.get.mockResolvedValue(JSON.stringify(cachedProducto));
      
      // Act
      await productController.getProductById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('product:1');
      expect(ProductDAO.findById).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedProducto);
    });
    
    test('retorna 404 si el producto no existe', async () => {
      // Arrange
      req.params.id = '999';
      ProductDAO.findById.mockResolvedValue(null);
      
      // Act
      await productController.getProductById(req, res);
      
      // Assert
      expect(ProductDAO.findById).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Producto no encontrado.' });
      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });

  // TESTS ACTUALIZAR PRODUCTO
  describe('updateProduct', () => {
    test('actualiza producto exitosamente', async () => {
      // Arrange
      req.params.id = '1';
      req.body = { 
        nombre: 'Producto Actualizado', 
        categoria: 'Nueva Cat',
        descripcion: 'Nueva descripción',
        precio: 1500
      };
      
      const updatedProducto = { 
        id_producto: 1, 
        ...req.body
      };
      
      ProductDAO.updateProduct.mockResolvedValue(updatedProducto);
      
      // Act
      await productController.updateProduct(req, res);
      
      // Assert
      expect(ProductDAO.updateProduct).toHaveBeenCalledWith('1', req.body);
      expect(axios.put).toHaveBeenCalledWith(
        `${process.env.SEARCH_SERVICE_URL}/search/product/1`,
        updatedProducto,
        expect.objectContaining({
          headers: { Authorization: req.headers.authorization }
        })
      );
      expect(redisClient.del).toHaveBeenCalledWith('product:1');
      expect(redisClient.del).toHaveBeenCalledWith('products:all');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Producto actualizado.',
        producto: updatedProducto
      });
    });
    
    test('maneja error al actualizar en búsqueda sin interrumpir flujo', async () => {
      // Arrange
      req.params.id = '1';
      req.body = { 
        nombre: 'Producto Actualizado', 
        categoria: 'Nueva Cat',
        precio: 1500
      };
      
      const updatedProducto = { id_producto: 1, ...req.body };
      
      ProductDAO.updateProduct.mockResolvedValue(updatedProducto);
      axios.put.mockRejectedValue(new Error('Error de conexión'));
      
      // Act
      await productController.updateProduct(req, res);
      
      // Assert
      expect(console.error).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Producto actualizado.',
        producto: updatedProducto
      });
    });
    
    test('retorna 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';
      req.params.id = '1';
      req.body = { nombre: 'Producto Test' };
      
      // Act
      await productController.updateProduct(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo administradores pueden actualizar productos.'
      });
      expect(ProductDAO.updateProduct).not.toHaveBeenCalled();
    });
    
    test('retorna 404 si el producto no existe', async () => {
      // Arrange
      req.params.id = '999';
      req.body = { nombre: 'Producto Inexistente' };
      
      ProductDAO.updateProduct.mockResolvedValue(null);
      
      // Act
      await productController.updateProduct(req, res);
      
      // Assert
      expect(ProductDAO.updateProduct).toHaveBeenCalledWith('999', req.body);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Producto no encontrado.' });
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });

  // TESTS ELIMINAR PRODUCTO
  describe('deleteProduct', () => {
    test('elimina producto exitosamente', async () => {
      // Arrange
      req.params.id = '1';
      ProductDAO.deleteProduct.mockResolvedValue(true);
      
      // Act
      await productController.deleteProduct(req, res);
      
      // Assert
      expect(ProductDAO.deleteProduct).toHaveBeenCalledWith('1');
      expect(axios.delete).toHaveBeenCalledWith(
        `${process.env.SEARCH_SERVICE_URL}/search/product/1`,
        expect.objectContaining({
          headers: { Authorization: req.headers.authorization }
        })
      );
      expect(redisClient.del).toHaveBeenCalledWith('product:1');
      expect(redisClient.del).toHaveBeenCalledWith('products:all');
      expect(redisClient.del).toHaveBeenCalledWith('pedidos:all');
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto eliminado correctamente.' });
    });
    
    test('maneja error al eliminar en búsqueda sin interrumpir flujo', async () => {
      // Arrange
      req.params.id = '1';
      ProductDAO.deleteProduct.mockResolvedValue(true);
      axios.delete.mockRejectedValue(new Error('Error de conexión'));
      
      // Act
      await productController.deleteProduct(req, res);
      
      // Assert
      expect(console.error).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto eliminado correctamente.' });
    });
    
    test('retorna 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';
      req.params.id = '1';
      
      // Act
      await productController.deleteProduct(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo administradores pueden eliminar productos.'
      });
      expect(ProductDAO.deleteProduct).not.toHaveBeenCalled();
    });
    
    test('retorna 404 si el producto no existe', async () => {
      // Arrange
      req.params.id = '999';
      ProductDAO.deleteProduct.mockResolvedValue(false);
      
      // Act
      await productController.deleteProduct(req, res);
      
      // Assert
      expect(ProductDAO.deleteProduct).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Producto no encontrado.' });
      expect(redisClient.del).not.toHaveBeenCalled();
    });
    
    test('ignora errores 404 del servicio de búsqueda', async () => {
      // Arrange
      req.params.id = '1';
      ProductDAO.deleteProduct.mockResolvedValue(true);
      
      // Mock para simular respuesta 404 del servicio de búsqueda
      axios.delete.mockImplementation(() => {
        const error = new Error('Not found');
        error.response = { status: 404 };
        throw error;
      });
      
      // Act
      await productController.deleteProduct(req, res);
      
      // Assert - El controlador debería funcionar a pesar del error 404
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto eliminado correctamente.' });
    });
  });

    // Modifica tu afterAll en product.unit.test.js
    afterAll(async () => {
    // Restaura console.error si se ha mockeado
    if (console.error.mockRestore) {
        console.error.mockRestore();
    }

    // Detener cualquier operación asíncrona pendiente
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Esto fuerza a Jest a esperar antes de terminar
    await new Promise(process.nextTick);
    });
});