// public/js/cashiers_expenses.js
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

    let usersCache = [];
    let categoriesCache = [];
    let transactionIdToEdit = null;

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggler = document.getElementById('sidebar-toggler');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const globalSearchInput = document.getElementById('globalSearchInput');
    const filterBtn = document.getElementById('filterBtn');

    const expensesTableBody = document.getElementById('expensesTableBody');
    const withdrawalsTableBody = document.getElementById('withdrawalsTableBody');

    const addExpenseModal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    const manualWithdrawalModal = new bootstrap.Modal(document.getElementById('manualWithdrawalModal'));
    const editExpenseModal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
    const editWithdrawalModal = new bootstrap.Modal(document.getElementById('editWithdrawalModal'));

    const expenseForm = document.getElementById('expenseForm');
    const withdrawalForm = document.getElementById('withdrawalForm');
    const editExpenseForm = document.getElementById('editExpenseForm');
    const editWithdrawalForm = document.getElementById('editWithdrawalForm');

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
        
        if (targetPanelId === '#expenses-panel') {
            fetchAndRenderTransactions('expense', expensesTableBody, startDate, endDate, search);
        } else {
            fetchAndRenderTransactions('manual_withdrawal', withdrawalsTableBody, startDate, endDate, search);
        }
    };
    
    const fetchAndRenderTransactions = async (type, tableBody, startDate, endDate, search) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/cash/transactions`, { params: { type, startDate, endDate, search } });
            tableBody.innerHTML = '';
            if (res.data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-3">Aucune transaction.</td></tr>`;
                return;
            }
            res.data.forEach(tx => {
                const row = document.createElement('tr');
                const user = type === 'expense' ? tx.user_name : (tx.validated_by_name || 'Admin');
                const category = tx.category_name || '';
                row.innerHTML = `
                    <td>${moment(tx.created_at).format('DD/MM/YYYY HH:mm')}</td>
                    <td>${user}</td>
                    ${type === 'expense' ? `<td>${category}</td>` : ''}
                    <td class="text-danger fw-bold">${formatAmount(Math.abs(tx.amount))}</td>
                    <td>${tx.comment || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info edit-tx-btn" data-id="${tx.id}" data-type="${type}" data-amount="${Math.abs(tx.amount)}" data-comment="${tx.comment || ''}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger delete-tx-btn" data-id="${tx.id}"><i class="bi bi-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">Erreur de chargement.</td></tr>`;
        }
    };

    const fetchInitialData = async () => {
        try {
            const [usersRes, categoriesRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/users`),
                axios.get(`${API_BASE_URL}/cash/expense-categories`)
            ]);
            usersCache = usersRes.data;
            categoriesCache = categoriesRes.data;
            
            const expenseUserSelect = document.getElementById('expenseUserSelect');
            expenseUserSelect.innerHTML = '<option value="">Sélectionner un utilisateur</option>';
            usersCache.forEach(u => expenseUserSelect.innerHTML += `<option value="${u.id}">${u.name}</option>`);

            const expenseCategorySelect = document.getElementById('expenseCategorySelect');
            expenseCategorySelect.innerHTML = '<option value="">Sélectionner une catégorie</option>';
            categoriesCache.forEach(cat => expenseCategorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`);
        } catch (error) {
            showNotification("Erreur de chargement des données de base.", "danger");
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
        
        expenseForm.addEventListener('submit', async e => {
            e.preventDefault();
            try {
                await axios.post(`${API_BASE_URL}/cash/expense`, {
                    user_id: document.getElementById('expenseUserSelect').value,
                    category_id: document.getElementById('expenseCategorySelect').value,
                    amount: document.getElementById('expenseAmountInput').value,
                    comment: document.getElementById('expenseCommentInput').value
                });
                showNotification("Dépense enregistrée.");
                addExpenseModal.hide();
                expenseForm.reset();
                applyFiltersAndRender();
            } catch (error) { showNotification(error.response?.data?.message || "Erreur.", "danger"); }
        });

        withdrawalForm.addEventListener('submit', async e => {
            e.preventDefault();
            try {
                await axios.post(`${API_BASE_URL}/cash/withdrawal`, {
                    amount: document.getElementById('withdrawalAmountInput').value,
                    comment: document.getElementById('withdrawalCommentInput').value,
                    user_id: CURRENT_USER_ID
                });
                showNotification("Décaissement enregistré.");
                manualWithdrawalModal.hide();
                withdrawalForm.reset();
                applyFiltersAndRender();
            } catch (error) { showNotification(error.response?.data?.message || "Erreur.", "danger"); }
        });

        editExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = document.getElementById('editExpenseAmount').value;
            const comment = document.getElementById('editExpenseComment').value;
            try {
                await axios.put(`${API_BASE_URL}/cash/transactions/${transactionIdToEdit}`, { amount, comment });
                showNotification("Dépense modifiée.");
                editExpenseModal.hide();
                applyFiltersAndRender();
            } catch (error) { showNotification("Erreur de modification.", 'danger'); }
        });

        editWithdrawalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = document.getElementById('editWithdrawalAmount').value;
            const comment = document.getElementById('editWithdrawalComment').value;
            try {
                await axios.put(`${API_BASE_URL}/cash/transactions/${transactionIdToEdit}`, { amount, comment });
                showNotification("Décaissement modifié.");
                editWithdrawalModal.hide();
                applyFiltersAndRender();
            } catch (error) { showNotification("Erreur de modification.", 'danger'); }
        });

        document.body.addEventListener('click', async (e) => {
            const target = e.target.closest('button, a');
            if (!target) return;

            if (target.matches('.edit-tx-btn')) {
                transactionIdToEdit = target.dataset.id;
                const type = target.dataset.type;
                const amount = target.dataset.amount;
                const comment = target.dataset.comment;
                
                if(type === 'expense'){
                    document.getElementById('editExpenseAmount').value = amount;
                    document.getElementById('editExpenseComment').value = comment;
                    editExpenseModal.show();
                } else {
                    document.getElementById('editWithdrawalAmount').value = amount;
                    document.getElementById('editWithdrawalComment').value = comment;
                    editWithdrawalModal.show();
                }
            }

            if (target.matches('.delete-tx-btn')) {
                const txId = target.dataset.id;
                if (confirm('Voulez-vous vraiment supprimer cette transaction ?')) {
                    try {
                        await axios.delete(`${API_BASE_URL}/cash/transactions/${txId}`);
                        showNotification('Transaction supprimée.');
                        applyFiltersAndRender();
                    } catch (error) { showNotification("Erreur de suppression.", "danger"); }
                }
            }
        });
    };
    
    const initializeApp = async () => {
        const today = new Date().toISOString().slice(0, 10);
        startDateInput.value = today;
        endDateInput.value = today;
        document.getElementById('expenseDate').value = today;
        document.getElementById('withdrawalDate').value = today;
        
        initializeEventListeners();
        
        await fetchInitialData();
        applyFiltersAndRender();
    };

    initializeApp();
});