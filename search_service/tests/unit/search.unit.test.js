// tests/controllers/searchController.test.js
const searchController = require('../../src/controllers/searchController');
const elasticService = require('../../src/services/elasticService');
const redisClient = require('../../src/config/redis');
const axios = require('axios');

jest.mock('../../src/services/elasticService');
jest.mock('../../src/config/redis');
jest.mock('axios');

describe('searchController', () => {
  let req, res;

  beforeEach(() => {
    req = { query: {}, params: {}, usuario: { rol: 'administrador' }, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('searchProducts', () => {
    it('debe devolver error 400 si falta "q"', async () => {
      req.query = {};
      await searchController.searchProducts(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('q') });
    });

    it('debe devolver datos desde cache si existe', async () => {
      req.query = { q: 'pizza', page: '1', limit: '10' };
      redisClient.get.mockResolvedValue(JSON.stringify([{ id: 1 }]));

      await searchController.searchProducts(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('debe buscar en Elastic si no hay cache', async () => {
      req.query = { q: 'pizza', page: '1', limit: '10' };
      redisClient.get.mockResolvedValue(null);
      elasticService.searchProducts.mockResolvedValue([{ id: 2 }]);
      redisClient.set.mockResolvedValue();

      await searchController.searchProducts(req, res);
      expect(elasticService.searchProducts).toHaveBeenCalled();
      expect(redisClient.set).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 2 }]);
    });
  });

  describe('searchProductsByCategory', () => {
    it('usa redis si hay resultados en cache', async () => {
      req.params = { categoria: 'bebidas' };
      req.query = { page: '1', limit: '10' };
      redisClient.get.mockResolvedValue(JSON.stringify([{ id: 3 }]));

      await searchController.searchProductsByCategory(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 3 }]);
    });

    it('usa ElasticSearch si no hay cache', async () => {
      req.params = { categoria: 'postres' };
      req.query = { page: '1', limit: '10' };
      redisClient.get.mockResolvedValue(null);
      elasticService.searchProductsByCategory.mockResolvedValue([{ id: 4 }]);
      redisClient.set.mockResolvedValue();

      await searchController.searchProductsByCategory(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 4 }]);
    });
  });

  describe('reindexProducts', () => {
    it('devuelve 403 si no es admin', async () => {
      req.usuario.rol = 'cliente';
      await searchController.reindexProducts(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('reindexa si es admin', async () => {
      process.env.API_URL = 'http://fake-api.com';
      axios.get.mockResolvedValue({ data: [{ id_producto: 1 }] });
      elasticService.reindexAllProducts.mockResolvedValue();
      redisClient.flushDb.mockResolvedValue();

      await searchController.reindexProducts(req, res);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.any(String),
        count: 1
      });
    });
  });
});
