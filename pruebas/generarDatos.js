const axios = require('axios');
const {faker}  = require('@faker-js/faker');


const AUTH_API = 'http://localhost/auth';   // Para /auth/register y /auth/login
const API = 'http://localhost/api';        // Para /restaurants, /products, etc.

const TOTAL_USERS = 10;
const TOTAL_RESTAURANTS = 5;
const MENUS_PER_RESTAURANT = 2;
const PRODUCTS_PER_MENU = 5;
const RESERVATIONS_PER_USER = 2;
const ORDERS_PER_USER = 2;

const dominios = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
const menuGenerados = new Set();
const productosGenerados = new Set();

const crearDatosMasivos = async () => {
  try {
    console.time('Ejecución total');
    const productosGlobales = [];
    const adminNombre = faker.person.fullName();
    const adminEmail = generarEmailDesdeNombre(adminNombre);

    // Crear admin
    await axios.post(`${AUTH_API}/auth/register`, {
      nombre: adminNombre,
      email: adminEmail,
      contrasena: '123456',
      rol: 'administrador'
    });

    const loginAdmin = await axios.post(`${AUTH_API}/auth/login`, {
      email: adminEmail,
      contrasena: '123456'
    });
    const adminToken = loginAdmin.data.token;
    console.log("Token del admin: ", adminToken);

    const usuarios = [];
    for (let i = 0; i < TOTAL_USERS; i++) {
      const nombre = faker.person.fullName(); 

      // Limpiar el nombre para usarlo en el email
      const email = generarEmailDesdeNombre(nombre);

      await axios.post(`${AUTH_API}/auth/register`, {
        nombre,
        email,
        contrasena: '123456',
        rol: 'cliente'
      });

      const login = await axios.post(`${AUTH_API}/auth/login`, {
        email,
        contrasena: '123456'
      });

      usuarios.push({
        id: login.data.usuario.id_usuario,
        token: login.data.token,
        email,
        nombre
      });
    }

    console.log("Usuarios insertados correctamente.")

    // Crear restaurantes con menús y productos
    const restaurantes = [];
    for (let r = 0; r < TOTAL_RESTAURANTS; r++) {
      const rest = await axios.post(`${API}/restaurants`, {
        nombre: faker.company.name(),
        direccion: faker.location.streetAddress()
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const id_restaurante = rest.data.restaurante.id_restaurante;
      restaurantes.push(id_restaurante);

      for (let m = 0; m < MENUS_PER_RESTAURANT; m++) {
        const menuData =  generarMenu();

        const menu = await axios.post(`${API}/menus`, {
          id_restaurante,
          nombre: menuData.nombre,
          descripcion: menuData.descripcion
        }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });

        const id_menu = menu.data.menu.id_menu;


        for (let p = 0; p < PRODUCTS_PER_MENU; p++) {
          const productoData =  generarProducto();
        
          const producto = await axios.post(`${API}/products`, {
            nombre: productoData.nombre,
            categoria: productoData.categoria,
            descripcion: productoData.descripcion,
            precio: parseFloat(faker.commerce.price()),
            id_menu
          }, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });

          productosGlobales.push({
            id_producto: producto.data.producto.id_producto,
            id_restaurante
          });
        }
      }
    }

    console.log("Restaurantes, menus y productos agregados correctamente.")

    // Crear reservaciones y pedidos por usuario
    for (const user of usuarios) {
      for (let r = 0; r < RESERVATIONS_PER_USER; r++) {
        const id_restaurante = faker.helpers.arrayElement(restaurantes);
        await axios.post(`${API}/reservations`, {
          id_usuario: user.id,
          id_restaurante,
          fecha_hora: faker.date.future().toISOString(),
          estado: 'pendiente'
        }, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      }

      for (let o = 0; o < ORDERS_PER_USER; o++) {
        const productosPedido = faker.helpers.arrayElements(productosGlobales, faker.number.int({ min: 1, max: 3 }));

        const productosFormateados = productosPedido.map(p => ({
          id_producto: p.id_producto,
          cantidad: faker.number.int({ min: 1, max: 5 })
        }));

        await axios.post(`${API}/orders`, {
          id_usuario: user.id,
          id_restaurante: productosPedido[0].id_restaurante,
          tipo: ['en restaurante', 'para recoger'][Math.floor(Math.random() * 2)],
          productos: productosFormateados
        }, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      }
    }


    console.log("Reservaciones y pedidos.")


    console.timeEnd('Ejecución total');
    console.log("Base de datos poblada con éxito.");

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
};


function generarEmailDesdeNombre(nombreCompleto) {
  // Normalizar: minúsculas, sin tildes, sin caracteres raros
  const nombreLimpio = nombreCompleto
    .normalize("NFD")                      // separa tildes
    .replace(/[\u0300-\u036f]/g, '')      // elimina tildes
    .replace(/[^a-zA-Z0-9 ]/g, '')        // elimina símbolos raros
    .toLowerCase();

  const partes = nombreLimpio.split(/\s+/); // divide por espacios

  let usuarioEmail = partes.join('.');      // ej: john.doe
  const dominio = dominios[Math.floor(Math.random() * dominios.length)];

  return `${usuarioEmail}@${dominio}`;
}


function generarMenu() {
  const categorias = [
    'Menú', 'Comida', 'Plato', 'Especialidad', 'Receta', 'Preparación',
    'Opción', 'Degustación', 'Selección', 'Ración', 'Sugerencia del chef',
    'Oferta', 'Variedad', 'Propuesta', 'Gastronomía', 'Manjar', 'Delicia'
  ];

  const origenes = [
    'Italia', 'Grecia', 'México', 'Japón', 'India', 'Francia', 'Tailandia',
    'España', 'Perú', 'Corea', 'Marruecos', 'China', 'Vietnam', 'Colombia',
    'Argentina', 'EE.UU.', 'Brasil', 'Turquía', 'Alemania', 'Suiza'
  ];

  const descriptores1 = [
    'Deliciosa', 'Aromática', 'Sabrosa', 'Tradicional', 'Exquisita', 'Auténtica',
    'Picante', 'Refrescante', 'Cremosa', 'Intensa', 'Fresca', 'Casera',
    'Irresistible', 'Crujiente', 'Tropical', 'Suave', 'Contundente', 'Liviana',
    'Energética', 'Reconfortante'
  ];

  const descriptores2 = [
    'horneada', 'a la parrilla', 'estilo gourmet', 'artesanal', 'marinada',
    'con especias', 'fusionada', 'al wok', 'de la casa', 'al vapor', 
    'en salsa', 'con toques cítricos', 'glaseada', 'salteada', 
    'rellena', 'gratinada', 'a baja temperatura', 'en reducción', 'caramelizada'
  ];

  const elegir = arr => arr[Math.floor(Math.random() * arr.length)];

  let intentos = 0;

  while (intentos < 5) {
    const categoria = elegir(categorias);
    const origen = elegir(origenes);
    const descriptor1 = elegir(descriptores1);
    const descriptor2 = elegir(descriptores2);

    const nombre = `${categoria} ${origen}`;
    const descripcion = `${categoria.toLowerCase()} ${origen.toLowerCase()} ${descriptor1.toLowerCase()} ${descriptor2.toLowerCase()}`;
    const clave = `${nombre} | ${descripcion}`;

    if (!menuGenerados.has(clave)) {
      menuGenerados.add(clave);
      return { nombre, descripcion };
    }

    intentos++;
  }

  // Si se repiten todos, devolver uno del set
  const claveRepetida = [...menuGenerados][Math.floor(Math.random() * menuGenerados.size)];
  const [nombre, descripcion] = claveRepetida.split(' | ');
  return { nombre, descripcion };
}

function generarProducto() {
  const nombres = [
    'Pizza', 'Taco', 'Sopa', 'Sushi', 'Hamburguesa', 'Ensalada', 'Curry',
    'Paella', 'Arepa', 'Ramen', 'Burrito', 'Empanada', 'Wok', 'Kebab',
    'Tamal', 'Pollo frito', 'Sandwich', 'Gyoza', 'Ceviche', 'Pasta'
  ];

  const categorias = [
    'Entrada', 'Plato fuerte', 'Merienda', 'Completo', 'Guarnición',
    'Snack', 'Combo', 'Antojito', 'Ración pequeña', 'Especialidad'
  ];

  const descriptores1 = [
    'crujiente', 'jugosa', 'suave', 'picante', 'fresca', 'dulce',
    'agridulce', 'sabrosa', 'ligera', 'rellena', 'intensa', 'cremosa',
    'dorada', 'esponjosa', 'refrescante', 'tierna', 'suavecita', 'fermentada'
  ];

  const descriptores2 = [
    'al horno', 'a la parrilla', 'empanizada', 'con especias', 'artesanal',
    'casera', 'caramelizada', 'gratinada', 'al vapor', 'salteada',
    'glaseada', 'fusionada', 'de la casa', 'al wok', 'rellena de queso',
    'con salsa especial', 'con toque cítrico', 'a baja temperatura'
  ];

  const elegir = arr => arr[Math.floor(Math.random() * arr.length)];

  let intentos = 0;

  while (intentos < 5) {
    const nombre = elegir(nombres);
    const categoria = elegir(categorias);
    const desc1 = elegir(descriptores1);
    const desc2 = elegir(descriptores2);

    const descripcion = `${nombre.toLowerCase()} ${desc1} ${desc2}`;
    const clave = `${nombre}|${categoria}|${desc1}|${desc2}`;

    if (!productosGenerados.has(clave)) {
      productosGenerados.add(clave);
      return { nombre, categoria, descripcion };
    }

    intentos++;
  }

  // Si todo se repitió, devolver uno del set
  const claveRepetida = [...productosGenerados][Math.floor(Math.random() * productosGenerados.size)];
  const [nombre, categoria, desc1, desc2] = claveRepetida.split('|');
  return {
    nombre,
    categoria,
    descripcion: `${nombre.toLowerCase()} ${desc1} ${desc2}`
  };
}

crearDatosMasivos();