/**
 * public/js/orders.js
 * WINK SHOP - Call Center (Version Finale & Autonome)
 * ---------------------------------------------------
 * Fonctionnalités : 
 * - Gestion multi-articles (Panier dans la modale)
 * - Alertes visuelles animées UNIQUEMENT sur l'icône (Rouge/Orange)
 * - Statuts visuels avec points colorés (Dots)
 * - Auto-calcul Frais de Livraison
 * - Attribution Livreur au moment de la copie.
 */

// ==========================================
// 1. DONNÉES DE RÉFÉRENCE (MOCK DATA)
// ==========================================

const CATALOGUE_PRODUITS = [
    { id: 1, name: "Montre Connectée Ultra", price: 25000 },
    { id: 2, name: "Écouteurs Pro Sans Fil", price: 15000 },
    { id: 3, name: "Kit Nettoyage Écran", price: 5000 },
    { id: 4, name: "Ring Light LED", price: 12000 },
    { id: 5, name: "Trépied Smartphone", price: 8000 },
    { id: 6, name: "Micro Cravate sans fil", price: 18000 },
    { id: 7, name: "Support PC Portable", price: 22000 }
];

const LISTE_MAGASINS = [
    { id: 1, name: "Douala" },
    { id: 2, name: "Yaoundé" },
    { id: 3, name: "Kribi" },
    { id: 4, name: "Bafoussam" }
];

// Tarifs Logistiques (Mock Data)
const LOGISTICS_RATES = [
    { id: 1, city: "Douala", neighborhoods: "Akwa, Bonanjo, Bali, Bonapriso", price: 1500 },
    { id: 2, city: "Douala", neighborhoods: "Bonamoussadi, Kotto, Logpom, Makepe", price: 2500 },
    { id: 3, city: "Yaoundé", neighborhoods: "Bastos, Centre, Etoudi, Tsinga", price: 2000 },
    { id: 4, city: "National", neighborhoods: "Bafoussam, Kribi, Garoua", price: 5000 }
];

// NOUVEAU: Liste des Livreurs pour l'attribution
const LISTE_LIVREURS = [
    { id: 0, name: "Non Assigné / A choisir" },
    { id: 1, name: "Jean Moto (Interne)" },
    { id: 2, name: "Speedy Delivery (Externe)" },
    { id: 3, name: "Marc Yaoundé (Interne)" },
];


// Dates dynamiques pour la démo
const now = new Date();
const todayStr = now.toISOString().split('T')[0];
const yesterdayObj = new Date(now); yesterdayObj.setDate(now.getDate() - 1);
const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

// ==========================================
// 2. ÉTAT INITIAL DES COMMANDES
// ==========================================
let orders = [
    { 
        id: 101, client: "Marie Curie", phone: "655000002", location: "Yaoundé, Bastos", 
        items: [{ name: "Écouteurs Pro Sans Fil", price: 14000, qty: 2 }], 
        status: "Programmé", date: todayStr, 
        reminderDate: todayStr, reminderTime: "14:00",
        note: "Client satisfait",
        deliveryFee: 2000 
    },
    { 
        id: 102, client: "Marc Lavoine", phone: "655998877", location: "Douala, Bonanjo", 
        items: [{ name: "Trépied Smartphone", price: 8000, qty: 1 }], 
        status: "À relancer", date: todayStr, 
        reminderDate: todayStr, reminderTime: "09:00",
        note: "N'a pas décroché",
        deliveryFee: 1500
    },
    { 
        id: 103, client: "Jean Dupont", phone: "699000001", location: "Douala, Akwa", 
        items: [{ name: "Montre Connectée Ultra", price: 25000, qty: 1 }], 
        status: "En attente", date: todayStr, note: "Livrer au bureau",
        deliveryFee: 1500
    },
];

// Variables globales
let currentFilteredOrders = [];
let currentPage = 1;
const itemsPerPage = 7;
let currentModalItems = []; 
let currentDetailsOrder = null; 

