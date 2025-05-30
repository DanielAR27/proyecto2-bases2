// tests/unit/pedido.unit.test.js
const pedidoController = require('../../src/controllers/pedidoController');
const PedidoDAO = require('../../src/dao/pedidoDAO');
const ProductDAO = require('../../src/dao/productDAO');
const redisClient = require('../../src/config/redis');

// Mock completos
jest.mock('../../src/dao/pedidoDAO');
jest.mock('../../src/dao/productDAO');
jest.mock('../../src/config/redis');

describe('PedidoController Unit Tests', () => {
  let req, res;
  
  beforeEach(() => {
    // Reset todos los mocks
    jest.clearAllMocks();
    
    // Mock request y response
    req = {
      body: {},
      params: {},
      usuario: { id_usuario: 1, rol: 'administrador' }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Mock redis
    redisClient.get.mockResolvedValue(null);
    redisClient.set.mockResolvedValue('OK');
    redisClient.del.mockResolvedValue(1);
    
    // Silenciar console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    console.error.mockRestore();
  });
  
  // Para evitar el error de "Cannot log after tests are done"
  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await new Promise(process.nextTick);
  });

  // TESTS CREAR PEDIDO
  describe('createPedido', () => {
    test('crea pedido exitosamente con datos válidos', async () => {
      // Arrange
      req.body = {
        id_usuario: 1,
        id_restaurante: 1,
        tipo: 'para recoger',
        productos: [
          { id_producto: 1, cantidad: 2 },
          { id_producto: 2, cantidad: 1 }
        ]
      };
      
      // Mock productos
      const productos = [
        { id_producto: 1, nombre: 'Producto 1', precio: 1000 },
        { id_producto: 2, nombre: 'Producto 2', precio: 2000 }
      ];
      
      ProductDAO.findById.mockImplementation(id => 
        productos.find(p => p.id_producto === id) || null
      );
      
      const mockPedido = { 
        id_pedido: 1, 
        id_usuario: 1,
        id_restaurante: 1,
        tipo: 'para recoger',
        estado: 'pendiente',
        detalles: [
          { id_producto: 1, cantidad: 2, subtotal: 2000 },
          { id_producto: 2, cantidad: 1, subtotal: 2000 }
        ]
      };
      
      PedidoDAO.createPedido.mockResolvedValue(mockPedido);
      
      // Act
      await pedidoController.createPedido(req, res);
      
      // Assert
      expect(ProductDAO.findById).toHaveBeenCalledTimes(2);
      expect(PedidoDAO.createPedido).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalledWith('pedidos:all');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Pedido creado exitosamente.',
        pedido: mockPedido
      });
    });
    
    test('retorna 403 si cliente intenta crear pedido para otro usuario', async () => {
      // Arrange
      req.usuario = { id_usuario: 1, rol: 'cliente' };
      req.body = {
        id_usuario: 2, // Otro usuario
        id_restaurante: 1,
        tipo: 'para recoger',
        productos: [{ id_producto: 1, cantidad: 1 }]
      };
      
      // Act
      await pedidoController.createPedido(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'No autorizado para crear pedidos para otros usuarios.' 
      });
      expect(PedidoDAO.createPedido).not.toHaveBeenCalled();
    });
    
    test('retorna 400 si faltan campos requeridos', async () => {
      // Arrange - sin tipo
      req.body = { 
        id_usuario: 1,
        id_restaurante: 1,
        productos: [{ id_producto: 1, cantidad: 1 }]
      };
      
      // Act
      await pedidoController.createPedido(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Datos incompletos o inválidos.' 
      });
      
      // Arrange - sin productos
      req.body = { 
        id_usuario: 1,
        id_restaurante: 1,
        tipo: 'para recoger'
      };
      
      // Act
      await pedidoController.createPedido(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('retorna 400 si productos tiene formato inválido', async () => {
      // Arrange - cantidad incorrecta
      req.body = { 
        id_usuario: 1,
        id_restaurante: 1,
        tipo: 'para recoger',
        productos: [{ id_producto: 1, cantidad: 0 }] // cantidad 0
      };
      
      // Act
      await pedidoController.createPedido(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Producto inválido o cantidad incorrecta.' 
      });
    });
    
    test('retorna 404 si un producto no existe', async () => {
      // Arrange
      req.body = { 
        id_usuario: 1,
        id_restaurante: 1,
        tipo: 'para recoger',
        productos: [{ id_producto: 999, cantidad: 1 }] // Producto inexistente
      };
      
      ProductDAO.findById.mockResolvedValue(null);
      
      // Act
      await pedidoController.createPedido(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Producto con ID 999 no encontrado.' 
      });
    });
  });

  // TESTS OBTENER TODOS LOS PEDIDOS
  describe('getAllPedidos', () => {
    test('retorna pedidos desde la base de datos y guarda en caché', async () => {
      // Arrange
      const mockPedidos = [
        { id_pedido: 1, id_usuario: 1, tipo: 'para recoger' },
        { id_pedido: 2, id_usuario: 2, tipo: 'en restaurante' }
      ];
      
      PedidoDAO.getAllPedidos.mockResolvedValue(mockPedidos);
      
      // Act
      await pedidoController.getAllPedidos(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('pedidos:all');
      expect(PedidoDAO.getAllPedidos).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalledWith(
        'pedidos:all', 
        JSON.stringify(mockPedidos), 
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(mockPedidos);
    });
    
    test('retorna pedidos desde caché si están disponibles', async () => {
      // Arrange
      const cachedPedidos = [
        { id_pedido: 1, id_usuario: 1, tipo: 'para recoger' }
      ];
      
      redisClient.get.mockResolvedValue(JSON.stringify(cachedPedidos));
      
      // Act
      await pedidoController.getAllPedidos(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('pedidos:all');
      expect(PedidoDAO.getAllPedidos).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedPedidos);
    });
  });

  // TESTS OBTENER PEDIDO POR ID
  describe('getPedidoById', () => {
    test('retorna pedido desde base de datos y guarda en caché', async () => {
      // Arrange
      req.params.id = '1';
      const mockPedido = { 
        id_pedido: 1, 
        id_usuario: 1, 
        tipo: 'para recoger' 
      };
      
      PedidoDAO.findById.mockResolvedValue(mockPedido);
      
      // Act
      await pedidoController.getPedidoById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('pedido:1');
      expect(PedidoDAO.findById).toHaveBeenCalledWith('1');
      expect(redisClient.set).toHaveBeenCalledWith(
        'pedido:1', 
        JSON.stringify(mockPedido), 
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(mockPedido);
    });
    
    test('retorna pedido desde caché si disponible', async () => {
      // Arrange
      req.params.id = '1';
      const cachedPedido = { 
        id_pedido: 1, 
        id_usuario: 1, 
        tipo: 'para recoger'
      };
      
      redisClient.get.mockResolvedValue(JSON.stringify(cachedPedido));
      
      // Act
      await pedidoController.getPedidoById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('pedido:1');
      expect(PedidoDAO.findById).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedPedido);
    });
    
    test('retorna 404 si el pedido no existe', async () => {
      // Arrange
      req.params.id = '999';
      PedidoDAO.findById.mockResolvedValue(null);
      
      // Act
      await pedidoController.getPedidoById(req, res);
      
      // Assert
      expect(PedidoDAO.findById).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pedido no encontrado.' });
      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });

  // TESTS ELIMINAR PEDIDO
  describe('deletePedido', () => {
    beforeEach(() => {
      // Setup común para pruebas de eliminación
      req.params.id = '1';
      req.usuario = { id_usuario: 1, rol: 'cliente' };
      
      const existingPedido = {
        id_pedido: 1,
        id_usuario: 1,
        tipo: 'para recoger'
      };
      
      PedidoDAO.findById.mockResolvedValue(existingPedido);
      PedidoDAO.deletePedido.mockResolvedValue(true);
    });
    
    test('elimina pedido exitosamente como propietario', async () => {
      // Act
      await pedidoController.deletePedido(req, res);
      
      // Assert
      expect(PedidoDAO.deletePedido).toHaveBeenCalledWith('1');
      expect(redisClient.del).toHaveBeenCalledWith('pedido:1');
      expect(redisClient.del).toHaveBeenCalledWith('pedidos:all');
      expect(res.json).toHaveBeenCalledWith({ message: 'Pedido eliminado correctamente.' });
    });
    
    test('elimina pedido exitosamente como administrador', async () => {
      // Arrange
      req.usuario = { id_usuario: 2, rol: 'administrador' };
      
      // Act
      await pedidoController.deletePedido(req, res);
      
      // Assert
      expect(PedidoDAO.deletePedido).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Pedido eliminado correctamente.' });
    });
    
    test('retorna 403 si intenta eliminar pedido de otro usuario sin ser admin', async () => {
      // Arrange
      req.usuario = { id_usuario: 2, rol: 'cliente' };
      
      // Act
      await pedidoController.deletePedido(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No autorizado para eliminar este pedido.'
      });
      expect(PedidoDAO.deletePedido).not.toHaveBeenCalled();
    });
    
    test('retorna 404 si el pedido no existe', async () => {
      // Arrange
      PedidoDAO.findById.mockResolvedValue(null);
      
      // Act
      await pedidoController.deletePedido(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pedido no encontrado.' });
      expect(PedidoDAO.deletePedido).not.toHaveBeenCalled();
    });
    
    test('retorna 500 si no se pudo eliminar el pedido', async () => {
      // Arrange
      PedidoDAO.deletePedido.mockResolvedValue(false);
      
      // Act
      await pedidoController.deletePedido(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pudo eliminar el pedido.' });
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });
});