/**
 * public/js/builder-mono.js
 * Gestionnaire de l'Éditeur Mono Produit (Version Finale UX)
 */

// Données
let offers = [
    { id: 1, qty: 1, name: "1 Boîte (Essai)", price: 15000, isDefault: false },
    { id: 2, qty: 2, name: "2 Boîtes (Populaire)", price: 25000, isDefault: true }
];
let uploadedImageURL = null;
const CATALOGUE = ["Montre Ultra", "Dentifrice Blancheur", "Ring Light", "Tondeuse Pro"];

document.addEventListener('DOMContentLoaded', () => {
    renderOffersEditor();
    updatePreview();
    
    // Datalist
    const dl = document.getElementById('stockProductList');
    if(dl) dl.innerHTML = CATALOGUE.map(c => `<option value="${c}">`).join('');

    // Listeners
    const ids = ['productSourceInput', 'ctaTextInput', 'ctaAnimationSelect', 
                 'formCtaTextInput', 'formCtaIconSelect', 'timerToggle', 
                 'whatsappTextInput', 'thankYouMsgInput', 'pixelIdInput', 'pixelEventSelect'];
                 
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', updatePreview);
            el.addEventListener('change', updatePreview);
        }
    });

    // Toggle WhatsApp
    document.getElementById('whatsappSupportToggle')?.addEventListener('change', (e) => {
        const set = document.getElementById('whatsappSettings');
        e.target.checked ? set.classList.remove('d-none') : set.classList.add('d-none');
        updatePreview();
    });

    // Image Upload
    document.getElementById('productImageInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                uploadedImageURL = evt.target.result;
                const img = document.getElementById('previewImage');
                const ph = document.getElementById('previewImagePlaceholder');
                img.src = uploadedImageURL; img.style.display = 'block'; ph.classList.add('d-none');
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('addOfferBtn').addEventListener('click', addNewOffer);
});

// --- PREVIEW LOGIC ---
function updatePreview() {
    // 1. Bouton Sticky
    const ctaText = document.getElementById('ctaTextInput').value || 'COMMANDER';
    document.getElementById('previewStickyBtn').textContent = ctaText;
    
    const anim = document.getElementById('ctaAnimationSelect').value;
    const btn = document.getElementById('previewStickyBtn');
    btn.className = 'btn btn-danger w-100 fw-bold shadow rounded-pill py-3 animate__animated';
    if(anim === 'pulse') btn.classList.add('animate__pulse', 'animate__infinite');
    if(anim === 'shake') btn.classList.add('animate__headShake', 'animate__infinite');

    // 2. Bouton Formulaire
    const formText = document.getElementById('formCtaTextInput').value || 'VALIDER';
    const formIcon = document.getElementById('formCtaIconSelect').value;
    document.getElementById('previewFormSubmitBtn').innerHTML = `<i class="fas fa-${formIcon} me-2"></i> ${formText}`;

    // 3. Timer & WhatsApp
    const showTimer = document.getElementById('timerToggle').checked;
    const timerEl = document.getElementById('previewTimer');
    showTimer ? timerEl.classList.remove('d-none') : timerEl.classList.add('d-none');

    const showWa = document.getElementById('whatsappSupportToggle').checked;
    const waEl = document.getElementById('previewWhatsapp');
    const waText = document.getElementById('whatsappTextInput').value || 'WhatsApp';
    document.getElementById('previewWhatsappText').textContent = waText;
    showWa ? waEl.classList.remove('d-none') : waEl.classList.add('d-none');

    // 4. Offres
    const container = document.getElementById('previewOffersList');
    container.innerHTML = offers.map(o => `
        <div class="p-2 border rounded mb-2 ${o.isDefault ? 'border-danger bg-danger bg-opacity-10' : 'bg-white border-light'}" style="cursor: pointer;">
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <input type="radio" class="form-check-input me-2" name="previewOffer" ${o.isDefault?'checked':''}>
                    <div>
                        <div class="fw-bold text-dark small">${o.name}</div>
                        <div class="text-muted" style="font-size: 0.7rem;">${o.qty} Unité(s)</div>
                    </div>
                </div>
                <div class="fw-bold text-danger">${o.price.toLocaleString()} FCFA</div>
            </div>
        </div>
    `).join('');
}

// --- MODALE ---
window.openConversionModal = () => {
    const m = document.getElementById('conversionModal');
    m.classList.remove('d-none');
    m.querySelector('.preview-modal-content').classList.add('animate__zoomIn');
};
window.closeConversionModal = () => {
    const m = document.getElementById('conversionModal');
    m.classList.add('d-none');
};

// --- OFFRES CRUD ---
function renderOffersEditor() {
    const tbody = document.getElementById('offersTableBody');
    tbody.innerHTML = '';
    offers.forEach((o, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="form-control form-control-sm text-center" value="${o.qty}" onchange="updOffer(${i}, 'qty', this.value)"></td>
            <td><input type="text" class="form-control form-control-sm" value="${o.name}" onchange="updOffer(${i}, 'name', this.value)"></td>
            <td><input type="number" class="form-control form-control-sm text-end" value="${o.price}" onchange="updOffer(${i}, 'price', this.value)"></td>
            <td class="text-center"><input type="radio" name="def" ${o.isDefault?'checked':''} onchange="setDef(${i})"></td>
            <td class="text-end"><button class="btn btn-sm text-danger" onclick="remOffer(${i})"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}
window.updOffer = (i, f, v) => { offers[i][f] = (f==='name'?v:parseInt(v)); updatePreview(); };
window.setDef = (i) => { offers.forEach((o, x) => o.isDefault = (x===i)); updatePreview(); };
window.remOffer = (i) => { offers.splice(i, 1); renderOffersEditor(); updatePreview(); };
window.addNewOffer = () => { offers.push({id:Date.now(), qty:1, name:"Offre", price:10000, isDefault:false}); renderOffersEditor(); updatePreview(); };

// --- ACTIONS FINALES ---
window.simPreview = function() {
    const data = {
        offers: offers,
        image: uploadedImageURL,
        productName: document.getElementById('productSourceInput').value || 'Produit Inconnu',
        ctaText: document.getElementById('ctaTextInput').value,
        ctaAnimation: document.getElementById('ctaAnimationSelect').value,
        formCtaText: document.getElementById('formCtaTextInput').value,
        formCtaIcon: document.getElementById('formCtaIconSelect').value,
        timerEnabled: document.getElementById('timerToggle').checked,
        whatsappEnabled: document.getElementById('whatsappSupportToggle').checked,
        whatsappNumber: document.getElementById('whatsappNumberInput').value,
        whatsappText: document.getElementById('whatsappTextInput').value,
        thankYouMsg: document.getElementById('thankYouMsgInput').value,
        pixelId: document.getElementById('pixelIdInput').value,
        pixelEvent: document.getElementById('pixelEventSelect').value
    };
    
    localStorage.setItem('winkshop_landing_data', JSON.stringify(data));
    
    // Ouverture forcée
    const win = window.open('landing.html', '_blank');
    if(!win) alert("Veuillez autoriser les pop-ups pour voir la prévisualisation.");
};

window.simPublish = function() {
    alert("Configuration publiée avec succès ! (Simulation)");
};