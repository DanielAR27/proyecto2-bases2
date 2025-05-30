// tests/routes/reservation.routes.test.js
const app = require('../../src/app');
const redisClient = require('../../src/config/redis');
const testUtils = require('../utils/testUtils');
const request = require('supertest');

describe('Reservas API', () => {
  // Datos de prueba
  let admin, user, otroUser, restaurante;
  let reservaIds = [];

  beforeAll(async () => {
    // Usar una DB diferente o limpiar completamente para cada prueba
    await redisClient.flushDb();

    await testUtils.waitForConnections();

    // Crear usuarios
    admin = await testUtils.registerAndLoginAdmin({
      nombre: 'AdminReserva',
      email: 'adminreserva@test.com',
      contrasena: 'admin123',
      rol: 'administrador'
    });

    user = await testUtils.registerAndLoginUser({
      nombre: 'ClienteReserva',
      email: 'clientereserva@test.com',
      contrasena: 'user123',
      rol: 'cliente'
    });

    otroUser = await testUtils.registerAndLoginUser({
      nombre: 'OtroClienteReserva',
      email: 'otro.clientereserva@test.com',
      contrasena: 'user123',
      rol: 'cliente'
    });

    // Crear restaurante
    restaurante = await testUtils.createRestaurant(app, admin.token, {
      nombre: 'Restaurante Reserva',
      direccion: 'Calle Reserva 123'
    });
  });

  afterAll(async () => {
    // Limpiar recursos
    try {
      await testUtils.cleanTestReservations(app, admin.token, reservaIds);
      await testUtils.cleanTestRestaurants(app, admin.token, [restaurante?.id_restaurante]);
      await testUtils.cleanTestUsers(admin.token, [user.id, otroUser.id], admin.id);
      await testUtils.closeConnections(redisClient);
    } catch (error) {
      console.error('Error en limpieza:', error);
    }
  });

  // 1. Casos de creación de reservas
  test('Crear reservas como admin y usuario', async () => {
    // Admin crea reserva para usuario
    const adminReserva = await testUtils.createReservation(app, admin.token, {
      id_usuario: user.id,
      id_restaurante: restaurante.id_restaurante,
      fecha_hora: new Date(Date.now() + 86400000).toISOString(), // Mañana
      estado: 'pendiente'
    });

    expect(adminReserva).toHaveProperty('id_reserva');
    expect(adminReserva).toHaveProperty('id_usuario', user.id);
    
    // Guardar ID para limpieza
    reservaIds.push(adminReserva.id_reserva);

    // Usuario crea reserva para sí mismo
    const userReserva = await testUtils.createReservation(app, user.token, {
      id_usuario: user.id,
      id_restaurante: restaurante.id_restaurante,
      fecha_hora: new Date(Date.now() + 172800000).toISOString(), // En dos días
      estado: 'pendiente'
    });

    expect(userReserva).toHaveProperty('id_reserva');
    expect(userReserva).toHaveProperty('id_usuario', user.id);
    
    // Guardar ID para limpieza
    reservaIds.push(userReserva.id_reserva);
  });

  // 2. Casos de error en creación
  test('Validación en creación de reservas', async () => {
    // Usuario intenta crear reserva para otro usuario
    const reservaParaOtro = await request(app)
      .post('/reservations')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        id_usuario: otroUser.id,
        id_restaurante: restaurante.id_restaurante,
        fecha_hora: new Date(Date.now() + 86400000).toISOString(),
        estado: 'pendiente'
      });

    expect(reservaParaOtro.statusCode).toBe(403);

    // Falta campo requerido
    const sinEstado = await request(app)
      .post('/reservations')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        id_usuario: user.id,
        id_restaurante: restaurante.id_restaurante,
        fecha_hora: new Date(Date.now() + 86400000).toISOString()
      });

    expect(sinEstado.statusCode).toBe(400);
  });

  // 3. Obtener y actualizar reservas
  test('Obtener y actualizar reservas', async () => {
    // Obtener reserva por ID
    const getReserva = await testUtils.getReservationById(app, reservaIds[0]);
    
    expect(getReserva).toHaveProperty('id_reserva', reservaIds[0]);
    
    // Actualizar reserva como usuario
    const updateReserva = await testUtils.updateReservation(app, user.token, reservaIds[0], {
      estado: 'confirmada',
      fecha_hora: new Date(Date.now() + 259200000).toISOString() // En tres días
    });
    
    expect(updateReserva).toHaveProperty('estado', 'confirmada');
    
    // Usuario intenta actualizar reserva de otro
    const otraReserva = await testUtils.createReservation(app, otroUser.token, {
      id_usuario: otroUser.id,
      id_restaurante: restaurante.id_restaurante,
      fecha_hora: new Date(Date.now() + 86400000).toISOString(),
      estado: 'pendiente'
    });
    
    reservaIds.push(otraReserva.id_reserva);
    
    const updateOtraReserva = await request(app)
      .put(`/reservations/${otraReserva.id_reserva}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ estado: 'confirmada' });
    
    expect(updateOtraReserva.statusCode).toBe(403);
  });

  // 4. Eliminar reservas
  test('Eliminar reservas', async () => {
    // Crear una reserva para eliminar
    const nuevaReserva = await testUtils.createReservation(app, user.token, {
      id_usuario: user.id,
      id_restaurante: restaurante.id_restaurante,
      fecha_hora: new Date(Date.now() + 86400000).toISOString(),
      estado: 'pendiente'
    });
    
    // Usuario elimina su propia reserva
    const deleteReserva = await testUtils.deleteReservation(app, user.token, nuevaReserva.id_reserva);
    
    expect(deleteReserva).toHaveProperty('message', 'Reserva eliminada correctamente.');
    
    // Admin elimina la reserva de un usuario
    const deleteAdminReserva = await testUtils.deleteReservation(app, admin.token, reservaIds[0]);
    
    expect(deleteAdminReserva).toHaveProperty('message', 'Reserva eliminada correctamente.');
    
    // Remover de la lista de limpieza ya que fue eliminada
    reservaIds = reservaIds.filter(id => id !== reservaIds[0]);
  });

});