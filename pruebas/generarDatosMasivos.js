const axios = require('axios');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

const AUTH_API = 'http://localhost/auth';
const API = 'http://localhost/api';

// Configuración para datos masivos
const CONFIG = {
  TOTAL_USERS: 100,
  MAX_RESTAURANTS: 10, //50 // null = todos los restaurantes del JSON, número = límite específico
  MENUS_PER_RESTAURANT: 2, //3
  PRODUCTS_PER_MENU: 3, // 8
  RESERVATIONS_PER_USER: 3,
  ORDERS_PER_USER: 6, // 5
  TOTAL_REPARTIDORES: 15
};

const dominios = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'protonmail.com'];

// Datos para generar direcciones realistas de Costa Rica
const provincias_costa_rica = [
  'San José', 'Alajuela', 'Cartago', 'Heredia', 'Puntarenas', 'Guanacaste', 'Limón'
];

const cantones_san_jose = [
  'San José Centro', 'Escazú', 'Desamparados', 'Puriscal', 'Tarrazú',
  'Aserrí', 'Mora', 'Goicoechea', 'Santa Ana', 'Alajuelita',
  'Vásquez de Coronado', 'Acosta', 'Tibás', 'Moravia', 'Montes de Oca',
  'Turrubares', 'Dota', 'Curridabat', 'Pérez Zeledón'
];

const tipos_via = [
  'Avenida', 'Calle', 'Boulevard', 'Paseo', 'Diagonal', 'Carretera'
];

const referencias_costa_rica = [
  'del Parque Central', 'de la Iglesia', 'del Banco Nacional', 'de la Escuela',
  'del Supermercado', 'de la Municipalidad', 'del Centro Comercial',
  'de la Gasolinera', 'del Hospital', 'de la Universidad',
  'del Mall', 'de la Plaza', 'del Estadio', 'de la Basílica',
  'del ICE', 'del CCSS', 'de Correos', 'del Ministerio'
];
const categorias_productos = [
  'Entrada', 'Plato principal', 'Postre', 'Bebida', 'Acompañamiento', 
  'Ensalada', 'Sopa', 'Aperitivo', 'Especialidad', 'Combo'
];

const nombres_productos = [
  'Pizza', 'Hamburguesa', 'Tacos', 'Sushi', 'Pasta', 'Ensalada', 'Sopa', 
  'Pollo', 'Carne', 'Pescado', 'Arroz', 'Sandwich', 'Burrito', 'Quesadilla',
  'Ceviche', 'Nachos', 'Alitas', 'Empanadas', 'Tamales', 'Gallo pinto',
  'Casado', 'Chifrijo', 'Patacones', 'Frijoles', 'Café', 'Limonada',
  'Batido', 'Refresco', 'Agua', 'Cerveza', 'Flan', 'Tres leches', 'Helado'
];

const adjetivos_productos = [
  'especial', 'tradicional', 'casero', 'gourmet', 'artesanal', 'fresco',
  'criollo', 'típico', 'delicioso', 'premium', 'clásico', 'tropical',
  'picante', 'suave', 'rico', 'sabroso', 'nutritivo', 'ligero'
];

const tipos_menu = [
  'Menú del día', 'Menú ejecutivo', 'Menú degustación', 'Especialidades',
  'Carta principal', 'Menú infantil', 'Menú saludable', 'Menú vegetariano'
];

const vehiculos_repartidor = [
  'Motocicleta Honda 150cc', 'Motocicleta Yamaha 125cc', 'Bicicleta eléctrica',
  'Scooter eléctrico', 'Motocicleta Suzuki 200cc', 'Bicicleta convencional',
  'Motocicleta Kawasaki 250cc', 'Auto compacto', 'Moto eléctrica'
];

// Coordenadas de Costa Rica 
const coordenadas_costa_rica = {
  min_lat: 9.7, max_lat: 10.5,
  min_lng: -85.0, max_lng: -83.6
};

