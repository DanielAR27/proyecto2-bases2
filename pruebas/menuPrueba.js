const readline = require('readline');
const axios = require('axios');

// Configuración básica
const AUTH_API = 'http://localhost/auth';   // Para /auth/register y /auth/login
const API = 'http://localhost/api';        // Para /restaurants, /products, etc.
const SEARCH_API = 'http://localhost/search'; // Para búsquedas

// Estado global
let currentToken = null;
let currentUser = null;
let isAdmin = true; // Por defecto inicia como administrador

// Crear interfaz de línea de comandos
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utilidad para hacer una pausa y esperar que el usuario presione Enter
const pause = () => {
  return new Promise(resolve => {
    rl.question('\nPresione Enter para continuar...', () => {
      resolve();
    });
  });
};

// Función principal para iniciar el programa
async function main() {
  console.log('Iniciando en modo administrador por defecto...');
  await showMainMenu();
}

// Función para mostrar el menú principal
async function showMainMenu() {
  while (true) {
    console.clear();
    console.log('======= SISTEMA DE GESTIÓN DE RESTAURANTE =======');
    console.log(`Modo actual: ${isAdmin ? 'Administrador' : 'Usuario regular'}`);
    console.log(`Usuario: ${currentUser ? currentUser.nombre : 'No autenticado'}`);
    console.log('=============================================');
    console.log('1. Autenticación');
    console.log('2. Búsqueda');
    console.log('3. Gestión de Productos');
    console.log('4. Gestión de Menús');
    console.log('5. Gestión de Pedidos');
    console.log('6. Gestión de Reservas');
    console.log('7. Gestión de Restaurantes');
    console.log('8. Gestión de Usuarios');
    console.log('9. Cambiar modo (Admin/Usuario)');
    console.log('0. Salir');
    console.log('=============================================');
    
    const option = await question('Seleccione una opción: ');
    switch (option) {
      case '1':
        await showAuthMenu();
        break;
      case '2':
        await showSearchMenu();
        break;
      case '3':
        await showProductsMenu();
        break;
      case '4':
        await showMenusMenu();
        break;
      case '5':
        await showOrdersMenu();
        break;
      case '6':
        await showReservationsMenu();
        break;
      case '7':
        await showRestaurantsMenu();
        break;
      case '8':
        await showUsersMenu();
        break;
      case '9':
        isAdmin = !isAdmin;
        console.log(`Modo cambiado a: ${isAdmin ? 'Administrador' : 'Usuario regular'}`);
        await pause();
        break;
      case '0':
        console.log('Saliendo del sistema...');
        rl.close();
        return;
      default:
        console.log('Opción inválida. Intente de nuevo.');
        await pause();
    }
  }
}

// Función para el menú de autenticación
async function showAuthMenu() {
  while (true) {
    console.clear();
    console.log('======= AUTENTICACIÓN =======');
    console.log('1. Registrar nuevo usuario');
    console.log('2. Iniciar sesión');
    console.log('3. Verificar token');
    console.log('0. Volver al menú principal');
    console.log('============================');
    
    const option = await question('Seleccione una opción: ');
    switch (option) {
      case '1':
        await registerUser();
        break;
      case '2':
        await loginUser();
        break;
      case '3':
        await verifyToken();
        break;
      case '0':
        return;
      default:
        console.log('Opción inválida. Intente de nuevo.');
        await pause();
    }
  }
}

// Función para el menú de búsqueda
async function showSearchMenu() {
  while (true) {
    console.clear();
    console.log('======= BÚSQUEDA =======');
    console.log('1. Buscar productos por texto');
    console.log('2. Buscar productos por categoría');
    console.log('3. Reindexar todos los productos');
    console.log('4. Indexar producto individual');
    console.log('5. Actualizar producto en el índice');
    console.log('6. Eliminar producto del índice');
    console.log('0. Volver al menú principal');
    console.log('=========================');
    
    const option = await question('Seleccione una opción: ');
    switch (option) {
      case '1':
        await searchProductsByText();
        break;
      case '2':
        await searchProductsByCategory();
        break;
      case '3':
        await reindexAllProducts();
        break;
      case '4':
        await indexSingleProduct();
        break;
      case '5':
        await updateProductInIndex();
        break;
      case '6':
        await deleteProductFromIndex();
        break;
      case '0':
        return;
      default:
        console.log('Opción inválida. Intente de nuevo.');
        await pause();
    }
  }
}

