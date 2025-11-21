/**
 * public/js/layout.js
 * Charge la Sidebar et la Topbar communes sur toutes les pages.
 */

document.addEventListener("DOMContentLoaded", async () => {
    await loadComponent("sidebar-container", "components/sidebar.html");
    await loadComponent("topbar-container", "components/topbar.html");

    initializeLayoutLogic();
    initializeUserHeader(); // Gère l'affichage du nom/avatar
});

/**
 * Charge un fichier HTML externe dans un conteneur donné
 */
async function loadComponent(containerId, filePath) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        const html = await response.text();
        container.innerHTML = html;
    } catch (error) {
        console.error(`Impossible de charger ${filePath}:`, error);
        container.innerHTML = `<div class="alert alert-danger">Erreur chargement ${filePath}</div>`;
    }
}

/**
 * Initialise la logique une fois le HTML injecté (Menu actif, Toggle)
 */
function initializeLayoutLogic() {
    // 1. Gestion du menu "Actif"
    const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    
    navLinks.forEach(link => {
        // On compare l'attribut data-page ou le href
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });

    // 2. Gestion du Toggle Sidebar (Ouverture/Fermeture)
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (toggleBtn && sidebar && mainContent) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('toggled');
            mainContent.classList.toggle('toggled');
        });
    }

    // 3. Gestion Déconnexion (Logout)
    const logoutBtns = document.querySelectorAll('#logoutBtn, #logoutBtnSidebar');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm('Se déconnecter ?')) {
                // Logique de déconnexion ici
                localStorage.removeItem('user_token'); 
                window.location.href = 'index.html'; 
            }
        });
    });
}

/**
 * Initialise les infos utilisateur dans la Topbar (Nom, Avatar, Notifs)
 * (Code extrait de dashboard.js pour être disponible partout)
 */
function initializeUserHeader() {
    const userStr = localStorage.getItem('user_data');
    const user = userStr ? JSON.parse(userStr) : { name: 'Lyxera', role: 'Gérant' };

    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');

    if (nameEl) nameEl.textContent = user.name;
    if (avatarEl) {
        avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff`;
    }
    
    // Simulation Notifications
    const notifCount = document.getElementById('notifCount');
    if(notifCount) notifCount.textContent = "2"; 
    
    // On pourrait aussi remplir la liste des notifications ici
}