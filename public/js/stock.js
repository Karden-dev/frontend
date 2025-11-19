/**
 * WINK SHOP - Gestion des Stocks
 */

// Données Mockées 
let products = [
    { id: 1, name: "Montre Connectée Ultra", price: 25000, qty: 45, threshold: 10 },
    { id: 2, name: "Écouteurs Pro Sans Fil", price: 15000, qty: 8, threshold: 10 }, 
    { id: 3, name: "Kit Nettoyage Écran", price: 5000, qty: 0, threshold: 5 },
    { id: 4, name: "Caméra Wifi 360", price: 35000, qty: 12, threshold: 5 },
    { id: 5, name: "Ring Light LED", price: 12000, qty: 3, threshold: 5 }
];

let currentRestockId = null;

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    renderStockTable(products);
    updateStockStats();

    // Recherche et Filtres
    const searchInput = document.getElementById('searchStock');
    const filterSelect = document.getElementById('filterStock');

    if(searchInput) searchInput.addEventListener('input', filterProducts);
    if(filterSelect) filterSelect.addEventListener('change', filterProducts);

    // Sauvegarde Produit (Ajout/Edit)
    const saveBtn = document.getElementById('saveProductBtn');
    if(saveBtn) saveBtn.addEventListener('click', saveProduct);
    
    // Slider synchro dans la modale
    const slider = document.getElementById('productThresholdSlider');
    const input = document.getElementById('productThreshold');
    if(slider && input) {
        slider.addEventListener('input', (e) => input.value = e.target.value);
        input.addEventListener('input', (e) => slider.value = e.target.value);
    }
    
    // Validation Réapprovisionnement
    const confirmRestock = document.getElementById('confirmRestockBtn');
    if(confirmRestock) confirmRestock.addEventListener('click', doRestock);
});

function renderStockTable(data) {
    const tbody = document.getElementById('stockTableBody');
    if(!tbody) return;
    
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">Aucun produit correspondant</td></tr>`;
        return;
    }

    data.forEach(p => {
        let statusBadge = '';
        let progressBarColor = 'bg-success';
        
        // Logique visuelle
        const ratio = p.qty / Math.max(p.threshold * 3, 1); // Ratio arbitraire pour la barre
        const percent = Math.min(100, Math.max(5, ratio * 100));

        if (p.qty === 0) {
            statusBadge = '<span class="badge bg-danger bg-opacity-10 text-danger rounded-pill">Rupture</span>';
            progressBarColor = 'bg-danger';
        } else if (p.qty <= p.threshold) {
            statusBadge = '<span class="badge bg-warning bg-opacity-10 text-warning rounded-pill">Faible</span>';
            progressBarColor = 'bg-warning';
        } else {
            statusBadge = '<span class="badge bg-success bg-opacity-10 text-success rounded-pill">En Stock</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center">
                    <div class="product-img"><i class="fas fa-box"></i></div>
                    <div>
                        <div class="fw-bold text-dark">${p.name}</div>
                        <div class="small text-muted">REF-${1000 + p.id}</div>
                    </div>
                </div>
            </td>
            <td class="text-end fw-medium">${formatMoney(p.price)}</td>
            <td>
                <div class="d-flex justify-content-between small mb-1">
                    <span class="fw-bold text-dark">${p.qty} en stock</span>
                    <span class="text-muted" style="font-size:0.75rem">Alerte à ${p.threshold}</span>
                </div>
                <div class="progress progress-thin">
                    <div class="progress-bar ${progressBarColor}" style="width: ${percent}%"></div>
                </div>
            </td>
            <td class="text-center">${statusBadge}</td>
            <td class="text-end pe-4">
                <button class="btn-quick-add d-inline-flex me-2" title="Ajout rapide" onclick="openRestockModal(${p.id})">
                    <i class="fas fa-plus" style="font-size:0.8rem"></i>
                </button>
                <button class="btn btn-light btn-sm text-muted rounded-circle" style="width:30px; height:30px;" onclick="editProduct(${p.id})">
                    <i class="fas fa-pen" style="font-size:0.8rem"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterProducts() {
    const term = document.getElementById('searchStock').value.toLowerCase();
    const filter = document.getElementById('filterStock').value;

    const filtered = products.filter(p => {
        const matchName = p.name.toLowerCase().includes(term);
        let matchStatus = true;

        if (filter === 'low') matchStatus = p.qty <= p.threshold && p.qty > 0;
        if (filter === 'out') matchStatus = p.qty === 0;

        return matchName && matchStatus;
    });

    renderStockTable(filtered);
}

/**
 * Mise à jour des Stats
 * Ajout du calcul "totalItems" (Volume Stock)
 */
function updateStockStats() {
    let totalVal = 0;
    let totalItems = 0; // Nouveau compteur
    let lowCount = 0;
    let outCount = 0;

    products.forEach(p => {
        totalVal += (p.price * p.qty);
        totalItems += p.qty; // Somme des quantités
        
        if (p.qty === 0) outCount++;
        else if (p.qty <= p.threshold) lowCount++;
    });

    // Mise à jour DOM
    setText('totalStockValue', formatMoney(totalVal));
    setText('totalItemsCount', totalItems); // Affichage de la nouvelle stat
    setText('lowStockCount', lowCount);
    setText('outOfStockCount', outCount);
}

/* --- GESTION DES MODALES --- */

function saveProduct() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const qty = parseInt(document.getElementById('productQty').value);
    const threshold = parseInt(document.getElementById('productThreshold').value);

    if (!name || isNaN(price) || isNaN(qty)) {
        alert("Veuillez remplir les champs obligatoires.");
        return;
    }

    if (id) {
        const idx = products.findIndex(p => p.id == id);
        if(idx > -1) products[idx] = { ...products[idx], name, price, qty, threshold };
    } else {
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push({ id: newId, name, price, qty, threshold });
    }

    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    
    // Refresh
    renderStockTable(products);
    updateStockStats();
    filterProducts(); // Réappliquer les filtres si actif
}

function editProduct(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;

    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productQty').value = p.qty;
    document.getElementById('productThreshold').value = p.threshold;
    document.getElementById('productThresholdSlider').value = p.threshold;

    new bootstrap.Modal(document.getElementById('productModal')).show();
}

function openRestockModal(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    
    currentRestockId = id;
    document.getElementById('restockProductName').textContent = p.name;
    document.getElementById('restockQty').value = 5; 
    
    new bootstrap.Modal(document.getElementById('restockModal')).show();
}

function adjustRestock(delta) {
    const input = document.getElementById('restockQty');
    let val = parseInt(input.value) || 0;
    input.value = Math.max(1, val + delta);
}

function doRestock() {
    const qtyToAdd = parseInt(document.getElementById('restockQty').value);
    if(currentRestockId && qtyToAdd > 0) {
        const idx = products.findIndex(p => p.id === currentRestockId);
        if(idx > -1) {
            products[idx].qty += qtyToAdd;
        }
    }
    bootstrap.Modal.getInstance(document.getElementById('restockModal')).hide();
    renderStockTable(products);
    updateStockStats();
    filterProducts();
}

/* --- UTILITAIRES --- */
function formatMoney(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function setText(id, value) {
    const el = document.getElementById(id);
    if(el) el.textContent = value;
}

function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    if(toggle) {
        toggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('toggled');
            document.getElementById('mainContent').classList.toggle('toggled');
        });
    }
}