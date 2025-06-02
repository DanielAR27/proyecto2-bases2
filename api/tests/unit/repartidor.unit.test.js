// tests/unit/repartidor.unit.test.js

const repartidorController = require('../../src/controllers/repartidorController');
const RepartidorDAO = require('../../src/dao/repartidorDAO');
const redisClient = require('../../src/config/redis');

// Mock de todas las dependencias
jest.mock('../../src/dao/repartidorDAO');
jest.mock('../../src/config/redis');

describe('RepartidorController - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    // Reset de todos los mocks antes de cada test
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

    // Mock de Redis
    redisClient.get = jest.fn().mockResolvedValue(null);
    redisClient.set = jest.fn().mockResolvedValue('OK');
    redisClient.del = jest.fn().mockResolvedValue(1);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('createRepartidor', () => {
    it('debe crear un repartidor exitosamente', async () => {
      // Arrange
      const repartidorData = {
        nombre: 'Juan Pérez',
        telefono: '+506 8888-9999',
        vehiculo: 'Motocicleta Honda 150cc'
      };

      const mockRepartidor = {
        id_repartidor: 1,
        ...repartidorData,
        estado: 'disponible',
        latitud_actual: null,
        longitud_actual: null,
        fecha_registro: new Date()
      };

      req.body = repartidorData;
      RepartidorDAO.createRepartidor.mockResolvedValue(mockRepartidor);

      // Act
      await repartidorController.createRepartidor(req, res);

      // Assert
      expect(RepartidorDAO.createRepartidor).toHaveBeenCalledWith(repartidorData);
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:all');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:available');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Repartidor creado correctamente.',
        repartidor: mockRepartidor
      });
    });

    it('debe rechazar creación si no es administrador', async () => {
      // Arrange
      req.body = { nombre: 'Juan Pérez', telefono: '+506 8888-9999', vehiculo: 'Moto' };
      req.usuario = { rol: 'cliente' };

      // Act
      await repartidorController.createRepartidor(req, res);

      // Assert
      expect(RepartidorDAO.createRepartidor).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden crear repartidores.'
      });
    });

    it('debe rechazar creación si faltan campos obligatorios', async () => {
      // Arrange
      req.body = { nombre: 'Juan Pérez' }; // Faltan telefono y vehiculo

      // Act
      await repartidorController.createRepartidor(req, res);

      // Assert
      expect(RepartidorDAO.createRepartidor).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Nombre, teléfono y vehículo son obligatorios.'
      });
    });

    it('debe rechazar creación si no hay usuario autenticado', async () => {
      // Arrange
      req.body = { nombre: 'Juan Pérez', telefono: '+506 8888-9999', vehiculo: 'Moto' };
      req.usuario = null;

      // Act
      await repartidorController.createRepartidor(req, res);

      // Assert
      expect(RepartidorDAO.createRepartidor).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden crear repartidores.'
      });
    });
  });

  describe('getAllRepartidores', () => {
    it('debe retornar todos los repartidores desde caché', async () => {
      // Arrange
      const mockRepartidores = [
        { id_repartidor: 1, nombre: 'Juan', estado: 'disponible' },
        { id_repartidor: 2, nombre: 'María', estado: 'ocupado' }
      ];

      redisClient.get.mockResolvedValue(JSON.stringify(mockRepartidores));

      // Act
      await repartidorController.getAllRepartidores(req, res);

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('repartidores:all');
      expect(RepartidorDAO.getAllRepartidores).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockRepartidores);
    });

    it('debe retornar todos los repartidores desde DB y cachear resultado', async () => {
      // Arrange
      const mockRepartidores = [
        { id_repartidor: 1, nombre: 'Juan', estado: 'disponible' },
        { id_repartidor: 2, nombre: 'María', estado: 'ocupado' }
      ];

      RepartidorDAO.getAllRepartidores.mockResolvedValue(mockRepartidores);

      // Act
      await repartidorController.getAllRepartidores(req, res);

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('repartidores:all');
      expect(RepartidorDAO.getAllRepartidores).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalledWith(
        'repartidores:all',
        JSON.stringify(mockRepartidores),
        { EX: 180 }
      );
      expect(res.json).toHaveBeenCalledWith(mockRepartidores);
    });

    it('debe rechazar si no es administrador', async () => {
      // Arrange
      req.usuario = { rol: 'cliente' };

      // Act
      await repartidorController.getAllRepartidores(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden ver todos los repartidores.'
      });
      expect(RepartidorDAO.getAllRepartidores).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableRepartidores', () => {
    it('debe retornar repartidores disponibles desde DB y cachear resultado', async () => {
      // Arrange
      const mockRepartidores = [
        { id_repartidor: 1, nombre: 'Juan', estado: 'disponible' },
        { id_repartidor: 2, nombre: 'Pedro', estado: 'disponible' }
      ];

      RepartidorDAO.getAvailableRepartidores.mockResolvedValue(mockRepartidores);

      // Act
      await repartidorController.getAvailableRepartidores(req, res);

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('repartidores:available');
      expect(RepartidorDAO.getAvailableRepartidores).toHaveBeenCalled();
      
      const expectedResponse = {
        message: 'Repartidores disponibles obtenidos correctamente.',
        total: 2,
        repartidores: mockRepartidores
      };

      expect(redisClient.set).toHaveBeenCalledWith(
        'repartidores:available',
        JSON.stringify(expectedResponse),
        { EX: 120 }
      );
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('debe retornar repartidores disponibles desde caché', async () => {
      // Arrange
      const cachedResponse = {
        message: 'Repartidores disponibles obtenidos correctamente.',
        total: 1,
        repartidores: [{ id_repartidor: 1, nombre: 'Juan', estado: 'disponible' }]
      };

      redisClient.get.mockResolvedValue(JSON.stringify(cachedResponse));

      // Act
      await repartidorController.getAvailableRepartidores(req, res);

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('repartidores:available');
      expect(RepartidorDAO.getAvailableRepartidores).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedResponse);
    });

    it('debe rechazar si no es administrador', async () => {
      // Arrange
      req.usuario = { rol: 'cliente' };

      // Act
      await repartidorController.getAvailableRepartidores(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tiene permisos para acceder a esta información.'
      });
      expect(RepartidorDAO.getAvailableRepartidores).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableWithLocation', () => {
    it('debe retornar repartidores disponibles con ubicación', async () => {
      // Arrange
      const mockRepartidores = [
        { 
          id_repartidor: 1, 
          nombre: 'Juan', 
          estado: 'disponible',
          latitud_actual: 9.9281,
          longitud_actual: -84.0907
        }
      ];

      RepartidorDAO.getAvailableWithLocation.mockResolvedValue(mockRepartidores);

      // Act
      await repartidorController.getAvailableWithLocation(req, res);

      // Assert
      const expectedResponse = {
        message: 'Repartidores disponibles con ubicación obtenidos correctamente.',
        total: 1,
        repartidores: mockRepartidores
      };

      expect(redisClient.set).toHaveBeenCalledWith(
        'repartidores:available:location',
        JSON.stringify(expectedResponse),
        { EX: 60 }
      );
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('debe rechazar si no es administrador', async () => {
      // Arrange
      req.usuario = { rol: 'cliente' };

      // Act
      await repartidorController.getAvailableWithLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tiene permisos para acceder a esta información.'
      });
    });
  });

  describe('getRepartidorById', () => {
    it('debe retornar repartidor desde DB y cachear resultado', async () => {
      // Arrange
      const mockRepartidor = { id_repartidor: 1, nombre: 'Juan', estado: 'disponible' };
      req.params = { id: '1' };

      RepartidorDAO.findById.mockResolvedValue(mockRepartidor);

      // Act
      await repartidorController.getRepartidorById(req, res);

      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('repartidor:1');
      expect(RepartidorDAO.findById).toHaveBeenCalledWith('1');
      expect(redisClient.set).toHaveBeenCalledWith(
        'repartidor:1',
        JSON.stringify(mockRepartidor),
        { EX: 180 }
      );
      expect(res.json).toHaveBeenCalledWith(mockRepartidor);
    });

    it('debe retornar 404 si repartidor no existe', async () => {
      // Arrange
      req.params = { id: '999' };
      RepartidorDAO.findById.mockResolvedValue(null);

      // Act
      await repartidorController.getRepartidorById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Repartidor no encontrado.'
      });
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('debe rechazar si no es administrador', async () => {
      // Arrange
      req.usuario = { rol: 'cliente' };
      req.params = { id: '1' };

      // Act
      await repartidorController.getRepartidorById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden ver detalles de repartidores.'
      });
    });
  });

  describe('updateRepartidor', () => {
    beforeEach(() => {
      req.params.id = '1';
      req.body = { 
        nombre: 'Juan Actualizado', 
        telefono: '+506 9999-8888', 
        vehiculo: 'Moto Nueva' 
      };
      const repartidorExistente = { 
        id_repartidor: 1, 
        nombre: 'Juan Viejo', 
        telefono: '+506 8888-9999',
        vehiculo: 'Moto Vieja'
      };
      RepartidorDAO.findById.mockResolvedValue(repartidorExistente);
    });

    it('debe actualizar un repartidor correctamente', async () => {
      // Arrange
      const repartidorActualizado = { ...req.body, id_repartidor: 1 };
      RepartidorDAO.updateRepartidor.mockResolvedValue(repartidorActualizado);

      // Act
      await repartidorController.updateRepartidor(req, res);

      // Assert
      expect(RepartidorDAO.findById).toHaveBeenCalledWith('1');
      expect(RepartidorDAO.updateRepartidor).toHaveBeenCalledWith('1', req.body);
      expect(redisClient.del).toHaveBeenCalledWith('repartidor:1');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:all');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:available');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:available:location');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Repartidor actualizado correctamente.',
        repartidor: repartidorActualizado
      });
    });

    it('debe rechazar si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';

      // Act
      await repartidorController.updateRepartidor(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden actualizar repartidores.'
      });
      expect(RepartidorDAO.updateRepartidor).not.toHaveBeenCalled();
    });

    it('debe rechazar si faltan campos obligatorios', async () => {
      // Arrange
      req.body = { nombre: 'Juan Actualizado' }; // Faltan telefono y vehiculo

      // Act
      await repartidorController.updateRepartidor(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Nombre, teléfono y vehículo son obligatorios.'
      });
      expect(RepartidorDAO.updateRepartidor).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si el repartidor no existe', async () => {
      // Arrange
      RepartidorDAO.findById.mockResolvedValue(null);

      // Act
      await repartidorController.updateRepartidor(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Repartidor no encontrado.' });
      expect(RepartidorDAO.updateRepartidor).not.toHaveBeenCalled();
    });
  });

  describe('deleteRepartidor', () => {
    it('debe eliminar un repartidor correctamente', async () => {
      // Arrange
      req.params.id = '1';
      RepartidorDAO.deleteRepartidor.mockResolvedValue(true);

      // Act
      await repartidorController.deleteRepartidor(req, res);

      // Assert
      expect(RepartidorDAO.deleteRepartidor).toHaveBeenCalledWith('1');
      expect(redisClient.del).toHaveBeenCalledWith('repartidor:1');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:all');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:available');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:available:location');
      expect(redisClient.del).toHaveBeenCalledWith('pedidos:all');
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Repartidor eliminado correctamente.' 
      });
    });

    it('debe rechazar si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';

      // Act
      await repartidorController.deleteRepartidor(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden eliminar repartidores.'
      });
      expect(RepartidorDAO.deleteRepartidor).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si el repartidor no existe', async () => {
      // Arrange
      req.params.id = '999';
      RepartidorDAO.deleteRepartidor.mockResolvedValue(false);

      // Act
      await repartidorController.deleteRepartidor(req, res);

      // Assert
      expect(RepartidorDAO.deleteRepartidor).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Repartidor no encontrado.' });
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('updateRepartidorLocation', () => {
    beforeEach(() => {
      req.params.id = '1';
      req.body = { latitud_actual: 9.9281, longitud_actual: -84.0907 };
      const repartidorExistente = { 
        id_repartidor: 1, 
        nombre: 'Juan Test',
        telefono: '+506 8888-9999',
        vehiculo: 'Moto',
        estado: 'disponible'
      };
      RepartidorDAO.findById.mockResolvedValue(repartidorExistente);
    });

    it('debe actualizar ubicación correctamente', async () => {
      // Arrange
      const repartidorActualizado = {
        id_repartidor: 1,
        nombre: 'Juan Test',
        latitud_actual: 9.9281,
        longitud_actual: -84.0907
      };

      RepartidorDAO.updateRepartidorLocation.mockResolvedValue(repartidorActualizado);

      // Act
      await repartidorController.updateRepartidorLocation(req, res);

      // Assert
      expect(RepartidorDAO.findById).toHaveBeenCalledWith('1');
      expect(RepartidorDAO.updateRepartidorLocation).toHaveBeenCalledWith('1', {
        latitud_actual: 9.9281,
        longitud_actual: -84.0907
      });
      expect(redisClient.del).toHaveBeenCalledWith('repartidor:1');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:all');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:available');
      expect(redisClient.del).toHaveBeenCalledWith('repartidores:available:location');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ubicación del repartidor actualizada correctamente.',
        repartidor: repartidorActualizado
      });
    });

    it('debe rechazar si no hay token', async () => {
      // Arrange
      req.usuario = null;

      // Act
      await repartidorController.updateRepartidorLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token requerido.'
      });
    });

    it('debe rechazar si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';

      // Act
      await repartidorController.updateRepartidorLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No autorizado para actualizar esta ubicación.'
      });
    });

    it('debe rechazar si faltan coordenadas', async () => {
      // Arrange
      req.body = { latitud_actual: 9.9281 }; // Falta longitud

      // Act
      await repartidorController.updateRepartidorLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Latitud y longitud son obligatorios.'
      });
    });

    it('debe rechazar si coordenadas no son números válidos', async () => {
      // Arrange
      req.body = { latitud_actual: 'no-es-numero', longitud_actual: -84.0907 };

      // Act
      await repartidorController.updateRepartidorLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Latitud y longitud deben ser números válidos.'
      });
    });

    it('debe rechazar si latitud está fuera de rango', async () => {
      // Arrange
      req.body = { latitud_actual: 91, longitud_actual: -84.0907 };

      // Act
      await repartidorController.updateRepartidorLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Latitud debe estar entre -90 y 90 grados.'
      });
    });

    it('debe rechazar si longitud está fuera de rango', async () => {
      // Arrange
      req.body = { latitud_actual: 9.9281, longitud_actual: 181 };

      // Act
      await repartidorController.updateRepartidorLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Longitud debe estar entre -180 y 180 grados.'
      });
    });

    it('debe retornar 404 si repartidor no existe', async () => {
      // Arrange
      RepartidorDAO.findById.mockResolvedValue(null);

      // Act
      await repartidorController.updateRepartidorLocation(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Repartidor no encontrado.'
      });
    });

    it('debe convertir strings a números para validación', async () => {
      // Arrange
      req.body = { latitud_actual: '9.9281', longitud_actual: '-84.0907' };
      const repartidorActualizado = {
        id_repartidor: 1,
        latitud_actual: 9.9281,
        longitud_actual: -84.0907
      };
      RepartidorDAO.updateRepartidorLocation.mockResolvedValue(repartidorActualizado);

      // Act
      await repartidorController.updateRepartidorLocation(req, res);

      // Assert
      expect(RepartidorDAO.updateRepartidorLocation).toHaveBeenCalledWith('1', {
        latitud_actual: 9.9281,
        longitud_actual: -84.0907
      });
    });
  });

  describe('updateRepartidorStatus', () => {
    beforeEach(() => {
      req.params.id = '1';
      req.body = { estado: 'ocupado' };
      const repartidorExistente = { 
        id_repartidor: 1, 
        nombre: 'Juan Test',
        estado: 'disponible'
      };
      RepartidorDAO.findById.mockResolvedValue(repartidorExistente);
    });

    it('debe actualizar estado correctamente', async () => {
      // Arrange
      const repartidorActualizado = {
        id_repartidor: 1,
        nombre: 'Juan Test',
        estado: 'ocupado'
      };

      RepartidorDAO.updateRepartidorStatus.mockResolvedValue(repartidorActualizado);

      // Act
      await repartidorController.updateRepartidorStatus(req, res);

      // Assert
      expect(RepartidorDAO.findById).toHaveBeenCalledWith('1');
      expect(RepartidorDAO.updateRepartidorStatus).toHaveBeenCalledWith('1', 'ocupado');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Estado del repartidor actualizado correctamente.',
        repartidor: repartidorActualizado
      });
    });

    it('debe rechazar si no hay token', async () => {
      // Arrange
      req.usuario = null;

      // Act
      await repartidorController.updateRepartidorStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token requerido.'
      });
    });

    it('debe rechazar si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';

      // Act
      await repartidorController.updateRepartidorStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No autorizado para cambiar el estado.'
      });
    });

    it('debe rechazar si el estado no es válido', async () => {
      // Arrange
      req.body = { estado: 'estado_invalido' };

      // Act
      await repartidorController.updateRepartidorStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Estado debe ser uno de: disponible, ocupado, desconectado'
      });
    });

    it('debe validar todos los estados válidos', async () => {
      // Test para cada estado válido
      const estadosValidos = ['disponible', 'ocupado', 'desconectado'];
      
      for (const estado of estadosValidos) {
        // Reset mocks
        jest.clearAllMocks();
        RepartidorDAO.findById.mockResolvedValue({ id_repartidor: 1 });
        RepartidorDAO.updateRepartidorStatus.mockResolvedValue({ id_repartidor: 1, estado });
        
        req.body = { estado };
        
        // Act
        await repartidorController.updateRepartidorStatus(req, res);
        
        // Assert
        expect(RepartidorDAO.updateRepartidorStatus).toHaveBeenCalledWith('1', estado);
      }
    });

    it('debe retornar 404 si repartidor no existe', async () => {
      // Arrange
      RepartidorDAO.findById.mockResolvedValue(null);

      // Act
      await repartidorController.updateRepartidorStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Repartidor no encontrado.'
      });
    });
  });

  // Modifica tu afterAll
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