// ==========================================
// 3. INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    const dateInput = document.getElementById('dateFilter');
    if(dateInput) dateInput.value = todayStr;

    populateDatalist();
    populateStoreSelect();

    handleOrderFilters();
    updateOrderStats();

    setupEventListeners();

    setInterval(() => {
        handleOrderFilters(); 
    }, 60000);
});

function setupEventListeners() {
    // Filtres
    document.getElementById('searchInput')?.addEventListener('input', handleOrderFilters);
    document.getElementById('statusFilter')?.addEventListener('change', handleOrderFilters);
    document.getElementById('dateFilter')?.addEventListener('change', handleOrderFilters);

    // Actions Modale Commande
    document.getElementById('saveOrderBtn')?.addEventListener('click', saveOrder);
    document.getElementById('orderStatus')?.addEventListener('change', toggleUiSections);
    
    // Auto-calcul frais
    document.getElementById('orderLocation')?.addEventListener('input', handleLocationLookup);
    
    // Actions Panier (Modale)
    document.getElementById('addItemName')?.addEventListener('input', autoFillPrice); 
    document.getElementById('btnAddItem')?.addEventListener('click', addModalItem);

    // Actions Modale Détails
    document.getElementById('copyToClipboardBtn')?.addEventListener('click', copyToClipboard);
}

// ==========================================
// 4. LOGIQUE LIVRAISON AUTOMATIQUE
// ==========================================

function lookupDeliveryFee(location) {
    if (!location) return 0;
    const lowerLocation = location.toLowerCase();

    for (const rate of LOGISTICS_RATES) {
        const lowerNeighborhoods = rate.neighborhoods.toLowerCase().split(',').map(n => n.trim());
        
        for (const neighborhood of lowerNeighborhoods) {
            if (neighborhood && lowerLocation.includes(neighborhood)) {
                return rate.price;
            }
        }
    }
    
    return 0;
}

window.handleLocationLookup = function() {
    const locationInput = document.getElementById('orderLocation');
    const feeInput = document.getElementById('orderDeliveryFee');
    
    if (locationInput && feeInput) {
        const fee = lookupDeliveryFee(locationInput.value);
        
        if (fee > 0 && (feeInput.value === '' || parseFloat(feeInput.value) === 0)) {
            feeInput.value = fee;
        }
    }
};

// ==========================================
// 5. RENDU DU TABLEAU
// ==========================================

function handleOrderFilters() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const statusVal = document.getElementById('statusFilter').value;
    const dateVal = document.getElementById('dateFilter').value;

    const filtered = orders.filter(o => {
        const productsText = o.items.map(i => i.name.toLowerCase()).join(' ');
        const matchText = (o.client||"").toLowerCase().includes(term) || 
                          o.phone.includes(term) || 
                          (o.location||"").toLowerCase().includes(term) || 
                          productsText.includes(term);
        
        const matchStatus = statusVal === "" || o.status === statusVal;
        
        let matchDate = true;
        if (dateVal) {
            const targetDate = (['Programmé','À relancer'].includes(o.status) && o.reminderDate) ? o.reminderDate : o.date;
            matchDate = (targetDate === dateVal);
        }
        return matchText && matchStatus && matchDate;
    });
    
    sortOrdersByAlert(filtered);
    currentFilteredOrders = filtered;
    currentPage = 1;
    renderOrdersTable(currentFilteredOrders);
}

