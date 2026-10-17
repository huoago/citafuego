// ========== Admin Panel Logic ==========

// Check admin auth on load
document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAdmin()) return;

    const user = Auth.getCurrentUser();
    document.getElementById('admin-user-info').innerHTML = 
        `Bienvenido, <strong>${user.name}</strong> (${user.role})`;

    setupTabs();
    renderDashboard();
    renderOffersTable();
    renderUsersTable();
    renderAdsTable();
    setupOfferForm();
    setupLogout();

    // Simulate real-time price updates
    startRealTimeUpdates();
});

// ========== Tab Navigation ==========
function setupTabs() {
    const menuLinks = document.querySelectorAll('.admin-menu a[data-tab]');
    const titles = {
        dashboard: '📊 Dashboard',
        offers: '🎯 Gestión de Ofertas',
        users: '👥 Usuarios',
        ads: '📢 Espacios Publicitarios',
        settings: '⚙️ Configuración'
    };

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            
            // Update active menu
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
            
            // Update title
            document.getElementById('page-title').textContent = titles[tab];
        });
    });
}

// ========== Dashboard ==========
function renderDashboard() {
    const offerStats = Offers.getStats();
    const adStats = Ads.getStats();
    const users = Auth.getUsers();

    document.getElementById('stat-offers').textContent = offerStats.active;
    document.getElementById('stat-users').textContent = users.length;
    document.getElementById('stat-clicks').textContent = offerStats.totalClicks.toLocaleString();
    document.getElementById('stat-conversions').textContent = offerStats.totalConversions.toLocaleString();
    
    document.getElementById('last-update').textContent = new Date().toLocaleString('es-PE');

    // Offers performance table
    const offers = Offers.getAll();
    const perfHtml = offers.map(o => `
        <tr>
            <td>${o.icon} ${o.name}</td>
            <td>${o.commission} ${o.commissionType}</td>
            <td>${o.clicks}</td>
            <td>${o.conversions}</td>
            <td>${o.clicks > 0 ? ((o.conversions / o.clicks) * 100).toFixed(1) : 0}%</td>
            <td><span class="offer-badge badge-${o.status === 'active' ? 'hot' : ''}">${o.status === 'active' ? 'Activa' : 'Pausada'}</span></td>
        </tr>
    `).join('');

    document.getElementById('offers-performance').innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Oferta</th>
                    <th>Comisión</th>
                    <th>Clicks</th>
                    <th>Conversiones</th>
                    <th>CTR</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>${perfHtml}</tbody>
        </table>
    `;
}

// ========== Offers CRUD ==========
function renderOffersTable() {
    const offers = Offers.getAll();
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Oferta</th>
                    <th>Comisión</th>
                    <th>Clicks</th>
                    <th>Conversiones</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${offers.map(o => `
                    <tr>
                        <td>${o.id}</td>
                        <td>${o.icon} <strong>${o.name}</strong><br><small style="color:#6c757d;">${o.target}</small></td>
                        <td>${o.commission}<br><small style="color:#6c757d;">${o.commissionType}</small></td>
                        <td>${o.clicks}</td>
                        <td>${o.conversions}</td>
                        <td><span class="offer-badge badge-${o.status === 'active' ? 'hot' : ''}">${o.status === 'active' ? 'Activa' : 'Pausada'}</span></td>
                        <td class="table-actions">
                            <button class="btn btn-sm btn-outline" onclick="editOffer(${o.id})">✏️ Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteOffer(${o.id})">🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('offers-table-container').innerHTML = html;
}

function showOfferForm() {
    document.getElementById('offer-form-modal').style.display = 'flex';
    document.getElementById('offer-form-title').textContent = 'Nueva Oferta';
    document.getElementById('offer-form').reset();
    document.getElementById('offer-id').value = '';
}

function hideOfferForm() {
    document.getElementById('offer-form-modal').style.display = 'none';
}

