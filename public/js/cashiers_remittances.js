// public/js/cashiers_remittances.js
document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = 'https://test.winkexpress.online';
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!storedUser) {
        window.location.href = 'index.html';
        return;
    }
    const user = JSON.parse(storedUser);
    const CURRENT_USER_ID = user.id;
    if (user.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    }
    document.getElementById('userName').textContent = user.name;

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggler = document.getElementById('sidebar-toggler');
    const logoutBtn = document.getElementById('logoutBtn');

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const globalSearchInput = document.getElementById('globalSearchInput');
    const filterBtn = document.getElementById('filterBtn');

    const summaryTableBody = document.getElementById('summaryTableBody');
    const shortfallsTableBody = document.getElementById('shortfallsTableBody');

    const remittanceDetailsModal = new bootstrap.Modal(document.getElementById('remittanceDetailsModal'));
    const settleShortfallModal = new bootstrap.Modal(document.getElementById('settleShortfallModal'));

    const settleShortfallForm = document.getElementById('settleShortfallForm');
    const confirmBatchBtn = document.getElementById('confirmBatchBtn');

    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    };

    const formatAmount = (amount) => `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;

    const debounce = (func, delay = 500) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    const applyFiltersAndRender = () => {
        const activeTab = document.querySelector('#cashTabs .nav-link.active');
        if (!activeTab) return;
        
        const targetPanelId = activeTab.getAttribute('data-bs-target');
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const search = globalSearchInput.value;

        if (!startDate || !endDate) return showNotification("Période invalide.", "warning");
        
        switch (targetPanelId) {
            case '#remittances-panel':
                fetchAndRenderSummary(startDate, endDate, search);
                break;
            case '#shortfalls-panel':
                fetchAndRenderShortfalls(search);
                break;
        }
    };

    const fetchAndRenderSummary = async (startDate, endDate, search) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/cash/remittance-summary`, { params: { startDate, endDate, search } });
            summaryTableBody.innerHTML = '';
            if (res.data.length === 0) {
                summaryTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-3">Aucun versement à afficher.</td></tr>`;
                return;
            }
            res.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.user_name}</td>
                    <td>${item.pending_count || 0}</td>
                    <td class="text-warning fw-bold">${formatAmount(item.pending_amount)}</td>
                    <td>${item.confirmed_count || 0}</td>
                    <td class="text-success fw-bold">${formatAmount(item.confirmed_amount)}</td>
                    <td><button class="btn btn-sm btn-primary details-btn" data-id="${item.user_id}" data-name="${item.user_name}">Gérer</button></td>
                `;
                summaryTableBody.appendChild(row);
            });
        } catch (error) {
            summaryTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">Erreur de chargement.</td></tr>`;
        }
    };

    const fetchAndRenderShortfalls = async (search) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/cash/shortfalls`, { params: { search } });
            shortfallsTableBody.innerHTML = '';
            if (res.data.length === 0) {
                shortfallsTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-3">Aucun manquant en attente.</td></tr>`;
                return;
            }
            res.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.deliveryman_name}</td>
                    <td class="text-danger fw-bold">${formatAmount(item.amount)}</td>
                    <td><span class="badge bg-warning text-dark">${item.status}</span></td>
                    <td>${moment(item.created_at).format('DD/MM/YYYY')}</td>
                    <td><button class="btn btn-sm btn-success settle-btn" data-id="${item.id}" data-amount="${item.amount}">Régler</button></td>
                `;
                shortfallsTableBody.appendChild(row);
            });
        } catch (error) {
            shortfallsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger p-4">Erreur de chargement.</td></tr>`;
        }
    };

    const initializeEventListeners = () => {
        sidebarToggler.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
        
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            window.location.href = 'index.html';
        });

        filterBtn.addEventListener('click', applyFiltersAndRender);
        globalSearchInput.addEventListener('input', debounce(applyFiltersAndRender));
        
        document.querySelectorAll('#cashTabs .nav-link').forEach(tab => tab.addEventListener('shown.bs.tab', applyFiltersAndRender));

        document.body.addEventListener('click', async (e) => {
            const target = e.target.closest('button, a');
            if (!target) return;

            if (target.matches('.details-btn')) {
                const deliverymanId = target.dataset.id;
                const deliverymanName = target.dataset.name;
                document.getElementById('modalDeliverymanName').textContent = deliverymanName;
                try {
                    const res = await axios.get(`${API_BASE_URL}/cash/remittance-details/${deliverymanId}`, { params: { startDate: startDateInput.value, endDate: endDateInput.value } });
                    const tableBody = document.getElementById('modalTransactionsTableBody');
                    tableBody.innerHTML = '';
                     if (res.data.length === 0) {
                         tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-3">Aucune transaction à gérer.</td></tr>`;
                     } else {
                        res.data.forEach(tx => {
                            const row = document.createElement('tr');
                            const statusBadge = tx.status === 'pending' ? `<span class="badge bg-warning text-dark">En attente</span>` : `<span class="badge bg-success">Confirmé</span>`;
                            row.innerHTML = `
                                <td><input type="checkbox" class="transaction-checkbox" data-id="${tx.id}" data-amount="${tx.amount}" ${tx.status !== 'pending' ? 'disabled' : ''}></td>
                                <td>${moment(tx.created_at).format('DD/MM HH:mm')}</td>
                                <td>${formatAmount(tx.amount)}</td>
                                <td>
                                    <div>${tx.comment}</div>
                                    <small class="text-muted">${tx.shop_name || 'Info'} - ${tx.item_names || 'non'} - ${tx.delivery_location || 'disponible'}</small>
                                </td>
                                <td>${statusBadge}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-info edit-remittance-btn" title="Modifier le montant" data-id="${tx.id}" data-amount="${tx.amount}"><i class="bi bi-pencil"></i></button>
                                    ${tx.status === 'pending' ? `<button class="btn btn-sm btn-outline-success confirm-single-remittance-btn" title="Confirmer ce versement" data-id="${tx.id}" data-amount="${tx.amount}"><i class="bi bi-check2"></i></button>` : ''}
                                </td>
                            `;
                            tableBody.appendChild(row);
                        });
                     }
                    remittanceDetailsModal.show();
                } catch (error) {
                    showNotification("Erreur au chargement des détails.", "danger");
                }
            }
            
            if (target.matches('.settle-btn')) {
                const shortfallId = target.dataset.id;
                const amountDue = target.dataset.amount;
                document.getElementById('settleShortfallInfo').textContent = `Montant du manquant: ${formatAmount(amountDue)}`;
                document.getElementById('settleAmountInput').value = amountDue;
                settleShortfallForm.dataset.shortfallId = shortfallId;
                settleShortfallModal.show();
            }

            if (target.matches('.edit-remittance-btn')) {
                const txId = target.dataset.id;
                const oldAmount = target.dataset.amount;
                const newAmount = prompt(`Modifier le montant du versement :`, oldAmount);
                if(newAmount && !isNaN(newAmount)){
                    try {
                        await axios.put(`${API_BASE_URL}/cash/remittances/${txId}`, { amount: newAmount });
                        showNotification("Montant mis à jour.");
                        remittanceDetailsModal.hide();
                    } catch (error) {
                        showNotification(error.response?.data?.message || "Erreur.", "danger");
                    }
                }
            }
            
            if (target.matches('.confirm-single-remittance-btn')) {
                const txId = target.dataset.id;
                const expectedAmount = target.dataset.amount;
                const paidAmount = prompt(`Montant attendu : ${formatAmount(expectedAmount)}. Montant versé ?`, expectedAmount);
                if (paidAmount !== null && !isNaN(paidAmount)) {
                    try {
                        const res = await axios.put(`${API_BASE_URL}/cash/remittances/confirm`, { transactionIds: [txId], paidAmount: parseFloat(paidAmount), validated_by: CURRENT_USER_ID });
                        showNotification(res.data.message);
                        remittanceDetailsModal.hide();
                        applyFiltersAndRender();
                        fetchAndRenderShortfalls();
                    } catch (error) { showNotification(error.response?.data?.message || "Erreur.", "danger"); }
                }
            }
        });
        
        if (confirmBatchBtn) {
            confirmBatchBtn.addEventListener('click', async () => {
                const selectedCheckboxes = document.querySelectorAll('#modalTransactionsTableBody .transaction-checkbox:checked');
                const transactionIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

                if (transactionIds.length === 0) return showNotification("Sélectionnez au moins une transaction.", 'warning');

                const expectedAmount = Array.from(selectedCheckboxes).reduce((sum, cb) => sum + parseFloat(cb.dataset.amount), 0);
                const paidAmount = prompt(`Total sélectionné : ${formatAmount(expectedAmount)}. Montant total versé ?`, expectedAmount);

                if (paidAmount !== null && !isNaN(paidAmount)) {
                    try {
                        const res = await axios.put(`${API_BASE_URL}/cash/remittances/confirm`, { transactionIds, paidAmount: parseFloat(paidAmount), validated_by: CURRENT_USER_ID });
                        showNotification(res.data.message);
                        remittanceDetailsModal.hide();
                        applyFiltersAndRender();
                        fetchAndRenderShortfalls();
                    } catch (error) { showNotification(error.response?.data?.message || "Erreur.", "danger"); }
                }
            });
        }
        
        settleShortfallForm.addEventListener('submit', async e => {
            e.preventDefault();
            const shortfallId = e.target.dataset.shortfallId;
            const amount = document.getElementById('settleAmountInput').value;
            try {
                await axios.put(`${API_BASE_URL}/cash/shortfalls/${shortfallId}/settle`, { amount: parseFloat(amount), userId: CURRENT_USER_ID });
                showNotification("Manquant réglé avec succès.");
                settleShortfallModal.hide();
                fetchAndRenderShortfalls();
            } catch (error) { showNotification(error.response?.data?.message || "Erreur.", "danger"); }
        });
    };
    
    const initializeApp = async () => {
        const today = new Date().toISOString().slice(0, 10);
        startDateInput.value = today;
        endDateInput.value = today;

        initializeEventListeners();
        applyFiltersAndRender();
    };

    initializeApp();
});