const crearDatosMasivos = async (opciones = {}) => {
  try {
    console.time('Ejecución total');
    
    // Configurar opciones con valores por defecto
    const config = {
      usuarios: opciones.usuarios || CONFIG.TOTAL_USERS,
      maxRestaurantes: opciones.maxRestaurantes !== undefined ? opciones.maxRestaurantes : CONFIG.MAX_RESTAURANTS,
      menusPorRestaurante: opciones.menusPorRestaurante || CONFIG.MENUS_PER_RESTAURANT,
      productosPorMenu: opciones.productosPorMenu || CONFIG.PRODUCTS_PER_MENU,
      reservacionesPorUsuario: opciones.reservacionesPorUsuario || CONFIG.RESERVATIONS_PER_USER,
      pedidosPorUsuario: opciones.pedidosPorUsuario || CONFIG.ORDERS_PER_USER,
      repartidores: opciones.repartidores || CONFIG.TOTAL_REPARTIDORES
    };
    
    console.log('Configuración de generación de datos:');
    console.log(`Usuarios: ${config.usuarios}`);
    console.log(`Restaurantes: ${config.maxRestaurantes === null ? 'TODOS los del JSON' : config.maxRestaurantes}`);
    console.log(`Menús por restaurante: ${config.menusPorRestaurante}`);
    console.log(`Productos por menú: ${config.productosPorMenu}`);
    console.log(`Reservaciones por usuario: ${config.reservacionesPorUsuario}`);
    console.log(`Pedidos por usuario: ${config.pedidosPorUsuario}`);
    console.log(`Repartidores: ${config.repartidores}`);
    console.log('');
    
    // Leer restaurantes desde JSON de OpenStreetMap
    let restaurantesData = [];
    try {
      const restaurantesPath = path.join(__dirname, 'restaurantes.json');
      const restaurantesContent = fs.readFileSync(restaurantesPath, 'utf8');
      const osmData = JSON.parse(restaurantesContent);
      
      // Procesar elementos de OpenStreetMap
      let restaurantesFiltrados = osmData.elements
        .filter(element => 
          element.type === 'node' && 
          element.tags && 
          element.tags.amenity === 'restaurant' && 
          element.tags.name && // Solo restaurantes con nombre
          element.tags.name.trim() !== '' // Ignorar nombres vacíos
        )
        .map(element => ({
          nombre: element.tags.name,
          direccion: element.tags['addr:full'] || 
                    element.tags['addr:street'] || 
                    (element.tags['addr:city'] ? `${element.tags['addr:city']}, Costa Rica` : 'San José, Costa Rica'),
          latitud: element.lat,
          longitud: element.lon
        }));
      
      // Aplicar límite de restaurantes si se especifica
      if (config.maxRestaurantes !== null && config.maxRestaurantes > 0) {
        restaurantesFiltrados = restaurantesFiltrados.slice(0, config.maxRestaurantes);
        console.log(`Procesando primeros ${config.maxRestaurantes} restaurantes de ${osmData.elements.length} disponibles`);
      } else {
        console.log(`Procesando TODOS los ${restaurantesFiltrados.length} restaurantes válidos del JSON`);
      }
      
      restaurantesData = restaurantesFiltrados;
      
      if (restaurantesData.length === 0) {
        throw new Error('No se encontraron restaurantes válidos en el JSON');
      }
      
    } catch (error) {
      console.log('Error leyendo restaurantes.json, generando restaurantes por defecto...');
      console.log('Error:', error.message);
      // Generar restaurantes por defecto
      restaurantesData = [
        { nombre: 'La Trattoria Italiana', direccion: 'Centro de San José, 200m norte del Teatro Nacional' },
        { nombre: 'Sushi Zen', direccion: 'Escazú, Plaza Mayor, local 15' },
        { nombre: 'Taco Libre', direccion: 'Barrio Escalante, Avenida 33, casa 2750' },
        { nombre: 'Burger Palace', direccion: 'Cartago Centro, 150m sur de la Basílica' },
        { nombre: 'Curry House', direccion: 'San Pedro, 300m este de la UCR' }
      ];
      
      // Aplicar límite también a restaurantes por defecto
      if (config.maxRestaurantes !== null && config.maxRestaurantes > 0) {
        restaurantesData = restaurantesData.slice(0, config.maxRestaurantes);
      }
    }

    const productosGlobales = [];
    const adminNombre = faker.person.fullName();
    const adminEmail = generarEmailDesdeNombre(adminNombre);

    // Crear admin
    console.log('Creando administrador...');
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

    // Crear usuarios en lotes
    console.log(`Creando ${config.usuarios} usuarios...`);
    const usuarios = [];
    for (let i = 0; i < config.usuarios; i++) {
    const nombre = faker.person.fullName();
    const email = generarEmailDesdeNombre(nombre);

    // Determinar si este usuario tiene referido (70% de probabilidad después de los primeros 10)
    let id_referido = null;
    if (usuarios.length >= 10 && Math.random() < 0.7) {
      const posibleReferente = faker.helpers.arrayElement(usuarios);
      id_referido = posibleReferente.id;
    }

    await axios.post(`${AUTH_API}/auth/register`, {
      nombre,
      email,
      contrasena: '123456',
      rol: 'cliente',
      id_referido
    });

    const login = await axios.post(`${AUTH_API}/auth/login`, {
      email,
      contrasena: '123456'
    });

    usuarios.push({
      id: login.data.usuario.id_usuario,
      token: login.data.token,
      email,
      nombre,
      id_referido
    });

    // Asignar ubicación aleatoria al usuario dentro de Costa Rica
    const latitud_usuario = faker.number.float({
      min: coordenadas_costa_rica.min_lat,
      max: coordenadas_costa_rica.max_lat,
      fractionDigits: 6
    });
    
    const longitud_usuario = faker.number.float({
      min: coordenadas_costa_rica.min_lng,
      max: coordenadas_costa_rica.max_lng,
      fractionDigits: 6
    });

    // Generar dirección realista para el usuario
    const direccion_usuario = generarDireccionCostaRica();

    try {
      await axios.put(`${AUTH_API}/users/${login.data.usuario.id_usuario}/location`, {
        latitud: latitud_usuario,
        longitud: longitud_usuario,
        direccion: direccion_usuario
      }, {
        headers: { Authorization: `Bearer ${login.data.token}` }
      });
    } catch (locationError) {
      console.log(`⚠️ No se pudo asignar ubicación al usuario ${nombre}: endpoint no disponible`);
    }

    if ((i + 1) % 20 === 0) {
      console.log(`  Usuarios creados: ${i + 1}/${config.usuarios}`);
    }
    }

    // Crear restaurantes con menús y productos
    console.log('Creando restaurantes, menús y productos...');
    const restaurantes = [];
    
    for (let r = 0; r < restaurantesData.length; r++) {
      const restauranteInfo = restaurantesData[r];
      
      const rest = await axios.post(`${API}/restaurants`, {
        nombre: restauranteInfo.nombre,
        direccion: restauranteInfo.direccion
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const id_restaurante = rest.data.restaurante.id_restaurante;
      restaurantes.push(id_restaurante);

      // Asignar ubicación al restaurante si está disponible en el JSON
      if (restauranteInfo.latitud && restauranteInfo.longitud) {
        try {
          await axios.put(`${API}/restaurants/${id_restaurante}/location`, {
            latitud: restauranteInfo.latitud,
            longitud: restauranteInfo.longitud
          }, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });
        } catch (locationError) {
          console.log(`⚠️ No se pudo asignar ubicación al restaurante ${restauranteInfo.nombre}: endpoint no disponible`);
        }
      }

      // Crear menús para este restaurante
      for (let m = 0; m < config.menusPorRestaurante; m++) {
        const nombreMenu = faker.helpers.arrayElement(tipos_menu);
        const descripcionMenu = `${nombreMenu} con especialidades de ${restauranteInfo.nombre}`;

        const menu = await axios.post(`${API}/menus`, {
          id_restaurante,
          nombre: nombreMenu,
          descripcion: descripcionMenu
        }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });

        const id_menu = menu.data.menu.id_menu;

        // Crear productos para este menú
        for (let p = 0; p < config.productosPorMenu; p++) {
          const nombreProducto = faker.helpers.arrayElement(nombres_productos);
          const adjetivo = faker.helpers.arrayElement(adjetivos_productos);
          const categoria = faker.helpers.arrayElement(categorias_productos);
          
          const nombreCompleto = `${nombreProducto} ${adjetivo}`;
          const descripcion = `Delicioso ${nombreProducto.toLowerCase()} ${adjetivo} preparado en ${restauranteInfo.nombre}`;
          
          const producto = await axios.post(`${API}/products`, {
            nombre: nombreCompleto,
            categoria: categoria,
            descripcion: descripcion,
            precio: parseFloat(faker.commerce.price({ min: 2500, max: 25000 })),
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

      console.log(`  Restaurante ${r + 1}/${restaurantesData.length} completado: ${restauranteInfo.nombre}`);
    }

    // Crear repartidores
    console.log(`Creando ${config.repartidores} repartidores...`);
    for (let r = 0; r < config.repartidores; r++) {
      const nombre = faker.person.fullName();
      const telefono = `+506 ${faker.string.numeric(4)}-${faker.string.numeric(4)}`;
      const vehiculo = faker.helpers.arrayElement(vehiculos_repartidor);
      
      // Coordenadas aleatorias en Costa Rica
      const latitud = faker.number.float({
        min: coordenadas_costa_rica.min_lat,
        max: coordenadas_costa_rica.max_lat,
        fractionDigits: 6
      });
      
      const longitud = faker.number.float({
        min: coordenadas_costa_rica.min_lng,
        max: coordenadas_costa_rica.max_lng,
        fractionDigits: 6
      });

      const repartidor = await axios.post(`${API}/drivers`, {
        nombre,
        telefono,
        vehiculo
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      // Actualizar ubicación del repartidor
      await axios.put(`${API}/drivers/${repartidor.data.repartidor.id_repartidor}/location`, {
        latitud_actual: latitud,
        longitud_actual: longitud
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if ((r + 1) % 5 === 0) {
        console.log(`  Repartidores creados: ${r + 1}/${config.repartidores}`);
      }
    }

    // Crear reservaciones y pedidos
    console.log('Creando reservaciones y pedidos...');
    let reservacionesCreadas = 0;
    let pedidosCreados = 0;

    for (let u = 0; u < usuarios.length; u++) {
      const user = usuarios[u];
      
      // Crear reservaciones
      for (let r = 0; r < config.reservacionesPorUsuario; r++) {
        const id_restaurante = faker.helpers.arrayElement(restaurantes);
        
        // Crear reserva inicial
        const reserva = await axios.post(`${API}/reservations`, {
          id_usuario: user.id,
          id_restaurante,
          fecha_hora: new Date().toISOString(), // Fecha temporal
          estado: 'pendiente' // Estado temporal
        }, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        // Actualizar con fecha del rango de 1 año
        const fechaReserva = faker.date.between({
          from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 año atrás
          to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)    // 1 año adelante
        });

        const id_reserva = reserva.data.reserva.id_reserva; // Ajustar según tu API

        // Determinar estado basado en la fecha
        let estadoReserva;
        const ahora = new Date();
        if (fechaReserva < ahora) {
          // Reservas pasadas
          estadoReserva = faker.helpers.arrayElement(['confirmada', 'cancelada', 'confirmada']);
        } else {
          // Reservas futuras
          estadoReserva = faker.helpers.arrayElement(['pendiente', 'confirmada']);
        }

        try {
          await axios.put(`${API}/reservations/${id_reserva}`, {
            fecha_hora: fechaReserva.toISOString(),
            estado: estadoReserva
          }, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
        } catch (error) {
          console.log(`⚠️ Error actualizando reserva ${id_reserva}:`, error.response?.data || error.message);
        }
        
        reservacionesCreadas++;
      }

      // Crear pedidos
      for (let o = 0; o < config.pedidosPorUsuario; o++) {
        const productosPedido = faker.helpers.arrayElements(
          productosGlobales, 
          faker.number.int({ min: 2, max: 6 })
        );

        const productosFormateados = productosPedido.map(p => ({
          id_producto: p.id_producto,
          cantidad: faker.number.int({ min: 1, max: 3 })
        }));

        // Crear pedido inicial
        const pedido = await axios.post(`${API}/orders`, {
          id_usuario: user.id,
          id_restaurante: productosPedido[0].id_restaurante,
          tipo: faker.helpers.arrayElement(['en restaurante', 'para recoger']),
          productos: productosFormateados
        }, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        // Actualizar con fecha del rango de 1 año
        const fechaPedido = faker.date.between({
          from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 año atrás
          to: new Date() // Hasta hoy
        });

        const id_pedido = pedido.data.pedido.id_pedido; // Ajustar según tu API

        // Determinar estado basado en la fecha para más realismo
        let estadoPedido;
        const ahora = new Date();
        const diferenciaDias = (ahora - fechaPedido) / (1000 * 60 * 60 * 24);

        if (diferenciaDias > 7) {
          estadoPedido = faker.helpers.arrayElement(['entregado', 'entregado', 'entregado']);
        } else if (diferenciaDias > 1) {
          estadoPedido = faker.helpers.arrayElement(['entregado', 'en preparacion', 'listo']);
        } else {
          estadoPedido = faker.helpers.arrayElement(['pendiente', 'en preparacion', 'listo']);
        }

        try {
          await axios.put(`${API}/orders/${id_pedido}`, {
            estado: estadoPedido,
            fecha_hora: fechaPedido.toISOString() // Ajustar campo según tu API
          }, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
        } catch (error) {
          console.log(`⚠️ Error actualizando pedido ${id_pedido}:`, error.response?.data || error.message);
        }
        
        pedidosCreados++;
      }

      if ((u + 1) % 25 === 0) {
        console.log(`  Usuarios procesados: ${u + 1}/${usuarios.length}`);
        console.log(`    Reservaciones: ${reservacionesCreadas}, Pedidos: ${pedidosCreados}`);
      }
    }

    console.timeEnd('Ejecución total');
    console.log('\n=== RESUMEN DE DATOS CREADOS ===');
    console.log(`✅ Usuarios: ${usuarios.length}`);
    console.log(`✅ Restaurantes: ${restaurantes.length}`);
    console.log(`✅ Productos: ${productosGlobales.length}`);
    console.log(`✅ Repartidores: ${config.repartidores}`);
    console.log(`✅ Reservaciones: ${reservacionesCreadas}`);
    console.log(`✅ Pedidos: ${pedidosCreados}`);
    console.log('\n🎉 Base de datos poblada exitosamente!');

  } catch (err) {
    console.error('❌ Error durante la ejecución:', err.response?.data || err.message);
    if (err.response?.status === 409) {
      console.log('💡 Tip: Es posible que algunos datos ya existan. Considera limpiar la base de datos primero.');
    }
  }
};

function generarEmailDesdeNombre(nombreCompleto) {
  const nombreLimpio = nombreCompleto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toLowerCase();

  const partes = nombreLimpio.split(/\s+/);
  let usuarioEmail = partes.join('.');
  const dominio = faker.helpers.arrayElement(dominios);

  // Agregar números aleatorios para evitar duplicados
  const numeroAleatorio = faker.number.int({ min: 10, max: 999 });
  return `${usuarioEmail}${numeroAleatorio}@${dominio}`;
}

function generarDireccionCostaRica() {
  const provincia = faker.helpers.arrayElement(provincias_costa_rica);
  let canton;
  
  // Si es San José, usar cantones específicos, sino usar la provincia como cantón
  if (provincia === 'San José') {
    canton = faker.helpers.arrayElement(cantones_san_jose);
  } else {
    canton = `${provincia} Centro`;
  }
  
  const tipoVia = faker.helpers.arrayElement(tipos_via);
  const numeroVia = faker.number.int({ min: 1, max: 150 });
  const numeroCasa = faker.number.int({ min: 1, max: 9999 });
  const distancia = faker.number.int({ min: 50, max: 500 });
  const direccion_cardinal = faker.helpers.arrayElement(['norte', 'sur', 'este', 'oeste']);
  const referencia = faker.helpers.arrayElement(referencias_costa_rica);
  
  // Formato típico costarricense: "Canton, Avenida X, casa Y, Zm dirección de referencia"
  const direcciones_posibles = [
    `${canton}, ${tipoVia} ${numeroVia}, casa ${numeroCasa}`,
    `${canton}, ${distancia}m ${direccion_cardinal} ${referencia}`,
    `${canton}, ${tipoVia} ${numeroVia}, ${distancia}m ${direccion_cardinal} ${referencia}`,
    `${provincia}, ${canton}, casa ${numeroCasa}`,
    `${canton}, contiguo ${referencia}`,
    `${provincia}, ${tipoVia} ${numeroVia}, ${numeroCasa}`
  ];
  
  return faker.helpers.arrayElement(direcciones_posibles);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  // Opciones de ejemplo para diferentes escenarios
  const opciones = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  crearDatosMasivos(opciones);
}

// Funciones de conveniencia para casos comunes
const crearDatosDemo = () => crearDatosMasivos({
  usuarios: 20,
  maxRestaurantes: 5,
  menusPorRestaurante: 2,
  productosPorMenu: 4,
  reservacionesPorUsuario: 1,
  pedidosPorUsuario: 2,
  repartidores: 3
});

const crearDatosMedianos = () => crearDatosMasivos({
  usuarios: 100,
  maxRestaurantes: 15,
  menusPorRestaurante: 3,
  productosPorMenu: 6,
  reservacionesPorUsuario: 2,
  pedidosPorUsuario: 3,
  repartidores: 8
});

const crearDatosCompletos = () => crearDatosMasivos({
  usuarios: 500,
  maxRestaurantes: null, // Todos los restaurantes del JSON
  menusPorRestaurante: 4,
  productosPorMenu: 10,
  reservacionesPorUsuario: 4,
  pedidosPorUsuario: 6,
  repartidores: 25
});

const crearDatosSoloRestaurantes = (cantidad) => crearDatosMasivos({
  usuarios: 10, // Mínimo de usuarios para que funcione
  maxRestaurantes: cantidad,
  menusPorRestaurante: 2,
  productosPorMenu: 5,
  reservacionesPorUsuario: 1,
  pedidosPorUsuario: 1,
  repartidores: 2
});

module.exports = { 
  crearDatosMasivos, 
  crearDatosDemo, 
  crearDatosMedianos, 
  crearDatosCompletos,
  crearDatosSoloRestaurantes
};