// Función para el menú de productos
async function showProductsMenu() {
  while (true) {
    console.clear();
    console.log('======= GESTIÓN DE PRODUCTOS =======');
    console.log('1. Obtener todos los productos');
    console.log('2. Crear un nuevo producto');
    console.log('3. Obtener un producto por ID');
    console.log('4. Actualizar un producto');
    console.log('5. Eliminar un producto');
    console.log('0. Volver al menú principal');
    console.log('==================================');
    
    const option = await question('Seleccione una opción: ');
    switch (option) {
      case '1':
        await getAllProducts();
        break;
      case '2':
        await createProduct();
        break;
      case '3':
        await getProductById();
        break;
      case '4':
        await updateProduct();
        break;
      case '5':
        await deleteProduct();
        break;
      case '0':
        return;
      default:
        console.log('Opción inválida. Intente de nuevo.');
        await pause();
    }
  }
}

// Función para el menú de menús
async function showMenusMenu() {
  while (true) {
    console.clear();
    console.log('======= GESTIÓN DE MENÚS =======');
    console.log('1. Obtener todos los menús');
    console.log('2. Crear un nuevo menú');
    console.log('3. Obtener un menú por ID');
    console.log('4. Actualizar un menú');
    console.log('5. Eliminar un menú');
    console.log('0. Volver al menú principal');
    console.log('===============================');
    
    const option = await question('Seleccione una opción: ');
    switch (option) {
      case '1':
        await getAllMenus();
        break;
      case '2':
        await createMenu();
        break;
      case '3':
        await getMenuById();
        break;
      case '4':
        await updateMenu();
        break;
      case '5':
        await deleteMenu();
        break;
      case '0':
        return;
      default:
        console.log('Opción inválida. Intente de nuevo.');
        await pause();
    }
  }
}

// Función para el menú de pedidos
async function showOrdersMenu() {
  while (true) {
    console.clear();
    console.log('======= GESTIÓN DE PEDIDOS =======');
    console.log('1. Obtener todos los pedidos');
    console.log('2. Crear un nuevo pedido');
    console.log('3. Obtener un pedido por ID');
    console.log('4. Eliminar un pedido');
    console.log('0. Volver al menú principal');
    console.log('================================');
    
    const option = await question('Seleccione una opción: ');
    switch (option) {
      case '1':
        await getAllOrders();
        break;
      case '2':
        await createOrder();
        break;
      case '3':
        await getOrderById();
        break;
      case '4':
        await deleteOrder();
        break;
      case '0':
        return;
      default:
        console.log('Opción inválida. Intente de nuevo.');
        await pause();
    }
  }
}

// Función para el menú de reservas
async function showReservationsMenu() {
  while (true) {
    console.clear();
    console.log('======= GESTIÓN DE RESERVAS =======');
    console.log('1. Obtener todas las reservas');
    console.log('2. Crear una nueva reserva');
    console.log('3. Obtener una reserva por ID');
    console.log('4. Actualizar una reserva');
    console.log('5. Eliminar una reserva');
    console.log('0. Volver al menú principal');
    console.log('==================================');
    
    const option = await question('Seleccione una opción: ');
    switch (option) {
      case '1':
        await getAllReservations();
        break;
      case '2':
        await createReservation();
        break;
      case '3':
        await getReservationById();
        break;
      case '4':
        await updateReservation();
        break;
      case '5':
        await deleteReservation();
        break;
      case '0':
        return;
      default:
        console.log('Opción inválida. Intente de nuevo.');
        await pause();
    }
  }
}

