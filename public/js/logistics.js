/**
 * public/js/logistics.js
 * Gestion Logistique Complète
 * - Trésorerie (Dettes livreurs)
 * - CRUD Flotte
 * - CRUD Zones/Quartiers
 */

// ==========================================
// 1. DONNÉES DE RÉFÉRENCE (MOCK)
// ==========================================

let drivers = [
    { id: 1, name: "Jean Moto", type: "Interne", phone: "699001122", sector: "Douala Centre", status: "Actif", cashHeld: 45000, pendingParcels: 3 },
    { id: 2, name: "Speedy Delivery", type: "Externe", phone: "677554433", sector: "Yaoundé", status: "Actif", cashHeld: 125000, pendingParcels: 8 },
    { id: 3, name: "Marc Durand", type: "Interne", phone: "655223344", sector: "Douala Nord", status: "Inactif", cashHeld: 0, pendingParcels: 0 }
];

// Nouvelle Structure : Ville + Liste Quartiers
let rates = [
    { id: 1, city: "Douala", neighborhoods: "Akwa, Bonanjo, Bali, Bonapriso", priceClient: 1500, costPrice: 500 },
    { id: 2, city: "Douala", neighborhoods: "Bonamoussadi, Kotto, Logpom, Makepe", price: 2500, cost: 1000 },
    { id: 3, city: "Yaoundé", neighborhoods: "Bastos, Centre, Etoudi", price: 2000, cost: 2000 },
    { id: 4, city: "National", neighborhoods: "Bafoussam, Kribi, Garoua (Expédition)", price: 5000, cost: 3500 }
];

let currentCollectDriverId = null;

// ==========================================
// 2. INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    renderTreasury();
    renderDrivers();
    renderRates();
    updateStats();

    // Gestion dynamique du bouton principal selon l'onglet
    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (e) => {
            updateMainActionButton(e.target.id);
        });
    });

    // Actions Formulaires
    document.getElementById('driverForm').addEventListener('submit', saveDriver);
    document.getElementById('rateForm').addEventListener('submit', saveRate);
    document.getElementById('confirmCollectBtn').addEventListener('click', confirmCollect);
    
    // Bouton principal initial (Onglet Treasury par défaut -> Exporter ou autre)
    updateMainActionButton('treasury-tab');
});

// ==========================================
// 3. RENDU DES TABLEAUX
// ==========================================

// --- TRÉSORERIE ---
function renderTreasury() {
    const tbody = document.getElementById('treasuryTableBody');
    tbody.innerHTML = '';
    
    const debtors = drivers.filter(d => d.cashHeld > 0);

    if (debtors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-success"><i class="fas fa-check-circle me-2"></i>Tout est encaissé !</td></tr>`;
        return;
    }

    debtors.forEach(d => {
        const typeBadge = d.type === 'Interne' ? '<span class="badge bg-info bg-opacity-10 text-info border-info border-opacity-25">Interne</span>' : '<span class="badge bg-secondary bg-opacity-10 text-secondary">Externe</span>';
        
        tbody.innerHTML += `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div class="avatar-driver me-3">${d.name.substring(0,2).toUpperCase()}</div>
                        <div class="fw-bold text-dark">${d.name}</div>
                    </div>
                </td>
                <td>${typeBadge}</td>
                <td><span class="fw-bold text-dark">${d.pendingParcels}</span> <span class="text-muted small">colis</span></td>
                <td class="text-end fw-bold text-danger">${formatMoney(d.cashHeld)}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-success rounded-pill px-3 fw-bold" onclick="openCollectModal(${d.id})">
                        <i class="fas fa-hand-holding-usd me-1"></i> Encaisser
                    </button>
                </td>
            </tr>
        `;
    });
}

