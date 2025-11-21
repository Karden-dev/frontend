/**
 * public/js/stock.js
 * WINK SHOP - Gestion Stock (v6 - Version Finale Fonctionnelle)
 * Correctifs : Portée des fonctions (window), Alignement État, Pagination.
 */

// --- DONNÉES INITIALES (MOCK) ---
let stores = [
    { id: 1, name: "Douala", active: true },
    { id: 2, name: "Yaoundé", active: true },
    { id: 3, name: "Kribi", active: true }
];

// Beaucoup de produits pour forcer la pagination (Items par page = 5)
let products = [
    { id: 1, name: "Montre Connectée Ultra", purchasePrice: 12000, sellingPrice: 25000, stockByLocation: { "Douala": 30, "Yaoundé": 15 }, threshold: 10, isActive: true },
    { id: 2, name: "Écouteurs Pro Sans Fil", purchasePrice: 7000, sellingPrice: 15000, stockByLocation: { "Douala": 5, "Yaoundé": 3 }, threshold: 10, isActive: true },
    { id: 3, name: "Kit Nettoyage Écran", purchasePrice: 1500, sellingPrice: 5000, stockByLocation: { "Douala": 0, "Yaoundé": 0 }, threshold: 5, isActive: true },
    { id: 4, name: "Ring Light LED", purchasePrice: 5000, sellingPrice: 12000, stockByLocation: { "Douala": 10 }, threshold: 5, isActive: true },
    { id: 5, name: "Trépied Smartphone", purchasePrice: 3000, sellingPrice: 8000, stockByLocation: { "Douala": 20, "Yaoundé": 5 }, threshold: 5, isActive: true },
    { id: 6, name: "Micro Cravate", purchasePrice: 8000, sellingPrice: 18000, stockByLocation: { "Yaoundé": 8 }, threshold: 3, isActive: true },
    { id: 7, name: "Support PC Portable", purchasePrice: 10000, sellingPrice: 22000, stockByLocation: { "Douala": 4 }, threshold: 2, isActive: true },
    { id: 8, name: "Clavier Mécanique", purchasePrice: 25000, sellingPrice: 45000, stockByLocation: { "Douala": 2 }, threshold: 5, isActive: true },
    { id: 9, name: "Souris Gamer", purchasePrice: 12000, sellingPrice: 25000, stockByLocation: { "Douala": 15 }, threshold: 5, isActive: true },
    { id: 10, name: "Tapis de Souris XL", purchasePrice: 4000, sellingPrice: 9000, stockByLocation: { "Douala": 50 }, threshold: 10, isActive: true },
    { id: 11, name: "Webcam HD 1080p", purchasePrice: 15000, sellingPrice: 30000, stockByLocation: { "Yaoundé": 5 }, threshold: 5, isActive: true },
    { id: 12, name: "Vieux Modèle Caméra", purchasePrice: 20000, sellingPrice: 35000, stockByLocation: { "Douala": 2 }, threshold: 5, isActive: false }
];

// Dates dynamiques pour le journal
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

let stockMovements = [
    { id: 10, date: `${today} 14:00`, productId: 1, productName: "Montre Connectée Ultra", type: "Entrée", location: "Douala", qty: 30, reason: "Stock Initial" },
    { id: 9, date: `${today} 12:30`, productId: 1, productName: "Montre Connectée Ultra", type: "Entrée", location: "Yaoundé", qty: 15, reason: "Transfert" },
    { id: 8, date: `${today} 11:00`, productId: 2, productName: "Écouteurs Pro", type: "Sortie", location: "Douala", qty: -1, reason: "Vente #CMD-102" },
    { id: 7, date: `${yesterday} 16:00`, productId: 5, productName: "Trépied Smartphone", type: "Entrée", location: "Douala", qty: 20, reason: "Réappro" },
    { id: 6, date: `${yesterday} 15:00`, productId: 4, productName: "Ring Light LED", type: "Entrée", location: "Douala", qty: 10, reason: "Réappro" },
    { id: 5, date: `${yesterday} 09:00`, productId: 3, productName: "Kit Nettoyage", type: "Sortie", location: "Douala", qty: -5, reason: "Perte" },
    { id: 4, date: `${yesterday} 08:30`, productId: 2, productName: "Écouteurs Pro", type: "Entrée", location: "Douala", qty: 5, reason: "Retour client" }
];

