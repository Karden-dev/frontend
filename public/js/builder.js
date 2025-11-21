/**
 * public/js/builder.js
 * WINK SHOP - Constructeur de Page (Version 1.0 - Autonome)
 * Gère l'affichage des projets existants et le choix du type de nouveau projet.
 */

// ==========================================
// 1. DONNÉES DE SIMULATION (MOCK DATA)
// ==========================================

const today = new Date().toISOString().split('T')[0];

let projects = [
    { 
        id: 1, 
        name: "Montre Ultra - Campagne Fête", 
        type: "mono-product", 
        url: "promo.winkshop.cm/montre-ultra", 
        status: "published", 
        conversions: 245, 
        createdAt: "2025-11-01" 
    },
    { 
        id: 2, 
        name: "Catalogue Été 2026", 
        type: "multi-product", 
        url: "catalogue.winkshop.cm", 
        status: "draft", 
        conversions: 0, 
        createdAt: today 
    },
    { 
        id: 3, 
        name: "Capture Email - Bon Plan", 
        type: "lead-capture", 
        url: "leads.winkshop.cm/bonplan", 
        status: "published", 
        conversions: 1520, 
        createdAt: "2025-10-20" 
    },
    { 
        id: 4, 
        name: "Micro Cravate - Archivé", 
        type: "mono-product", 
        url: "promo.winkshop.cm/micro", 
        status: "archived", 
        conversions: 55, 
        createdAt: "2025-09-15" 
    }
];

// ==========================================
// 2. INITIALISATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("Builder JS Loaded");
    
    // Rendu initial du tableau des projets
    renderProjectsTable(projects);
    
    // Ajout des gestionnaires d'événements
    setupEventListeners();
});

function setupEventListeners() {
    // Écouteur pour la modale de choix de type (utilise la délégation d'événement)
    const modal = document.getElementById('projectTypeModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            const card = e.target.closest('.project-card');
            if (card) {
                const type = card.getAttribute('data-type');
                handleNewProjectSelection(type);
            }
        });
    }

    // Le bouton principal ouvre la modale (fonction globale pour le HTML)
    window.openProjectTypeModal = () => {
        new bootstrap.Modal(document.getElementById('projectTypeModal')).show();
    };
}

// ==========================================
// 3. LOGIQUE D'AFFICHAGE (TABLEAU)
// ==========================================

function renderProjectsTable(data) {
    const tbody = document.getElementById('projectsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Aucun projet trouvé.</td></tr>`;
        return;
    }

    data.forEach(p => {
        // --- Statut (Badge) ---
        let statusBadge = '';
        let rowClass = '';
        if (p.status === 'published') {
            statusBadge = `<span class="badge bg-success bg-opacity-10 text-success fw-medium">Publié</span>`;
        } else if (p.status === 'draft') {
            statusBadge = `<span class="badge bg-warning bg-opacity-10 text-warning fw-medium">Brouillon</span>`;
        } else if (p.status === 'archived') {
            statusBadge = `<span class="badge bg-secondary bg-opacity-10 text-muted fw-medium">Archivé</span>`;
            rowClass = 'opacity-75';
        }

        // --- Type ---
        let typeText = p.type === 'mono-product' ? 'Mono-Produit' : 
                       p.type === 'multi-product' ? 'Catalogue' : 'Capture de Lead';
        
        // --- Actions ---
        const editAction = `<button class="btn btn-sm btn-light text-primary" onclick="handleProjectAction(${p.id}, 'edit')" title="Éditer"><i class="fas fa-pen"></i></button>`;
        const viewAction = `<a class="btn btn-sm btn-light text-info ms-2" href="#" target="_blank" onclick="handleProjectAction(${p.id}, 'view')" title="Prévisualiser"><i class="far fa-eye"></i></a>`;

        const tr = document.createElement('tr');
        if (rowClass) tr.className = rowClass;

        tr.innerHTML = `
            <td class="ps-3">
                <div class="fw-bold text-dark">${p.name}</div>
                <div class="small text-primary">${p.url}</div>
            </td>
            <td>${typeText}</td>
            <td>${statusBadge}</td>
            <td class="fw-bold">${p.conversions}</td>
            <td>${p.createdAt}</td>
            <td class="text-end pe-3">
                ${editAction}
                ${viewAction}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 4. LOGIQUE NOUVEAU PROJET & ACTIONS
// ==========================================

function handleNewProjectSelection(type) {
    // Fermer la modale de choix
    bootstrap.Modal.getInstance(document.getElementById('projectTypeModal')).hide();

    if (type === 'mono-product') {
        // Redirection immédiate vers la page de l'éditeur Mono Produit
        window.location.href = 'builder-mono.html';
    
    } else if (type === 'lead-capture') {
        // Logique future pour la Page de Capture
        alert("Action future : Ouverture de l'éditeur de Page de Capture.");

    } else if (type === 'multi-product') {
        // Logique future pour le Multi Produit
        alert("Action future : Ouverture de l'éditeur Multi Produit.");
    }

    console.log(`Type de projet sélectionné: ${type}`);
}

// Global helper pour la modale
window.openProjectTypeModal = () => {
    new bootstrap.Modal(document.getElementById('projectTypeModal')).show();
};

// Global helper pour les actions (Édition/Prévisualisation)
window.handleProjectAction = function(id, action) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    if (action === 'edit') {
        alert(`Ouverture de l'éditeur pour le projet: ${project.name}`);
    } else if (action === 'view') {
        alert(`Ouverture de la prévisualisation pour: ${project.url}`);
    }
};