// --- FLOTTE (LIVREURS) ---
function renderDrivers() {
    const tbody = document.getElementById('driversTableBody');
    tbody.innerHTML = '';

    drivers.forEach(d => {
        const statusDot = d.status === 'Actif' ? '<span class="text-success">● Actif</span>' : '<span class="text-muted">● Inactif</span>';
        
        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold text-dark">${d.name}</td>
                <td>${d.phone}</td>
                <td>${d.sector}</td>
                <td class="small fw-bold">${statusDot}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-light btn-sm text-muted" onclick="editDriver(${d.id})">
                        <i class="fas fa-pen"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// --- ZONES & TARIFS ---
function renderRates() {
    const tbody = document.getElementById('ratesTableBody');
    tbody.innerHTML = '';

    rates.forEach(r => {
        const margin = r.priceClient - r.costPrice;
        const marginClass = margin > 0 ? 'text-success' : 'text-danger';
        
        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold text-dark">${r.city}</td>
                <td><small class="text-muted text-truncate d-block" style="max-width:250px;" title="${r.neighborhoods}">${r.neighborhoods}</small></td>
                <td class="text-end fw-bold">${formatMoney(r.priceClient)}</td>
                <td class="text-end text-muted">${formatMoney(r.costPrice)}</td>
                <td class="text-end fw-bold ${marginClass}">${margin > 0 ? '+' : ''}${formatMoney(margin)}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-light btn-sm text-muted" onclick="editRate(${r.id})"><i class="fas fa-pen"></i></button>
                </td>
            </tr>
        `;
    });
}

// ==========================================
// 4. LOGIQUE CRUD (EDIT, SAVE)
// ==========================================

// --- LIVREURS ---
function saveDriver(e) {
    e.preventDefault();
    const id = document.getElementById('driverId').value;
    const name = document.getElementById('driverName').value;
    const type = document.getElementById('driverType').value;
    const phone = document.getElementById('driverPhone').value;
    const sector = document.getElementById('driverSector').value;
    const active = document.getElementById('driverActive').checked;

    if (id) {
        const idx = drivers.findIndex(d => d.id == id);
        if (idx > -1) {
            drivers[idx] = { ...drivers[idx], name, type, phone, sector, status: active ? 'Actif' : 'Inactif' };
            showToast(`Livreur ${name} modifié !`, 'success');
        }
    } else {
        drivers.push({
            id: Date.now(), name, type, phone, sector,
            status: active ? 'Actif' : 'Inactif',
            cashHeld: 0, pendingParcels: 0
        });
        showToast(`Livreur ${name} ajouté !`, 'success');
    }

    renderDrivers();
    updateStats();
    bootstrap.Modal.getInstance(document.getElementById('driverModal')).hide();
}

window.editDriver = function(id) {
    const d = drivers.find(x => x.id === id);
    if (!d) return;
    
    document.getElementById('driverModalTitle').textContent = "Modifier Livreur";
    document.getElementById('driverId').value = d.id;
    document.getElementById('driverName').value = d.name;
    document.getElementById('driverType').value = d.type;
    document.getElementById('driverPhone').value = d.phone;
    document.getElementById('driverSector').value = d.sector;
    document.getElementById('driverActive').checked = (d.status === 'Actif');
    
    new bootstrap.Modal(document.getElementById('driverModal')).show();
};

window.resetDriverModal = function() {
    document.getElementById('driverForm').reset();
    document.getElementById('driverId').value = '';
    document.getElementById('driverModalTitle').textContent = "Ajouter un Livreur";
};


// --- ZONES ---
function saveRate(e) {
    e.preventDefault();
    const id = document.getElementById('rateId').value;
    const city = document.getElementById('rateCity').value;
    const neighborhoods = document.getElementById('rateNeighborhoods').value;
    const price = parseFloat(document.getElementById('ratePriceClient').value) || 0;
    const cost = parseFloat(document.getElementById('rateCostPrice').value) || 0;

    if (id) {
        const idx = rates.findIndex(r => r.id == id);
        if(idx > -1) {
            rates[idx] = { id: parseInt(id), city, neighborhoods, priceClient: price, costPrice: cost };
            showToast("Tarif mis à jour.", 'success');
        }
    } else {
        rates.push({ id: Date.now(), city, neighborhoods, priceClient: price, costPrice: cost });
        showToast("Nouvelle zone créée.", 'success');
    }

    renderRates();
    updateStats();
    bootstrap.Modal.getInstance(document.getElementById('rateModal')).hide();
}

window.editRate = function(id) {
    const r = rates.find(x => x.id === id);
    if(!r) return;

    document.getElementById('rateModalTitle').textContent = "Modifier la Zone";
    document.getElementById('rateId').value = r.id;
    document.getElementById('rateCity').value = r.city;
    document.getElementById('rateNeighborhoods').value = r.neighborhoods;
    document.getElementById('ratePriceClient').value = r.priceClient;
    document.getElementById('rateCostPrice').value = r.costPrice;

    new bootstrap.Modal(document.getElementById('rateModal')).show();
};

window.resetRateModal = function() {
    document.getElementById('rateForm').reset();
    document.getElementById('rateId').value = '';
    document.getElementById('rateModalTitle').textContent = "Définir une Zone";
};


// ==========================================
// 5. UTILS & TOAST
// ==========================================

// Encaissement sans Alert
window.openCollectModal = function(id) {
    const d = drivers.find(x => x.id === id);
    if (!d) return;
    currentCollectDriverId = id;
    document.getElementById('collectDriverName').textContent = d.name;
    document.getElementById('collectAmount').textContent = formatMoney(d.cashHeld);
    new bootstrap.Modal(document.getElementById('collectModal')).show();
};

function confirmCollect() {
    const d = drivers.find(x => x.id === currentCollectDriverId);
    if (d) {
        d.cashHeld = 0;
        d.pendingParcels = 0;
        renderTreasury();
        updateStats();
        bootstrap.Modal.getInstance(document.getElementById('collectModal')).hide();
        showToast(`Versement validé pour ${d.name}`, 'success');
    }
}

// Affichage Notification Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast`;
    
    let icon = type === 'success' ? 'check-circle' : 'info-circle';
    let color = type === 'success' ? '#10b981' : '#3b82f6'; // Vert ou Bleu
    
    toast.style.borderLeft = `4px solid ${color}`;
    toast.innerHTML = `<i class="fas fa-${icon}" style="color:${color}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Supprimer après 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateMainActionButton(tabId) {
    const btn = document.getElementById('mainActionBtn');
    if (tabId === 'treasury-tab') {
        btn.innerHTML = '<i class="fas fa-file-export me-2"></i> Exporter État';
        btn.className = "btn btn-outline-dark rounded-pill px-4 shadow-sm fw-bold";
        btn.onclick = () => showToast("Export PDF généré (Simu)", "info");
    } else if (tabId === 'drivers-tab') {
        btn.innerHTML = '<i class="fas fa-plus me-2"></i> Nouveau Livreur';
        btn.className = "btn btn-primary rounded-pill px-4 shadow-sm fw-bold";
        btn.onclick = () => { window.resetDriverModal(); new bootstrap.Modal(document.getElementById('driverModal')).show(); };
    } else if (tabId === 'rates-tab') {
        btn.innerHTML = '<i class="fas fa-plus me-2"></i> Nouvelle Zone';
        btn.className = "btn btn-primary rounded-pill px-4 shadow-sm fw-bold";
        btn.onclick = () => { window.resetRateModal(); new bootstrap.Modal(document.getElementById('rateModal')).show(); };
    }
}

function updateStats() {
    document.getElementById('statCashOut').textContent = formatMoney(drivers.reduce((sum, d) => sum + d.cashHeld, 0));
    document.getElementById('statActiveDrivers').textContent = drivers.filter(d => d.status === 'Actif').length;
    document.getElementById('statTotalZones').textContent = rates.length;
}

function formatMoney(a) { return new Intl.NumberFormat('fr-FR').format(a) + ' FCFA'; }