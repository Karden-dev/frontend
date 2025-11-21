/**
 * WINK SHOP - Dashboard Logic
 * Gère uniquement l'affichage des KPIs et la rentabilité.
 * (L'interface globale est gérée par layout.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Note: initializeSidebar() et initializeUser() sont maintenant gérés par layout.js
    
    initializeDateFilter();
    
    // Charger les données par défaut (Date d'aujourd'hui)
    const today = new Date().toISOString().split('T')[0];
    fetchDashboardData(today);
});

/* --- LOGIQUE MÉTIER (Finance & Commandes) --- */

function initializeDateFilter() {
    const dateInput = document.getElementById('dateFilter');
    const dateDisplay = document.getElementById('currentDateDisplay');
    
    if (dateInput) {
        // Date du jour par défaut
        const today = new Date();
        dateInput.valueAsDate = today;
        
        // Formatage pour l'affichage (ex: 24 Novembre 2023)
        if(dateDisplay) dateDisplay.textContent = formatDateFr(today);

        // Écouteur de changement 
        dateInput.addEventListener('change', (e) => {
            if(dateDisplay) dateDisplay.textContent = formatDateFr(new Date(e.target.value));
            fetchDashboardData(e.target.value);
        });
    }
}

/**
 * Récupère les données financières (Simulation API)
 * @param {string} date - Format YYYY-MM-DD
 */
async function fetchDashboardData(date) {
    const tbody = document.getElementById('productsTableBody');
    if(tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
    }

    try {
        // Simulation d'un délai réseau
        await new Promise(resolve => setTimeout(resolve, 600));

        // TODO: Remplacer par : const data = await axios.get(`/api/dashboard?date=${date}`);
        const data = getMockData(date); 

        updateKPIs(data.summary);
        renderProfitabilityTable(data.orders);

    } catch (error) {
        console.error("Erreur Dashboard:", error);
        if(tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erreur de chargement des données.</td></tr>`;
    }
}

/**
 * Met à jour les cartes du haut (KPIs)
 * */
function updateKPIs(summary) {
    // Animation simple des chiffres
    animateValue("totalRevenue", summary.totalRevenue, " FCFA");
    animateValue("deliveredRevenue", summary.deliveredRevenue, " FCFA");
    
    // Calcul Ratio 
    let ratio = 0;
    if (summary.totalRevenue > 0) {
        ratio = (summary.deliveredRevenue / summary.totalRevenue) * 100;
    }
    
    const ratioEl = document.getElementById('ratioPercentage');
    if (ratioEl) {
        ratioEl.textContent = `${ratio.toFixed(1)}%`;
        // Couleur dynamique
        ratioEl.className = `stat-value ${ratio >= 50 ? 'text-success' : 'text-warning'}`;
    }
}

/**
 * Génère le tableau de rentabilité
 * Calcul: Bénéfice = Prix - (Pub + Livraison) 
 */
function renderProfitabilityTable(orders) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Aucune commande pour cette date.</td></tr>`;
        return;
    }

    orders.forEach(order => {
        // Calculs financiers
        const revenue = order.price || 0;
        const costAd = order.adCost || 0;      // 
        const costDelivery = order.delivery || 0;
        const profit = revenue - (costAd + costDelivery);
        
        // Badge Statut
        let statusBadge = '';
        switch(order.status) {
            case 'Livré': 
                statusBadge = `<span class="badge bg-light-success text-success border border-success-subtle px-3">Livré</span>`; 
                break;
            case 'Programmé': 
                statusBadge = `<span class="badge bg-light-warning text-warning border border-warning-subtle px-3">Programmé</span>`; 
                break;
            case 'Annulé': 
                statusBadge = `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle px-3">Annulé</span>`; 
                break;
            default: 
                statusBadge = `<span class="badge bg-secondary bg-opacity-10 text-secondary px-3">${order.status}</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <div>
                        <div class="fw-bold text-dark">${order.product}</div>
                        <div class="small text-muted"><i class="far fa-user me-1"></i> ${order.client}</div>
                    </div>
                </div>
            </td>
            <td>${statusBadge}</td>
            <td class="text-end fw-medium">${formatMoney(revenue)}</td>
            <td class="text-end text-muted small">-${formatMoney(costAd)}</td>
            <td class="text-end text-muted small">-${formatMoney(costDelivery)}</td>
            <td class="text-end">
                <span class="fw-bold ${profit > 0 ? 'text-success' : 'text-danger'}">
                    ${profit > 0 ? '+' : ''}${formatMoney(profit)}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/* --- UTILITAIRES --- */

function formatMoney(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount);
}

function formatDateFr(dateObj) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return dateObj.toLocaleDateString('fr-FR', options);
}

function animateValue(id, end, suffix = "") {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    // Mise à jour directe pour l'instant (peut être animée plus tard)
    obj.textContent = formatMoney(end) + suffix;
}

/**
 * DONNÉES MOCK (Pour simuler le Backend)
 */
function getMockData(date) {
    // On génère des données aléatoires basées sur la date pour voir du changement
    const isWeekend = new Date(date).getDay() % 6 === 0;
    const multiplier = isWeekend ? 0.5 : 1; // Moins de commandes le weekend pour l'exemple

    return {
        summary: {
            totalRevenue: 185000 * multiplier, 
            deliveredRevenue: 125000 * multiplier,
        },
        orders: [
            {
                id: 1, product: "Montre Connectée Ultra", client: "Jean Dupont",
                status: "Livré", price: 25000, adCost: 2500, delivery: 1500
            },
            {
                id: 2, product: "Écouteurs Sans Fil Pro", client: "Marie Curie",
                status: "Programmé", price: 15000, adCost: 1200, delivery: 1000
            },
            {
                id: 3, product: "Pack Nettoyage Kit", client: "Paul Biya",
                status: "Annulé", price: 5000, adCost: 500, delivery: 1000
            },
            {
                id: 4, product: "Caméra Surveillance Wifi", client: "Alice Wonder",
                status: "Livré", price: 35000, adCost: 3000, delivery: 2000
            },
            {
                id: 5, product: "Support Téléphone Voiture", client: "Marc Lavoine",
                status: "En cours", price: 10000, adCost: 800, delivery: 1500
            }
        ]
    };
}