function renderOrdersTable(data) {
    const tbody = document.getElementById('ordersTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-muted">Aucune commande trouvée.</td></tr>`;
        updateOrderPagination(0,0,0);
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, data.length);
    const paginated = data.slice(start, end);
    updateOrderPagination(start + 1, end, data.length);

    paginated.forEach(order => {
        const totalItemsPrice = order.items.reduce((acc, i) => acc + (i.qty * i.price), 0);
        const totalAmount = totalItemsPrice + (order.deliveryFee || 0); 
        const totalQty = order.items.reduce((acc, i) => acc + i.qty, 0);

        // Affichage Produits (Résumé)
        let productDisplay = "";
        if(order.items.length > 0) {
            productDisplay = `<span class="product-summary">${order.items[0].name}</span>`;
            if(order.items.length > 1) {
                productDisplay += `<span class="product-more" title="${order.items.slice(1).map(i=>i.name).join(', ')}">+${order.items.length - 1}</span>`;
            }
        } else {
            productDisplay = `<span class="text-muted fst-italic">Vide</span>`;
        }

        // Logique Visuelle (Date & Alertes)
        let dateHtml = `<div class="text-muted small">${order.date}</div>`;
        let alertRowClass = ""; 
        
        if (['Programmé', 'À relancer'].includes(order.status) && order.reminderDate) {
            const timeStatus = checkTimeStatus(order.reminderDate, order.reminderTime);
            
            let iconColor = "text-primary"; 
            let iconAnimClass = "";        
            let iconName = "fa-clock";

            if (timeStatus === 'past') {
                iconColor = "text-danger fw-bold";
                iconAnimClass = "anim-icon-urgent";
                iconName = "fa-bell";
                alertRowClass = "alert-row";
            } else if (timeStatus === 'imminent') {
                iconColor = "text-warning fw-bold";
                iconAnimClass = "anim-icon-soon";
                iconName = "fa-clock";
            }

            dateHtml = `
                <div class="${iconColor} small">
                    <i class="fas ${iconName} ${iconAnimClass} me-1"></i>
                    ${order.reminderDate} <span class="small opacity-75">${order.reminderTime||''}</span>
                </div>
            `;
        }
        
        if(order.note) dateHtml += `<div class="note-text text-truncate" style="max-width: 160px;">"${order.note}"</div>`;

        // GESTION STATUT (DOT + TEXTE)
        let stClass = "st-attente";
        if(order.status === 'Livré') stClass = "st-livre";
        else if(order.status === 'Programmé') stClass = "st-programme";
        else if(order.status === 'À relancer') stClass = "st-relance";
        else if(order.status === 'Confirmer') stClass = "st-confirmer";
        else if(order.status === 'Annulé' || order.status === 'Rejeté') stClass = "st-annule";

        const statusHtml = `
            <div class="status-cell-wrapper ${stClass}">
                <span class="status-dot"></span>
                <span class="status-text">${order.status}</span>
            </div>
        `;

        const tr = document.createElement('tr');
        if(alertRowClass) tr.className = alertRowClass;
        
        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center">
                    <div>
                        <div class="client-name">${order.client || 'Inconnu'}</div>
                        <div class="client-phone">${formatPhoneNumber(order.phone)}</div>
                    </div>
                </div>
            </td>
            <td class="small text-muted">${order.location || '-'}</td>
            <td>${productDisplay}</td>
            <td class="text-center fw-bold small">${totalQty}</td>
            <td class="text-end fw-bold text-dark small">${formatMoney(totalAmount)}</td>
            <td>${statusHtml}</td>
            <td>${dateHtml}</td>
            <td class="text-end pe-4">
                <div class="dropdown">
                    <button class="btn-icon-dropdown" type="button" data-bs-toggle="dropdown">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                        <li><a class="dropdown-item" href="#" onclick="window.openDetailsModal(${order.id})"><i class="far fa-eye text-primary"></i> Détails</a></li>
                        <li><a class="dropdown-item" href="#" onclick="window.openWhatsApp('${order.phone}')"><i class="fab fa-whatsapp text-success"></i> WhatsApp</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="window.editOrder(${order.id})"><i class="fas fa-pen text-muted"></i> Modifier</a></li>
                    </ul>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 6. ACTIONS SAVE / EDIT / RESET
// ==========================================

function saveOrder() {
    const id = document.getElementById('orderId').value;
    const client = document.getElementById('orderClient').value;
    const phone = document.getElementById('orderPhone').value;
    const deliveryFee = parseFloat(document.getElementById('orderDeliveryFee').value) || 0; 

    if(currentModalItems.length === 0) { alert("Veuillez ajouter au moins un article au panier."); return; }
    if(!phone) { alert("Le numéro de téléphone est obligatoire."); return; }

    const newOrder = {
        id: id ? parseInt(id) : Date.now(),
        client, phone, 
        location: document.getElementById('orderLocation').value,
        items: [...currentModalItems], 
        status: document.getElementById('orderStatus').value,
        note: document.getElementById('orderComment').value,
        deliveryFee: deliveryFee, 
        date: id ? (orders.find(o=>o.id==id)?.date || todayStr) : todayStr,
        reminderDate: document.getElementById('orderReminderDate').value,
        reminderTime: document.getElementById('orderReminderTime').value,
        deliveredFrom: document.getElementById('orderDeliveryStore').value
    };

    if(id) {
        const idx = orders.findIndex(o => o.id == id);
        if (idx > -1) orders[idx] = newOrder;
    } else {
        orders.unshift(newOrder);
    }

    bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
    handleOrderFilters();
    updateOrderStats();
}

window.editOrder = function(id) {
    const o = orders.find(x => x.id === id);
    if(!o) return;
    
    document.getElementById('orderModalTitle').textContent = "Modifier Commande";
    document.getElementById('orderId').value = o.id;
    document.getElementById('orderClient').value = o.client;
    document.getElementById('orderPhone').value = o.phone;
    document.getElementById('orderLocation').value = o.location;
    document.getElementById('orderDeliveryFee').value = o.deliveryFee || 0; 
    
    document.getElementById('orderStatus').value = o.status;
    document.getElementById('orderComment').value = o.note || '';
    document.getElementById('orderReminderDate').value = o.reminderDate || '';
    document.getElementById('orderReminderTime').value = o.reminderTime || '';
    document.getElementById('orderDeliveryStore').value = o.deliveredFrom || '';
    
    currentModalItems = [...o.items];
    renderModalItems();
    
    toggleUiSections();
    new bootstrap.Modal(document.getElementById('orderModal')).show();
};

window.resetOrderModal = function() {
    document.getElementById('orderForm').reset();
    document.getElementById('orderId').value = '';
    document.getElementById('orderModalTitle').textContent = "Nouvelle Commande";
    
    currentModalItems = [];
    renderModalItems();
    document.getElementById('orderReminderDate').value = todayStr;
    document.getElementById('orderDeliveryFee').value = 0; 
    
    toggleUiSections();
};

// ==========================================
// 7. DÉTAILS & WHATSAPP (Attribution Livreur)
// ==========================================

window.openDetailsModal = function(id) {
    currentDetailsOrder = orders.find(x => x.id === id);
    if(!currentDetailsOrder) return;
    
    const o = currentDetailsOrder;
    const totalItemsPrice = o.items.reduce((acc, i) => acc + (i.qty * i.price), 0);
    const totalAmount = totalItemsPrice + (o.deliveryFee || 0);

    // Remplir la liste des livreurs
    const driverSelect = document.getElementById('driverAssignmentSelect');
    if(driverSelect) {
        driverSelect.innerHTML = LISTE_LIVREURS.map(d => 
            `<option value="${d.name}">${d.name}</option>`
        ).join('');
        driverSelect.value = "Non Assigné / A choisir";
    }

    const itemsHtml = o.items.map(i => 
        `<div class="d-flex justify-content-between small"><span>${i.name} (x${i.qty})</span><span>${formatMoney(i.price * i.qty)}</span></div>`
    ).join('');

    const list = document.getElementById('detailsList');
    list.innerHTML = `
        <li class="list-group-item d-flex justify-content-between"><span>Client:</span> <strong>${o.client || "Inconnu"}</strong></li>
        <li class="list-group-item d-flex justify-content-between"><span>Tél:</span> <strong>${formatPhoneNumber(o.phone)}</strong></li>
        <li class="list-group-item d-flex justify-content-between"><span>Lieu:</span> <span>${o.location || '-'}</span></li>
        
        <li class="list-group-item bg-light">
            <div class="fw-bold small mb-1">Détail Articles :</div>
            ${itemsHtml}
            <div class="d-flex justify-content-between small pt-1 border-top mt-1"><span>Frais de Livraison:</span> <span>${formatMoney(o.deliveryFee || 0)}</span></div>
            <div class="border-top mt-2 pt-1 d-flex justify-content-between fw-bold text-primary">
                <span>TOTAL à percevoir:</span> <span>${formatMoney(totalAmount)}</span>
            </div>
        </li>
        
        <li class="list-group-item d-flex justify-content-between"><span>Statut:</span> <span>${o.status}</span></li>
        ${o.note ? `<li class="list-group-item"><strong>Note:</strong> <br><i class="text-muted small">${o.note}</i></li>` : ''}
    `;
    new bootstrap.Modal(document.getElementById('detailsModal')).show();
};

window.copyToClipboard = function() {
    if(!currentDetailsOrder) return;
    const o = currentDetailsOrder;
    
    // Récupérer le livreur sélectionné
    const driverSelect = document.getElementById('driverAssignmentSelect');
    const assignedDriver = driverSelect ? driverSelect.value : 'Non renseigné';

    if (assignedDriver === "Non Assigné / A choisir" || assignedDriver === "Non renseigné") {
        if (!confirm("ATTENTION : Aucun livreur n'a été attribué. Voulez-vous copier sans assignation ?")) {
            return;
        }
    }
    
    const totalItemsPrice = o.items.reduce((acc, i) => acc + (i.qty * i.price), 0);
    const totalAmount = totalItemsPrice + (o.deliveryFee || 0);
    const natureText = o.items.map(i => `${i.qty} x ${i.name}`).join(', ');

    const textToCopy = 
`*Livreur Attribué*: ${assignedDriver}
*WinkShop*
*Nom*: ${o.client || 'Client'}
*Téléphone*: ${formatPhoneNumber(o.phone)}
*Adresse*: ${o.location || 'N/A'}
*Nature*: ${natureText}
*Frais Livraison*: ${formatMoney(o.deliveryFee || 0)}
*Net à percevoir*: ${formatMoney(totalAmount)}
*Note*: ${o.note || ''}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.getElementById('copyToClipboardBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check me-2"></i> Copié !';
        btn.classList.replace('btn-success', 'btn-dark');
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.replace('btn-dark', 'btn-success');
        }, 2000);
    });
};

window.openWhatsApp = function(phone) {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 9) clean = '237' + clean;
    window.open(`https://wa.me/${clean}`, '_blank');
};


// ==========================================
// 8. FONCTIONS PANIER & UTILITAIRES
// ==========================================

function populateDatalist() {
    const datalist = document.getElementById('productDataList');
    if (!datalist) return;
    datalist.innerHTML = CATALOGUE_PRODUITS.map(p => 
        `<option value="${p.name}" data-price="${p.price}">`
    ).join('');
}

function populateStoreSelect() {
    const select = document.getElementById('orderDeliveryStore');
    if(!select) return;
    select.innerHTML = '<option value="">Choisir magasin...</option>' +
        LISTE_MAGASINS.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

function autoFillPrice(e) {
    const val = e.target.value;
    const product = CATALOGUE_PRODUITS.find(p => p.name === val);
    if (product) {
        document.getElementById('addItemPrice').value = product.price;
    }
}

function addModalItem() {
    const name = document.getElementById('addItemName').value;
    const price = parseFloat(document.getElementById('addItemPrice').value);
    const qty = parseInt(document.getElementById('addItemQty').value);

    if(name && !isNaN(price) && qty > 0) {
        currentModalItems.push({ name, price, qty });
        renderModalItems();
        
        document.getElementById('addItemName').value = '';
        document.getElementById('addItemPrice').value = '';
        document.getElementById('addItemQty').value = 1;
        document.getElementById('addItemName').focus();
    } else {
        alert("Veuillez vérifier le produit et le prix.");
    }
}

function renderModalItems() {
    const tbody = document.getElementById('modalItemsList');
    const totalEl = document.getElementById('modalTotalAmount');
    let total = 0;
    tbody.innerHTML = '';
    
    if(currentModalItems.length === 0) {
        tbody.innerHTML = `<tr class="text-center text-muted"><td class="py-3">Aucun article ajouté</td></tr>`;
    } else {
        currentModalItems.forEach((item, idx) => {
            const subTotal = item.price * item.qty;
            total += subTotal;
            tbody.innerHTML += `
                <tr>
                    <td>${item.name}</td>
                    <td class="text-end">${item.qty} x ${formatMoney(item.price)}</td>
                    <td class="text-end" style="width:30px;">
                        <i class="fas fa-times text-danger pointer" onclick="removeModalItem(${idx})" title="Retirer"></i>
                    </td>
                </tr>
            `;
        });
    }
    totalEl.textContent = formatMoney(total);
}

window.removeModalItem = function(idx) { 
    currentModalItems.splice(idx, 1); 
    renderModalItems(); 
};

function toggleUiSections() {
    const s = document.getElementById('orderStatus').value;
    const remDiv = document.getElementById('reminderSection');
    const storeDiv = document.getElementById('deliveryStoreSection');
    
    if(['Programmé','À relancer'].includes(s)) remDiv.classList.remove('d-none');
    else remDiv.classList.add('d-none');
    
    if(s === 'Livré') storeDiv.classList.remove('d-none');
    else storeDiv.classList.add('d-none');
}

function updateOrderStats() {
    document.getElementById('statTotal').textContent = orders.length;
    document.getElementById('statConfirmed').textContent = orders.filter(o => o.status === 'Confirmer').length;
    document.getElementById('statProgrammed').textContent = orders.filter(o => ['Programmé', 'À relancer'].includes(o.status)).length;
    document.getElementById('statCancelled').textContent = orders.filter(o => ['Annulé', 'Rejeté'].includes(o.status)).length;
}

function checkTimeStatus(dateStr, timeStr) {
    if(!dateStr) return 'future';
    const now = new Date();
    const target = new Date(dateStr + (timeStr ? 'T'+timeStr : 'T23:59'));
    const diffMinutes = (target - now) / 1000 / 60;
    
    if (diffMinutes < 0) return 'past'; 
    if (diffMinutes < 120) return 'imminent'; 
    return 'future';
}

function sortOrdersByAlert(dataList) {
    dataList.sort((a, b) => {
        const statusA = (['Programmé','À relancer'].includes(a.status) && a.reminderDate) ? checkTimeStatus(a.reminderDate, a.reminderTime) : 'future';
        const statusB = (['Programmé','À relancer'].includes(b.status) && b.reminderDate) ? checkTimeStatus(b.reminderDate, b.reminderTime) : 'future';
        const score = { 'past': 3, 'imminent': 2, 'future': 1 };
        
        if (score[statusA] !== score[statusB]) return score[statusB] - score[statusA];
        return new Date(b.date) - new Date(a.date);
    });
}

function formatPhoneNumber(phone) {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 9) {
        return clean.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
}

function formatMoney(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function updateOrderPagination(start, end, total) {
    document.getElementById('paginationInfoStart').textContent = total > 0 ? start : 0;
    document.getElementById('paginationInfoEnd').textContent = end;
    document.getElementById('paginationInfoTotal').textContent = total;
    
    const controls = document.getElementById('paginationControls');
    if(!controls) return;
    
    const totalPages = Math.ceil(total / itemsPerPage);
    let html = '';

    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    html += `<li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" onclick="window.changeOrderPage(${currentPage-1});return false;">
                    <i class="fas fa-chevron-left"></i>
                </a>
             </li>`;

    if (totalPages > 0) {
        for(let i=1; i<=totalPages; i++) {
            const active = i === currentPage ? 'active' : '';
            html += `<li class="page-item ${active}">
                        <a class="page-link" href="#" onclick="window.changeOrderPage(${i});return false;">${i}</a>
                     </li>`;
        }
    } else {
         html += `<li class="page-item active"><a class="page-link" href="#">1</a></li>`;
    }

    const nextDisabled = (currentPage === totalPages || totalPages === 0) ? 'disabled' : '';
    html += `<li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" onclick="window.changeOrderPage(${currentPage+1});return false;">
                    <i class="fas fa-chevron-right"></i>
                </a>
             </li>`;
             
    controls.innerHTML = html;
}
window.changeOrderPage = function(p) { 
    if(p>=1) { 
        currentPage=p; 
        renderOrdersTable(currentFilteredOrders); 
    } 
};