// État de l'application
let currentRestockId = null;
let currentTransferId = null;
let currentFilteredData = [];
let currentFilteredJournal = [];
let currentPage = 1;
const itemsPerPage = 5;

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Stock JS Loaded - Initializing...");
    
    // 1. Initialiser les vues
    updateStoreDropdowns();
    renderStockTable(products);
    updateStockStats();
    renderStoreList();

    // 2. Attacher les écouteurs d'événements statiques
    safeAddListener('searchStock', 'input', handleMainFilters);
    safeAddListener('filterStore', 'change', handleMainFilters);
    safeAddListener('filterStatus', 'change', handleMainFilters);

    safeAddListener('saveProductBtn', 'click', saveProduct);
    safeAddListener('confirmRestockBtn', 'click', doRestock);
    safeAddListener('confirmTransferBtn', 'click', doTransfer);
    safeAddListener('addStoreBtn', 'click', addNewStore);
    safeAddListener('saveStoreNameBtn', 'click', saveStoreName);

    safeAddListener('applyJournalFilters', 'click', applyJournalFilters);
    safeAddListener('exportFilteredJournalBtn', 'click', exportFilteredJournal);
    
    // Init Modale Journal (Reset dates à l'ouverture)
    const journalModal = document.getElementById('journalModal');
    if(journalModal) {
        journalModal.addEventListener('show.bs.modal', () => {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const todayStr = now.toISOString().split('T')[0];
            
            // Set values safely
            const startEl = document.getElementById('journalDateStart');
            const endEl = document.getElementById('journalDateEnd');
            if(startEl) startEl.value = firstDay;
            if(endEl) endEl.value = todayStr;

            const storeFilter = document.getElementById('journalFilterStore');
            if(storeFilter) storeFilter.value = "";
            
            renderProductOptions();
            
            const prodFilter = document.getElementById('journalFilterProduct');
            if(prodFilter) prodFilter.value = "";
            
            applyJournalFilters();
        });
    }

    // Mise à jour affichage stock lors du changement de magasin source dans transfert
    safeAddListener('transferSourceStore', 'change', updateTransferStockDisplay);
});

function safeAddListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, handler);
    } else {
        console.warn(`Element #${id} introuvable pour l'événement ${event}`);
    }
}

/* ============================================================
   1. FONCTIONS GLOBALES (ACCESSIBLES VIA ONCLICK HTML)
   ============================================================ */

// --- CRUD PRODUIT ---
window.resetProductModal = function() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModalTitle').textContent = "Nouveau Produit";
    document.getElementById('initialStockSection').classList.remove('d-none');
    document.getElementById('productActive').checked = true;
    renderStoreExceptionsTable({}); 
};

window.editProduct = function(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    
    document.getElementById('productModalTitle').textContent = "Modifier " + p.name;
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productSellingPrice').value = p.sellingPrice;
    document.getElementById('productThreshold').value = p.threshold;
    document.getElementById('productActive').checked = p.isActive;
    
    document.getElementById('initialStockSection').classList.add('d-none');
    
    renderStoreExceptionsTable(p.storeExceptions || {}, p.stockByLocation);
    
    new bootstrap.Modal(document.getElementById('productModal')).show();
};

// --- RESTOCK (ENTRÉE) ---
window.openRestockModal = function(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    currentRestockId = id;
    setText('restockProductName', p.name);
    document.getElementById('restockQty').value = 5; 
    document.getElementById('restockCostPrice').value = "";
    new bootstrap.Modal(document.getElementById('restockModal')).show();
};

window.adjustRestock = function(delta) {
    const input = document.getElementById('restockQty');
    let val = parseInt(input.value) || 0;
    input.value = Math.max(1, val + delta);
};

