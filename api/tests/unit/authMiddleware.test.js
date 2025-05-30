// tests/middleware/authMiddleware.test.js
const authMiddleware = require("../../src/middlewares/authMiddleware");
const axios = require("axios");

jest.mock("axios");

describe("authMiddleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn(),
    };
    res = {};
    next = jest.fn();
    // Limpiar el console.error para evitar ruido
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restaurar console.error después de cada prueba
    console.error.mockRestore();
  });

  test("debe continuar sin usuario si no hay token", async () => {
    req.header.mockReturnValue(null);

    await authMiddleware(req, res, next);

    expect(req.user).toBeNull(); // Corregido: en el middleware se establece como req.user = null
    expect(next).toHaveBeenCalled();
  });

  test("debe establecer req.usuario si el token es válido", async () => {
    const fakeToken = "Bearer valid-token";
    const fakeUser = { id: 1, rol: "admin" };

    req.header.mockReturnValue(fakeToken);
    axios.get.mockResolvedValue({ data: { usuario: fakeUser } });

    await authMiddleware(req, res, next);

    expect(axios.get).toHaveBeenCalledWith(`${process.env.AUTH_SERVICE_URL}/auth/verify`, {
      headers: { Authorization: fakeToken },
    });
    expect(req.usuario).toEqual(fakeUser);
    expect(next).toHaveBeenCalled();
  });

  test("debe continuar sin usuario si hay error al verificar token", async () => {
    const fakeToken = "Bearer invalid-token";
    req.header.mockReturnValue(fakeToken);
    axios.get.mockRejectedValue(new Error("Token inválido"));

    await authMiddleware(req, res, next);

    expect(req.usuario).toBeNull();
    expect(next).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled(); // Verifica que se logueó el error
  });
});