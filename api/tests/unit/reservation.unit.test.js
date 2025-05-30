// tests/unit/reservation.unit.test.js
const reservationController = require('../../src/controllers/reservationController');
const ReservationDAO = require('../../src/dao/reservationDAO');
const redisClient = require('../../src/config/redis');

// Mock completos
jest.mock('../../src/dao/reservationDAO');
jest.mock('../../src/config/redis');

describe('ReservationController Unit Tests', () => {
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

  // TESTS CREAR RESERVA
  describe('createReservation', () => {
    test('crea reserva exitosamente con datos válidos', async () => {
      // Arrange
      const fechaReserva = new Date(Date.now() + 86400000).toISOString(); // mañana
      req.body = {
        id_usuario: 1,
        id_restaurante: 1,
        fecha_hora: fechaReserva,
        estado: 'pendiente'
      };
      
      const mockReserva = { 
        id_reserva: 1, 
        ...req.body 
      };
      
      ReservationDAO.createReservation.mockResolvedValue(mockReserva);
      
      // Act
      await reservationController.createReservation(req, res);
      
      // Assert
      expect(ReservationDAO.createReservation).toHaveBeenCalledWith(req.body);
      expect(redisClient.del).toHaveBeenCalledWith('reservas:all');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Reserva creada.',
        reserva: mockReserva
      });
    });
    
    test('retorna 401 si no hay token', async () => {
      // Arrange
      req.usuario = null;
      
      // Act
      await reservationController.createReservation(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Token requerido.' 
      });
      expect(ReservationDAO.createReservation).not.toHaveBeenCalled();
    });
    
    test('retorna 403 si intenta crear reserva para otro usuario sin ser admin', async () => {
      // Arrange
      req.usuario = { id_usuario: 2, rol: 'cliente' };
      req.body = {
        id_usuario: 1, // otro usuario
        id_restaurante: 1,
        fecha_hora: new Date().toISOString(),
        estado: 'pendiente'
      };
      
      // Act
      await reservationController.createReservation(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Solo puede crear reservas para usted mismo o si es administrador.' 
      });
      expect(ReservationDAO.createReservation).not.toHaveBeenCalled();
    });
    
    test('retorna 400 si faltan campos requeridos', async () => {
      // Arrange - faltan varios campos
      req.body = { id_usuario: 1 };
      
      // Act
      await reservationController.createReservation(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Faltan datos requeridos.' 
      });
      expect(ReservationDAO.createReservation).not.toHaveBeenCalled();
    });
  });

  // TESTS OBTENER TODAS LAS RESERVAS
  describe('getAllReservations', () => {
    test('retorna reservas desde la base de datos y guarda en caché', async () => {
      // Arrange
      const mockReservas = [
        { id_reserva: 1, id_usuario: 1, id_restaurante: 1, estado: 'pendiente' },
        { id_reserva: 2, id_usuario: 2, id_restaurante: 1, estado: 'confirmada' }
      ];
      
      ReservationDAO.getAllReservations.mockResolvedValue(mockReservas);
      
      // Act
      await reservationController.getAllReservations(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('reservas:all');
      expect(ReservationDAO.getAllReservations).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalledWith(
        'reservas:all', 
        JSON.stringify(mockReservas), 
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(mockReservas);
    });
    
    test('retorna reservas desde caché si están disponibles', async () => {
      // Arrange
      const cachedReservas = [
        { id_reserva: 1, id_usuario: 1, id_restaurante: 1, estado: 'pendiente' }
      ];
      
      redisClient.get.mockResolvedValue(JSON.stringify(cachedReservas));
      
      // Act
      await reservationController.getAllReservations(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('reservas:all');
      expect(ReservationDAO.getAllReservations).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedReservas);
    });
  });

  // TESTS OBTENER RESERVA POR ID
  describe('getReservationById', () => {
    test('retorna reserva desde base de datos y guarda en caché', async () => {
      // Arrange
      req.params.id = '1';
      const mockReserva = { 
        id_reserva: 1, 
        id_usuario: 1, 
        id_restaurante: 1, 
        estado: 'pendiente' 
      };
      
      ReservationDAO.findById.mockResolvedValue(mockReserva);
      
      // Act
      await reservationController.getReservationById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('reserva:1');
      expect(ReservationDAO.findById).toHaveBeenCalledWith('1');
      expect(redisClient.set).toHaveBeenCalledWith(
        'reserva:1', 
        JSON.stringify(mockReserva), 
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(mockReserva);
    });
    
    test('retorna reserva desde caché si disponible', async () => {
      // Arrange
      req.params.id = '1';
      const cachedReserva = { 
        id_reserva: 1, 
        id_usuario: 1, 
        id_restaurante: 1, 
        estado: 'confirmada' 
      };
      
      redisClient.get.mockResolvedValue(JSON.stringify(cachedReserva));
      
      // Act
      await reservationController.getReservationById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('reserva:1');
      expect(ReservationDAO.findById).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedReserva);
    });
    
    test('retorna 404 si la reserva no existe', async () => {
      // Arrange
      req.params.id = '999';
      ReservationDAO.findById.mockResolvedValue(null);
      
      // Act
      await reservationController.getReservationById(req, res);
      
      // Assert
      expect(ReservationDAO.findById).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Reserva no encontrada.' });
      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });

  // TESTS ACTUALIZAR RESERVA
  describe('updateReservation', () => {
    beforeEach(() => {
      // Setup común para pruebas de actualización
      req.params.id = '1';
      req.body = { 
        fecha_hora: new Date(Date.now() + 86400000).toISOString(),
        estado: 'confirmada'
      };
      
      const existingReserva = {
        id_reserva: 1,
        id_usuario: 1,
        id_restaurante: 1,
        estado: 'pendiente'
      };
      
      ReservationDAO.findById.mockResolvedValue(existingReserva);
    });
    
    test('actualiza reserva exitosamente', async () => {
      // Arrange
      const updatedReserva = { 
        id_reserva: 1, 
        id_usuario: 1,
        id_restaurante: 1,
        estado: 'confirmada',
        fecha_hora: req.body.fecha_hora
      };
      
      ReservationDAO.updateReservation.mockResolvedValue(updatedReserva);
      
      // Act
      await reservationController.updateReservation(req, res);
      
      // Assert
      expect(ReservationDAO.updateReservation).toHaveBeenCalledWith('1', req.body);
      expect(redisClient.del).toHaveBeenCalledWith('reserva:1');
      expect(redisClient.del).toHaveBeenCalledWith('reservas:all');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Reserva actualizada.',
        reserva: updatedReserva
      });
    });
    
    test('retorna 401 si no hay token', async () => {
      // Arrange
      req.usuario = null;
      
      // Act
      await reservationController.updateReservation(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token requerido.'
      });
      expect(ReservationDAO.updateReservation).not.toHaveBeenCalled();
    });
    
    test('retorna 403 si intenta actualizar reserva de otro usuario sin ser admin', async () => {
      // Arrange
      req.usuario = { id_usuario: 2, rol: 'cliente' };
      
      // Act
      await reservationController.updateReservation(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tienes permiso para actualizar esta reserva.'
      });
      expect(ReservationDAO.updateReservation).not.toHaveBeenCalled();
    });
    
    test('retorna 404 si la reserva no existe', async () => {
      // Arrange
      ReservationDAO.findById.mockResolvedValue(null);
      
      // Act
      await reservationController.updateReservation(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Reserva no encontrada.' });
      expect(ReservationDAO.updateReservation).not.toHaveBeenCalled();
    });
  });

  // TESTS ELIMINAR RESERVA
  describe('deleteReservation', () => {
    beforeEach(() => {
      // Setup común para pruebas de eliminación
      req.params.id = '1';
      
      const existingReserva = {
        id_reserva: 1,
        id_usuario: 1,
        id_restaurante: 1,
        estado: 'pendiente'
      };
      
      ReservationDAO.findById.mockResolvedValue(existingReserva);
      ReservationDAO.deleteReservation.mockResolvedValue(true);
    });
    
    test('elimina reserva exitosamente', async () => {
      // Act
      await reservationController.deleteReservation(req, res);
      
      // Assert
      expect(ReservationDAO.deleteReservation).toHaveBeenCalledWith('1');
      expect(redisClient.del).toHaveBeenCalledWith('reserva:1');
      expect(redisClient.del).toHaveBeenCalledWith('reservas:all');
      expect(res.json).toHaveBeenCalledWith({ message: 'Reserva eliminada correctamente.' });
    });
    
    test('retorna 401 si no hay token', async () => {
      // Arrange
      req.usuario = null;
      
      // Act
      await reservationController.deleteReservation(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token requerido.'
      });
      expect(ReservationDAO.deleteReservation).not.toHaveBeenCalled();
    });
    
    test('retorna 403 si intenta eliminar reserva de otro usuario sin ser admin', async () => {
      // Arrange
      req.usuario = { id_usuario: 2, rol: 'cliente' };
      
      // Act
      await reservationController.deleteReservation(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No tienes permiso para eliminar esta reserva.'
      });
      expect(ReservationDAO.deleteReservation).not.toHaveBeenCalled();
    });
    
    test('retorna 404 si la reserva no existe', async () => {
      // Arrange
      ReservationDAO.findById.mockResolvedValue(null);
      
      // Act
      await reservationController.deleteReservation(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Reserva no encontrada.' });
      expect(ReservationDAO.deleteReservation).not.toHaveBeenCalled();
    });
  });
});