// --- TRANSFERT ---
window.openTransferModal = function(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    currentTransferId = id;
    
    const nameEl = document.getElementById('transferProductName');
    if(nameEl) nameEl.value = p.name;
    
    const idEl = document.getElementById('transferProductId');
    if(idEl) idEl.value = p.id;
    
    document.getElementById('transferQty').value = 1;
    document.getElementById('transferReason').value = "";
    
    updateTransferStockDisplay();
    new bootstrap.Modal(document.getElementById('transferModal')).show();
};

// --- MAGASINS ---
window.toggleStore = function(id) {
    const s = stores.find(x => x.id === id);
    if(s) { 
        s.active = !s.active; 
        updateStoreDropdowns(); 
        renderStoreList(); 
        handleMainFilters();
    }
};

window.openRenameStoreModal = function(id) {
    const s = stores.find(x => x.id === id);
    if(s) {
        document.getElementById('editStoreId').value = id;
        document.getElementById('editStoreNameInput').value = s.name;
        new bootstrap.Modal(document.getElementById('renameStoreModal')).show();
    }
};

// --- PAGINATION ---
window.changePage = function(p) {
    currentPage = p; 
    renderStockTable(currentFilteredData); 
};

// --- HISTORIQUE ---
window.openHistoryModal = function(productId) {
    const p = products.find(x => x.id === productId);
    if(!p) return;
    setText('historyProductName', `Produit : ${p.name}`);
    
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    const logs = stockMovements.filter(m => m.productId === productId);
    renderHistoryRows(tbody, logs);
    new bootstrap.Modal(document.getElementById('historyModal')).show();
};


/* ============================================================
   2. LOGIQUE MÉTIER & RENDU
   ============================================================ */

// --- Helpers Prix & Stock ---
function getSellingPrice(p, storeName) {
    if (storeName && storeName !== 'all' && p.storeExceptions && p.storeExceptions[storeName]?.price) {
        return p.storeExceptions[storeName].price;
    }
    return p.sellingPrice;
}

function getThreshold(p, storeName) {
    if (storeName && storeName !== 'all' && p.storeExceptions && p.storeExceptions[storeName]?.threshold) {
        return p.storeExceptions[storeName].threshold;
    }
    return p.threshold;
}

function getQty(p, storeName) {
    if (!p.stockByLocation) return 0;
    if (storeName && storeName !== 'all') return p.stockByLocation[storeName] || 0;
    return Object.values(p.stockByLocation).reduce((sum, q) => sum + q, 0);
}

