/**
 * WINK SHOP - Gestion des Commandes (Call Center)
 */

// Données locales simulées (Pour remplacer la BDD temporairement)
let ordersData = [];

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    
    // 1. Charger les données (Simulation)
    ordersData = getMockOrders();
    renderOrders(ordersData);
    updateStats(ordersData);

    // 2. Écouteurs pour les Filtres
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');

    [searchInput, statusFilter, dateFilter].forEach(el => {
        el.addEventListener('input', handleFilters);
    });

    // 3. Gestion de la Modale de Statut
    initModalLogic();
});

/**
 * Applique les filtres (Recherche + Statut + Date)
 */
function handleFilters() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const statusVal = document.getElementById('statusFilter').value;
    const dateVal = document.getElementById('dateFilter').value;

    const filtered = ordersData.filter(order => {
        // Filtre Recherche (Nom, Tel, Lieu, Article)
        const matchText = (
            order.client.toLowerCase().includes(searchText) ||
            order.phone.includes(searchText) ||
            order.location.toLowerCase().includes(searchText) ||
            order.product.toLowerCase().includes(searchText)
        );

        // Filtre Statut
        const matchStatus = statusVal === "" || order.status === statusVal;

        // Filtre Date (Si Programmé/Relance, on cherche la date de rappel, sinon date création)
        let matchDate = true;
        if (dateVal) {
            const targetDate = order.scheduledDate ? order.scheduledDate : order.date;
            matchDate = targetDate === dateVal;
        }

        return matchText && matchStatus && matchDate;
    });

    renderOrders(filtered);
    // Note: On ne met pas à jour les "Stats Cards" lors du filtrage pour garder les totaux globaux,
    // sauf si vous préférez voir les stats des résultats filtrés.
}

/**
 * Affiche le tableau HTML
 */
