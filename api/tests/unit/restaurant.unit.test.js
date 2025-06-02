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
 
  describe('getAllRestaurantsWithLocation', () => {
    const redisClient = require('../../src/config/redis');

    beforeEach(() => {
      // Resetear mocks de Redis
      redisClient.get.mockClear();
      redisClient.set.mockClear();
    });

    it('debe devolver todos los restaurantes con ubicación para administradores', async () => {
      // Arrange
      const mockRestaurants = [
        {
          id_restaurante: 1,
          nombre: 'Restaurante Test 1',
          direccion: 'Dirección Test 1',
          id_admin: 1,
          latitud: 9.9281,
          longitud: -84.0907
        },
        {
          id_restaurante: 2,
          nombre: 'Restaurante Test 2',
          direccion: 'Dirección Test 2',
          id_admin: 1,
          latitud: 9.9341,
          longitud: -84.0877
        }
      ];

      // Mock: no hay datos en caché
      redisClient.get.mockResolvedValue(null);
      RestaurantDAO.getAllRestaurantsWithLocation.mockResolvedValue(mockRestaurants);

      // Act
      await restaurantController.getAllRestaurantsWithLocation(req, res);

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('restaurants:geo:all');
      expect(RestaurantDAO.getAllRestaurantsWithLocation).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Restaurantes con ubicación obtenidos correctamente.',
        total: 2,
        restaurantes: mockRestaurants
      });
    });

    it('debe devolver error 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';

      // Act
      await restaurantController.getAllRestaurantsWithLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tiene permisos para acceder a esta información.'
      });
      expect(RestaurantDAO.getAllRestaurantsWithLocation).not.toHaveBeenCalled();
      expect(redisClient.get).not.toHaveBeenCalled();
    });

    it('debe devolver lista vacía si no hay restaurantes con ubicación', async () => {
      // Arrange
      redisClient.get.mockResolvedValue(null);
      RestaurantDAO.getAllRestaurantsWithLocation.mockResolvedValue([]);

      // Act
      await restaurantController.getAllRestaurantsWithLocation(req, res);

      // Assert
      expect(RestaurantDAO.getAllRestaurantsWithLocation).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Restaurantes con ubicación obtenidos correctamente.',
        total: 0,
        restaurantes: []
      });
    });

    it('debe manejar errores de servidor', async () => {
      // Arrange
      redisClient.get.mockResolvedValue(null);
      RestaurantDAO.getAllRestaurantsWithLocation.mockRejectedValue(new Error('DB Error'));

      // Act
      await restaurantController.getAllRestaurantsWithLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error en el servidor.'
      });
    });

    it('debe usar caché si está disponible', async () => {
      // Arrange
      const cachedResponse = {
        message: 'Restaurantes con ubicación obtenidos correctamente.',
        total: 1,
        restaurantes: [{ id_restaurante: 1, nombre: 'Test Restaurant' }]
      };
      
      // Mock: hay datos en caché
      redisClient.get.mockResolvedValue(JSON.stringify(cachedResponse));

      // Act
      await restaurantController.getAllRestaurantsWithLocation(req, res);

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('restaurants:geo:all');
      expect(RestaurantDAO.getAllRestaurantsWithLocation).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedResponse);
    });

    it('debe guardar en caché cuando no hay datos en caché', async () => {
      // Arrange
      const mockRestaurants = [{ id_restaurante: 1, nombre: 'Test Restaurant' }];
      
      // Mock: no hay datos en caché
      redisClient.get.mockResolvedValue(null);
      RestaurantDAO.getAllRestaurantsWithLocation.mockResolvedValue(mockRestaurants);

      // Act
      await restaurantController.getAllRestaurantsWithLocation(req, res);

      // Assert
      const expectedResponse = {
        message: 'Restaurantes con ubicación obtenidos correctamente.',
        total: 1,
        restaurantes: mockRestaurants
      };

      expect(redisClient.get).toHaveBeenCalledWith('restaurants:geo:all');
      expect(RestaurantDAO.getAllRestaurantsWithLocation).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalledWith(
        'restaurants:geo:all',
        JSON.stringify(expectedResponse),
        { EX: 600 }
      );
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
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

  describe('updateRestaurantLocation', () => {
    beforeEach(() => {
      req.params.id = '1';
      req.body = { latitud: 9.9281, longitud: -84.0907 };
      const restauranteExistente = { 
        id_restaurante: 1, 
        nombre: 'Restaurante Test', 
        direccion: 'Dirección Test',
        id_admin: 1
      };
      RestaurantDAO.findById.mockResolvedValue(restauranteExistente);
    });

    it('debe actualizar la ubicación del restaurante correctamente', async () => {
      // Arrange
      const restauranteActualizado = {
        id_restaurante: 1,
        nombre: 'Restaurante Test',
        direccion: 'Dirección Test',
        id_admin: 1,
        latitud: 9.9281,
        longitud: -84.0907
      };
      RestaurantDAO.updateRestaurantLocation.mockResolvedValue(restauranteActualizado);

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(RestaurantDAO.findById).toHaveBeenCalledWith('1');
      expect(RestaurantDAO.updateRestaurantLocation).toHaveBeenCalledWith('1', {
        latitud: 9.9281,
        longitud: -84.0907
      });
      expect(redisClient.del).toHaveBeenCalledWith('restaurant:1');
      expect(redisClient.del).toHaveBeenCalledWith('restaurants:all');
      expect(redisClient.del).toHaveBeenCalledWith('restaurants:geo:all');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ubicación del restaurante actualizada correctamente.',
        restaurante: restauranteActualizado
      });
    });

    it('debe devolver error 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No autorizado para actualizar esta ubicación.'
      });
      expect(RestaurantDAO.findById).not.toHaveBeenCalled();
      expect(RestaurantDAO.updateRestaurantLocation).not.toHaveBeenCalled();
    });

    it('debe devolver error 401 si no hay token', async () => {
      // Arrange
      req.usuario = null;

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token requerido.'
      });
      expect(RestaurantDAO.updateRestaurantLocation).not.toHaveBeenCalled();
    });

    it('debe devolver error 400 si faltan latitud o longitud', async () => {
      // Arrange - sin latitud
      req.body = { longitud: -84.0907 };

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Latitud y longitud son obligatorios.'
      });
      expect(RestaurantDAO.updateRestaurantLocation).not.toHaveBeenCalled();
    });

    it('debe devolver error 400 si latitud no es un número válido', async () => {
      // Arrange
      req.body = { latitud: 'no-es-numero', longitud: -84.0907 };

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Latitud y longitud deben ser números válidos.'
      });
      expect(RestaurantDAO.updateRestaurantLocation).not.toHaveBeenCalled();
    });

    it('debe devolver error 400 si latitud está fuera de rango', async () => {
      // Arrange
      req.body = { latitud: 91, longitud: -84.0907 };

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Latitud debe estar entre -90 y 90 grados.'
      });
      expect(RestaurantDAO.updateRestaurantLocation).not.toHaveBeenCalled();
    });

    it('debe devolver error 400 si longitud está fuera de rango', async () => {
      // Arrange
      req.body = { latitud: 9.9281, longitud: 181 };

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Longitud debe estar entre -180 y 180 grados.'
      });
      expect(RestaurantDAO.updateRestaurantLocation).not.toHaveBeenCalled();
    });

    it('debe devolver error 404 si el restaurante no existe', async () => {
      // Arrange
      RestaurantDAO.findById.mockResolvedValue(null);

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(RestaurantDAO.findById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Restaurante no encontrado.'
      });
      expect(RestaurantDAO.updateRestaurantLocation).not.toHaveBeenCalled();
    });

    it('debe devolver error 404 si updateRestaurantLocation devuelve null', async () => {
      // Arrange
      RestaurantDAO.updateRestaurantLocation.mockResolvedValue(null);

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(RestaurantDAO.findById).toHaveBeenCalledWith('1');
      expect(RestaurantDAO.updateRestaurantLocation).toHaveBeenCalledWith('1', {
        latitud: 9.9281,
        longitud: -84.0907
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Restaurante no encontrado.'
      });
    });

    it('debe manejar errores de servidor', async () => {
      // Arrange
      RestaurantDAO.findById.mockRejectedValue(new Error('DB Error'));

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error en el servidor.'
      });
    });

    it('debe convertir strings a números para validación (compatibilidad Postgres/Mongo)', async () => {
      // Arrange - simular entrada como strings (common en forms/APIs)
      req.body = { latitud: '9.9281', longitud: '-84.0907' };
      const restauranteActualizado = {
        id_restaurante: 1,
        latitud: 9.9281,
        longitud: -84.0907
      };
      RestaurantDAO.updateRestaurantLocation.mockResolvedValue(restauranteActualizado);

      // Act
      await restaurantController.updateRestaurantLocation(req, res);

      // Assert
      expect(RestaurantDAO.updateRestaurantLocation).toHaveBeenCalledWith('1', {
        latitud: 9.9281,  // Debe convertir string a number
        longitud: -84.0907 // Debe convertir string a number
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ubicación del restaurante actualizada correctamente.',
        restaurante: restauranteActualizado
      });
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