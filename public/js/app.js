// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let selectedApartments = [];

// API base URL
const API_BASE = window.location.origin + '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadStats();
    showSection('home');
});

// Authentication functions
function checkAuthStatus() {
    if (authToken) {
        // Verify token with server
        fetch(`${API_BASE}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Invalid token');
        })
        .then(data => {
            currentUser = data.profile;
            updateAuthUI();
        })
        .catch(error => {
            logout();
        });
    }
}

function updateAuthUI() {
    const authDiv = document.getElementById('nav-auth');
    const userDiv = document.getElementById('nav-user');
    
    if (currentUser) {
        authDiv.style.display = 'none';
        userDiv.style.display = 'flex';
        document.getElementById('user-name').textContent = 
            `${currentUser.first_name} ${currentUser.last_name}`;
        
        // Update roommates section
        updateRoommatesSection();
    } else {
        authDiv.style.display = 'flex';
        userDiv.style.display = 'none';
    }
}

function showAuthModal(type) {
    document.getElementById('auth-modal').style.display = 'block';
    switchAuthForm(type);
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

function switchAuthForm(type) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (type === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

async function login(event) {
    event.preventDefault();
    showLoading(true);
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            updateAuthUI();
            closeAuthModal();
            showToast('Bienvenido de nuevo!', 'success');
        } else {
            showToast(data.message || 'Error al iniciar sesión', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
    
    showLoading(false);
}

async function register(event) {
    event.preventDefault();
    showLoading(true);
    
    const formData = {
        first_name: document.getElementById('register-first-name').value,
        last_name: document.getElementById('register-last-name').value,
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value,
        phone: document.getElementById('register-phone').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            updateAuthUI();
            closeAuthModal();
            showToast('¡Registro exitoso! Bienvenido a RoomMates', 'success');
        } else {
            const errorMsg = data.errors ? 
                data.errors.map(err => err.msg).join(', ') : 
                data.message || 'Error al registrarse';
            showToast(errorMsg, 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
    
    showLoading(false);
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    updateAuthUI();
    showToast('Sesión cerrada', 'success');
    showSection('home');
}

// Navigation functions
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section, .hero');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Load content based on section
        switch(sectionId) {
            case 'apartments':
                loadApartments();
                break;
            case 'rooms':
                loadRooms();
                break;
            case 'roommates':
                loadRoommates();
                break;
        }
    }
}

// Stats loading
async function loadStats() {
    try {
        // Load apartments count
        const apartmentsResponse = await fetch(`${API_BASE}/apartments`);
        const apartmentsData = await apartmentsResponse.json();
        document.getElementById('apartments-count').textContent = 
            apartmentsData.apartments ? apartmentsData.apartments.length : 0;
        
        // Load rooms count
        const roomsResponse = await fetch(`${API_BASE}/rooms`);
        const roomsData = await roomsResponse.json();
        document.getElementById('rooms-count').textContent = 
            roomsData.rooms ? roomsData.rooms.length : 0;
        
        // Simulate users count
        document.getElementById('users-count').textContent = '150+';
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Apartments functions
async function loadApartments(filters = {}) {
    showLoading(true);
    
    const queryParams = new URLSearchParams(filters);
    
    try {
        const response = await fetch(`${API_BASE}/apartments?${queryParams}`);
        const data = await response.json();
        
        displayApartments(data.apartments || []);
    } catch (error) {
        showToast('Error cargando apartamentos', 'error');
    }
    
    showLoading(false);
}

function displayApartments(apartments) {
    const grid = document.getElementById('apartments-grid');
    
    if (apartments.length === 0) {
        grid.innerHTML = '<p class="no-results">No se encontraron apartamentos</p>';
        return;
    }
    
    grid.innerHTML = apartments.map(apartment => `
        <div class="listing-card">
            <div class="listing-image">
                <i class="fas fa-building"></i> Sin imagen
            </div>
            <div class="listing-content">
                <h3 class="listing-title">${apartment.title}</h3>
                <div class="listing-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${apartment.address}, ${apartment.city}
                </div>
                <div class="listing-price">$${apartment.monthly_rent}/mes</div>
                <div class="listing-features">
                    <span class="feature">
                        <i class="fas fa-bed"></i> ${apartment.total_rooms} hab
                    </span>
                    <span class="feature">
                        <i class="fas fa-bath"></i> ${apartment.total_bathrooms} baños
                    </span>
                    ${apartment.furnished ? '<span class="feature"><i class="fas fa-couch"></i> Amoblado</span>' : ''}
                    ${apartment.parking_available ? '<span class="feature"><i class="fas fa-car"></i> Parking</span>' : ''}
                </div>
                <div class="listing-actions">
                    <button class="btn btn-primary btn-small" onclick="viewApartment(${apartment.id})">
                        Ver detalles
                    </button>
                    <button class="btn btn-outline btn-small" onclick="toggleApartmentSelection(${apartment.id})">
                        ${selectedApartments.includes(apartment.id) ? 'Quitar' : 'Comparar'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterApartments() {
    const filters = {};
    
    const city = document.getElementById('city-filter').value;
    const minPrice = document.getElementById('min-price').value;
    const maxPrice = document.getElementById('max-price').value;
    const rooms = document.getElementById('rooms-filter').value;
    
    if (city) filters.city = city;
    if (minPrice) filters.min_price = minPrice;
    if (maxPrice) filters.max_price = maxPrice;
    if (rooms) filters.rooms = rooms;
    
    loadApartments(filters);
}

// Rooms functions
async function loadRooms(filters = {}) {
    showLoading(true);
    
    const queryParams = new URLSearchParams(filters);
    
    try {
        const response = await fetch(`${API_BASE}/rooms?${queryParams}`);
        const data = await response.json();
        
        displayRooms(data.rooms || []);
    } catch (error) {
        showToast('Error cargando habitaciones', 'error');
    }
    
    showLoading(false);
}

function displayRooms(rooms) {
    const grid = document.getElementById('rooms-grid');
    
    if (rooms.length === 0) {
        grid.innerHTML = '<p class="no-results">No se encontraron habitaciones</p>';
        return;
    }
    
    const roomTypeLabels = {
        bedroom: 'Habitación privada',
        shared_bedroom: 'Habitación compartida',
        studio: 'Studio'
    };
    
    grid.innerHTML = rooms.map(room => `
        <div class="listing-card">
            <div class="listing-image">
                <i class="fas fa-bed"></i> Sin imagen
            </div>
            <div class="listing-content">
                <h3 class="listing-title">${room.apartment_title}</h3>
                <div class="listing-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${room.address}, ${room.city}
                </div>
                <div class="listing-price">$${room.monthly_rent}/mes</div>
                <div class="listing-features">
                    <span class="feature">
                        <i class="fas fa-door-open"></i> ${roomTypeLabels[room.room_type]}
                    </span>
                    ${room.private_bathroom ? '<span class="feature"><i class="fas fa-bath"></i> Baño privado</span>' : ''}
                    ${room.furnished ? '<span class="feature"><i class="fas fa-couch"></i> Amoblado</span>' : ''}
                </div>
                <div class="listing-actions">
                    <button class="btn btn-primary btn-small" onclick="viewRoom(${room.id})">
                        Ver detalles
                    </button>
                    ${currentUser ? 
                        `<button class="btn btn-outline btn-small" onclick="applyForRoom(${room.id})">
                            Aplicar
                        </button>` : 
                        '<button class="btn btn-outline btn-small" onclick="showAuthModal(\'login\')">Iniciar sesión</button>'
                    }
                </div>
            </div>
        </div>
    `).join('');
}

function filterRooms() {
    const filters = {};
    
    const city = document.getElementById('rooms-city-filter').value;
    const minPrice = document.getElementById('rooms-min-price').value;
    const maxPrice = document.getElementById('rooms-max-price').value;
    const roomType = document.getElementById('room-type-filter').value;
    
    if (city) filters.city = city;
    if (minPrice) filters.min_price = minPrice;
    if (maxPrice) filters.max_price = maxPrice;
    if (roomType) filters.room_type = roomType;
    
    loadRooms(filters);
}

async function applyForRoom(roomId) {
    if (!currentUser) {
        showAuthModal('login');
        return;
    }
    
    const message = prompt('Mensaje opcional para el propietario:');
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/rooms/${roomId}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ message: message || '' })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Aplicación enviada exitosamente', 'success');
        } else {
            showToast(data.message || 'Error enviando aplicación', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
    
    showLoading(false);
}

// Roommates functions
function updateRoommatesSection() {
    const content = document.getElementById('roommates-content');
    
    if (!currentUser) {
        content.innerHTML = `
            <div class="auth-required">
                <p>Inicia sesión para encontrar compañeros compatibles</p>
                <button class="btn btn-primary" onclick="showAuthModal('login')">Iniciar Sesión</button>
            </div>
        `;
        return;
    }
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <button class="btn btn-primary" onclick="findRoommates()">
                <i class="fas fa-search"></i> Buscar Compañeros Compatibles
            </button>
        </div>
        <div id="roommates-grid" class="listings-grid">
            <!-- Roommates will be loaded here -->
        </div>
    `;
}

async function loadRoommates() {
    if (!currentUser) {
        updateRoommatesSection();
        return;
    }
    
    updateRoommatesSection();
}

async function findRoommates() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/users/roommates`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        displayRoommates(data.matches || []);
    } catch (error) {
        showToast('Error buscando compañeros', 'error');
    }
    
    showLoading(false);
}

function displayRoommates(matches) {
    const grid = document.getElementById('roommates-grid');
    
    if (matches.length === 0) {
        grid.innerHTML = '<p class="no-results">No se encontraron compañeros compatibles</p>';
        return;
    }
    
    grid.innerHTML = matches.map(match => `
        <div class="roommate-card">
            <div class="compatibility-score">
                ${match.compatibility_score}%
            </div>
            <h3>${match.first_name} ${match.last_name}</h3>
            <p><strong>Edad:</strong> ${match.age || 'No especificada'}</p>
            <p><strong>Ocupación:</strong> ${match.occupation || 'No especificada'}</p>
            <p><strong>Presupuesto:</strong> $${match.budget_min || 0} - $${match.budget_max || 0}</p>
            <p>${match.bio || 'Sin descripción'}</p>
            <button class="btn btn-primary" onclick="expressInterest(${match.id})">
                <i class="fas fa-heart"></i> Expresar Interés
            </button>
        </div>
    `).join('');
}

async function expressInterest(userId) {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/users/interest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ user_id: userId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.mutual) {
                showToast('¡Es un match! Ambos están interesados', 'success');
            } else {
                showToast('Interés expresado exitosamente', 'success');
            }
        } else {
            showToast(data.message || 'Error expresando interés', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
    
    showLoading(false);
}

// Comparison functions
function toggleApartmentSelection(apartmentId) {
    const index = selectedApartments.indexOf(apartmentId);
    
    if (index > -1) {
        selectedApartments.splice(index, 1);
    } else {
        if (selectedApartments.length >= 5) {
            showToast('Máximo 5 apartamentos para comparar', 'error');
            return;
        }
        selectedApartments.push(apartmentId);
    }
    
    updateCompareSection();
    loadApartments(); // Refresh to update button text
}

function updateCompareSection() {
    const selection = document.getElementById('compare-selection');
    
    if (selectedApartments.length === 0) {
        selection.innerHTML = '<p>Selecciona apartamentos para comparar desde la lista de apartamentos</p>';
        document.getElementById('comparison-table').style.display = 'none';
    } else {
        selection.innerHTML = `
            <p>Apartamentos seleccionados: ${selectedApartments.length}/5</p>
            <button class="btn btn-primary" onclick="compareSelectedApartments()" 
                    ${selectedApartments.length < 2 ? 'disabled' : ''}>
                Comparar Apartamentos
            </button>
            <button class="btn btn-outline" onclick="clearSelection()">Limpiar Selección</button>
        `;
    }
}

function clearSelection() {
    selectedApartments = [];
    updateCompareSection();
    loadApartments();
}

async function compareSelectedApartments() {
    if (selectedApartments.length < 2) {
        showToast('Selecciona al menos 2 apartamentos', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/apartments/compare`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apartment_ids: selectedApartments })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayComparison(data.apartments, data.stats);
        } else {
            showToast('Error comparando apartamentos', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
    
    showLoading(false);
}

function displayComparison(apartments, stats) {
    const table = document.getElementById('comparison-table');
    
    const cols = apartments.length + 1;
    
    table.innerHTML = `
        <div class="comparison-header" style="grid-template-columns: 200px repeat(${apartments.length}, 1fr);">
            <div><strong>Característica</strong></div>
            ${apartments.map(apt => `<div><strong>${apt.title}</strong></div>`).join('')}
        </div>
        
        <div class="comparison-row" style="grid-template-columns: 200px repeat(${apartments.length}, 1fr);">
            <div>Precio/mes</div>
            ${apartments.map(apt => `<div>$${apt.monthly_rent}</div>`).join('')}
        </div>
        
        <div class="comparison-row" style="grid-template-columns: 200px repeat(${apartments.length}, 1fr);">
            <div>Habitaciones</div>
            ${apartments.map(apt => `<div>${apt.total_rooms}</div>`).join('')}
        </div>
        
        <div class="comparison-row" style="grid-template-columns: 200px repeat(${apartments.length}, 1fr);">
            <div>Baños</div>
            ${apartments.map(apt => `<div>${apt.total_bathrooms}</div>`).join('')}
        </div>
        
        <div class="comparison-row" style="grid-template-columns: 200px repeat(${apartments.length}, 1fr);">
            <div>Área (m²)</div>
            ${apartments.map(apt => `<div>${apt.total_area || 'N/A'}</div>`).join('')}
        </div>
        
        <div class="comparison-row" style="grid-template-columns: 200px repeat(${apartments.length}, 1fr);">
            <div>Amoblado</div>
            ${apartments.map(apt => `<div>${apt.furnished ? 'Sí' : 'No'}</div>`).join('')}
        </div>
        
        <div class="comparison-row" style="grid-template-columns: 200px repeat(${apartments.length}, 1fr);">
            <div>Parking</div>
            ${apartments.map(apt => `<div>${apt.parking_available ? 'Sí' : 'No'}</div>`).join('')}
        </div>
        
        <div class="comparison-row" style="grid-template-columns: 200px repeat(${apartments.length}, 1fr);">
            <div>Ubicación</div>
            ${apartments.map(apt => `<div>${apt.city}</div>`).join('')}
        </div>
    `;
    
    table.style.display = 'block';
}

// Search from hero
function searchFromHero() {
    const query = document.getElementById('hero-search-input').value;
    
    if (query) {
        document.getElementById('city-filter').value = query;
        showSection('apartments');
        filterApartments();
    } else {
        showSection('apartments');
    }
}

// Utility functions
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// View details functions
function viewApartment(id) {
    // For now, just show a message
    showToast('Funcionalidad de detalle próximamente', 'info');
}

function viewRoom(id) {
    // For now, just show a message
    showToast('Funcionalidad de detalle próximamente', 'info');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('auth-modal');
    if (event.target == modal) {
        closeAuthModal();
    }
}