function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    const countSpan = document.getElementById('showingCount');
    tbody.innerHTML = '';
    countSpan.textContent = orders.length;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">Aucune commande trouvée</td></tr>`;
        return;
    }

    orders.forEach(order => {
        // Classe couleur badge
        const statusClass = getStatusClass(order.status);
        
        // Gestion Date / Commentaire pour affichage
        let infoSup = `<div class="small text-muted">${order.date}</div>`;
        if (['Programmé', 'À relancer'].includes(order.status) && order.scheduledDate) {
            infoSup = `<div class="small text-warning fw-bold"><i class="fas fa-clock"></i> ${order.scheduledDate} ${order.scheduledTime || ''}</div>`;
        }
        if (order.lastComment) {
            infoSup += `<div class="small text-muted fst-italic text-truncate" style="max-width: 150px;" title="${order.lastComment}">"${order.lastComment}"</div>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="fw-bold text-dark">${order.client}</div>
                <div class="small text-primary">${order.phone}</div>
            </td>
            <td>${order.location}</td>
            <td>${order.product}</td>
            <td class="text-center fw-bold">${order.qty}</td>
            <td>
                <span class="badge-status ${statusClass}" onclick="openStatusModal(${order.id})">
                    ${order.status} <i class="fas fa-pen ms-1" style="font-size:0.6rem; opacity:0.5"></i>
                </span>
            </td>
            <td>${infoSup}</td>
            <td class="text-end">
                <button class="btn-action d-inline-flex" title="Voir détails (Non implémenté)">
                    <i class="far fa-eye"></i>
                </button>
                <button class="btn-action d-inline-flex text-success" title="WhatsApp (Non implémenté)">
                    <i class="fab fa-whatsapp"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Logique de la Modale (Champs dynamiques)
 */
let currentEditingOrderId = null;

function openStatusModal(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if(!order) return;

    currentEditingOrderId = orderId;
    
    // Remplir les champs
    const select = document.getElementById('modalStatusSelect');
    const dateInput = document.getElementById('modalDateInput');
    const timeInput = document.getElementById('modalTimeInput');
    const commentInput = document.getElementById('modalComment');
    
    select.value = order.status;
    dateInput.value = order.scheduledDate || '';
    timeInput.value = order.scheduledTime || '';
    commentInput.value = ''; // On repart d'un commentaire vide pour la nouvelle note

    // Déclencher la vérification d'affichage des champs date
    select.dispatchEvent(new Event('change'));

    // Ouvrir la modale Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('statusModal'));
    modal.show();
}

function initModalLogic() {
    const select = document.getElementById('modalStatusSelect');
    const dateSection = document.getElementById('modalDateSection');
    const saveBtn = document.getElementById('modalSaveBtn');

    [cite_start]// Afficher/Masquer Date selon statut [cite: 6, 7]
    select.addEventListener('change', (e) => {
        const val = e.target.value;
        if (['Programmé', 'À relancer'].includes(val)) {
            dateSection.classList.remove('d-none');
        } else {
            dateSection.classList.add('d-none');
        }
    });

    // Sauvegarde
    saveBtn.addEventListener('click', () => {
        const newStatus = select.value;
        const comment = document.getElementById('modalComment').value;
        const date = document.getElementById('modalDateInput').value;
        const time = document.getElementById('modalTimeInput').value;

        // Validation simple : Commentaire requis si Annulé/Rejeté
        if (['Annulé', 'Rejeté'].includes(newStatus) && comment.trim() === '') {
            alert("Merci d'ajouter un commentaire pour expliquer le refus/annulation.");
            return;
        }

        // Validation Date si Programmé
        if (['Programmé', 'À relancer'].includes(newStatus) && !date) {
            alert("Veuillez définir une date de rappel.");
            return;
        }

        // Mise à jour des données (Simulation Backend)
        const orderIndex = ordersData.findIndex(o => o.id === currentEditingOrderId);
        if (orderIndex > -1) {
            ordersData[orderIndex].status = newStatus;
            if(comment) ordersData[orderIndex].lastComment = comment; // Historique simplifié
            
            if(['Programmé', 'À relancer'].includes(newStatus)) {
                ordersData[orderIndex].scheduledDate = date;
                ordersData[orderIndex].scheduledTime = time;
            } else {
                // Reset date si on passe à Livré par exemple
                ordersData[orderIndex].scheduledDate = null;
            }
        }

        // Fermer et Rafraîchir
        const modalEl = document.getElementById('statusModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();

        renderOrders(ordersData);
        updateStats(ordersData);
    });
}

/**
 * Met à jour les 4 cartes stats en haut
 */
function updateStats(orders) {
    const stats = {
        total: orders.length,
        confirmed: orders.filter(o => o.status === 'Confirmer').length,
        programmed: orders.filter(o => o.status === 'Programmé').length,
        delivered: orders.filter(o => o.status === 'Livré').length
    };

    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statConfirmed').textContent = stats.confirmed;
    document.getElementById('statProgrammed').textContent = stats.programmed;
    document.getElementById('statDelivered').textContent = stats.delivered;
}

/**
 * Helper CSS Classes
 */
function getStatusClass(status) {
    switch (status) {
        case 'Livré': return 'status-livré';
        case 'Programmé': return 'status-programmé';
        case 'Confirmer': return 'status-confirmer';
        case 'À relancer': return 'status-relance';
        case 'Annulé': 
        case 'Rejeté': return 'status-annulé';
        case 'En attente': return 'status-attente';
        default: return 'bg-light text-dark border';
    }
}

/**
 * Sidebar Toggle (Code partagé)
 */
function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    if(toggle) {
        toggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('toggled');
            document.getElementById('mainContent').classList.toggle('toggled');
        });
    }
}

/**
 * DONNÉES DE TEST
 */
function getMockOrders() {
    return [
        { id: 1, client: "Jean Dupont", phone: "699000001", location: "Douala, Akwa", product: "Montre Connectée", qty: 1, status: "Confirmer", date: "2023-11-20", lastComment: "" },
        { id: 2, client: "Marie Curie", phone: "655000002", location: "Yaoundé, Bastos", product: "Écouteurs Pro", qty: 2, status: "Programmé", date: "2023-11-19", scheduledDate: "2023-11-25", scheduledTime: "14:00", lastComment: "Livrer au bureau" },
        { id: 3, client: "Paul Biya", phone: "677000003", location: "Yaoundé, Etoudi", product: "Kit Nettoyage", qty: 1, status: "Livré", date: "2023-11-18", lastComment: "Client satisfait" },
        { id: 4, client: "Alice Wonder", phone: "690111222", location: "Kribi", product: "Caméra Wifi", qty: 1, status: "À relancer", date: "2023-11-20", scheduledDate: "2023-11-21", scheduledTime: "09:00", lastComment: "N'a pas décroché" },
        { id: 5, client: "Test Refus", phone: "600000000", location: "Bafoussam", product: "Montre", qty: 1, status: "Rejeté", date: "2023-11-15", lastComment: "Trop cher pour lui" },
    ];
}