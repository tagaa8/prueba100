# 🏠 Roommates Rental Platform

Una plataforma completa para alquiler de departamentos y subalquiler de habitaciones con sistema de matcheo entre compañeros de cuarto.

## 🚀 Características

- **🏘️ Publicación de departamentos**: Propietarios pueden listar departamentos completos
- **🛏️ Subalquiler de habitaciones**: Posibilidad de alquilar habitaciones individuales
- **🤝 Matcheo de compañeros**: Algoritmo de compatibilidad para encontrar el roommate ideal
- **📊 Comparador de apartamentos**: Herramienta para analizar y comparar distintos departamentos
- **🔐 Autenticación segura**: Sistema completo de registro y login con JWT
- **📱 API REST**: API completa con validaciones y manejo de errores

## 🛠️ Tecnologías

- **Backend**: Node.js + Express.js
- **Base de datos**: MySQL
- **Autenticación**: JWT + bcryptjs
- **Testing**: Jest + Supertest
- **Validación**: express-validator

## 📋 Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (versión 14 o superior)
- [MySQL](https://dev.mysql.com/downloads/mysql/) (versión 8.0 o superior)
- [npm](https://www.npmjs.com/) (incluido con Node.js)

### Instalación de MySQL en macOS

```bash
# Usando Homebrew (recomendado)
brew install mysql

# Iniciar MySQL
brew services start mysql

# Conectar como root (sin contraseña inicialmente)
mysql -u root
```

## 🚀 Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd roommates-rental-platform
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

El archivo `.env` ya está configurado para desarrollo local con MySQL root sin contraseña:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=roommates_platform
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
```

**Importante**: Si tu instalación de MySQL tiene contraseña para root, actualiza `DB_PASSWORD` en el archivo `.env`

### 4. Inicializar la base de datos

```bash
# Crear la base de datos y las tablas
node config/init-db.js
```

### 5. Ejecutar el servidor

```bash
# Modo desarrollo (con auto-reload)
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en: http://localhost:3000

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch
```

## 📚 API Endpoints

### Autenticación

```http
POST /api/auth/register
POST /api/auth/login
```

### Usuarios y Perfil

```http
GET /api/users/profile          # Obtener perfil del usuario
PUT /api/users/profile          # Actualizar perfil
GET /api/users/roommates        # Buscar compañeros compatibles
POST /api/users/interest        # Expresar interés en un usuario
GET /api/users/matches          # Obtener matches mutuos
```

### Apartamentos

```http
GET /api/apartments             # Listar apartamentos (con filtros)
GET /api/apartments/:id         # Obtener apartamento específico
POST /api/apartments            # Crear nuevo apartamento (requiere auth)
PUT /api/apartments/:id         # Actualizar apartamento (requiere auth)
POST /api/apartments/compare    # Comparar apartamentos
POST /api/apartments/comparisons # Guardar comparación (requiere auth)
GET /api/apartments/comparisons  # Obtener comparaciones guardadas (requiere auth)
```

### Habitaciones

```http
GET /api/rooms                  # Listar habitaciones disponibles
GET /api/rooms/:id              # Obtener habitación específica
POST /api/rooms                 # Crear nueva habitación (requiere auth)
POST /api/rooms/:id/apply       # Aplicar a una habitación (requiere auth)
GET /api/rooms/:id/applications # Ver aplicaciones (solo propietario)
PUT /api/rooms/applications/:id # Actualizar estado de aplicación
```

## 🔧 Estructura del proyecto

```
roommates-rental-platform/
├── config/
│   ├── database.js         # Configuración de MySQL
│   ├── init-db.js         # Script de inicialización de BD
│   └── schema.sql         # Schema de la base de datos
├── controllers/
│   ├── authController.js   # Lógica de autenticación
│   ├── apartmentController.js # Lógica de apartamentos
│   ├── roomController.js   # Lógica de habitaciones
│   ├── userController.js   # Lógica de usuarios y matching
│   └── comparisonController.js # Lógica de comparaciones
├── middleware/
│   └── auth.js            # Middleware de autenticación
├── routes/
│   ├── auth.js            # Rutas de autenticación
│   ├── apartments.js      # Rutas de apartamentos
│   ├── rooms.js           # Rutas de habitaciones
│   └── users.js           # Rutas de usuarios
├── tests/                 # Tests unitarios
├── uploads/               # Archivos subidos
├── server.js              # Punto de entrada
└── package.json
```

## 💡 Uso de la plataforma

### Para propietarios:

1. Registrarse en la plataforma
2. Crear un apartamento con todos los detalles
3. Agregar habitaciones individuales si deseas subalquilar
4. Gestionar aplicaciones de inquilinos

### Para inquilinos:

1. Registrarse y completar perfil
2. Buscar apartamentos o habitaciones
3. Usar el comparador para evaluar opciones
4. Aplicar a habitaciones de interés
5. Buscar compañeros de cuarto compatibles

### Sistema de matching:

El algoritmo de compatibilidad considera:
- **Presupuesto**: Superposición de rangos de precio
- **Edad**: Diferencia de edad
- **Estilo de vida**: Preferencias como limpieza, ruido, mascotas, etc.

## 🚨 Troubleshooting

### Error de conexión a MySQL

```bash
# Verificar que MySQL esté corriendo
brew services list | grep mysql

# Si no está corriendo, iniciarlo
brew services start mysql

# Verificar conexión
mysql -u root -p
```

### Error "ER_NOT_SUPPORTED_AUTH_MODE"

```sql
-- Conectar a MySQL y ejecutar:
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;
```

### Puerto 3000 en uso

```bash
# Cambiar puerto en .env
PORT=3001

# O liberar puerto 3000
lsof -ti:3000 | xargs kill -9
```

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -am 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia ISC.

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa la sección de troubleshooting
2. Verifica que MySQL esté corriendo
3. Confirma que las dependencias estén instaladas
4. Crea un issue en el repositorio