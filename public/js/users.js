/**
 * public/js/users.js
 * Gestion des Utilisateurs (Version Finale)
 */

// Données Mock (Avec date de création ajoutée)
let users = [
    { 
        id: 1, name: "Lyxera", email: "admin@winkshop.cm", role: "admin", active: true, 
        createdAt: "2023-01-15", lastLogin: "2023-11-20 10:45" 
    },
    { 
        id: 2, name: "Michel Stock", email: "stock@winkshop.cm", role: "manager", active: true, 
        createdAt: "2023-03-10", lastLogin: "2023-11-19 16:20" 
    },
    { 
        id: 3, name: "Sarah Vente", email: "sarah@winkshop.cm", role: "seller", active: true, 
        createdAt: "2023-06-05", lastLogin: "2023-11-20 09:00" 
    },
    { 
        id: 4, name: "Paul Ancien", email: "paul@winkshop.cm", role: "seller", active: false, 
        createdAt: "2022-11-01", lastLogin: "2023-10-01 08:30" 
    }
];

document.addEventListener('DOMContentLoaded', () => {
    renderUsersTable(users);
    updateUserStats();

    document.getElementById('searchUser').addEventListener('input', handleFilters);
    document.getElementById('filterRole').addEventListener('change', handleFilters);
    document.getElementById('userForm').addEventListener('submit', saveUser);
    document.getElementById('userRole').addEventListener('change', updateRoleDescription);
});

function renderUsersTable(data) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Aucun utilisateur trouvé.</td></tr>`;
        return;
    }

    data.forEach(user => {
        const isBlocked = !user.active;
        const rowClass = isBlocked ? 'row-blocked' : '';
        
        // Avatar
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=128`;

        // Rôle (Texte coloré seulement)
        let roleHtml = '';
        if (user.role === 'admin') roleHtml = '<span class="role-text text-admin">Administrateur</span>';
        else if (user.role === 'manager') roleHtml = '<span class="role-text text-manager">Gestionnaire</span>';
        else roleHtml = '<span class="role-text text-seller">Vendeur</span>';

        // Statut (Dot)
        const statusHtml = user.active 
            ? `<div class="status-cell st-active"><span class="status-dot"></span>Actif</div>` 
            : `<div class="status-cell st-blocked"><span class="status-dot"></span>Bloqué</div>`;

        // Actions
        const toggleActionText = user.active ? 'Bloquer l\'accès' : 'Réactiver';
        const toggleIcon = user.active ? 'fa-ban' : 'fa-check-circle';
        const toggleColor = user.active ? 'text-danger' : 'text-success';

        const tr = document.createElement('tr');
        if (rowClass) tr.className = rowClass;

        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center">
                    <img src="${avatarUrl}" class="user-avatar-sm me-3" alt="${initials}">
                    <div>
                        <div class="fw-bold text-dark">${user.name}</div>
                        <div class="small text-muted">${user.email}</div>
                    </div>
                </div>
            </td>
            <td>${roleHtml}</td>
            <td>${statusHtml}</td>
            <td class="text-muted small fw-medium">${user.createdAt}</td>
            <td class="text-muted small">${user.lastLogin || 'Jamais'}</td>
            <td class="text-end pe-4">
                <div class="dropdown">
                    <button class="btn-icon-dropdown" type="button" data-bs-toggle="dropdown">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                        <li><a class="dropdown-item" href="#" onclick="window.editUser(${user.id})"><i class="fas fa-pen text-muted me-2"></i> Modifier</a></li>
                        <li><a class="dropdown-item" href="#" onclick="window.resetPassword(${user.id})"><i class="fas fa-key text-muted me-2"></i> Reset Password</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item fw-medium ${toggleColor}" href="#" onclick="window.toggleUserStatus(${user.id})"><i class="fas ${toggleIcon} me-2"></i> ${toggleActionText}</a></li>
                    </ul>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleFilters() {
    const term = document.getElementById('searchUser').value.toLowerCase();
    const role = document.getElementById('filterRole').value;

    const filtered = users.filter(u => {
        const matchText = u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
        const matchRole = role === "" || u.role === role;
        return matchText && matchRole;
    });
    renderUsersTable(filtered);
}

function updateUserStats() {
    document.getElementById('statTotalUsers').textContent = users.length;
    document.getElementById('statActiveUsers').textContent = users.filter(u => u.active).length;
    document.getElementById('statBlockedUsers').textContent = users.filter(u => !u.active).length;
}

// Actions
window.resetUserModal = function() {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userModalTitle').textContent = "Nouvel Utilisateur";
    document.getElementById('userRole').value = 'seller';
    updateRoleDescription();
};

window.editUser = function(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    document.getElementById('userModalTitle').textContent = "Modifier Utilisateur";
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userPassword').value = ""; 
    updateRoleDescription();
    new bootstrap.Modal(document.getElementById('userModal')).show();
};

function saveUser(e) {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;

    if (id) {
        const idx = users.findIndex(u => u.id == id);
        if (idx > -1) {
            users[idx].name = name;
            users[idx].email = email;
            users[idx].role = role;
        }
    } else {
        const today = new Date().toISOString().split('T')[0];
        users.push({ id: Date.now(), name, email, role, active: true, createdAt: today, lastLogin: null });
    }
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    handleFilters();
    updateUserStats();
}

window.toggleUserStatus = function(id) {
    const user = users.find(u => u.id === id);
    if (user) {
        user.active = !user.active;
        handleFilters();
        updateUserStats();
    }
};

window.resetPassword = function(id) {
    alert("Mot de passe réinitialisé (Simulation).");
};

function updateRoleDescription() {
    const role = document.getElementById('userRole').value;
    const descEl = document.getElementById('roleDescription');
    if (role === 'seller') descEl.innerHTML = '<i class="fas fa-headset me-1"></i> Accès : Commandes uniquement.';
    else if (role === 'manager') descEl.innerHTML = '<i class="fas fa-boxes me-1"></i> Accès : Stock et Commandes.';
    else if (role === 'admin') descEl.innerHTML = '<i class="fas fa-shield-alt me-1"></i> Accès : Total.';
}