// Función para el menú de restaurantes
async function showRestaurantsMenu() {
  while (true) {
    console.clear();
    console.log('======= GESTIÓN DE RESTAURANTES =======');
    console.log('1. Obtener todos los restaurantes');
    console.log('2. Crear un nuevo restaurante');
    console.log('3. Obtener un restaurante por ID');
    console.log('4. Actualizar un restaurante');
    console.log('5. Eliminar un restaurante');
    console.log('0. Volver al menú principal');
    console.log('=====================================');
    
    const option = await question('Seleccione una opción: ');
    switch (option) {
      case '1':
        await getAllRestaurants();
        break;
      case '2':
        await createRestaurant();
        break;
      case '3':
        await getRestaurantById();
        break;
      case '4':
        await updateRestaurant();
        break;
      case '5':
        await deleteRestaurant();
        break;
      case '0':
        return;
      default:
        console.log('Opción inválida. Intente de nuevo.');
        await pause();
    }
  }
}

// Función para el menú de usuarios
async function showUsersMenu() {
  while (true) {
    console.clear();
    console.log('======= GESTIÓN DE USUARIOS =======');
    console.log('1. Obtener información del usuario actual');
    console.log('2. Actualizar información de un usuario');
    console.log('3. Eliminar un usuario');
    console.log('0. Volver al menú principal');
    console.log('==================================');
    
    const option = await question('Seleccione una opción: ');
    switch (option) {
      case '1':
        await getCurrentUserInfo();
        break;
      case '2':
        await updateUser();
        break;
      case '3':
        await deleteUser();
        break;
      case '0':
        return;
      default:
        console.log('Opción inválida. Intente de nuevo.');
        await pause();
    }
  }
}

