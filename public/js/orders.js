// js/orders.js
// Version MISE À JOUR - Correction Modales, Tri par Lieu Intelligent, Désactivation Statuts Non Assignés

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = '/api';
    // --- Références DOM ---
    const ordersTableBody = document.getElementById('ordersTableBody');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const bulkActionsDropdown = document.getElementById('bulkActionsDropdown');
    const addOrderModal = new bootstrap.Modal(document.getElementById('addOrderModal'));
    const addShopModal = new bootstrap.Modal(document.getElementById('addShopModal'));
    const editOrderModal = new bootstrap.Modal(document.getElementById('editOrderModal'));
    const statusActionModal = new bootstrap.Modal(document.getElementById('statusActionModal'));
    const assignDeliveryModal = new bootstrap.Modal(document.getElementById('assignDeliveryModal'));
    const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));

    // Pagination DOM
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const paginationInfo = document.getElementById('paginationInfo');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');

    const bulkStatusActionModal = new bootstrap.Modal(document.getElementById('bulkStatusActionModal'));
    const bulkFailedDeliveryModal = new bootstrap.Modal(document.getElementById('bulkFailedDeliveryModal'));

    const addOrderForm = document.getElementById('addOrderForm');
    const addShopForm = document.getElementById('addShopForm');
    const editOrderForm = document.getElementById('editOrderForm');
    const failedDeliveryForm = document.getElementById('failedDeliveryForm');
    const deliveredPaymentForm = document.getElementById('deliveredPaymentForm');
    const assignDeliveryForm = document.getElementById('assignDeliveryForm');
    const deliverymanSearchInput = document.getElementById('deliverymanSearchInput');
    const deliverymanSearchResultsContainer = document.getElementById('deliverymanSearchResults');
    const assignDeliverymanIdInput = document.getElementById('assignDeliverymanId');
    const filterBtn = document.getElementById('filterBtn');
    const searchInput = document.getElementById('searchInput');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');

    const statusFilterBtn = document.getElementById('statusFilterBtn');
    const statusFilterMenu = document.getElementById('statusFilterMenu');

    // --- NOUVELLE RÉFÉRENCE DOM POUR TRI PAR LIEU ---
    const sortByLocationBtn = document.getElementById('sortByLocationBtn');

    let selectedStatusFilter = '';

    const bulkDeliveredPaymentForm = document.getElementById('bulkDeliveredPaymentForm');
    const bulkFailedDeliveryForm = document.getElementById('bulkFailedDeliveryForm');

    const addShopSearchInput = document.getElementById('shopSearchInput');
    const addSearchResultsContainer = document.getElementById('searchResults');
    const addSelectedShopIdInput = document.getElementById('selectedShopId');
    const itemsContainer = document.getElementById('itemsContainer');
    const addItemBtn = document.getElementById('addItemBtn');

    const editShopSearchInput = document.getElementById('editShopSearchInput');
    const editSearchResultsContainer = document.getElementById('editSearchResults');
    const editSelectedShopIdInput = document.getElementById('editSelectedShopId');
    const editItemsContainer = document.getElementById('editItemsContainer');
    const editAddItemBtn = document.getElementById('editAddItemBtn');
    const editOrderIdInput = document.getElementById('editOrderId');
    const editDeliverymanIdInput = document.getElementById('editDeliverymanId');
    const editCreatedAtInput = document.getElementById('editCreatedAt');

    const isExpeditionCheckbox = document.getElementById('isExpedition');
    const expeditionFeeContainer = document.getElementById('expeditionFeeContainer');
    const expeditionFeeInput = document.getElementById('expeditionFee');
    const editIsExpeditionCheckbox = document.getElementById('editIsExpedition');
    const editExpeditionFeeContainer = document.getElementById('editExpeditionFeeContainer');
    const editExpeditionFeeInput = document.getElementById('editExpeditionFee');

    // --- MISE À JOUR : Référence vers le span principal et le span du nombre ---
    const selectedOrdersIndicator = document.getElementById('selectedOrdersIds'); // Le span principal pour l'infobulle
    const selectedOrdersCountSpan = selectedOrdersIndicator?.querySelector('.selected-count-number'); // Le span interne pour le nombre
    const selectedOrdersIdsModalInfoSpan = document.getElementById('selectedOrdersIdsModalInfo'); // Span dans la modale d'assignation


    let allOrders = []; // Stocke toutes les commandes après l'appel API initial (avant filtre frontend)
    let filteredOrders = []; // Stocke les commandes après l'application de TOUS les filtres (API + frontend search)
    let shopsCache = [];
    let deliverymenCache = [];
    let currentOrdersToAssign = []; // Utilisé spécifiquement pour la modale d'assignation
    let selectedOrderIds = new Set(); // *** Set pour stocker les IDs des commandes sélectionnées ***

    // --- NOUVEL ÉTAT POUR LE TRI PAR LIEU ---
    let isSortedByLocation = false;

    // Pagination State
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect.value);

    // --- MISE À JOUR : AJOUT DES NOUVEAUX STATUS & PAIEMENTS ---
    const statusTranslations = {
        'pending': 'En attente',
        'in_progress': 'Assignée',
        'ready_for_pickup': 'Prête', // NOUVEAU
        'en_route': 'En route', // NOUVEAU
        'delivered': 'Livrée',
        'cancelled': 'Annulée',
        'failed_delivery': 'Livraison ratée',
        'reported': 'À relancer',
        'return_declared': 'Retour déclaré', // NOUVEAU
        'returned': 'Retournée' // NOUVEAU
    };
    const paymentTranslations = {
        'pending': 'En attente',
        'cash': 'En espèces',
        'paid_to_supplier': 'Mobile Money',
        'cancelled': 'Annulé'
    };
    const statusColors = {
        'pending': 'status-pending',
        'in_progress': 'status-in_progress',
        'ready_for_pickup': 'status-ready_for_pickup',
        'en_route': 'status-en_route',
        'delivered': 'status-delivered',
        'cancelled': 'status-cancelled',
        'failed_delivery': 'status-failed_delivery',
        'reported': 'status-reported',
        'return_declared': 'status-failed_delivery', // Utiliser la couleur échec
        'returned': 'status-failed_delivery' // Utiliser la couleur échec
    };
    const paymentColors = {
        'pending': 'payment-pending',
        'cash': 'payment-cash',
        'paid_to_supplier': 'payment-supplier_paid',
        'cancelled': 'payment-cancelled'
    };

    const truncateText = (text, maxLength) => {
        if (!text) return 'N/A';
        const str = String(text);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    };

    // Fonction pour obtenir l'en-tête d'authentification
    const getAuthHeader = () => {
        if (typeof AuthManager === 'undefined' || !AuthManager.getToken) {
            console.error("AuthManager non défini ou .getToken() manquant.");
            return null;
        }
        const token = AuthManager.getToken();
        if (!token) {
            console.error("Token non trouvé pour l'en-tête.");
            return null;
        }
        return { 'Authorization': `Bearer ${token}` };
    };

    // --- DÉBUT LOGIQUE TRI PAR LIEU INTELLIGENT ---

    const LOCATION_KEYWORDS = [
        'bastos', 'etoudi', 'ngousso', 'mvan', 'messa', 'centre ville', 'nkomo',
        'mimboman', 'obia', 'elig', 'jouvence', 'odza', 'emana', 'nkouloulou',
        'mokolo', 'simbock', 'ekounou', 'mfandena'
    ];

    /**
     * Calcule la distance de Levenshtein entre deux chaînes.
     */
    const levenshteinDistance = (s1, s2) => {
        if (s1 === s2) return 0;
        const len1 = s1.length;
        const len2 = s2.length;
        if (len1 === 0) return len2;
        if (len2 === 0) return len1;

        const matrix = [];

        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = (s1[i - 1] === s2[j - 1]) ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,       // Suppression
                    matrix[i][j - 1] + 1,       // Insertion
                    matrix[i - 1][j - 1] + cost // Substitution
                );
            }
        }

        return matrix[len1][len2];
    };

    /**
     * Extrait le mot-clé de localisation, corrigeant les fautes d'orthographe si possible.
     */
    const extractLocationKeyword = (locationString) => {
        if (!locationString) return null;

        let normalized = String(locationString).toLowerCase().trim();
        normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
        normalized = normalized.replace(/\s+/g, ' ').trim();

        const stopWords = ['rue', 'devant', 'derriere', 'face', 'non loin', 'carrefour', 'entree', 'cote', 'apres', 'avant', 'vers', 'yde', 'yaounde', 'bp', 'cedex', 'cite', 'montée', 'descente', 'pres'];
        const words = normalized.split(' ').filter(word => word.length > 2 && !stopWords.includes(word));

        for (const word of words) {
            for (const keyword of LOCATION_KEYWORDS) {
                // 1. Correspondance exacte ou partielle simple
                if (word.includes(keyword) || keyword.includes(word)) {
                    return keyword.charAt(0).toUpperCase() + keyword.slice(1);
                }

                // 2. Correspondance "intelligente" (distance de Levenshtein < 2)
                const distance = levenshteinDistance(word, keyword);
                if (distance <= 1 && word.length >= 4) {
                     return keyword.charAt(0).toUpperCase() + keyword.slice(1) + '*'; // Ajout d'un * pour la correction
                }
            }
        }

        return null;
    };

    // Fonction utilitaire pour obtenir la clé de tri (ne trie que les statuts non démarrés)
    const getOrderLocationKey = (order) => {
        const unprocessedStatuses = ['pending', 'in_progress', 'ready_for_pickup'];
        if (!unprocessedStatuses.includes(order.status)) return null;
        return extractLocationKeyword(order.delivery_location);
    };

    // --- FIN LOGIQUE TRI PAR LIEU INTELLIGENT ---


    const fetchShops = async () => {
        try {
            const headers = getAuthHeader();
             if (!headers) { throw new Error("Authentification requise pour charger les marchands."); }
            const res = await axios.get(`${API_BASE_URL}/shops?status=actif`, { headers });
            shopsCache = res.data;
        } catch (error) {
            console.error("Erreur détaillée lors du chargement des marchands:", error);
             showNotification("Erreur chargement marchands.", "danger");
             if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
        }
    };

    const fetchDeliverymen = async () => {
        try {
            const headers = getAuthHeader();
            if (!headers) { throw new Error("Authentification requise pour charger les livreurs."); }

            const res = await axios.get(`${API_BASE_URL}/deliverymen`, { headers });
            deliverymenCache = res.data;
        } catch (error) {
            console.error("Erreur détaillée lors du chargement des livreurs:", error);
            showNotification("Erreur chargement livreurs.", "danger");
            if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
        }
    };

    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(alert);
        setTimeout(() => {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) {
                bsAlert.close();
            } else {
                alert.remove();
            }
        }, 5000);
    };


    const showLoading = (element) => {
        if (!element) return;
        element.innerHTML = '<tr><td colspan="12" class="text-center p-4"><div class="spinner-border text-corail" role="status"><span class="visually-hidden">Chargement...</span></div></td></tr>';
    };

    const fetchAllDataOnce = async () => {
        showLoading(ordersTableBody);
        await applyFiltersAndRenderTable();
    };


    const normalizeString = (str) => {
        if (!str) return '';
        return String(str).toLowerCase().trim().replace(/\s+/g, ' ');
    };

    const applyFiltersAndRenderTable = async () => {
        const searchTextRaw = searchInput.value;
        const startDate = startDateFilter.value;
        const endDate = endDateFilter.value;
        const status = selectedStatusFilter;

        showLoading(ordersTableBody);

        try {
            const headers = getAuthHeader();
            if (!headers) {
                 showNotification("Erreur d'authentification.", "danger");
                 ordersTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-danger p-4">Erreur d'authentification. Veuillez vous reconnecter.</td></tr>`;
                 updatePaginationInfo(0);
                 return;
            }
            const apiParams = {};
            if (startDate) apiParams.startDate = startDate;
            if (endDate) apiParams.endDate = endDate;
            if (status) apiParams.status = status;

            const ordersRes = await axios.get(`${API_BASE_URL}/orders`, { params: apiParams, headers });
            allOrders = ordersRes.data;

            const searchTextNormalized = normalizeString(searchTextRaw);
            let ordersToSort = allOrders.filter(order => {
                 return (
                     !searchTextNormalized || // Si pas de texte, inclure tout
                     normalizeString(order.customer_name).includes(searchTextNormalized) ||
                     normalizeString(order.customer_phone).includes(searchTextNormalized) ||
                     normalizeString(order.delivery_location).includes(searchTextNormalized) ||
                     normalizeString(order.shop_name).includes(searchTextNormalized) ||
                     normalizeString(order.deliveryman_name).includes(searchTextNormalized) ||
                     (order.items && order.items.some(item => normalizeString(item.item_name).includes(searchTextNormalized))) ||
                      String(order.id).includes(searchTextNormalized)
                 );
            });

            // --- NOUVEAU: Application du Tri par Lieu ---
            if (isSortedByLocation) {
                ordersToSort = ordersToSort.sort((a, b) => {
                    const statusA = a.status;
                    const statusB = b.status;

                    // Statuts à trier par lieu (pending, in_progress, ready_for_pickup)
                    const isUnprocessedA = ['pending', 'in_progress', 'ready_for_pickup'].includes(statusA);
                    const isUnprocessedB = ['pending', 'in_progress', 'ready_for_pickup'].includes(statusB);

                    if (isUnprocessedA && !isUnprocessedB) return -1;
                    if (!isUnprocessedA && isUnprocessedB) return 1;

                    if (isUnprocessedA && isUnprocessedB) {
                         const keyA = getOrderLocationKey(a);
                         const keyB = getOrderLocationKey(b);

                         if (keyA === keyB) {
                              // Tri secondaire : par date de création (plus ancienne en premier)
                              return moment(a.created_at).diff(moment(b.created_at));
                         }
                         if (keyA === null) return 1; // Null à la fin du groupe
                         if (keyB === null) return -1; // Null à la fin du groupe

                         return keyA.localeCompare(keyB); // Tri par nom de lieu
                    }

                    // Pour les autres statuts, tri chronologique inverse (récent en premier)
                    return moment(b.created_at).diff(moment(a.created_at));
                });
            } else {
                 // Tri par défaut : du plus récent au plus ancien (utilisé quand le tri par lieu est désactivé)
                 ordersToSort.sort((a, b) => moment(b.created_at).diff(moment(a.created_at)));
            }

            filteredOrders = ordersToSort;
            // --- FIN NOUVEAU: Application du Tri par Lieu ---

            currentPage = 1;
            renderPaginatedTable();
        } catch (error) {
            console.error("Erreur détaillée lors de l'application des filtres:", error);
            ordersTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-danger p-4">Erreur lors du filtrage des données.</td></tr>`;
            updatePaginationInfo(0);
            if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
        }
    };


    const updatePaginationInfo = (totalItems) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

        if (currentPage > totalPages) currentPage = totalPages;

        currentPageDisplay.textContent = currentPage;
        paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} (${totalItems} commande(s))`;

        firstPageBtn.classList.toggle('disabled', currentPage === 1 || totalPages === 0);
        prevPageBtn.classList.toggle('disabled', currentPage === 1 || totalPages === 0);
        nextPageBtn.classList.toggle('disabled', currentPage >= totalPages || totalPages === 0);
        lastPageBtn.classList.toggle('disabled', currentPage >= totalPages || totalPages === 0);

        updateSelectAllCheckboxState();
    };

    const handlePageChange = (newPage) => {
        const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
         if (totalPages === 0) {
             newPage = 1;
         } else if (newPage < 1) {
            newPage = 1;
        } else if (newPage > totalPages) {
            newPage = totalPages;
        }

        currentPage = newPage;
        renderPaginatedTable();
    };

    const renderPaginatedTable = () => {
        ordersTableBody.innerHTML = '';
        if (!filteredOrders || filteredOrders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="12" class="text-center p-3">Aucune commande trouvée pour les filtres actuels.</td></tr>`;
            updatePaginationInfo(0);
            return;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const ordersToRender = filteredOrders.slice(startIndex, endIndex);

        let currentLocationGroupKeyword = null; // NOUVEAU: Pour le regroupement par lieu
        const allPending = filteredOrders.filter(o => ['pending', 'in_progress', 'ready_for_pickup'].includes(o.status));
        const groups = {}; // { keyword: count }

        if (isSortedByLocation) {
             allPending.forEach(order => {
                 const key = getOrderLocationKey(order) || 'Autres';
                 groups[key] = (groups[key] || 0) + 1;
             });
        }


        ordersToRender.forEach(order => {
            const row = document.createElement('tr');
            const totalArticleAmount = parseFloat(order.article_amount || 0);
            const deliveryFee = parseFloat(order.delivery_fee || 0);
            const expeditionFee = parseFloat(order.expedition_fee || 0);
            const deliverymanName = order.deliveryman_name || 'Non assigné';
            const shopName = order.shop_name || 'N/A';

            let payoutAmount = 0;
            if (order.status === 'delivered') {
                if (order.payment_status === 'cash') {
                    payoutAmount = totalArticleAmount - deliveryFee - expeditionFee;
                } else if (order.payment_status === 'paid_to_supplier') {
                    payoutAmount = -deliveryFee - expeditionFee;
                }
            } else if (order.status === 'failed_delivery') {
                const amountReceived = parseFloat(order.amount_received || 0);
                payoutAmount = amountReceived - deliveryFee - expeditionFee;
            }

            const displayStatus = statusTranslations[order.status] || 'Non spécifié';
            const displayPaymentStatus = paymentTranslations[order.payment_status] || 'Non spécifié';
            const statusClass = statusColors[order.status] || 'bg-secondary text-white'; // Classe CSS pour la couleur du point
            const paymentClass = paymentColors[order.payment_status] || 'bg-secondary text-white'; // Classe CSS pour la couleur du point

            const itemTooltip = order.items && order.items.length > 0
                ? order.items.map(item => `Article: ${item.quantity} x ${item.item_name}<br>Montant: ${item.amount.toLocaleString('fr-FR')} FCFA`).join('<br>')
                : 'N/A';

            const isChecked = selectedOrderIds.has(String(order.id));

            // --- CORRECTION CLÉ: Logique de désactivation des actions de STATUT ---
            const isAssigned = !!order.deliveryman_id;
            const isFinalStatus = ['delivered', 'cancelled', 'failed_delivery', 'returned'].includes(order.status);
            const isPendingPreparation = ['pending', 'in_progress', 'ready_for_pickup', 'return_declared'].includes(order.status);
            // Statuer n'est possible que si la commande est assignée, et qu'elle est EN_ROUTE ou REPORTED
            const canChangeStatus = isAssigned && ['en_route', 'reported'].includes(order.status);
            const disableStatusBtn = !canChangeStatus; // Désactiver si non assigné OU si en préparation/pending/final

            // --- MISE À JOUR: Affichage intelligent du tri par lieu (Exposant Orange) ---
            let locationDisplay = truncateText(order.delivery_location, 25);
            let exponentHtml = '';
            let locationKeyword = getOrderLocationKey(order);

            if (isSortedByLocation && locationKeyword) {
                const orderKey = locationKeyword.replace('*', ''); // Nettoyer le * pour le rendu principal

                if (orderKey !== currentLocationGroupKeyword) {
                    currentLocationGroupKeyword = orderKey;
                    const totalInGroup = groups[locationKeyword] || groups[orderKey];
                    // Générer le format superscript orange (exposant)
                    exponentHtml = `<sup class="text-primary fw-bold ms-1" style="font-size: 0.7em;">(${totalInGroup})</sup>`;
                }
                // Afficher le mot-clé + l'exposant
                 locationDisplay = `${locationKeyword}${exponentHtml}`;
            } else {
                 currentLocationGroupKeyword = null; // Réinitialiser pour les statuts non triés
            }
            // --- FIN MISE À JOUR: Affichage intelligent du tri par lieu ---


            row.innerHTML = `
                <td><input type="checkbox" class="order-checkbox" data-order-id="${order.id}" ${isChecked ? 'checked' : ''}></td>
                <td>${truncateText(shopName, 25)}</td>
                <td><span data-bs-toggle="tooltip" data-bs-html="true" title="Client: ${order.customer_name || 'N/A'}">${truncateText(order.customer_phone, 25)}</span></td>
                <td>${locationDisplay}</td>
                <td><span data-bs-toggle="tooltip" data-bs-html="true" title="${itemTooltip}">${truncateText(order.items && order.items.length > 0 ? order.items[0].item_name : 'N/A', 25)}</span></td>
                <td class="text-end">${totalArticleAmount.toLocaleString('fr-FR')} FCFA</td>
                <td class="text-end">${deliveryFee.toLocaleString('fr-FR')} FCFA</td>
                <td class="text-end">${payoutAmount.toLocaleString('fr-FR')} FCFA</td>
                <td><div class="payment-container"><span class="indicator-dot ${paymentClass}"></span>${displayPaymentStatus}</div></td>
                <td><div class="status-container"><span class="indicator-dot ${statusClass}"></span>${displayStatus}</div></td>
                <td>${truncateText(deliverymanName, 25)}</td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-gear"></i></button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item details-btn" href="#" data-order-id="${order.id}"><i class="bi bi-eye"></i> Afficher les détails</a></li>
                            <li><a class="dropdown-item edit-btn" href="#" data-order-id="${order.id}" ${order.picked_up_by_rider_at ? 'disabled' : ''} title="${order.picked_up_by_rider_at ? 'Colis déjà récupéré' : 'Modifier'}"><i class="bi bi-pencil"></i> Modifier</a></li>
                            <li><a class="dropdown-item assign-btn" href="#" data-order-id="${order.id}"><i class="bi bi-person"></i> Assigner</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item status-delivered-btn ${disableStatusBtn ? 'disabled text-muted' : ''}" href="#" data-order-id="${order.id}"><i class="bi bi-check-circle"></i> Livrée</a></li>
                            <li><a class="dropdown-item status-failed-btn ${disableStatusBtn ? 'disabled text-muted' : ''}" href="#" data-order-id="${order.id}"><i class="bi bi-x-circle"></i> Livraison ratée</a></li>
                            <li><a class="dropdown-item status-reported-btn ${disableStatusBtn ? 'disabled text-muted' : ''}" href="#" data-order-id="${order.id}"><i class="bi bi-clock"></i> À relancer</a></li>
                            <li><a class="dropdown-item status-cancelled-btn ${disableStatusBtn ? 'disabled text-muted' : ''}" href="#" data-order-id="${order.id}"><i class="bi bi-slash-circle"></i> Annulée</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item delete-btn text-danger" href="#" data-order-id="${order.id}"><i class="bi bi-trash"></i> Supprimer</a></li>
                        </ul>
                    </div>
                </td>
                `;
            ordersTableBody.appendChild(row);
        });

        // Réinitialiser les tooltips Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function(tooltipTriggerEl) {
             const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
             if (existingTooltip) {
                 existingTooltip.dispose();
             }
             new bootstrap.Tooltip(tooltipTriggerEl);
        });


        updatePaginationInfo(filteredOrders.length);
        updateSelectedIdsSpan(); // Mettre à jour l'affichage des IDs sélectionnés
    };

    const updateSelectAllCheckboxState = () => {
        if (!selectAllCheckbox) return;
        const visibleCheckboxes = ordersTableBody.querySelectorAll('.order-checkbox');
        const allVisibleSelected = visibleCheckboxes.length > 0 && Array.from(visibleCheckboxes).every(cb => selectedOrderIds.has(cb.dataset.orderId));
        const someVisibleSelected = Array.from(visibleCheckboxes).some(cb => selectedOrderIds.has(cb.dataset.orderId));

        selectAllCheckbox.checked = allVisibleSelected;
        selectAllCheckbox.indeterminate = !allVisibleSelected && someVisibleSelected;
    };

     // --- MISE À JOUR : updateSelectedIdsSpan formate sur 2 chiffres et met à jour l'infobulle ---
     const updateSelectedIdsSpan = () => {
         if (selectedOrdersIndicator && selectedOrdersCountSpan) {
             const count = selectedOrderIds.size;
             // Formatage sur 2 chiffres (ex: 01, 05, 10, 25)
             const formattedCount = String(count).padStart(2, '0');
             selectedOrdersCountSpan.textContent = formattedCount;

             // Mise à jour de l'infobulle (tooltip Bootstrap)
             const tooltipTitle = count === 0 ? "Aucune commande sélectionnée" : `${count} commande(s) sélectionnée(s)`;
             selectedOrdersIndicator.setAttribute('data-bs-original-title', tooltipTitle); // Mettre à jour l'attribut utilisé par Bootstrap
             selectedOrdersIndicator.setAttribute('title', tooltipTitle); // Fallback pour le title natif

             // Réinitialiser l'instance de tooltip pour qu'il prenne en compte le nouveau titre
              const tooltipInstance = bootstrap.Tooltip.getInstance(selectedOrdersIndicator);
              if (tooltipInstance) {
                   tooltipInstance.setContent({ '.tooltip-inner': tooltipTitle }); // Méthode pour MAJ le contenu
              } else if(count > 0) { // Initialiser si ce n'est pas déjà fait et qu'il y a une sélection
                   new bootstrap.Tooltip(selectedOrdersIndicator);
              }
         }
         // Mettre aussi à jour le span dans la modale d'assignation
         if (selectedOrdersIdsModalInfoSpan) {
             const idsArray = Array.from(selectedOrderIds);
             selectedOrdersIdsModalInfoSpan.textContent = idsArray.length > 0 ? (idsArray.length <= 10 ? idsArray.join(', ') : `${idsArray.length} sélectionnée(s)`) : 'Aucune';
         }
     };

    const resetAddOrderForm = () => {
        addOrderForm.reset();
        addSelectedShopIdInput.value = '';
        addShopSearchInput.value = '';
        itemsContainer.innerHTML = '';
        addItemRow(itemsContainer);
        isExpeditionCheckbox.checked = false;
        expeditionFeeContainer.style.display = 'none';
        if (expeditionFeeInput) expeditionFeeInput.value = 0;
        if (itemsContainer.children.length > 0) {
            itemsContainer.children[0].querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
        }
    };

    const addItemRow = (container, item = {}) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'row g-2 item-row mb-2';
        const index = container.children.length;
        const nameId = `itemName-${index}-${Date.now()}`;
        const quantityId = `itemQuantity-${index}-${Date.now()}`;
        const amountId = `itemAmount-${index}-${Date.now()}`;

        itemRow.innerHTML = `
            <div class="col-md-5">
                <label for="${nameId}" class="form-label mb-1">Nom article</label>
                <input type="text" class="form-control form-control-sm item-name-input" id="${nameId}" value="${item.item_name || ''}" placeholder="Ex: T-shirt" required>
            </div>
            <div class="col-md-3">
                <label for="${quantityId}" class="form-label mb-1">Qté</label>
                <input type="number" class="form-control form-control-sm item-quantity-input" id="${quantityId}" value="${item.quantity || 1}" min="1" required>
            </div>
            <div class="col-md-4">
                <label for="${amountId}" class="form-label mb-1">Montant</label>
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control item-amount-input" id="${amountId}" value="${item.amount || 0}" min="0" required>
                    <button class="btn btn-outline-danger remove-item-btn" type="button"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
        container.appendChild(itemRow);

        if (container.children.length > 1) {
            itemRow.querySelectorAll('label').forEach(label => label.classList.add('visually-hidden'));
        } else {
             itemRow.querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
        }
    };


    const handleRemoveItem = (container) => {
        container.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.remove-item-btn');
            if (removeButton && container.children.length > 1) {
                const rowToRemove = removeButton.closest('.item-row');
                if (rowToRemove) {
                    rowToRemove.remove();
                     if (container.children.length === 1) {
                          const firstRow = container.querySelector('.item-row');
                          if (firstRow) {
                              firstRow.querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
                          }
                     }
                }
            }
        });
    };


    if (isExpeditionCheckbox) {
        isExpeditionCheckbox.addEventListener('change', () => {
            expeditionFeeContainer.style.display = isExpeditionCheckbox.checked ? 'block' : 'none';
            if (!isExpeditionCheckbox.checked) expeditionFeeInput.value = 0;
        });
    }

    if (editIsExpeditionCheckbox) {
        editIsExpeditionCheckbox.addEventListener('change', () => {
            editExpeditionFeeContainer.style.display = editIsExpeditionCheckbox.checked ? 'block' : 'none';
            if (!editIsExpeditionCheckbox.checked) editExpeditionFeeInput.value = 0;
        });
    }

    addShopForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const shopData = {
            name: document.getElementById('newShopName').value,
            phone_number: document.getElementById('newShopPhone').value,
            bill_packaging: document.getElementById('newBillPackaging').checked,
            bill_storage: document.getElementById('newBillStorage').checked,
            packaging_price: parseFloat(document.getElementById('newPackagingPrice').value),
            storage_price: parseFloat(document.getElementById('newStoragePrice').value),
            created_by: AuthManager.getUserId()
        };
        const headers = getAuthHeader();
        if (!headers) return showNotification("Erreur d'authentification.", "danger");

        try {
            const response = await axios.post(`${API_BASE_URL}/shops`, shopData, { headers });
            showNotification('Marchand créé avec succès !');
            await fetchShops();
            const newShopId = response.data.shopId;
            const newShop = shopsCache.find(s => s.id === newShopId);
            if(newShop){
                addShopSearchInput.value = newShop.name;
                addSelectedShopIdInput.value = newShop.id;
            } else {
                 addShopSearchInput.value = shopData.name;
                 addSelectedShopIdInput.value = newShopId;
            }
            addShopModal.hide();
        } catch (error) {
            if (!navigator.onLine && window.syncManager) {
                const request = { url: `${API_BASE_URL}/shops`, method: 'POST', payload: shopData, token: AuthManager.getToken() };
                await window.syncManager.put(request);
                navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                showNotification("Action mise en file d'attente.", 'info');
                addShopModal.hide();
                addShopSearchInput.value = shopData.name;
                addSelectedShopIdInput.value = `temp-${Date.now()}`;
            } else {
                console.error("Erreur détaillée (création marchand):", error);
                showNotification(error.response?.data?.message || "Erreur lors de la création.", 'danger');
                 if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
            }
        }
    });


    addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const items = Array.from(itemsContainer.querySelectorAll('.item-row')).map(row => ({
            item_name: row.querySelector('.item-name-input').value,
            quantity: parseInt(row.querySelector('.item-quantity-input').value),
            amount: parseFloat(row.querySelector('.item-amount-input').value)
        }));

        if (items.length === 0 || !items[0].item_name) {
             showNotification('Veuillez ajouter au moins un article.', 'danger');
             return;
        }

        const totalArticleAmount = items.reduce((sum, item) => sum + item.amount, 0);

        const orderData = {
            shop_id: addSelectedShopIdInput.value,
            customer_name: document.getElementById('customerName').value,
            customer_phone: document.getElementById('customerPhone').value,
            delivery_location: document.getElementById('deliveryLocation').value,
            article_amount: totalArticleAmount,
            delivery_fee: document.getElementById('deliveryFee').value,
            expedition_fee: isExpeditionCheckbox.checked ? parseFloat(expeditionFeeInput.value || 0) : 0,
            created_by: AuthManager.getUserId(),
            items: items
        };

        if (!orderData.shop_id || !orderData.customer_phone || !orderData.delivery_location || !orderData.delivery_fee) {
            showNotification('Veuillez remplir tous les champs obligatoires (Marchand, Tél. Client, Lieu, Frais Liv.).', 'warning');
            return;
        }

        const headers = getAuthHeader();
        if (!headers) return showNotification("Erreur d'authentification.", "danger");


        try {
            await axios.post(`${API_BASE_URL}/orders`, orderData, { headers });
            showNotification('Commande créée avec succès !');
            addOrderModal.hide();
            await applyFiltersAndRenderTable();
            resetAddOrderForm();
        } catch (error) {
            if (!navigator.onLine && window.syncManager) {
                const request = { url: `${API_BASE_URL}/orders`, method: 'POST', payload: orderData, token: AuthManager.getToken() };
                await window.syncManager.put(request);
                navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                showNotification("Commande mise en file d'attente. Elle sera synchronisée plus tard.", 'info');
                addOrderModal.hide();
                resetAddOrderForm();
            } else {
                console.error("Erreur détaillée (ajout commande):", error);
                showNotification(error.response?.data?.message || 'Erreur lors de la création de la commande.', 'danger');
                 if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
            }
        }
    });

    editOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = editOrderIdInput.value;
        const items = Array.from(editItemsContainer.querySelectorAll('.item-row')).map(row => ({
            item_name: row.querySelector('.item-name-input').value,
            quantity: parseInt(row.querySelector('.item-quantity-input').value),
            amount: parseFloat(row.querySelector('.item-amount-input').value)
        }));

        const totalArticleAmount = items.reduce((sum, item) => sum + item.amount, 0);
        const expeditionFee = editIsExpeditionCheckbox.checked ? parseFloat(editExpeditionFeeInput.value || 0) : 0;

        const updatedData = {
            shop_id: editSelectedShopIdInput.value,
            customer_name: document.getElementById('editCustomerName').value || null,
            customer_phone: document.getElementById('editCustomerPhone').value,
            delivery_location: document.getElementById('editDeliveryLocation').value,
            article_amount: totalArticleAmount,
            delivery_fee: document.getElementById('editDeliveryFee').value,
            expedition_fee: expeditionFee,
            items: items,
            deliveryman_id: editDeliverymanIdInput.value || null,
            created_at: editCreatedAtInput.value,
            updated_by: AuthManager.getUserId()
        };

         if (!updatedData.shop_id || !updatedData.customer_phone || !updatedData.delivery_location || !updatedData.delivery_fee) {
            showNotification('Veuillez remplir tous les champs obligatoires (Marchand, Tél. Client, Lieu, Frais Liv.).', 'warning');
            return;
        }
        if (!updatedData.created_at) {
             showNotification('La date et heure de la commande est obligatoire.', 'warning');
             return;
        }

        const headers = getAuthHeader();
        if (!headers) return showNotification("Erreur d'authentification.", "danger");

        try {
            await axios.put(`${API_BASE_URL}/orders/${orderId}`, updatedData, { headers });
            showNotification('Commande modifiée avec succès !');
            editOrderModal.hide();
            await applyFiltersAndRenderTable();
        } catch (error) {
            if (!navigator.onLine && window.syncManager) {
                const request = { url: `${API_BASE_URL}/orders/${orderId}`, method: 'PUT', payload: updatedData, token: AuthManager.getToken() };
                await window.syncManager.put(request);
                navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                showNotification("Modification mise en file d'attente.", 'info');
                editOrderModal.hide();
            } else {
                console.error("Erreur détaillée (modif commande):", error);
                showNotification(error.response?.data?.message || 'Erreur lors de la modification de la commande.', 'danger');
                 if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
            }
        }
    });

    const updateOrderStatus = async (orderIdsInput, status, paymentStatus = null, amountReceived = 0) => {
        const orderIds = Array.isArray(orderIdsInput) ? orderIdsInput : [orderIdsInput];
        if (orderIds.length === 0) return showNotification("Aucune commande sélectionnée.", "warning");

        const userId = AuthManager.getUserId();
        const headers = getAuthHeader();
        if (!headers) return showNotification("Erreur d'authentification.", "danger");

        const promises = orderIds.map(id => {
            const payload = { status, payment_status: paymentStatus, amount_received: amountReceived, userId };
            const url = `${API_BASE_URL}/orders/${id}/status`;

            return axios.put(url, payload, { headers }).catch(async (error) => {
                if (!navigator.onLine && window.syncManager) {
                    const request = { url, method: 'PUT', payload, token: AuthManager.getToken() };
                    await window.syncManager.put(request);
                    return { status: 'queued', id };
                }
                 console.error(`Erreur MAJ statut commande ${id}:`, error.response?.data || error.message);
                return { status: 'failed', id, error: error.response?.data?.message || error.message };
            });
        });

        try {
            const results = await Promise.allSettled(promises);

            let successCount = 0;
            let queuedCount = 0;
            let failedCount = 0;
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    if (result.value?.status === 'queued') {
                        queuedCount++;
                    } else if (result.value?.status === 'failed') {
                         failedCount++;
                         console.error(`Échec MAJ statut pour ${result.value.id}: ${result.value.error}`);
                    } else {
                        successCount++;
                    }
                } else {
                    failedCount++;
                     console.error(`Erreur inattendue lors de la MAJ statut:`, result.reason);
                }
            });

            if (queuedCount > 0) {
                showNotification(`${queuedCount} action(s) ont été mise(s) en file d'attente.`, 'info');
                 if ('serviceWorker' in navigator && 'SyncManager' in window) {
                     navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests')).catch(err => console.error("Erreur enregistrement sync:", err));
                 }
            }
            if (successCount > 0) {
                showNotification(`${successCount} commande(s) mise(s) à jour avec succès.`);
            }
            if (failedCount > 0) {
                 showNotification(`${failedCount} mise(s) à jour ont échoué. Voir la console pour détails.`, 'danger');
            }

        } catch (error) {
            console.error("Erreur inattendue lors du traitement des mises à jour de statut:", error);
            showNotification('Une erreur globale est survenue lors de la mise à jour des statuts.', 'danger');
        } finally {
            await applyFiltersAndRenderTable();
        }
    };


    ordersTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('a, button');
        if (!target) return;

        const orderId = target.dataset.orderId;

         if (target.matches('.dropdown-item')) {
             e.preventDefault(); // <--- CORRECTION CLÉ: Empêcher l'action par défaut du lien <a>

             if (target.classList.contains('details-btn')) {
                 try {
                     const headers = getAuthHeader();
                     if (!headers) return showNotification("Erreur d'authentification.", "danger");
                     const res = await axios.get(`${API_BASE_URL}/orders/${orderId}`, { headers });
                     const order = res.data;
                     const shopName = order.shop_name || 'N/A';
                     const deliverymanName = order.deliveryman_name || 'Non assigné';
                     const preparedByName = order.prepared_by_name || 'N/A';
                     const preparedAt = order.prepared_at ? moment(order.prepared_at).format('DD/MM/YYYY HH:mm') : 'N/A';
                     const pickedUpAt = order.picked_up_by_rider_at ? moment(order.picked_up_by_rider_at).format('DD/MM/YYYY HH:mm') : 'N/A';
                     const startedAt = order.started_at ? moment(order.started_at).format('DD/MM/YYYY HH:mm') : 'N/A';


                     const itemsHtml = (order.items || []).map(item => `
                        <li>${item.item_name} (x${item.quantity}) - ${item.amount.toLocaleString('fr-FR')} FCFA</li>
                    `).join('');

                     const historyHtml = (order.history || []).map(hist => `
                        <div class="border-start border-3 ps-3 mb-2">
                            <small class="text-muted">${new Date(hist.created_at).toLocaleString()}</small>
                            <p class="mb-0">${hist.action}</p>
                            <small>Par: ${hist.user_name || 'N/A'}</small>
                        </div>
                    `).join('');

                     document.getElementById('orderDetailsContent').innerHTML = `
                        <h6>Détails de la commande #${order.id}</h6>
                        <ul class="list-unstyled">
                            <li><strong>Marchand:</strong> ${shopName}</li>
                            <li><strong>Client:</strong> ${order.customer_name || 'N/A'} (${order.customer_phone})</li>
                            <li><strong>Lieu de livraison:</strong> ${order.delivery_location}</li>
                            <li><strong>Montant article:</strong> ${parseFloat(order.article_amount || 0).toLocaleString('fr-FR')} FCFA</li>
                            <li><strong>Frais de livraison:</strong> ${parseFloat(order.delivery_fee || 0).toLocaleString('fr-FR')} FCFA</li>
                            ${order.expedition_fee > 0 ? `<li><strong>Frais d'expédition:</strong> ${parseFloat(order.expedition_fee).toLocaleString('fr-FR')} FCFA</li>` : ''}
                            <li><strong>Statut:</strong> <span class="badge ${statusColors[order.status] || 'bg-secondary'}">${statusTranslations[order.status] || 'Non spécifié'}</span></li>
                            <li><strong>Paiement:</strong> <span class="badge ${paymentColors[order.payment_status] || 'bg-secondary'}">${paymentTranslations[order.payment_status] || 'Non spécifié'}</span></li>
                            <li><strong>Livreur:</strong> ${deliverymanName}</li>
                            <li><strong>Date de création:</strong> ${new Date(order.created_at).toLocaleString()}</li>
                            ${order.amount_received > 0 && order.status === 'failed_delivery' ? `<li><strong>Montant reçu (Échec):</strong> ${parseFloat(order.amount_received).toLocaleString('fr-FR')} FCFA</li>` : ''}
                            <hr>
                            <li><strong>Préparé par:</strong> ${preparedByName}</li>
                            <li><strong>Prêt à:</strong> ${preparedAt}</li>
                            <li><strong>Récupéré par livreur à:</strong> ${pickedUpAt}</li>
                            <li><strong>Course démarrée à:</strong> ${startedAt}</li>
                        </ul>
                        <hr>
                        <h6>Articles commandés</h6>
                        <ul class="list-unstyled">
                            ${itemsHtml || '<li>Aucun article détaillé.</li>'}
                        </ul>
                        <hr>
                        <h6>Historique</h6>
                        ${historyHtml.length > 0 ? historyHtml : '<p>Aucun historique disponible.</p>'}
                    `;
                     orderDetailsModal.show(); // OUVRE LA MODALE
                 } catch (error) {
                     console.error("Erreur détaillée (détails commande):", error);
                     showNotification("Impossible de charger les données de la commande.", 'danger');
                      if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
                 }
             } else if (target.classList.contains('delete-btn')) {
                 if (confirm("Êtes-vous sûr de vouloir supprimer cette commande ?")) {
                    const url = `${API_BASE_URL}/orders/${orderId}`;
                    const headers = getAuthHeader();
                    if (!headers) return showNotification("Erreur d'authentification.", "danger");

                     try {
                         await axios.delete(url, { headers });
                         showNotification('Commande supprimée avec succès.');
                         selectedOrderIds.delete(orderId);
                         await applyFiltersAndRenderTable();
                     } catch (error) {
                         if (!navigator.onLine && window.syncManager) {
                             const request = { url, method: 'DELETE', payload: {}, token: AuthManager.getToken() };
                             await window.syncManager.put(request);
                             navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                             showNotification("Suppression mise en file d'attente.", 'info');
                             selectedOrderIds.delete(orderId);
                             await applyFiltersAndRenderTable();
                         } else {
                             console.error("Erreur détaillée (suppression):", error);
                             showNotification(error.response?.data?.message || 'Erreur lors de la suppression.', 'danger');
                              if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
                         }
                     }
                 }
             } else if (target.classList.contains('status-delivered-btn')) {
                 document.getElementById('statusActionModalLabel').textContent = `Paiement pour Commande #${orderId}`;
                 deliveredPaymentForm.classList.remove('d-none');
                 failedDeliveryForm.classList.add('d-none');
                 statusActionModal.show(); // OUVRE LA MODALE

                 document.getElementById('paymentCashBtn').onclick = () => {
                     updateOrderStatus(orderId, 'delivered', 'cash');
                     statusActionModal.hide();
                 };

                 document.getElementById('paymentSupplierBtn').onclick = () => {
                     updateOrderStatus(orderId, 'delivered', 'paid_to_supplier');
                     statusActionModal.hide();
                 };

             } else if (target.classList.contains('status-failed-btn')) {
                 document.getElementById('statusActionModalLabel').textContent = `Livraison ratée pour Commande #${orderId}`;
                 deliveredPaymentForm.classList.add('d-none');
                 failedDeliveryForm.classList.remove('d-none');
                 statusActionModal.show(); // OUVRE LA MODALE

                 document.getElementById('amountReceived').value = 0;
                 failedDeliveryForm.onsubmit = (ev) => {
                     ev.preventDefault();
                     const amountReceived = document.getElementById('amountReceived').value || 0;
                     updateOrderStatus(orderId, 'failed_delivery', null, amountReceived);
                     statusActionModal.hide();
                 };

             } else if (target.classList.contains('status-reported-btn')) {
                 updateOrderStatus(orderId, 'reported', 'pending');
             } else if (target.classList.contains('status-cancelled-btn')) {
                 if (confirm(`Confirmer l'annulation de la commande #${orderId} ?`)) {
                    updateOrderStatus(orderId, 'cancelled', 'cancelled');
                 }
             } else if (target.classList.contains('assign-btn')) {
                 currentOrdersToAssign = [orderId];
                 selectedOrdersIdsModalInfoSpan.textContent = `#${orderId}`;
                 assignDeliveryModal.show(); // OUVRE LA MODALE
                 deliverymanSearchInput.value = '';
                 assignDeliverymanIdInput.value = '';
                 deliverymanSearchResultsContainer.classList.add('d-none');
             } else if (target.classList.contains('edit-btn')) {
                 try {
                     const headers = getAuthHeader();
                     if (!headers) return showNotification("Erreur d'authentification.", "danger");
                     const res = await axios.get(`${API_BASE_URL}/orders/${orderId}`, { headers });
                     const order = res.data;
                     const shop = shopsCache.find(s => s.id === order.shop_id);

                     editOrderIdInput.value = order.id;
                     editShopSearchInput.value = shop?.name || '';
                     editSelectedShopIdInput.value = order.shop_id;
                     document.getElementById('editCustomerName').value = order.customer_name || '';
                     document.getElementById('editCustomerPhone').value = order.customer_phone;
                     document.getElementById('editDeliveryLocation').value = order.delivery_location;
                     document.getElementById('editDeliveryFee').value = order.delivery_fee;
                     editDeliverymanIdInput.value = order.deliveryman_id || '';

                     const expeditionFee = parseFloat(order.expedition_fee || 0);
                     editIsExpeditionCheckbox.checked = expeditionFee > 0;
                     editExpeditionFeeContainer.style.display = expeditionFee > 0 ? 'block' : 'none';
                     editExpeditionFeeInput.value = expeditionFee;

                     const formattedDate = order.created_at ? moment(order.created_at).format('YYYY-MM-DDTHH:mm') : '';
                     editCreatedAtInput.value = formattedDate;

                     editItemsContainer.innerHTML = '';
                     if (order.items && order.items.length > 0) {
                         order.items.forEach(item => addItemRow(editItemsContainer, item));
                     } else {
                         addItemRow(editItemsContainer);
                     }
                     editOrderModal.show(); // OUVRE LA MODALE
                 } catch (error) {
                     console.error("Erreur détaillée (chargement modif):", error);
                     showNotification(error.response?.data?.message || "Impossible de charger les données pour la modification.", 'danger');
                      if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
                 }
             }
         }
    });

    ordersTableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('order-checkbox')) {
            const orderId = e.target.dataset.orderId;
            if (e.target.checked) {
                selectedOrderIds.add(orderId);
            } else {
                selectedOrderIds.delete(orderId);
            }
            updateSelectAllCheckboxState();
            updateSelectedIdsSpan();
        }
    });

    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const visibleCheckboxes = ordersTableBody.querySelectorAll('.order-checkbox');

        visibleCheckboxes.forEach(cb => {
            const orderId = cb.dataset.orderId;
            cb.checked = isChecked;
            if (isChecked) {
                selectedOrderIds.add(orderId);
            } else {
                selectedOrderIds.delete(orderId);
            }
        });
        updateSelectedIdsSpan();
    });


    bulkActionsDropdown.addEventListener('click', async (e) => {
        const action = e.target.closest('.dropdown-item');
        if (!action) return;
        e.preventDefault();

        const idsToProcess = Array.from(selectedOrderIds);

        if (idsToProcess.length === 0) {
            showNotification("Veuillez sélectionner au moins une commande.", 'warning');
            return;
        }

        // Vérifier si les commandes sélectionnées sont éligibles au changement de statut en vrac
        const selectedOrdersEligibility = allOrders.filter(o => idsToProcess.includes(String(o.id))).every(order => {
             const isAssigned = !!order.deliveryman_id;
             const isFinalStatus = ['delivered', 'cancelled', 'failed_delivery', 'returned'].includes(order.status);
             const isPendingPreparation = ['pending', 'in_progress', 'ready_for_pickup', 'return_declared'].includes(order.status);
             // Vérifier si la commande est assignée et si elle est EN_ROUTE ou REPORTED (pour statut)
             return isAssigned && ['en_route', 'reported'].includes(order.status);
        });


        if (action.classList.contains('bulk-assign-btn')) {
            currentOrdersToAssign = idsToProcess;
            selectedOrdersIdsModalInfoSpan.textContent = `${idsToProcess.length} sélectionnée(s)`; // MAJ modale
            assignDeliveryModal.show();
            deliverymanSearchInput.value = '';
            assignDeliverymanIdInput.value = '';
            deliverymanSearchResultsContainer.classList.add('d-none');
        } else if (action.classList.contains('bulk-status-delivered-btn') || action.classList.contains('bulk-status-failed-btn') || action.classList.contains('bulk-status-reported-btn') || action.classList.contains('bulk-status-cancel-btn')) {
            if (!selectedOrdersEligibility && (action.classList.contains('bulk-status-delivered-btn') || action.classList.contains('bulk-status-failed-btn') || action.classList.contains('bulk-status-reported-btn'))) {
                return showNotification("Les actions de statut groupées (Livrée, Ratée, Relance) ne sont possibles que sur les commandes assignées et en cours de livraison/relance.", 'danger');
            }
            // L'annulation (cancel) est toujours possible si assignée

            if (action.classList.contains('bulk-status-delivered-btn')) {
                bulkStatusActionModal.show();
            } else if (action.classList.contains('bulk-status-failed-btn')) {
                 bulkFailedDeliveryModal.show();
            } else if (action.classList.contains('bulk-status-reported-btn')) {
                updateOrderStatus(idsToProcess, 'reported', 'pending');
            } else if (action.classList.contains('bulk-status-cancel-btn')) {
                if (confirm(`Voulez-vous vraiment annuler ${idsToProcess.length} commande(s) ?`)) {
                    updateOrderStatus(idsToProcess, 'cancelled', 'cancelled');
                }
            }
        } else if (action.classList.contains('bulk-delete-btn')) {
             if (confirm(`Voulez-vous vraiment supprimer ${idsToProcess.length} commande(s) ?`)) {
                 const headers = getAuthHeader();
                 if (!headers) return showNotification("Erreur d'authentification.", "danger");

                 const promises = idsToProcess.map(id => {
                     const url = `${API_BASE_URL}/orders/${id}`;
                     return axios.delete(url, { headers }).catch(async (error) => {
                         if (!navigator.onLine && window.syncManager) {
                             const request = { url, method: 'DELETE', payload: {}, token: AuthManager.getToken() };
                             await window.syncManager.put(request);
                             return { status: 'queued', id };
                         }
                         console.error(`Erreur suppression commande ${id}:`, error.response?.data || error.message);
                         return { status: 'failed', id: id, error: error.response?.data?.message || error.message };
                     });
                 });

                 try {
                     const results = await Promise.allSettled(promises);
                     let successCount = 0;
                     let queuedCount = 0;
                     let failedCount = 0;
                     results.forEach(result => {
                         if (result.status === 'fulfilled') {
                             if (result.value?.status === 'queued') {
                                 queuedCount++;
                             } else if (result.value?.status === 'failed') {
                                 failedCount++;
                             } else {
                                 successCount++;
                                 const deletedId = String(result.value?.id || result.value?.config?.url.split('/').pop());
                                 selectedOrderIds.delete(deletedId); // Retirer du set si succès
                             }
                         } else { failedCount++; }
                     });


                     if (queuedCount > 0) {
                         showNotification(`${queuedCount} suppression(s) mise(s) en file d'attente.`, 'info');
                         navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                     }
                     if (successCount > 0) {
                         showNotification(`${successCount} commande(s) supprimée(s).`);
                     }
                     if (failedCount > 0) {
                         showNotification(`${failedCount} suppression(s) ont échoué.`, 'danger');
                     }

                 } catch (err) {
                     showNotification("Une erreur globale est survenue lors de la suppression.", 'danger');
                 } finally {
                     await applyFiltersAndRenderTable();
                 }
             }
        }
    });

    document.getElementById('bulkPaymentCashBtn')?.addEventListener('click', () => {
        updateOrderStatus(Array.from(selectedOrderIds), 'delivered', 'cash');
        bulkStatusActionModal.hide();
    });
    document.getElementById('bulkPaymentSupplierBtn')?.addEventListener('click', () => {
        updateOrderStatus(Array.from(selectedOrderIds), 'delivered', 'paid_to_supplier');
        bulkStatusActionModal.hide();
    });
    bulkFailedDeliveryForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const amountReceived = document.getElementById('bulkAmountReceived').value || 0;
        updateOrderStatus(Array.from(selectedOrderIds), 'failed_delivery', null, amountReceived);
        bulkFailedDeliveryModal.hide();
        document.getElementById('bulkAmountReceived').value = 0;
    });

    assignDeliveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const deliverymanId = assignDeliverymanIdInput.value;
        if (!deliverymanId) return showNotification('Veuillez sélectionner un livreur.', 'warning');
        if (currentOrdersToAssign.length === 0) return showNotification('Aucune commande sélectionnée pour l\'assignation.', 'warning');

        const headers = getAuthHeader();
        if (!headers) return showNotification("Erreur d'authentification.", "danger");

        const promises = currentOrdersToAssign.map(orderId => {
            const url = `${API_BASE_URL}/orders/${orderId}/assign`;
            const payload = { deliverymanId, userId: AuthManager.getUserId() };
            return axios.put(url, payload, { headers }).catch(async (error) => {
                if (!navigator.onLine && window.syncManager) {
                    const request = { url, method: 'PUT', payload, token: AuthManager.getToken() };
                    await window.syncManager.put(request);
                    return { status: 'queued', id: orderId };
                }
                 console.error(`Erreur assignation commande ${orderId}:`, error.response?.data || error.message);
                return { status: 'failed', id: orderId, error: error.response?.data?.message || error.message };
            });
        });

        try {
            const results = await Promise.allSettled(promises);
            let successCount = 0;
            let queuedCount = 0;
            let failedCount = 0;
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                     if (result.value?.status === 'queued') queuedCount++;
                     else if (result.value?.status === 'failed') failedCount++;
                     else successCount++;
                } else { failedCount++; }
            });

             if (queuedCount > 0) {
                 showNotification(`${queuedCount} assignation(s) mise(s) en file d'attente.`, 'info');
                 navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
             }
             if (successCount > 0) {
                 showNotification(`${successCount} commande(s) assignée(s) avec succès.`);
             }
             if (failedCount > 0) {
                  showNotification(`${failedCount} assignation(s) ont échoué.`, 'danger');
             }

        } catch(err) {
             console.error("Erreur globale lors de l'assignation:", err);
            showNotification("Erreur globale lors de l'assignation.", 'danger');
        } finally {
            assignDeliveryModal.hide();
            currentOrdersToAssign = [];
            await applyFiltersAndRenderTable();
        }
    });

    const setupShopSearch = (searchInputId, resultsContainerId, selectedIdInputId) => {
        const input = document.getElementById(searchInputId);
        const resultsContainer = document.getElementById(resultsContainerId);
        const hiddenInput = document.getElementById(selectedIdInputId);

        if (!input || !resultsContainer || !hiddenInput) {
            console.error(`Éléments manquants pour setupShopSearch: ${searchInputId}`);
            return;
        }

        input.addEventListener('input', () => {
            const searchTerm = input.value.toLowerCase().trim();
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('d-none');

            if (searchTerm.length > 0) {
                const filteredShops = shopsCache.filter(shop =>
                    shop.name.toLowerCase().includes(searchTerm) ||
                    shop.phone_number.includes(searchTerm)
                );
                if (filteredShops.length > 0) {
                    filteredShops.slice(0, 10).forEach(shop => {
                        const div = document.createElement('div');
                        div.className = 'p-2 dropdown-item';
                        div.textContent = `${shop.name} (${shop.phone_number})`;
                        div.dataset.id = shop.id;
                        div.dataset.name = shop.name;
                        div.addEventListener('click', () => {
                            input.value = div.dataset.name;
                            hiddenInput.value = div.dataset.id;
                            resultsContainer.classList.add('d-none');
                        });
                        resultsContainer.appendChild(div);
                    });
                    resultsContainer.classList.remove('d-none');
                } else {
                    resultsContainer.innerHTML = '<div class="p-2 text-muted small">Aucun marchand trouvé.</div>';
                    resultsContainer.classList.remove('d-none');
                }
            }
        });

         document.addEventListener('click', (e) => {
            if (!resultsContainer.contains(e.target) && e.target !== input) {
                resultsContainer.classList.add('d-none');
            }
        });
    };

    const setupDeliverymanSearch = () => {
        if (!deliverymanSearchInput || !deliverymanSearchResultsContainer || !assignDeliverymanIdInput) return;

        deliverymanSearchInput.addEventListener('input', () => {
            const searchTerm = deliverymanSearchInput.value.toLowerCase().trim();
            deliverymanSearchResultsContainer.innerHTML = '';
             deliverymanSearchResultsContainer.classList.add('d-none');

            if (searchTerm.length > 0) {
                const filteredDeliverymen = deliverymenCache.filter(dm => dm.name.toLowerCase().includes(searchTerm));
                if (filteredDeliverymen.length > 0) {
                    filteredDeliverymen.slice(0, 10).forEach(dm => {
                        const div = document.createElement('div');
                        div.className = 'p-2 dropdown-item';
                        div.textContent = dm.name;
                        div.dataset.id = dm.id;
                        div.dataset.name = dm.name;
                        div.addEventListener('click', () => {
                            deliverymanSearchInput.value = div.dataset.name;
                            assignDeliverymanIdInput.value = div.dataset.id;
                            deliverymanSearchResultsContainer.classList.add('d-none');
                        });
                        deliverymanSearchResultsContainer.appendChild(div);
                    });
                    deliverymanSearchResultsContainer.classList.remove('d-none');
                } else {
                    deliverymanSearchResultsContainer.innerHTML = '<div class="p-2 text-muted small">Aucun livreur trouvé.</div>';
                     deliverymanSearchResultsContainer.classList.remove('d-none');
                }
            }
        });

         document.addEventListener('click', (e) => {
             if (!deliverymanSearchResultsContainer.contains(e.target) && e.target !== deliverymanSearchInput) {
                 deliverymanSearchResultsContainer.classList.add('d-none');
             }
         });
    };

    // --- INITIALISATION ---
    const initializeApp = async () => {
         if (typeof AuthManager === 'undefined' || !AuthManager.getToken || !AuthManager.getUser) {
             console.error("AuthManager n'est pas prêt.");
             showNotification("Erreur d'initialisation de l'authentification.", "danger");
             return;
         }
         const currentUser = AuthManager.getUser();
         if (!currentUser) {
             console.log("Utilisateur non authentifié, redirection...");
             return;
         }
         const userNameSpan = document.getElementById('userName');
         if (userNameSpan) userNameSpan.textContent = currentUser.name;


        const today = new Date().toISOString().slice(0, 10);
        startDateFilter.value = today;
        endDateFilter.value = today;

        searchInput.addEventListener('input', applyFiltersAndRenderTable);
        startDateFilter.addEventListener('change', applyFiltersAndRenderTable);
        endDateFilter.addEventListener('change', applyFiltersAndRenderTable);

        statusFilterMenu.addEventListener('click', (e) => {
            const option = e.target.closest('.status-filter-option');
            if (option) {
                e.preventDefault();
                selectedStatusFilter = option.dataset.status;
                statusFilterBtn.textContent = `Statut : ${option.textContent}`;
                applyFiltersAndRenderTable();
            }
        });

        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderPaginatedTable();
        });

        firstPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(1); });
        prevPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage - 1); });
        nextPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage + 1); });
        lastPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(Math.ceil(filteredOrders.length / itemsPerPage)); });

        // --- NOUVEAU LISTENER : Tri par Lieu ---
        if(sortByLocationBtn) {
            sortByLocationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isSortedByLocation = !isSortedByLocation; // Inverser l'état

                // Mettre à jour l'apparence du bouton
                sortByLocationBtn.classList.toggle('active', isSortedByLocation);
                sortByLocationBtn.classList.toggle('btn-outline-secondary', !isSortedByLocation);
                sortByLocationBtn.classList.toggle('btn-secondary', isSortedByLocation);

                sortByLocationBtn.title = isSortedByLocation ? 'Désactiver le tri par lieu' : 'Trier les commandes en attente par lieu';

                // Réappliquer les filtres et le tri
                applyFiltersAndRenderTable();
            });
        }


        try {
            await Promise.all([fetchShops(), fetchDeliverymen()]);
        } catch (error) {
             console.error("Échec du chargement des données initiales (marchands/livreurs).");
             return;
        }


        itemsPerPage = parseInt(itemsPerPageSelect.value);
        await fetchAllDataOnce();

        setupShopSearch('shopSearchInput', 'searchResults', 'selectedShopId');
        setupShopSearch('editShopSearchInput', 'editSearchResults', 'editSelectedShopId');
        setupDeliverymanSearch();
        addItemBtn.addEventListener('click', () => addItemRow(itemsContainer));
        editAddItemBtn.addEventListener('click', () => addItemRow(editItemsContainer));
        handleRemoveItem(itemsContainer);
        handleRemoveItem(editItemsContainer);
        filterBtn.addEventListener('click', applyFiltersAndRenderTable);

        // Initialiser les tooltips pour la première fois
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function(tooltipTriggerEl) {
             new bootstrap.Tooltip(tooltipTriggerEl);
        });


        const sidebarToggler = document.getElementById('sidebar-toggler');
        const mainContent = document.getElementById('main-content');
        const sidebar = document.getElementById('sidebar');

        if (sidebarToggler && sidebar && mainContent) {
            sidebarToggler.addEventListener('click', () => {
                if (window.innerWidth < 992) {
                     const sidebarOffcanvas = bootstrap.Offcanvas.getInstance(sidebar);
                     if (sidebarOffcanvas) sidebarOffcanvas.toggle();
                     else sidebar.classList.toggle('show');
                 } else {
                    sidebar.classList.toggle('collapsed');
                    mainContent.classList.toggle('expanded');
                 }
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if(logoutBtn && typeof AuthManager !== 'undefined' && AuthManager.logout){
            logoutBtn.addEventListener('click', (e) => {
                 e.preventDefault();
                 AuthManager.logout();
            });
        }
         const currentPath = window.location.pathname.split('/').pop() || 'orders.html';
         document.querySelectorAll('.sidebar .nav-link').forEach(link => {
             link.classList.remove('active');
             const dropdownItem = link.closest('.dropdown-menu')?.querySelector(`.dropdown-item[href="${currentPath}"]`);
             if (dropdownItem) {
                 dropdownItem.classList.add('active');
                 link.classList.add('active');
             } else if (link.getAttribute('href') === currentPath) {
                 link.classList.add('active');
             }
         });
    };

     if (typeof AuthManager !== 'undefined') {
         AuthManager.init();
         if (AuthManager.getUser()) {
            initializeApp();
         } else {
             console.log("AuthManager a initialisé, mais aucun utilisateur trouvé. Attente de redirection.");
         }
     } else {
         console.error("AuthManager n'est pas défini au moment de l'initialisation.");
     }

});