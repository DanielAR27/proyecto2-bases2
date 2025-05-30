// tests/unit/menu.unit.test.js
const menuController = require('../../src/controllers/menuController');
const MenuDAO = require('../../src/dao/menuDAO');
const redisClient = require('../../src/config/redis');

// Mock completos
jest.mock('../../src/dao/menuDAO');
jest.mock('../../src/config/redis');

describe('MenuController Unit Tests', () => {
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

  // TESTS CREAR MENÚ
  describe('createMenu', () => {
    test('crea menú exitosamente con datos válidos', async () => {
      // Arrange
      req.body = {
        id_restaurante: 1,
        nombre: 'Menú de Prueba',
        descripcion: 'Descripción de prueba'
      };
      
      const mockMenu = { 
        id_menu: 1, 
        ...req.body 
      };
      
      MenuDAO.createMenu.mockResolvedValue(mockMenu);
      
      // Act
      await menuController.createMenu(req, res);
      
      // Assert
      expect(MenuDAO.createMenu).toHaveBeenCalledWith(req.body);
      expect(redisClient.del).toHaveBeenCalledWith('menus:all');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Menú creado correctamente.',
        menu: mockMenu
      });
    });
    
    test('retorna 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';
      
      // Act
      await menuController.createMenu(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Solo los administradores pueden crear menús.' 
      });
      expect(MenuDAO.createMenu).not.toHaveBeenCalled();
    });
    
    test('retorna 400 si faltan campos requeridos', async () => {
      // Arrange - Missing nombre
      req.body = { id_restaurante: 1 };
      
      // Act
      await menuController.createMenu(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'id_restaurante y nombre son obligatorios.' 
      });
      
      // Arrange - Missing id_restaurante
      req.body = { nombre: 'Menu Test' };
      
      // Act
      await menuController.createMenu(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // TESTS OBTENER TODOS LOS MENÚS
  describe('getAllMenus', () => {
    test('retorna menús desde la base de datos y guarda en caché', async () => {
      // Arrange
      const mockMenus = [
        { id_menu: 1, nombre: 'Menú 1', id_restaurante: 1 },
        { id_menu: 2, nombre: 'Menú 2', id_restaurante: 2 }
      ];
      
      MenuDAO.getAllMenus.mockResolvedValue(mockMenus);
      
      // Act
      await menuController.getAllMenus(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('menus:all');
      expect(MenuDAO.getAllMenus).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalledWith(
        'menus:all', 
        JSON.stringify(mockMenus), 
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(mockMenus);
    });
    
    test('retorna menús desde caché si están disponibles', async () => {
      // Arrange
      const cachedMenus = [
        { id_menu: 1, nombre: 'Menú Caché', id_restaurante: 1 }
      ];
      
      redisClient.get.mockResolvedValue(JSON.stringify(cachedMenus));
      
      // Act
      await menuController.getAllMenus(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('menus:all');
      expect(MenuDAO.getAllMenus).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedMenus);
    });
  });

  // TESTS OBTENER MENÚ POR ID
  describe('getMenuById', () => {
    test('retorna menú desde base de datos y guarda en caché', async () => {
      // Arrange
      req.params.id = '1';
      const mockMenu = { id_menu: 1, nombre: 'Menú Test', id_restaurante: 1 };
      
      MenuDAO.findById.mockResolvedValue(mockMenu);
      
      // Act
      await menuController.getMenuById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('menu:1');
      expect(MenuDAO.findById).toHaveBeenCalledWith('1');
      expect(redisClient.set).toHaveBeenCalledWith(
        'menu:1', 
        JSON.stringify(mockMenu), 
        { EX: 300 }
      );
      expect(res.json).toHaveBeenCalledWith(mockMenu);
    });
    
    test('retorna menú desde caché si disponible', async () => {
      // Arrange
      req.params.id = '1';
      const cachedMenu = { id_menu: 1, nombre: 'Menú Caché', id_restaurante: 1 };
      
      redisClient.get.mockResolvedValue(JSON.stringify(cachedMenu));
      
      // Act
      await menuController.getMenuById(req, res);
      
      // Assert
      expect(redisClient.get).toHaveBeenCalledWith('menu:1');
      expect(MenuDAO.findById).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedMenu);
    });
    
    test('retorna 404 si el menú no existe', async () => {
      // Arrange
      req.params.id = '999';
      MenuDAO.findById.mockResolvedValue(null);
      
      // Act
      await menuController.getMenuById(req, res);
      
      // Assert
      expect(MenuDAO.findById).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Menú no encontrado.' });
      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });

  // TESTS ACTUALIZAR MENÚ
  describe('updateMenu', () => {
    test('actualiza menú exitosamente', async () => {
      // Arrange
      req.params.id = '1';
      req.body = { nombre: 'Menú Actualizado', descripcion: 'Nueva descripción' };
      
      const updatedMenu = { 
        id_menu: 1, 
        ...req.body, 
        id_restaurante: 1 
      };
      
      MenuDAO.updateMenu.mockResolvedValue(updatedMenu);
      
      // Act
      await menuController.updateMenu(req, res);
      
      // Assert
      expect(MenuDAO.updateMenu).toHaveBeenCalledWith('1', req.body);
      expect(redisClient.del).toHaveBeenCalledWith('menu:1');
      expect(redisClient.del).toHaveBeenCalledWith('menus:all');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Menú actualizado correctamente.',
        menu: updatedMenu
      });
    });
    
    test('retorna 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';
      req.params.id = '1';
      req.body = { nombre: 'Menú Actualizado' };
      
      // Act
      await menuController.updateMenu(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden actualizar menús.'
      });
      expect(MenuDAO.updateMenu).not.toHaveBeenCalled();
    });
    
    test('retorna 400 si falta nombre', async () => {
      // Arrange
      req.params.id = '1';
      req.body = { descripcion: 'Solo descripción' };
      
      // Act
      await menuController.updateMenu(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'El nombre del menú es obligatorio.'
      });
      expect(MenuDAO.updateMenu).not.toHaveBeenCalled();
    });
    
    test('retorna 404 si el menú no existe', async () => {
      // Arrange
      req.params.id = '999';
      req.body = { nombre: 'Menú Inexistente' };
      
      MenuDAO.updateMenu.mockResolvedValue(null);
      
      // Act
      await menuController.updateMenu(req, res);
      
      // Assert
      expect(MenuDAO.updateMenu).toHaveBeenCalledWith('999', req.body);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Menú no encontrado.' });
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });

  // TESTS ELIMINAR MENÚ
  describe('deleteMenu', () => {
    test('elimina menú exitosamente', async () => {
      // Arrange
      req.params.id = '1';
      MenuDAO.deleteMenu.mockResolvedValue(true);
      
      // Act
      await menuController.deleteMenu(req, res);
      
      // Assert
      expect(MenuDAO.deleteMenu).toHaveBeenCalledWith('1');
      expect(redisClient.del).toHaveBeenCalledWith('menu:1');
      expect(redisClient.del).toHaveBeenCalledWith('menus:all');
      expect(redisClient.del).toHaveBeenCalledWith('products:all');
      expect(res.json).toHaveBeenCalledWith({ message: 'Menú eliminado correctamente.' });
    });
    
    test('retorna 403 si no es administrador', async () => {
      // Arrange
      req.usuario.rol = 'cliente';
      req.params.id = '1';
      
      // Act
      await menuController.deleteMenu(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo los administradores pueden eliminar menús.'
      });
      expect(MenuDAO.deleteMenu).not.toHaveBeenCalled();
    });
    
    test('retorna 404 si el menú no existe', async () => {
      // Arrange
      req.params.id = '999';
      MenuDAO.deleteMenu.mockResolvedValue(false);
      
      // Act
      await menuController.deleteMenu(req, res);
      
      // Assert
      expect(MenuDAO.deleteMenu).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Menú no encontrado.' });
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