// --- Rendu Tableau Principal ---
function renderStockTable(data) {
    currentFilteredData = data;
    
    // Pagination Logic
    const totalPages = Math.ceil(data.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;
    if (currentPage < 1 && totalPages > 0) currentPage = 1;

    const tbody = document.getElementById('stockTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Aucun produit trouvé.</td></tr>`;
        updatePaginationControls(0,0,0);
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, data.length);
    const paginated = data.slice(start, end);
    
    updatePaginationControls(start + 1, end, data.length);

    const selectedStore = document.getElementById('filterStore')?.value || 'all';

    paginated.forEach(p => {
        const displayQty = getQty(p, selectedStore);
        const globalQty = getQty(p, 'all');
        const displayPrice = getSellingPrice(p, selectedStore);
        const displayThreshold = getThreshold(p, selectedStore);

        // Calcul Statut
        let statusText = 'En Stock', statusColor = 'text-success', barColor = 'bg-success';
        if (!p.isActive) { 
            statusText = 'Archivé'; statusColor = 'text-secondary'; 
        } else if (selectedStore === 'all' && globalQty === 0) { 
            statusText = 'Rupture'; statusColor = 'text-danger'; barColor = 'bg-danger'; 
        } else if (selectedStore !== 'all' && displayQty === 0) { 
            statusText = 'Rupture Local'; statusColor = 'text-danger'; barColor = 'bg-danger'; 
        } else if (displayQty <= displayThreshold) { 
            statusText = 'Faible'; statusColor = 'text-warning'; barColor = 'bg-warning'; 
        }

        const percent = Math.min(100, Math.max(5, (displayQty / Math.max(displayThreshold * 3, 1) * 100)));

        // Badges Magasins
        let locHtml = '';
        if (selectedStore === 'all') {
            locHtml = Object.entries(p.stockByLocation).filter(([_,q]) => q > 0)
                .map(([l,q]) => `<span class="badge-store me-1">${l}: ${q}</span>`).join('');
        } else {
            locHtml = `<span class="badge-store me-1 fw-bold">${selectedStore}: ${displayQty}</span>`;
        }

        const tr = document.createElement('tr');
        if(!p.isActive) tr.className = 'opacity-75 bg-light';
        
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
            <td class="text-end fw-bold text-dark">${formatMoney(p.purchasePrice)}</td>
            <td class="text-end fw-bold text-dark">${formatMoney(displayPrice)}</td>
            <td>
                <div class="d-flex justify-content-between small mb-1">
                    <span class="fw-bold text-dark">${displayQty}</span>
                    <span class="text-muted" style="font-size:0.75rem">Alerte à ${displayThreshold}</span>
                </div>
                <div class="mb-2">${locHtml || '<span class="small text-muted fst-italic">Vide</span>'}</div>
                ${p.isActive ? `<div class="progress progress-thin"><div class="progress-bar ${barColor}" style="width: ${percent}%"></div></div>` : ''}
            </td>
            <td class="text-center">
                <div class="status-cell-wrapper">
                    <span class="${statusColor} status-text">
                        <span class="status-dot" style="background-color:currentColor"></span>${statusText}
                    </span>
                </div>
            </td>
            <td class="text-end pe-4">
                <div class="d-flex justify-content-end">
                    ${p.isActive ? `<button class="btn-action-icon btn-add" title="Entrée" onclick="window.openRestockModal(${p.id})"><i class="fas fa-plus"></i></button>` : ''}
                    ${p.isActive ? `<button class="btn-action-icon btn-transfer" title="Transfert" onclick="window.openTransferModal(${p.id})"><i class="fas fa-exchange-alt"></i></button>` : ''}
                    <button class="btn-action-icon btn-history" title="Historique" onclick="window.openHistoryModal(${p.id})"><i class="fas fa-history"></i></button>
                    <button class="btn-action-icon btn-edit" title="Modifier" onclick="window.editProduct(${p.id})"><i class="fas fa-pen"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updatePaginationControls(start, end, total) {
    setText('paginationInfoStart', total > 0 ? start : 0);
    setText('paginationInfoEnd', end);
    setText('paginationInfoTotal', total);
    
    const controls = document.getElementById('paginationControls');
    if(!controls) return;
    controls.innerHTML = '';

    const totalPages = Math.ceil(total / itemsPerPage);
    if(totalPages <= 1) return;

    const createLi = (page, text, active=false, disabled=false) => {
        const li = document.createElement('li');
        li.className = `page-item ${active?'active':''} ${disabled?'disabled':''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="window.changePage(${page}); return false;">${text}</a>`;
        return li;
    };

    controls.appendChild(createLi(currentPage-1, '<i class="fas fa-chevron-left"></i>', false, currentPage===1));
    for(let i=1; i<=totalPages; i++) controls.appendChild(createLi(i, i, i===currentPage));
    controls.appendChild(createLi(currentPage+1, '<i class="fas fa-chevron-right"></i>', false, currentPage===totalPages));
}

function handleMainFilters() {
    const term = document.getElementById('searchStock').value.toLowerCase();
    const storeVal = document.getElementById('filterStore').value;
    const statusVal = document.getElementById('filterStatus').value;

    let filtered = products.filter(p => {
        const totalQty = getQty(p, 'all');
        const matchName = p.name.toLowerCase().includes(term);
        let matchStatus = true;
        
        if (statusVal === 'active') matchStatus = p.isActive;
        else if (statusVal === 'archived') matchStatus = !p.isActive;
        else if (statusVal === 'low') matchStatus = p.isActive && totalQty <= p.threshold && totalQty > 0;
        else if (statusVal === 'out') matchStatus = p.isActive && totalQty === 0;
        
        return matchName && matchStatus;
    });

    if(storeVal !== 'all') {
        filtered = filtered.filter(p => p.stockByLocation[storeVal] !== undefined);
    }

    currentPage = 1; 
    renderStockTable(filtered);
}

function updateStockStats() {
    let totalValuePurchase = 0;
    let totalItems = 0;
    let lowCount = 0;
    let outCount = 0;

    products.forEach(p => {
        if (!p.isActive) return;
        const qty = getQty(p, 'all');
        totalValuePurchase += (p.purchasePrice * qty);
        totalItems += qty;
        
        if (qty === 0) outCount++;
        else if (qty <= p.threshold) lowCount++;
    });

    setText('totalStockValue', formatMoney(totalValuePurchase));
    setText('totalItemsCount', totalItems);
    setText('lowStockCount', lowCount);
    setText('outOfStockCount', outCount);
}

// --- GESTION MAGASINS ---
function updateStoreDropdowns() {
    const activeStores = stores.filter(s => s.active);
    const generateOptions = (list, all=false) => (all?'<option value="all">Tous les Magasins</option>':'') + list.map(s=>`<option value="${s.name}">${s.name}</option>`).join('');

    if(document.getElementById('filterStore')) document.getElementById('filterStore').innerHTML = generateOptions(stores, true);
    
    ['restockLocation','productInitialStore','transferSourceStore','transferDestStore'].forEach(id => { 
        if(document.getElementById(id)) document.getElementById(id).innerHTML = generateOptions(activeStores); 
    });

    if(document.getElementById('journalFilterStore')) document.getElementById('journalFilterStore').innerHTML = '<option value="">Tous</option>' + activeStores.map(s=>`<option value="${s.name}">${s.name}</option>`).join('');
}

function renderStoreList() {
    const list = document.getElementById('storeListDisplay');
    if(!list) return;
    list.innerHTML = stores.map(s => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
                <span class="fw-medium ${s.active ? 'text-dark' : 'text-muted text-decoration-line-through'}">${s.name}</span>
                ${!s.active ? '<span class="badge bg-light text-muted small">Inactif</span>' : ''}
            </div>
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-light border" onclick="window.openRenameStoreModal(${s.id})"><i class="fas fa-pen text-muted"></i></button>
                <div class="form-check form-switch ms-2"><input class="form-check-input" type="checkbox" onchange="window.toggleStore(${s.id})" ${s.active ? 'checked' : ''}></div>
            </div>
        </li>
    `).join('');
}

function addNewStore() {
    const input = document.getElementById('newStoreInput');
    const name = input.value.trim();
    if (name && !stores.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        stores.push({ id: Date.now(), name: name, active: true });
        input.value = '';
        updateStoreDropdowns();
        renderStoreList();
    }
}

function saveStoreName() {
    const id = parseInt(document.getElementById('editStoreId').value);
    const newName = document.getElementById('editStoreNameInput').value.trim();
    if(newName) {
        const s = stores.find(x => x.id === id);
        if(s) {
            const oldName = s.name;
            s.name = newName;
            // Maj Références
            products.forEach(p => {
                if(p.stockByLocation[oldName] !== undefined) { p.stockByLocation[newName] = p.stockByLocation[oldName]; delete p.stockByLocation[oldName]; }
                if(p.storeExceptions && p.storeExceptions[oldName]) { p.storeExceptions[newName] = p.storeExceptions[oldName]; delete p.storeExceptions[oldName]; }
            });
            stockMovements.forEach(m => { if(m.location === oldName) m.location = newName; });
            
            updateStoreDropdowns();
            renderStoreList();
            handleMainFilters();
        }
        bootstrap.Modal.getInstance(document.getElementById('renameStoreModal')).hide();
    }
}

// --- ACTIONS ---
function saveProduct() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productSellingPrice').value);
    const thresh = parseInt(document.getElementById('productThreshold').value);
    const active = document.getElementById('productActive').checked;

    if(!name || isNaN(price)) { alert("Données invalides"); return; }

    const exceptions = {};
    document.querySelectorAll('#storeExceptionsBody tr').forEach(tr => {
        const store = tr.querySelector('.exception-price').dataset.store;
        const pVal = tr.querySelector('.exception-price').value;
        const tVal = tr.querySelector('.exception-threshold').value;
        if(pVal || tVal) {
            exceptions[store] = {};
            if(pVal) exceptions[store].price = parseFloat(pVal);
            if(tVal) exceptions[store].threshold = parseInt(tVal);
        }
    });

    if(id) {
        const p = products.find(x => x.id == id);
        if(p) {
            p.name = name; p.sellingPrice = price; p.threshold = thresh; p.isActive = active;
            p.storeExceptions = exceptions;
        }
    } else {
        const newId = Date.now();
        const initStore = document.getElementById('productInitialStore').value;
        const initQty = parseInt(document.getElementById('productQty').value)||0;
        const initCost = parseFloat(document.getElementById('productInitialCost').value)||0;
        const stockInit = {}; if(initStore) stockInit[initStore] = initQty;
        
        products.push({
            id: newId, name, purchasePrice: initCost, sellingPrice: price, threshold: thresh,
            stockByLocation: stockInit, storeExceptions: exceptions, isActive: active
        });
        if(initQty > 0) addMovement(newId, name, 'Entrée', initStore, initQty, "Initialisation");
    }

    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    handleMainFilters();
    updateStockStats();
}

function doRestock() {
    const qtyToAdd = parseInt(document.getElementById('restockQty').value);
    const location = document.getElementById('restockLocation').value;
    const inputCost = document.getElementById('restockCostPrice').value;

    if(currentRestockId && qtyToAdd > 0 && location) {
        const idx = products.findIndex(p => p.id === currentRestockId);
        if(idx > -1) {
            const p = products[idx];
            if (inputCost && inputCost.trim() !== "") {
                const newUnitCost = parseFloat(inputCost);
                const currentTotalQty = getQty(p, 'all');
                const currentTotalValue = currentTotalQty * p.purchasePrice;
                const incomingValue = qtyToAdd * newUnitCost;
                const newTotalQty = currentTotalQty + qtyToAdd;
                if (newTotalQty > 0) p.purchasePrice = Math.round((currentTotalValue + incomingValue) / newTotalQty);
            }
            if (!p.stockByLocation[location]) p.stockByLocation[location] = 0;
            p.stockByLocation[location] += qtyToAdd;
            addMovement(p.id, p.name, 'Entrée', location, qtyToAdd, "Réapprovisionnement");
        }
    }
    bootstrap.Modal.getInstance(document.getElementById('restockModal')).hide();
    handleMainFilters();
    updateStockStats();
}

function updateTransferStockDisplay() {
    const pId = currentTransferId;
    const store = document.getElementById('transferSourceStore').value;
    const display = document.getElementById('transferSourceStockDisplay');
    if(pId && store) {
        const p = products.find(x => x.id === pId);
        const qty = p.stockByLocation[store] || 0;
        display.textContent = `Stock disponible : ${qty}`;
        display.className = qty > 0 ? "form-text small text-success fw-bold" : "form-text small text-danger fw-bold";
    }
}

function doTransfer() {
    const pId = currentTransferId;
    const source = document.getElementById('transferSourceStore').value;
    const dest = document.getElementById('transferDestStore').value;
    const qty = parseInt(document.getElementById('transferQty').value);
    const reason = document.getElementById('transferReason').value || "Transfert";

    if(!pId || !source || !dest || isNaN(qty) || qty <= 0) return;
    if(source === dest) { alert("Source et destination identiques"); return; }

    const p = products.find(x => x.id === pId);
    const sourceQty = p.stockByLocation[source] || 0;

    if(sourceQty < qty) { alert("Stock insuffisant"); return; }

    p.stockByLocation[source] -= qty;
    if(!p.stockByLocation[dest]) p.stockByLocation[dest] = 0;
    p.stockByLocation[dest] += qty;

    addMovement(p.id, p.name, 'Sortie', source, qty, `Vers ${dest} : ${reason}`);
    addMovement(p.id, p.name, 'Entrée', dest, qty, `De ${source} : ${reason}`);

    bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
    handleMainFilters();
}

// --- JOURNAL & EXPORT ---
function addMovement(id, name, type, loc, qty, reason) {
    const now = new Date();
    stockMovements.unshift({
        id: Date.now(), date: now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0].substring(0,5),
        productId: id, productName: name, type, location: loc, qty: type === 'Sortie' ? -qty : qty, reason
    });
}

function renderHistoryRows(tbody, logs) {
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Aucun mouvement.</td></tr>`;
        return;
    }
    tbody.innerHTML = logs.map(log => `
        <tr><td class="ps-3 text-muted">${log.date}</td><td>${log.location}</td><td><span class="badge ${log.qty > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}">${log.type}</span></td><td class="text-end fw-bold ${log.qty > 0 ? 'text-success' : 'text-danger'}">${log.qty > 0 ? '+' : ''}${Math.abs(log.qty)}</td><td class="text-muted small pe-3">${log.reason}</td></tr>
    `).join('');
}

function renderProductOptions() {
    const select = document.getElementById('journalFilterProduct');
    if(!select) return;
    select.innerHTML = '<option value="">Tous</option>' + 
        [...products].sort((a,b)=>a.name.localeCompare(b.name)).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

function applyJournalFilters() {
    const start = document.getElementById('journalDateStart').value;
    const end = document.getElementById('journalDateEnd').value;
    const store = document.getElementById('journalFilterStore').value;
    const prodId = document.getElementById('journalFilterProduct').value;

    currentFilteredJournal = stockMovements.filter(m => {
        const mDate = m.date.split(' ')[0];
        let dateOk = true;
        if (start) dateOk = dateOk && (mDate >= start);
        if (end) dateOk = dateOk && (mDate <= end);
        let storeOk = (!store || store === "" || m.location === store);
        let prodOk = (!prodId || prodId === "" || m.productId == prodId);
        return dateOk && storeOk && prodOk;
    });
    
    const tbody = document.getElementById('globalJournalTableBody');
    if(!tbody) return;
    if (currentFilteredJournal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5">Aucun résultat.</td></tr>`;
    } else {
        tbody.innerHTML = currentFilteredJournal.map(log => `
            <tr><td class="ps-4 text-nowrap">${log.date}</td><td class="fw-medium">${log.productName}</td><td><span class="fw-bold text-dark small">${log.location}</span></td><td>${log.type}</td><td class="text-end fw-bold ${log.qty > 0 ? 'text-success' : 'text-danger'}">${log.qty > 0 ? '+' : ''}${log.qty}</td><td class="text-muted small pe-4">${log.reason}</td></tr>
        `).join('');
    }
}

function exportFilteredJournal() {
    if (currentFilteredJournal.length === 0) { alert("Rien à exporter."); return; }
    let csvContent = "Date;Heure;Produit;Magasin;Type;Quantité;Raison\n";
    currentFilteredJournal.forEach(m => {
        const [d, t] = m.date.split(' ');
        csvContent += [d, t, `"${m.productName.replace(/"/g, '""')}"`, m.location, m.type, m.qty, `"${m.reason}"`].join(";") + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Journal_Export_${Date.now()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function renderStoreExceptionsTable(exceptions, stocks = {}) {
    const tbody = document.getElementById('storeExceptionsBody');
    tbody.innerHTML = '';
    stores.filter(s => s.active).forEach(store => {
        const exc = exceptions[store.name] || {};
        const stock = stocks[store.name] || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3 fw-medium">${store.name}</td>
            <td><span class="badge bg-light text-dark border">${stock}</span></td>
            <td><input type="number" class="form-control input-sm-custom exception-price" data-store="${store.name}" value="${exc.price||''}" placeholder="Défaut"></td>
            <td><input type="number" class="form-control input-sm-custom exception-threshold" data-store="${store.name}" value="${exc.threshold||''}" placeholder="Défaut"></td>
        `;
        tbody.appendChild(tr);
    });
}

function formatMoney(amount) { return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'; }
function setText(id, value) { const el = document.getElementById(id); if(el) el.textContent = value; }