function editOffer(id) {
    const offer = Offers.getById(id);
    if (!offer) return;

    document.getElementById('offer-form-modal').style.display = 'flex';
    document.getElementById('offer-form-title').textContent = 'Editar Oferta';
    document.getElementById('offer-id').value = offer.id;
    document.getElementById('offer-name').value = offer.name;
    document.getElementById('offer-desc').value = offer.description;
    document.getElementById('offer-icon').value = offer.icon;
    document.getElementById('offer-commission').value = offer.commission;
    document.getElementById('offer-commission-type').value = offer.commissionType;
    document.getElementById('offer-url').value = offer.affiliateUrl;
    document.getElementById('offer-target').value = offer.target;
    document.getElementById('offer-status').value = offer.status;
}

function deleteOffer(id) {
    if (confirm('¿Estás seguro de eliminar esta oferta?')) {
        Offers.delete(id);
        renderOffersTable();
        renderDashboard();
    }
}

function setupOfferForm() {
    document.getElementById('offer-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('offer-id').value;
        
        const data = {
            name: document.getElementById('offer-name').value,
            description: document.getElementById('offer-desc').value,
            icon: document.getElementById('offer-icon').value,
            commission: document.getElementById('offer-commission').value,
            commissionType: document.getElementById('offer-commission-type').value,
            affiliateUrl: document.getElementById('offer-url').value,
            target: document.getElementById('offer-target').value,
            status: document.getElementById('offer-status').value
        };

        if (id) {
            Offers.update(id, data);
        } else {
            Offers.add(data);
        }

        hideOfferForm();
        renderOffersTable();
        renderDashboard();
    });
}

// ========== Users Table ==========
function renderUsersTable() {
    const users = Auth.getUsers();
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Fecha de registro</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                    <tr>
                        <td>${u.id}</td>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                        <td><span class="offer-badge badge-${u.role === 'admin' ? 'top' : 'new'}">${u.role}</span></td>
                        <td>${new Date(u.createdAt).toLocaleDateString('es-PE')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('users-table-container').innerHTML = html;
}

// ========== Ads Table ==========
function renderAdsTable() {
    const ads = Ads.getAll();
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Ubicación</th>
                    <th>Nombre</th>
                    <th>Impresiones</th>
                    <th>Clicks</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${ads.map(a => `
                    <tr>
                        <td>${a.id}</td>
                        <td>${a.slot}</td>
                        <td>${a.title}</td>
                        <td>${a.impressions.toLocaleString()}</td>
                        <td>${a.clicks}</td>
                        <td>
                            <button class="btn btn-sm ${a.active ? 'btn-success' : 'btn-danger'}" 
                                onclick="toggleAd(${a.id})">
                                ${a.active ? 'Activo' : 'Inactivo'}
                            </button>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline" onclick="editAd(${a.id})">✏️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('ads-table-container').innerHTML = html;
}

function toggleAd(id) {
    const ads = Ads.getAll();
    const ad = ads.find(a => a.id === id);
    if (ad) {
        Ads.update(id, { active: !ad.active });
        renderAdsTable();
    }
}

function editAd(id) {
    const ad = Ads.getAll().find(a => a.id === id);
    if (!ad) return;
    const newTitle = prompt('Nuevo nombre del anuncio:', ad.title);
    if (newTitle) {
        Ads.update(id, { title: newTitle });
        renderAdsTable();
    }
}

// ========== Real-time Updates ==========
function startRealTimeUpdates() {
    // Simulate live traffic updates every 5 seconds
    setInterval(() => {
        const offers = Offers.getAll();
        let changed = false;
        
        offers.forEach(o => {
            if (o.status === 'active' && Math.random() > 0.7) {
                o.clicks += Math.floor(Math.random() * 3);
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem(Offers.KEY, JSON.stringify(offers));
            renderDashboard();
        }
    }, 5000);
}

// ========== Logout ==========
function setupLogout() {
    document.getElementById('btn-logout').addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
    });
}

// ========== Settings ==========
function saveSettings() {
    alert('Configuración guardada correctamente');
}

function resetAllData() {
    if (confirm('¿Estás seguro? Esto borrará TODOS los datos y restaurará los valores por defecto.')) {
        localStorage.removeItem(Offers.KEY);
        localStorage.removeItem(Ads.KEY);
        localStorage.removeItem(Auth.USERS_KEY);
        localStorage.removeItem(Auth.SESSION_KEY);
        location.reload();
    }
}
