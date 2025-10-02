// public/js/cashiers_closings.js
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
    
    const closingsHistoryTableBody = document.getElementById('closingsHistoryTableBody');
    const closeCashForm = document.getElementById('closeCashForm');
    
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

    const fetchCashMetrics = async (startDate, endDate) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/cash/metrics`, { params: { startDate, endDate } });
            document.getElementById('db-total-collected').textContent = formatAmount(res.data.total_collected);
            document.getElementById('db-total-expenses').textContent = formatAmount(res.data.total_expenses);
            document.getElementById('db-total-withdrawals').textContent = formatAmount(res.data.total_withdrawals);
            document.getElementById('db-cash-on-hand').textContent = formatAmount(res.data.cash_on_hand);
        } catch (error) {
            console.error("Erreur de chargement des métriques:", error);
            document.getElementById('db-total-collected').textContent = "0 FCFA";
            document.getElementById('db-total-expenses').textContent = "0 FCFA";
            document.getElementById('db-total-withdrawals').textContent = "0 FCFA";
            document.getElementById('db-cash-on-hand').textContent = "0 FCFA";
        }
    };
    
    const fetchClosingHistory = async () => {
        const startDate = document.getElementById('historyStartDate').value;
        const endDate = document.getElementById('historyEndDate').value;
        try {
            const res = await axios.get(`${API_BASE_URL}/cash/closing-history`, { params: { startDate, endDate } });
            closingsHistoryTableBody.innerHTML = '';
            if (res.data.length === 0) {
                closingsHistoryTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-3">Aucun historique.</td></tr>`;
                return;
            }
            res.data.forEach(item => {
                const diffClass = item.difference < 0 ? 'text-danger' : (item.difference > 0 ? 'text-success' : '');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${moment(item.closing_date).format('DD/MM/YYYY')}</td>
                    <td>${formatAmount(item.expected_cash)}</td>
                    <td>${formatAmount(item.actual_cash_counted)}</td>
                    <td class="fw-bold ${diffClass}">${formatAmount(item.difference)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-success export-single-closing-btn" data-id="${item.id}" title="Exporter ce rapport"><i class="bi bi-file-earmark-spreadsheet"></i></button>
                    </td>
                `;
                closingsHistoryTableBody.appendChild(row);
            });
        } catch (error) {
            closingsHistoryTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erreur de chargement.</td></tr>`;
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

        document.getElementById('historyStartDate').addEventListener('change', fetchClosingHistory);
        document.getElementById('historyEndDate').addEventListener('change', fetchClosingHistory);
        document.getElementById('exportHistoryBtn').addEventListener('click', () => {
            const startDate = document.getElementById('historyStartDate').value;
            const endDate = document.getElementById('historyEndDate').value;
            window.open(`${API_BASE_URL}/cash/closing-history/export?startDate=${startDate}&endDate=${endDate}`, '_blank');
        });

        closeCashForm.addEventListener('submit', async e => {
            e.preventDefault();
            try {
                await axios.post(`${API_BASE_URL}/cash/close-cash`, {
                    closingDate: document.getElementById('closeDate').value,
                    actualCash: document.getElementById('actualAmount').value,
                    comment: document.getElementById('closeComment').value,
                    userId: CURRENT_USER_ID
                });
                showNotification("Caisse clôturée avec succès !");
                fetchClosingHistory();
                const today = new Date().toISOString().slice(0, 10);
                fetchCashMetrics(today, today);
            } catch(error) { showNotification(error.response?.data?.message || "Erreur.", "danger"); }
        });
    };
    
    const initializeApp = async () => {
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('closeDate').value = today;
        document.getElementById('historyStartDate').value = moment().subtract(30, 'days').format('YYYY-MM-DD');
        document.getElementById('historyEndDate').value = today;
        
        initializeEventListeners();
        fetchCashMetrics(today, today);
        fetchClosingHistory();
    };

    initializeApp();
});