// Funciones de utilidad para realizar solicitudes HTTP
async function makeRequest(method, url, data = null, requiresToken = false) {
  try {
    const config = {};
    
    if (requiresToken) {
      if (!currentToken) {
        console.log('No hay un token de autenticación. Por favor, inicie sesión primero.');
        await pause();
        return null;
      }
      config.headers = { Authorization: `Bearer ${currentToken}` };
    }
    
    let response;
    
    switch (method.toLowerCase()) {
      case 'get':
        response = await axios.get(url, config);
        break;
      case 'post':
        response = await axios.post(url, data, config);
        break;
      case 'put':
        response = await axios.put(url, data, config);
        break;
      case 'delete':
        response = await axios.delete(url, config);
        break;
      default:
        console.log('Método HTTP no válido');
        return null;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en la solicitud:', error.response?.data || error.message);
    return null;
  }
}

// Función para preguntar al usuario
function question(text) {
  return new Promise(resolve => {
    rl.question(text, answer => {
      resolve(answer);
    });
  });
}

// Implementación de las funciones de autenticación
async function registerUser() {
  console.clear();
  console.log('=== REGISTRO DE USUARIO ===');
  
  const nombre = await question('Nombre completo: ');
  const email = await question('Email: ');
  const contrasena = await question('Contraseña: ');
  const rol = isAdmin ? await question('Rol (administrador/cliente): ') : 'cliente';
  
  const data = { nombre, email, contrasena, rol };
  const response = await makeRequest('post', `${AUTH_API}/auth/register`, data);
  
  if (response) {
    console.log('Usuario registrado con éxito.');
  }
  
  await pause();
}

async function loginUser() {
  console.clear();
  console.log('=== INICIO DE SESIÓN ===');
  
  const email = await question('Email: ');
  const contrasena = await question('Contraseña: ');
  
  const data = { email, contrasena };
  const response = await makeRequest('post', `${AUTH_API}/auth/login`, data);
  
  if (response) {
    currentToken = response.token;
    currentUser = response.usuario;
    console.log('Inicio de sesión exitoso.');
    console.log(`Bienvenido, ${currentUser.nombre}`);
    // Si el usuario logueado es administrador, cambiar modo a admin
    if (currentUser.rol === 'administrador') {
      isAdmin = true;
      console.log('Modo cambiado a Administrador debido al rol del usuario.');
    } else {
      isAdmin = false;
      console.log('Modo cambiado a Usuario regular debido al rol del usuario.');
    }
  }
  
  await pause();
}

async function verifyToken() {
  console.clear();
  console.log('=== VERIFICACIÓN DE TOKEN ===');
  
  if (!currentToken) {
    console.log('No hay token para verificar. Por favor, inicie sesión primero.');
    await pause();
    return;
  }
  
  const response = await makeRequest('get', `${AUTH_API}/auth/verify`, null, true);
  
  if (response) {
    console.log('Token válido.');
    console.log('Información del token:', response);
  } else {
    console.log('Token inválido o expirado.');
    currentToken = null;
    currentUser = null;
  }
  
  await pause();
}

// Implementación de las funciones de búsqueda
async function searchProductsByText() {
  console.clear();
  console.log('=== BÚSQUEDA DE PRODUCTOS POR TEXTO ===');
  
  const query = await question('Texto de búsqueda: ');
  const response = await makeRequest('get', `${SEARCH_API}/search/products?q=${encodeURIComponent(query)}`);
  
  if (response) {
    console.log('Resultados de la búsqueda:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function searchProductsByCategory() {
  console.clear();
  console.log('=== BÚSQUEDA DE PRODUCTOS POR CATEGORÍA ===');
  
  const categoria = await question('Categoría: ');
  const response = await makeRequest('get', `${SEARCH_API}/search/products/category/${encodeURIComponent(categoria)}`);
  
  if (response) {
    console.log('Resultados de la búsqueda:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function reindexAllProducts() {
  console.clear();
  console.log('=== REINDEXAR TODOS LOS PRODUCTOS ===');
  
  const response = await makeRequest('post', `${SEARCH_API}/search/reindex`, null, true);
  
  if (response) {
    console.log('Productos reindexados con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function indexSingleProduct() {
  console.clear();
  console.log('=== INDEXAR PRODUCTO INDIVIDUAL ===');
  
  console.log('Ingrese los datos del producto:');
  const id = await question('ID del producto: ');
  const nombre = await question('Nombre: ');
  const descripcion = await question('Descripción: ');
  const categoria = await question('Categoría: ');
  const precio = await question('Precio: ');
  
  const data = { id, nombre, descripcion, categoria, precio };
  const response = await makeRequest('post', `${SEARCH_API}/search/product`, data, true);
  
  if (response) {
    console.log('Producto indexado con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function updateProductInIndex() {
  console.clear();
  console.log('=== ACTUALIZAR PRODUCTO EN EL ÍNDICE ===');
  
  const id = await question('ID del producto a actualizar: ');
  console.log('Ingrese los nuevos datos del producto:');
  const nombre = await question('Nombre: ');
  const descripcion = await question('Descripción: ');
  const categoria = await question('Categoría: ');
  const precio = await question('Precio: ');
  
  const data = { nombre, descripcion, categoria, precio };
  const response = await makeRequest('put', `${SEARCH_API}/search/product/${id}`, data, true);
  
  if (response) {
    console.log('Producto actualizado en el índice con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function deleteProductFromIndex() {
  console.clear();
  console.log('=== ELIMINAR PRODUCTO DEL ÍNDICE ===');
  
  const id = await question('ID del producto a eliminar: ');
  const response = await makeRequest('delete', `${SEARCH_API}/search/product/${id}`, null, true);
  
  if (response) {
    console.log('Producto eliminado del índice con éxito.');
    console.log(response);
  }
  
  await pause();
}

// Implementación de funciones para productos
async function getAllProducts() {
  console.clear();
  console.log('=== OBTENER TODOS LOS PRODUCTOS ===');
  
  const response = await makeRequest('get', `${API}/products`);
  
  if (response) {
    console.log('Lista de productos:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function createProduct() {
  console.clear();
  console.log('=== CREAR NUEVO PRODUCTO ===');
  
  const nombre = await question('Nombre: ');
  const categoria = await question('Categoría: ');
  const descripcion = await question('Descripción: ');
  const precio = parseFloat(await question('Precio: '));
  const id_menu = await question('ID del menú al que pertenece: ');
  
  const data = { nombre, categoria, descripcion, precio, id_menu };
  const response = await makeRequest('post', `${API}/products`, data, true);
  
  if (response) {
    console.log('Producto creado con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function getProductById() {
  console.clear();
  console.log('=== OBTENER PRODUCTO POR ID ===');
  
  const id = await question('ID del producto: ');
  const response = await makeRequest('get', `${API}/products/${id}`);
  
  if (response) {
    console.log('Detalles del producto:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function updateProduct() {
  console.clear();
  console.log('=== ACTUALIZAR PRODUCTO ===');
  
  const id = await question('ID del producto a actualizar: ');
  console.log('Ingrese los nuevos datos del producto:');
  const nombre = await question('Nombre: ');
  const categoria = await question('Categoría: ');
  const descripcion = await question('Descripción: ');
  const precio = parseFloat(await question('Precio: '));
  const id_menu = await question('ID del menú: ');
  
  const data = { nombre, categoria, descripcion, precio, id_menu };
  const response = await makeRequest('put', `${API}/products/${id}`, data, true);
  
  if (response) {
    console.log('Producto actualizado con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function deleteProduct() {
  console.clear();
  console.log('=== ELIMINAR PRODUCTO ===');
  
  const id = await question('ID del producto a eliminar: ');
  const response = await makeRequest('delete', `${API}/products/${id}`, null, true);
  
  if (response) {
    console.log('Producto eliminado con éxito.');
    console.log(response);
  }
  
  await pause();
}

// Implementación de funciones para menús
async function getAllMenus() {
  console.clear();
  console.log('=== OBTENER TODOS LOS MENÚS ===');
  
  const response = await makeRequest('get', `${API}/menus`);
  
  if (response) {
    console.log('Lista de menús:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function createMenu() {
  console.clear();
  console.log('=== CREAR NUEVO MENÚ ===');
  
  const nombre = await question('Nombre: ');
  const descripcion = await question('Descripción: ');
  const id_restaurante = await question('ID del restaurante: ');
  
  const data = { nombre, descripcion, id_restaurante };
  const response = await makeRequest('post', `${API}/menus`, data, true);
  
  if (response) {
    console.log('Menú creado con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function getMenuById() {
  console.clear();
  console.log('=== OBTENER MENÚ POR ID ===');
  
  const id = await question('ID del menú: ');
  const response = await makeRequest('get', `${API}/menus/${id}`);
  
  if (response) {
    console.log('Detalles del menú:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function updateMenu() {
  console.clear();
  console.log('=== ACTUALIZAR MENÚ ===');
  
  const id = await question('ID del menú a actualizar: ');
  console.log('Ingrese los nuevos datos del menú:');
  const nombre = await question('Nombre: ');
  const descripcion = await question('Descripción: ');
  
  const data = { nombre, descripcion };
  const response = await makeRequest('put', `${API}/menus/${id}`, data, true);
  
  if (response) {
    console.log('Menú actualizado con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function deleteMenu() {
  console.clear();
  console.log('=== ELIMINAR MENÚ ===');
  
  const id = await question('ID del menú a eliminar: ');
  const response = await makeRequest('delete', `${API}/menus/${id}`, null, true);
  
  if (response) {
    console.log('Menú eliminado con éxito.');
    console.log(response);
  }
  
  await pause();
}

// Implementación de funciones para pedidos
async function getAllOrders() {
  console.clear();
  console.log('=== OBTENER TODOS LOS PEDIDOS ===');
  
  const response = await makeRequest('get', `${API}/orders`);
  
  if (response) {
    console.log('Lista de pedidos:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function createOrder() {
  console.clear();
  console.log('=== CREAR NUEVO PEDIDO ===');
  
  const id_usuario = currentUser ? currentUser.id_usuario : await question('ID del usuario: ');
  const id_restaurante = await question('ID del restaurante: ');
  const tipo = await question('Tipo (en restaurante/para recoger): ');
  
  console.log('Agregue productos al pedido:');
  const productos = [];
  let agregarMas = 'si';
  
  while (agregarMas.toLowerCase() === 'si' || agregarMas.toLowerCase() === 'sí' || agregarMas.toLowerCase() === 's') {
    const id_producto = await question('ID del producto: ');
    const cantidad = parseInt(await question('Cantidad: '));
    productos.push({ id_producto, cantidad });
    
    agregarMas = await question('¿Agregar otro producto? (si/no): ');
  }
  
  const data = { id_usuario, id_restaurante, tipo, productos };
  const response = await makeRequest('post', `${API}/orders`, data, true);
  
  if (response) {
    console.log('Pedido creado con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function getOrderById() {
  console.clear();
  console.log('=== OBTENER PEDIDO POR ID ===');
  
  const id = await question('ID del pedido: ');
  const response = await makeRequest('get', `${API}/orders/${id}`);
  
  if (response) {
    console.log('Detalles del pedido:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function deleteOrder() {
  console.clear();
  console.log('=== ELIMINAR PEDIDO ===');
  
  const id = await question('ID del pedido a eliminar: ');
  const response = await makeRequest('delete', `${API}/orders/${id}`, null, true);
  
  if (response) {
    console.log('Pedido eliminado con éxito.');
    console.log(response);
  }
  
  await pause();
}

// Implementación de funciones para reservas
async function getAllReservations() {
  console.clear();
  console.log('=== OBTENER TODAS LAS RESERVAS ===');
  
  const response = await makeRequest('get', `${API}/reservations`);
  
  if (response) {
    console.log('Lista de reservas:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function createReservation() {
  console.clear();
  console.log('=== CREAR NUEVA RESERVA ===');
  
  const id_usuario = currentUser ? currentUser.id_usuario : await question('ID del usuario: ');
  const id_restaurante = await question('ID del restaurante: ');
  const fecha_hora = await question('Fecha y hora (YYYY-MM-DD HH:MM): ');
  const estado = await question('Estado (pendiente/confirmada/cancelada): ');
  
  const data = { id_usuario, id_restaurante, fecha_hora, estado };
  const response = await makeRequest('post', `${API}/reservations`, data, true);
  
  if (response) {
    console.log('Reserva creada con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function getReservationById() {
  console.clear();
  console.log('=== OBTENER RESERVA POR ID ===');
  
  const id = await question('ID de la reserva: ');
  const response = await makeRequest('get', `${API}/reservations/${id}`);
  
  if (response) {
    console.log('Detalles de la reserva:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function updateReservation() {
  console.clear();
  console.log('=== ACTUALIZAR RESERVA ===');
  
  const id = await question('ID de la reserva a actualizar: ');
  console.log('Ingrese los nuevos datos de la reserva:');
  const fecha_hora = await question('Fecha y hora (YYYY-MM-DD HH:MM): ');
  const estado = await question('Estado (pendiente/confirmada/cancelada): ');
  
  const data = { fecha_hora, estado };
  const response = await makeRequest('put', `${API}/reservations/${id}`, data, true);
  
  if (response) {
    console.log('Reserva actualizada con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function deleteReservation() {
  console.clear();
  console.log('=== ELIMINAR RESERVA ===');
  
  const id = await question('ID de la reserva a eliminar: ');
  const response = await makeRequest('delete', `${API}/reservations/${id}`, null, true);
  
  if (response) {
    console.log('Reserva eliminada con éxito.');
    console.log(response);
  }
  
  await pause();
}

// Implementación de funciones para restaurantes
async function getAllRestaurants() {
  console.clear();
  console.log('=== OBTENER TODOS LOS RESTAURANTES ===');
  
  const response = await makeRequest('get', `${API}/restaurants`);
  
  if (response) {
    console.log('Lista de restaurantes:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function createRestaurant() {
  console.clear();
  console.log('=== CREAR NUEVO RESTAURANTE ===');
  
  const nombre = await question('Nombre: ');
  const direccion = await question('Dirección: ');
  
  const data = { nombre, direccion };
  const response = await makeRequest('post', `${API}/restaurants`, data, true);
  
  if (response) {
    console.log('Restaurante creado con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function getRestaurantById() {
  console.clear();
  console.log('=== OBTENER RESTAURANTE POR ID ===');
  
  const id = await question('ID del restaurante: ');
  const response = await makeRequest('get', `${API}/restaurants/${id}`);
  
  if (response) {
    console.log('Detalles del restaurante:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function updateRestaurant() {
  console.clear();
  console.log('=== ACTUALIZAR RESTAURANTE ===');
  
  const id = await question('ID del restaurante a actualizar: ');
  console.log('Ingrese los nuevos datos del restaurante:');
  const nombre = await question('Nombre: ');
  const direccion = await question('Dirección: ');
  
  const data = { nombre, direccion };
  const response = await makeRequest('put', `${API}/restaurants/${id}`, data, true);
  
  if (response) {
    console.log('Restaurante actualizado con éxito.');
    console.log(response);
  }
  
  await pause();
}

async function deleteRestaurant() {
  console.clear();
  console.log('=== ELIMINAR RESTAURANTE ===');
  
  const id = await question('ID del restaurante a eliminar: ');
  const response = await makeRequest('delete', `${API}/restaurants/${id}`, null, true);
  
  if (response) {
    console.log('Restaurante eliminado con éxito.');
    console.log(response);
  }
  
  await pause();
}

// Implementación de funciones para usuarios
async function getCurrentUserInfo() {
  console.clear();
  console.log('=== INFORMACIÓN DEL USUARIO ACTUAL ===');
  
  if (!currentToken) {
    console.log('No hay un usuario autenticado. Por favor, inicie sesión primero.');
    await pause();
    return;
  }
  
  const response = await makeRequest('get', `${AUTH_API}/users/me`, null, true);
  
  if (response) {
    console.log('Información del usuario:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  await pause();
}

async function updateUser() {
  console.clear();
  console.log('=== ACTUALIZAR USUARIO ===');
  
  const id = await question('ID del usuario a actualizar: ');
  console.log('Ingrese los nuevos datos del usuario:');
  const nombre = await question('Nombre: ');
  const email = await question('Email: ');
  
  const data = { nombre, email };
  const response = await makeRequest('put', `${AUTH_API}/users/${id}`, data, true);
  
  if (response) {
    console.log('Usuario actualizado con éxito.');
    console.log(response);
    
    // Si estamos actualizando el usuario actual, actualizar la información
    if (currentUser && currentUser.id_usuario === parseInt(id)) {
      currentUser.nombre = nombre;
      currentUser.email = email;
    }
  }
  
  await pause();
}

async function deleteUser() {
  console.clear();
  console.log('=== ELIMINAR USUARIO ===');
  
  const id = await question('ID del usuario a eliminar: ');
  const response = await makeRequest('delete', `${AUTH_API}/users/${id}`, null, true);
  
  if (response) {
    console.log('Usuario eliminado con éxito.');
    console.log(response);
    
    // Si estamos eliminando el usuario actual, cerrar sesión
    if (currentUser && currentUser.id_usuario === parseInt(id)) {
      console.log('Has eliminado tu propio usuario. Cerrando sesión...');
      currentUser = null;
      currentToken = null;
    }
  }
  
  await pause();
}

// Iniciar el programa
main().catch(error => {
  console.error('Error en la aplicación:', error);
  rl.close();
});