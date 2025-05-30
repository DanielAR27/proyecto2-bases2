// tests/unit/restaurant.controller.test.js
const restaurantController = require('../../src/controllers/restaurantController');
const RestaurantDAO = require('../../src/dao/restaurantDAO');
const redisClient = require('../../src/config/redis');

// Mock del DAO y Redis
jest.mock('../../src/dao/restaurantDAO');
jest.mock('../../src/config/redis');

describe('Restaurant Controller - Unit Tests', () => {
  let req, res;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock de console.error para evitar ruido
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock de request y response
    req = {
      body: {},
      params: {},
      usuario: { id_usuario: 1, rol: 'administrador' }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Mock de redisClient
    redisClient.get.mockResolvedValue(null);
    redisClient.set.mockResolvedValue('OK');
    redisClient.del.mockResolvedValue(1);
  });
  
  afterEach(() => {
    console.error.mockRestore();
  });
  
  describe('createRestaurant', () => {
    test('debe crear un restaurante correctamente', async () => {
      // Arrange
      req.body = { nombre: 'Restaurante Test', direccion: 'Calle Test 123' };
      const nuevoRestaurante = { id_restaurante: 1, ...req.body, id_admin: 1 };
      RestaurantDAO.createRestaurant.mockResolvedValue(nuevoRestaurante);
      
      // Act
      await restaurantController.createRestaurant(req, res);
      
      // Assert
      expect(RestaurantDAO.createRestaurant).toHaveBeenCalledWith({
        nombre: 'Restaurante Test',
        direccion: 'Calle Test 123',
        id_admin: 1
      });
      expect(redisClient.del).toHaveBeenCalledWith('restaurants:all');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Restaurante creado correctamente.',
        restaurante: nuevoRestaurante
      });
    });
    
    test('debe devolver 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';
      
      // Act
      await restaurantController.createRestaurant(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden crear restaurantes.'
      });
      expect(RestaurantDAO.createRestaurant).not.toHaveBeenCalled();
    });
    
    test('debe devolver 400 si faltan campos requeridos', async () => {
      // Arrange
      req.body = { nombre: 'Restaurante Test' }; // Sin dirección
      
      // Act
      await restaurantController.createRestaurant(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Nombre y dirección son obligatorios.'
      });
      expect(RestaurantDAO.createRestaurant).not.toHaveBeenCalled();
    });
  });
  
  describe('getAllRestaurants', () => {
    test('debe obtener restaurantes de la base de datos y guardar en caché', async () => {
      // Arrange
      const restaurantes = [
        { id_restaurante: 1, nombre: 'Restaurante 1', direccion: 'Dirección 1' },
        { id_restaurante: 2, nombre: 'Restaurante 2', direccion: 'Dirección 2' }
      ];
      RestaurantDAO.getAllRestaurants.mockResolvedValue(restaurantes);
      
      // Act
      await restaurantController.getAllRestaurants(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('restaurants:all');
      expect(RestaurantDAO.getAllRestaurants).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalledWith(
        'restaurants:all',
        JSON.stringify(restaurantes),
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(restaurantes);
    });
    
    test('debe obtener restaurantes desde caché si están disponibles', async () => {
      // Arrange
      const restaurantesCache = [
        { id_restaurante: 1, nombre: 'Restaurante Caché', direccion: 'Dirección Caché' }
      ];
      redisClient.get.mockResolvedValue(JSON.stringify(restaurantesCache));
      
      // Act
      await restaurantController.getAllRestaurants(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('restaurants:all');
      expect(RestaurantDAO.getAllRestaurants).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(restaurantesCache);
    });
  });
  
  describe('getRestaurantById', () => {
    test('debe obtener un restaurante por ID desde la base de datos', async () => {
      // Arrange
      req.params.id = '1';
      const restaurante = { id_restaurante: 1, nombre: 'Restaurante Test', direccion: 'Dirección Test' };
      RestaurantDAO.findById.mockResolvedValue(restaurante);
      
      // Act
      await restaurantController.getRestaurantById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('restaurant:1');
      expect(RestaurantDAO.findById).toHaveBeenCalledWith('1');
      expect(redisClient.set).toHaveBeenCalledWith(
        'restaurant:1',
        JSON.stringify(restaurante),
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(restaurante);
    });
    
    test('debe obtener un restaurante desde caché si está disponible', async () => {
      // Arrange
      req.params.id = '1';
      const restauranteCache = { id_restaurante: 1, nombre: 'Restaurante Caché', direccion: 'Dirección Caché' };
      redisClient.get.mockResolvedValue(JSON.stringify(restauranteCache));
      
      // Act
      await restaurantController.getRestaurantById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('restaurant:1');
      expect(RestaurantDAO.findById).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(restauranteCache);
    });
    
    test('debe devolver 404 si el restaurante no existe', async () => {
      // Arrange
      req.params.id = '999';
      RestaurantDAO.findById.mockResolvedValue(null);
      
      // Act
      await restaurantController.getRestaurantById(req, res);
      
      // Assert
      expect(RestaurantDAO.findById).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Restaurante no encontrado.' });
      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });
  
  describe('updateRestaurant', () => {
    beforeEach(() => {
      req.params.id = '1';
      req.body = { nombre: 'Restaurante Actualizado', direccion: 'Dirección Actualizada' };
      const restauranteExistente = { id_restaurante: 1, nombre: 'Restaurante Viejo', direccion: 'Dirección Vieja' };
      RestaurantDAO.findById.mockResolvedValue(restauranteExistente);
    });
    
    test('debe actualizar un restaurante correctamente', async () => {
      // Arrange
      const restauranteActualizado = { ...req.body, id_restaurante: 1 };
      RestaurantDAO.updateRestaurant.mockResolvedValue(restauranteActualizado);
      
      // Act
      await restaurantController.updateRestaurant(req, res);
      
      // Assert
      expect(RestaurantDAO.findById).toHaveBeenCalledWith('1');
      expect(RestaurantDAO.updateRestaurant).toHaveBeenCalledWith('1', req.body);
      expect(redisClient.del).toHaveBeenCalledWith('restaurant:1');
      expect(redisClient.del).toHaveBeenCalledWith('restaurants:all');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Restaurante actualizado correctamente.',
        restaurante: restauranteActualizado
      });
    });
    
    test('debe devolver 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';
      
      // Act
      await restaurantController.updateRestaurant(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden actualizar restaurantes.'
      });
      expect(RestaurantDAO.updateRestaurant).not.toHaveBeenCalled();
    });
    
    test('debe devolver 400 si faltan campos requeridos', async () => {
      // Arrange
      req.body = { nombre: 'Solo Nombre' }; // Sin dirección
      
      // Act
      await restaurantController.updateRestaurant(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Nombre y dirección son obligatorios.'
      });
      expect(RestaurantDAO.updateRestaurant).not.toHaveBeenCalled();
    });
    
    test('debe devolver 404 si el restaurante no existe', async () => {
      // Arrange
      RestaurantDAO.findById.mockResolvedValue(null);
      
      // Act
      await restaurantController.updateRestaurant(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Restaurante no encontrado.' });
      expect(RestaurantDAO.updateRestaurant).not.toHaveBeenCalled();
    });
  });
  
  describe('deleteRestaurant', () => {
    test('debe eliminar un restaurante correctamente', async () => {
      // Arrange
      req.params.id = '1';
      RestaurantDAO.deleteRestaurant.mockResolvedValue(true);
      
      // Act
      await restaurantController.deleteRestaurant(req, res);
      
      // Assert
      expect(RestaurantDAO.deleteRestaurant).toHaveBeenCalledWith('1');
      expect(redisClient.del).toHaveBeenCalledWith('restaurant:1');
      expect(redisClient.del).toHaveBeenCalledWith('restaurants:all');
      expect(redisClient.del).toHaveBeenCalledWith('menus:all');
      expect(redisClient.del).toHaveBeenCalledWith('products:all');
      expect(redisClient.del).toHaveBeenCalledWith('reservas:all');
      expect(redisClient.del).toHaveBeenCalledWith('pedidos:all');
      expect(res.json).toHaveBeenCalledWith({ message: 'Restaurante eliminado correctamente.' });
    });
    
    test('debe devolver 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';
      
      // Act
      await restaurantController.deleteRestaurant(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden eliminar restaurantes.'
      });
      expect(RestaurantDAO.deleteRestaurant).not.toHaveBeenCalled();
    });
    
    test('debe devolver 404 si el restaurante no existe', async () => {
      // Arrange
      req.params.id = '999';
      RestaurantDAO.deleteRestaurant.mockResolvedValue(false);
      
      // Act
      await restaurantController.deleteRestaurant(req, res);
      
      // Assert
      expect(RestaurantDAO.deleteRestaurant).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Restaurante no encontrado.' });
      expect(redisClient.del).not.toHaveBeenCalled();
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