// public/js/preparation.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '/api';
    let currentUser = null;
    let deliverymenCache = []; // Cache des livreurs pour le filtre de retour

    // --- Références DOM ---
    const userNameDisplay = document.getElementById('userName');

    // Onglet Préparation
    const preparationContainer = document.getElementById('preparation-container');
    const prepCountSpan = document.getElementById('prepCount');
    const refreshPrepBtn = document.getElementById('refreshPrepBtn');
    const hubNotificationBadge = document.getElementById('hubNotificationBadge');
    const hubNotificationList = document.getElementById('hubNotificationList');

    // Onglet Retours
    const returnsTableBody = document.getElementById('returnsTableBody');
    const returnCountSpan = document.getElementById('returnCount');
    const returnFiltersForm = document.getElementById('returnFiltersForm');
    const returnDeliverymanFilter = document.getElementById('returnDeliverymanFilter');
    const returnStartDateInput = document.getElementById('returnStartDate');
    const returnEndDateInput = document.getElementById('returnEndDate');
    const refreshReturnsBtn = document.getElementById('refreshReturnsBtn');

    // Modale Édition Articles
    const editItemsModalEl = document.getElementById('editItemsModal');
    const editItemsModal = editItemsModalEl ? new bootstrap.Modal(editItemsModalEl) : null;
    const editItemsForm = document.getElementById('editItemsForm');
    const editItemsOrderIdSpan = document.getElementById('editItemsOrderId');
    const editItemsOrderIdHidden = document.getElementById('editItems_OrderId_Hidden');
    const modalItemsContainer = document.getElementById('modalItemsContainer');
    const modalAddItemBtn = document.getElementById('modalAddItemBtn');
    const modalDeliveryFeeInput = document.getElementById('modalDeliveryFee');
    const modalExpeditionFeeInput = document.getElementById('modalExpeditionFee');
    const saveItemsAndMarkReadyBtn = document.getElementById('saveItemsAndMarkReadyBtn');
    const editAlert = editItemsModalEl ? editItemsModalEl.querySelector('.alert-warning') : null;


    // --- Constantes ---
    const statusReturnTranslations = {
        'pending_return_to_hub': 'En attente Hub',
        'received_at_hub': 'Confirmé Hub',
        'returned_to_shop': 'Retourné Marchand'
    };

    // --- Fonctions Utilitaires ---
    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const alertId = `notif-${Date.now()}`;
        const alert = document.createElement('div');
        alert.id = alertId;
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(alert);
        setTimeout(() => {
            const activeAlert = document.getElementById(alertId);
            if(activeAlert) { try { bootstrap.Alert.getOrCreateInstance(activeAlert)?.close(); } catch (e) { activeAlert.remove(); } }
        }, 5000);
    };

    const getAuthHeader = () => {
        if (typeof AuthManager === 'undefined' || !AuthManager.getToken) { return null; }
        const token = AuthManager.getToken();
        if (!token) { AuthManager.logout(); return null; }
        return { 'Authorization': `Bearer ${token}` };
    };

    const showLoadingState = (element, isLoading) => {
        if (!element) return;

        if (element.tagName === 'TBODY') {
            element.innerHTML = isLoading ? `<tr><td colspan="7" class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></td></tr>` : '';
        } else if (element.id === 'preparation-container') {
             if (isLoading) {
                 element.innerHTML = `<div id="loading-prep" class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement...</span></div></div>`;
             } else if (element.querySelector('#loading-prep')) {
                 element.innerHTML = ''; // Nettoyer le spinner après le chargement
             }
        }
    };

    // Charger les livreurs pour le filtre des retours
    const fetchDeliverymen = async () => {
        const headers = getAuthHeader();
        if (!headers) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/deliverymen?status=all`, { headers });
            deliverymenCache = res.data;
            renderDeliverymanFilterOptions();
        } catch (error) {
            console.error("Erreur chargement livreurs:", error);
        }
    };

    const renderDeliverymanFilterOptions = () => {
        if(!returnDeliverymanFilter) return;
        returnDeliverymanFilter.innerHTML = '<option value="">Tous les livreurs</option>';
        deliverymenCache.forEach(dm => {
            const option = document.createElement('option');
            option.value = dm.id;
            option.textContent = dm.name;
            returnDeliverymanFilter.appendChild(option);
        });
    };

    const formatAmount = (amount) => `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;

    // --- Fonctions PRINCIPALES ---

    // --- PRÉPARATION (Onglet 1) ---

    /**
     * Récupère les commandes en attente de préparation ou déjà prêtes.
     */
    const fetchOrdersToPrepare = async () => {
        showLoadingState(preparationContainer, true);

        const headers = getAuthHeader();
        if (!headers) { showNotification("Erreur d'authentification.", "danger"); showLoadingState(preparationContainer, false); return; }

        try {
            const response = await axios.get(`${API_BASE_URL}/orders/pending-preparation`, { headers });
            const orders = response.data || [];

            // FILTRE CRUCIAL : Supprimer les commandes qui ont déjà été récupérées (picked_up_by_rider_at est set)
            const ordersToRender = orders.filter(order => !order.picked_up_by_rider_at);

            renderOrders(ordersToRender);
            if(prepCountSpan) prepCountSpan.textContent = ordersToRender.length;
        } catch (error) {
            console.error("Erreur fetchOrdersToPrepare:", error);
            showNotification("Erreur lors du chargement des commandes à préparer.", "danger");
             if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
             showLoadingState(preparationContainer, false);
        }
    };

    /**
     * Affiche les commandes groupées par livreur avec le nouveau design.
     */
    const renderOrders = (orders) => {
        if (!preparationContainer) return;
        preparationContainer.innerHTML = ''; // Vider le conteneur

        const groupedByDeliveryman = orders.reduce((acc, order) => {
            const deliverymanId = order.deliveryman_id || 0;
            const deliverymanName = order.deliveryman_name || 'Non Assigné';
            if (!acc[deliverymanId]) {
                acc[deliverymanId] = { name: deliverymanName, orders: [] };
            }
            acc[deliverymanId].orders.push(order);
            return acc;
        }, {});

        const sortedGroupIds = Object.keys(groupedByDeliveryman).sort((a, b) => {
             if (a === '0') return -1;
             if (b === '0') return 1;
             return groupedByDeliveryman[a].name.localeCompare(groupedByDeliveryman[b].name);
        });

        if (sortedGroupIds.length === 0) {
             preparationContainer.innerHTML = '<div class="alert alert-secondary text-center">Aucune commande à préparer actuellement.</div>';
             return;
        }

        sortedGroupIds.forEach(deliverymanId => {
            const group = groupedByDeliveryman[deliverymanId];
            const groupDiv = document.createElement('div');
            groupDiv.className = 'deliveryman-group';

            const readyCount = group.orders.filter(o => o.status === 'ready_for_pickup').length;
            const inProgressCount = group.orders.filter(o => o.status === 'in_progress').length;

            const headerDiv = document.createElement('div');
            headerDiv.className = 'deliveryman-header';
            headerDiv.innerHTML = `<i class="bi bi-person-fill me-2"></i>${group.name}
                 <span class="badge text-bg-info ms-2">${readyCount} Prêt(s)</span>
                 <span class="badge text-bg-warning ms-2">${inProgressCount} En cours</span>`;
            groupDiv.appendChild(headerDiv);

            const gridDiv = document.createElement('div');
            gridDiv.className = 'orders-grid';

            group.orders.sort((a, b) => {
                 if (a.status === 'in_progress' && b.status === 'ready_for_pickup') return -1;
                 if (a.status === 'ready_for_pickup' && b.status === 'in_progress') return 1;
                 return moment(a.created_at).diff(moment(b.created_at));
            });

            group.orders.forEach(order => {
                const isReady = order.status === 'ready_for_pickup';
                const isPickedUp = !!order.picked_up_by_rider_at;

                // Ne pas afficher si déjà récupérée
                if (isPickedUp) return;

                const card = document.createElement('div');
                card.className = `order-card-prep ${isReady ? 'is-ready' : ''}`;
                card.dataset.orderId = order.id;
                card.dataset.orderData = JSON.stringify(order);

                // Calculer le total des articles pour l'affichage (non modifiable)
                const totalArticles = order.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

                const itemsListHtml = (order.items && order.items.length > 0)
                    ? `<ul class="items-list list-unstyled">${order.items.map(item => `<li>- ${item.quantity} x ${item.item_name || 'Article inconnu'}</li>`).join('')}</ul>`
                    : '<p class="text-muted small">Aucun article détaillé.</p>';

                const readyBadge = isReady
                    ? `<span class="badge text-bg-success"><i class="bi bi-check-lg"></i> PRÊT</span>`
                    : `<span class="badge text-bg-warning text-dark"><i class="bi bi-clock-history"></i> À FAIRE</span>`;

                // --- NOUVEAU: Bouton Crayon + Bouton Action Principal ---
                const editButtonHtml = `
                    <button class="btn btn-sm btn-edit-items" data-order-id="${order.id}" title="Modifier Nom/Quantité Article">
                        <i class="bi bi-pencil"></i>
                    </button>`;

                const actionButtonHtml = isReady
                    ? `<button class="btn btn-sm btn-ready-action confirm-ready-btn" data-order-id="${order.id}" disabled>
                           <i class="bi bi-check-circle-fill me-1"></i> Préparation Confirmée
                       </button>`
                    : `<button class="btn btn-sm btn-primary-custom btn-ready-action mark-ready-btn" data-order-id="${order.id}">
                           <i class="bi bi-check-lg me-1"></i> Marquer comme Prête
                       </button>`;
                // --- FIN NOUVEAU ---

                card.innerHTML = `
                    ${editButtonHtml}
                    <div class="order-id">#${order.id}</div>
                    <div class="info-line"><i class="bi bi-shop"></i> <span>${order.shop_name || 'Marchand inconnu'}</span></div>
                    <div class="info-line"><i class="bi bi-person"></i> <span>${order.customer_phone || 'Tél inconnu'}</span></div>
                    <div class="info-line"><i class="bi bi-geo-alt"></i> <span>${order.delivery_location || 'Lieu inconnu'}</span></div>
                    <h6>Articles (${formatAmount(totalArticles)}) :</h6>
                    ${itemsListHtml}
                    <div class="action-button-container">
                        ${actionButtonHtml}
                    </div>
                    <small class="text-muted text-end mt-1">Assignée le ${moment(order.created_at).format('DD/MM HH:mm')}</small>
                `;
                gridDiv.appendChild(card);
            });

            groupDiv.appendChild(gridDiv);
            preparationContainer.appendChild(groupDiv);
        });

        attachButtonListeners(); // Attacher les listeners aux nouveaux boutons
    };

    /**
     * Ouvre la modale d'édition des articles d'une commande (MODIFIÉ POUR RESTRICTIONS).
     */
    const openEditItemsModal = (orderData) => {
        if (!editItemsModal || !orderData) return;

        const isPickedUp = !!orderData.picked_up_by_rider_at;
        const isReady = orderData.status === 'ready_for_pickup';

        // Configuration de la modale pour l'édition/visualisation
        editItemsOrderIdSpan.textContent = orderData.id;
        editItemsOrderIdHidden.value = orderData.id;
        modalDeliveryFeeInput.value = orderData.delivery_fee || 0;
        modalExpeditionFeeInput.value = orderData.expedition_fee || 0;

        // --- NOUVEAU: Désactiver les champs de frais ---
        modalDeliveryFeeInput.readOnly = true;
        modalExpeditionFeeInput.readOnly = true;

        modalItemsContainer.innerHTML = '';
        if (orderData.items && orderData.items.length > 0) {
            orderData.items.forEach(item => addItemRowModal(modalItemsContainer, item, isPickedUp));
        } else {
            addItemRowModal(modalItemsContainer, {}, isPickedUp); // Ajouter une ligne vide
        }

        // Gérer le mode d'édition/visualisation
        if (isPickedUp) {
            // Mode lecture seule
            editItemsForm.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
            modalAddItemBtn.disabled = true;
            saveItemsAndMarkReadyBtn.disabled = true;
            saveItemsAndMarkReadyBtn.innerHTML = '<i class="bi bi-lock me-1"></i> Colis déjà récupéré (Non modifiable)';
            if(editAlert) editAlert.innerHTML = '<i class="bi bi-info-circle-fill me-1"></i> **Mode lecture seule:** Le colis a été récupéré par le livreur le ' + moment(orderData.picked_up_by_rider_at).format('DD/MM HH:mm') + '.';
            if(editAlert) editAlert.classList.remove('alert-warning');
            if(editAlert) editAlert.classList.add('alert-secondary');

        } else {
            // Mode édition normale
            editItemsForm.querySelectorAll('input:not([readonly]), select, textarea, button:not([data-bs-dismiss])').forEach(el => el.disabled = false);
            modalAddItemBtn.disabled = false;
            saveItemsAndMarkReadyBtn.disabled = false;
            
            // Le bouton de soumission fait toujours la même chose : Sauvegarder les modifications d'articles
            saveItemsAndMarkReadyBtn.innerHTML = '<i class="bi bi-save me-1"></i> Sauvegarder les Modifications'; 
            
            if(editAlert) editAlert.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i> Modifiez ici **uniquement le nom ou la quantité** des articles si nécessaire. Les montants et frais sont non modifiables.';
            if(editAlert) editAlert.classList.add('alert-warning');
            if(editAlert) editAlert.classList.remove('alert-secondary');
        }

        editItemsModal.show();
    };

    // Ajout/Suppression de lignes dans la modale (MODIFIÉ POUR RESTRICTIONS)
    const addItemRowModal = (container, item = {}, isReadOnly = false) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'row g-2 item-row-modal mb-2';
        const isFirst = container.children.length === 0;

        itemRow.innerHTML = `
            <div class="col-md-5">
                <label class="form-label mb-1 ${!isFirst ? 'visually-hidden' : ''}">Nom article</label>
                <input type="text" class="form-control form-control-sm item-name-input" value="${item.item_name || ''}" placeholder="Article" required ${isReadOnly ? 'readonly' : ''}>
                <input type="hidden" class="item-id-input" value="${item.id || ''}">
            </div>
            <div class="col-md-3">
                <label class="form-label mb-1 ${!isFirst ? 'visually-hidden' : ''}">Qté</label>
                <input type="number" class="form-control form-control-sm item-quantity-input" value="${item.quantity || 1}" min="1" required ${isReadOnly ? 'readonly' : ''}>
            </div>
            <div class="col-md-4">
                <label class="form-label mb-1 ${!isFirst ? 'visually-hidden' : ''}">Montant (Info)</label>
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control item-amount-input" value="${item.amount || 0}" min="0" readonly> <button class="btn btn-outline-danger remove-item-btn-modal" type="button" ${isReadOnly ? 'disabled' : ''}><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
        container.appendChild(itemRow);

         if (container.children.length > 1) {
             itemRow.querySelectorAll('label').forEach(label => label.classList.add('visually-hidden'));
         } else {
             itemRow.querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
         }
    };


    /**
     * Gère la soumission du formulaire d'édition d'articles (MODIFIÉ POUR RESTRICTIONS).
     * Envoie uniquement nom/quantité. Ne marque plus comme "Prête" automatiquement.
     */
    const handleEditItemsSubmit = async (event) => {
        event.preventDefault();
        const headers = getAuthHeader();
        if (!headers) return;

        const orderId = editItemsOrderIdHidden.value;
        const button = saveItemsAndMarkReadyBtn;

        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sauvegarde...';

        const items = Array.from(modalItemsContainer.querySelectorAll('.item-row-modal')).map(row => ({
            item_name: row.querySelector('.item-name-input').value,
            quantity: parseInt(row.querySelector('.item-quantity-input').value),
            // Conservation du montant original pour la BDD (même si non modifiable par l'Admin Hub)
            amount: parseFloat(row.querySelector('.item-amount-input').value) 
        }));

        if (items.some(item => !item.item_name || item.quantity <= 0)) {
            showNotification("Veuillez vérifier que tous les articles ont un nom et une quantité valide.", "warning");
            button.disabled = false;
            button.innerHTML = '<i class="bi bi-save me-1"></i> Sauvegarder les Modifications';
            return;
        }

        // On envoie les items modifiés (nom/quantité) avec leur montant d'origine
        const totalArticleAmount = items.reduce((sum, item) => sum + item.amount, 0);

        // NOTE TRÈS IMPORTANTE : Nous envoyons les frais de livraison/expédition avec leurs valeurs d'origine (readonly)
        // car la route /orders/:id/ update les articles ET peut mettre à jour les frais s'ils sont dans le body.
        // Si on omet ces champs, ils seront mis à NULL ou 0 côté backend. Pour les conserver, on renvoie les valeurs readonly.
        const updateData = { 
            items: items, 
            article_amount: totalArticleAmount,
            delivery_fee: parseFloat(modalDeliveryFeeInput.value) || 0,
            expedition_fee: parseFloat(modalExpeditionFeeInput.value) || 0,
        };

        try {
            // Mettre à jour la commande via PUT /orders/:id
            await axios.put(`${API_BASE_URL}/orders/${orderId}`, updateData, { headers });

            showNotification(`Articles de la commande #${orderId} modifiés !`, 'success');

            editItemsModal.hide();
            fetchOrdersToPrepare(); 

        } catch (error) {
            console.error(`Erreur sauvegarde articles Cde ${orderId}:`, error);
            showNotification(error.response?.data?.message || `Échec de la sauvegarde des modifications.`, 'danger');
            if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
        } finally {
             button.disabled = false;
             button.innerHTML = '<i class="bi bi-save me-1"></i> Sauvegarder les Modifications';
        }
    };

    /**
     * Marque une commande comme prête (appel API séparé).
     */
    const markOrderAsReady = async (orderId) => {
        const headers = getAuthHeader();
        if (!headers) return;

        const button = preparationContainer.querySelector(`.mark-ready-btn[data-order-id="${orderId}"]`);
        if(button) button.disabled = true;

        try {
            // Appel à la route PUT /orders/:id/ready
            await axios.put(`${API_BASE_URL}/orders/${orderId}/ready`, {}, { headers });
            showNotification(`Commande #${orderId} marquée comme prête !`, 'success');
            fetchOrdersToPrepare(); // Rafraîchir
        } catch (error) {
            console.error(`Erreur marquage prête Cde ${orderId}:`, error);
            showNotification(error.response?.data?.message || `Échec marquage comme prête.`, 'danger');
            if(button) button.disabled = false;
            if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
        }
    };


    // --- RETOURS (Onglet 2) ---

    /**
     * Récupère la liste des retours en attente de gestion (Admin).
     */
    const fetchPendingReturns = async () => {
        showLoadingState(returnsTableBody, true);

        const headers = getAuthHeader();
        if (!headers) { showLoadingState(returnsTableBody, false); return; }

        const filters = {
            status: document.getElementById('returnStatusFilter').value,
            deliverymanId: returnDeliverymanFilter.value,
            startDate: returnStartDateInput.value,
            endDate: returnEndDateInput.value
        };

        try {
            const response = await axios.get(`${API_BASE_URL}/returns/pending-hub`, { params: filters, headers });
            const returns = response.data || [];
            renderReturnsTable(returns);
            const pendingToHubCount = returns.filter(r => r.return_status === 'pending_return_to_hub').length;
            if(returnCountSpan) returnCountSpan.textContent = pendingToHubCount;

            const totalHubNotifications = pendingToHubCount;
            if (hubNotificationBadge) {
                 hubNotificationBadge.textContent = totalHubNotifications;
                 hubNotificationBadge.classList.toggle('d-none', totalHubNotifications === 0);
            }

        } catch (error) {
            console.error("Erreur fetchPendingReturns:", error);
            returnsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-3">Erreur lors du chargement des retours.</td></tr>`;
             if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
        }
    };

    /**
     * Affiche les retours dans le tableau.
     */
    const renderReturnsTable = (returns) => {
        if (!returnsTableBody) return;
        returnsTableBody.innerHTML = '';

        if (returns.length === 0) {
             returnsTableBody.innerHTML = `<tr><td colspan="7" class="text-center p-3">Aucun retour trouvé pour ces filtres.</td></tr>`;
             return;
        }

        returns.forEach(returnItem => {
            const isConfirmed = returnItem.return_status === 'received_at_hub';
            const row = document.createElement('tr');

            const statusText = statusReturnTranslations[returnItem.return_status] || returnItem.return_status;
            const statusClass = isConfirmed ? 'badge bg-success' : 'badge bg-warning text-dark';

            const actionsHtml = isConfirmed
                ? `<span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i> Confirmé</span>`
                : `<button class="btn btn-sm btn-danger btn-confirm-return" data-tracking-id="${returnItem.tracking_id}"><i class="bi bi-box-arrow-in-down me-1"></i> Confirmer Réception</button>`;

            const commentTooltip = returnItem.comment ? `title="${returnItem.comment}"` : `title="Aucun commentaire"`;

            row.innerHTML = `
                <td>${returnItem.tracking_id}</td>
                <td><a href="orders.html?search=#${returnItem.order_id}" target="_blank">#${returnItem.order_id}</a></td>
                <td>${returnItem.deliveryman_name}</td>
                <td>${returnItem.shop_name}</td>
                <td>${moment(returnItem.declaration_date).format('DD/MM HH:mm')}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    ${actionsHtml}
                    <i class="bi bi-chat-left-text text-muted ms-2" data-bs-toggle="tooltip" data-bs-placement="top" ${commentTooltip}></i>
                </td>
            `;
            returnsTableBody.appendChild(row);
        });

         const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
         tooltipTriggerList.forEach(function(tooltipTriggerEl) {
              const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
              if (existingTooltip) existingTooltip.dispose();
              new bootstrap.Tooltip(tooltipTriggerEl);
         });

         attachButtonListeners(); // Réattacher les listeners pour les boutons de confirmation
    };

    /**
     * Gère la confirmation de réception d'un retour au Hub (Admin).
     */
    const handleConfirmHubReception = async (event) => {
        const button = event.currentTarget;
        const trackingId = button.dataset.trackingId;
        if (!trackingId || !confirm(`Confirmer la réception physique du retour #${trackingId} ?\nCeci marquera la commande comme "Retournée".`)) return;

        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> ...';

        const headers = getAuthHeader();
        if (!headers) { button.disabled = false; return; }

        try {
            await axios.put(`${API_BASE_URL}/returns/${trackingId}/confirm-hub`, {}, { headers });
            showNotification(`Retour #${trackingId} confirmé avec succès.`, 'success');
            fetchPendingReturns();
        } catch (error) {
            console.error(`Erreur confirmation retour ${trackingId}:`, error);
            showNotification(error.response?.data?.message || `Erreur lors de la confirmation.`, 'danger');
            button.disabled = false;
            button.innerHTML = '<i class="bi bi-box-arrow-in-down me-1"></i> Confirmer Réception';
             if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
        }
    };

    /**
     * Récupère les notifications du Hub (Préparation requise, Retours à valider, etc.)
     */
    const fetchHubNotifications = async () => {
        const pendingReturns = parseInt(returnCountSpan?.textContent || '0');
        const ordersToPrepare = parseInt(prepCountSpan?.textContent || '0');

        const notifications = [];
        if (pendingReturns > 0) {
            notifications.push({ type: 'danger', message: `${pendingReturns} retour(s) en attente de confirmation Hub.`, action: '#returns-panel' });
        }
        if (ordersToPrepare > 0) {
            notifications.push({ type: 'warning', message: `${ordersToPrepare} commande(s) à vérifier/préparer.`, action: '#preparation-panel' });
        }

        hubNotificationList.innerHTML = '';
        if (notifications.length === 0) {
             hubNotificationList.innerHTML = '<p class="text-center text-muted">Aucune nouvelle notification.</p>';
             return;
        }

        notifications.forEach(notif => {
            const item = document.createElement('a');
            item.href = notif.action;
            item.className = `list-group-item list-group-item-action list-group-item-${notif.type} small`;
            item.innerHTML = `<i class="bi bi-bell-fill me-2"></i> ${notif.message}`;
            item.addEventListener('click', (e) => {
                 e.preventDefault();
                 const targetTab = document.querySelector(`button[data-bs-target="${notif.action}"]`);
                 const tabInstance = bootstrap.Tab.getInstance(targetTab) || new bootstrap.Tab(targetTab);
                 tabInstance.show();
                 const modal = bootstrap.Modal.getInstance(document.getElementById('notificationModal'));
                 if(modal) modal.hide();
            });
            hubNotificationList.appendChild(item);
        });
    };


    // --- Attachement des Listeners ---

    function attachButtonListeners() {
         // Préparation: Bouton Crayon (Édition) + Bouton Marquer Prête
         preparationContainer.querySelectorAll('.btn-edit-items').forEach(button => {
            button.removeEventListener('click', openEditItemsModalFromButton);
            button.addEventListener('click', openEditItemsModalFromButton);
         });
         preparationContainer.querySelectorAll('.mark-ready-btn').forEach(button => {
             button.removeEventListener('click', handleMarkReadyClick);
             button.addEventListener('click', handleMarkReadyClick);
         });

         // Retours: Bouton Confirmer Réception
         returnsTableBody.querySelectorAll('.btn-confirm-return').forEach(button => {
             button.removeEventListener('click', handleConfirmHubReception);
             if (!button.disabled) {
                 button.addEventListener('click', handleConfirmHubReception);
             }
         });
    }

    // Handler pour le bouton "Marquer Prête"
    function handleMarkReadyClick(event) {
        const button = event.currentTarget;
        const orderId = button.dataset.orderId;
        if (orderId && confirm(`Marquer la commande #${orderId} comme prête pour la récupération ?`)) {
            markOrderAsReady(orderId);
        }
    }

    // Fonction intermédiaire pour ouvrir la modale depuis les boutons CRAYON
    function openEditItemsModalFromButton(event) {
        const button = event.currentTarget;
        const card = button.closest('.order-card-prep');
        if (card && card.dataset.orderData) {
            try {
                const orderData = JSON.parse(card.dataset.orderData);
                openEditItemsModal(orderData);
            } catch (e) {
                console.error("Impossible de parser les données de la commande :", e);
                showNotification("Erreur de données de la commande.", "danger");
            }
        }
    }

    // --- Initialisation et Listeners ---
    const initializeApp = async () => {
         if (typeof AuthManager === 'undefined' || !AuthManager.getUser) {
             showNotification("Erreur critique d'initialisation.", "danger");
             return;
         }
        currentUser = AuthManager.getUser();

        if (userNameDisplay) userNameDisplay.textContent = currentUser.name;

        // Définir la date du jour par défaut pour les filtres de retour
        const today = moment().format('YYYY-MM-DD');
        if(returnStartDateInput) returnStartDateInput.value = today;
        if(returnEndDateInput) returnEndDateInput.value = today;

        await fetchDeliverymen();

        // Listeners pour la section PRÉPARATION
        refreshPrepBtn?.addEventListener('click', fetchOrdersToPrepare);

        // Listeners pour la section RETOURS
        returnFiltersForm?.addEventListener('submit', (e) => {
             e.preventDefault();
             fetchPendingReturns();
        });
        refreshReturnsBtn?.addEventListener('click', fetchPendingReturns); // Bouton refresh retours

        // Listeners pour la MODALE D'ÉDITION D'ARTICLES
        modalAddItemBtn?.addEventListener('click', () => addItemRowModal(modalItemsContainer));
        modalItemsContainer?.addEventListener('click', (e) => {
             const removeButton = e.target.closest('.remove-item-btn-modal');
             if (removeButton && !removeButton.disabled) { 
                 if (modalItemsContainer.children.length > 1) {
                     removeButton.closest('.item-row-modal').remove();
                     if (modalItemsContainer.children.length === 1) {
                         modalItemsContainer.children[0].querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
                     }
                 } else {
                     showNotification("Vous devez avoir au moins un article.", "warning");
                 }
             }
        });
        editItemsForm?.addEventListener('submit', handleEditItemsSubmit);

        // Charger les deux sections au démarrage
        fetchOrdersToPrepare();
        fetchPendingReturns();

        // Ajout du listener pour le bouton de notification
        document.getElementById('notificationBtn')?.addEventListener('click', fetchHubNotifications);


        // Listeners Globaux (Logout)
        document.getElementById('logoutBtn')?.addEventListener('click', () => AuthManager.logout());

        // Gérer l'affichage des onglets (pour le rafraîchissement des données)
        document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tabEl => {
            tabEl.addEventListener('shown.bs.tab', event => {
                const targetId = event.target.getAttribute('data-bs-target');
                if (targetId === '#preparation-panel') {
                    fetchOrdersToPrepare(); // Rafraîchir les préparations
                } else if (targetId === '#returns-panel') {
                    fetchPendingReturns(); // Rafraîchir les retours
                }
            });
        });
    };

     // Démarrage de l'application (écoute l'événement ou utilise le timeout)
     document.addEventListener('authManagerReady', initializeApp);
     setTimeout(() => {
         if (!currentUser && typeof AuthManager !== 'undefined' && AuthManager.getUser()) {
              initializeApp();
         }
     }, 1000);
});