/**
 * public/js/builder-mono.js
 * Gestionnaire de l'Éditeur Mono Produit (Version Corrigée & Stabilisée)
 * Fix: Boutons inactifs, IDs manquants, Logique WhatsApp & Stock.
 */

// --- DONNÉES DE DÉPART ---

const CATALOGUE_STOCK = [
    "Montre Ultra Connectée",
    "Écouteurs Pro Sans Fil",
    "Kit de Blanchiment Dentaire",
    "Ring Light LED Professionnelle",
    "Tondeuse Barbe Précision",
    "Correcteur de Posture",
    "Masseur Cervical Électrique"
];

let offers = [
    { id: 1, qty: 1, name: "1 Unité (Essai)", price: 15000, isDefault: false },
    { id: 2, qty: 2, name: "2 Unités (Recommandé)", price: 25000, isDefault: true },
    { id: 3, qty: 3, name: "3 Unités (Famille)", price: 35000, isDefault: false }
];

let uploadedImageURL = null;

// --- UTILITAIRES ---
// Fonction pour récupérer une valeur sans faire planter le script si l'ID n'existe pas
function getVal(id, fallback = '') {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
}
function getCheck(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

// --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("Builder Mono JS Loaded (Fixed)");

    // 1. Remplir la Datalist
    const dl = document.getElementById('stockProductList');
    if (dl) {
        dl.innerHTML = CATALOGUE_STOCK.map(c => `<option value="${c}">`).join('');
    }

    // 2. Rendu initial
    renderOffersEditor();
    
    // 3. Lancer la preview (avec délai de sécurité)
    setTimeout(updatePreview, 200);

    // 4. Attacher les Écouteurs
    setupEventListeners();
});

function setupEventListeners() {
    // Liste des IDs à surveiller
    const inputsToWatch = [
        'productSourceInput', 
        'offersStyleSelect',
        'shippingPriceInput', 'shippingCustomTextInput',
        'timerToggle', 'timerPositionSelect', 'timerShowInForm', 'timerStyleSelect', 
        'timerDurationInput', 'timerTextPatternInput', 'timerBgColor', 'timerTextColor',
        'stockScarcityToggle', 'stockQtyInput', 'stockStyleSelect', 'stockTextPattern', 'stockColorInput',
        'ctaTextInput', 'ctaShapeSelect', 'ctaAnimationSelect', 'ctaColorInput',
        'whatsappSupportToggle', 'whatsappNumberInput', 'whatsappStyleSelect', 'whatsappTextInput', 'whatsappPosSelect', 'whatsappColorInput',
        'formCtaTextInput', 'formCtaIconSelect',
        'tyTitleInput', 'tyMsgInput', 'tyBtnTextInput', 'tyRedirectToggle', 'tyBtnLinkInput', 'tyBtnIconSelect', 'tyBtnColorInput'
    ];

    inputsToWatch.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePreview);
            el.addEventListener('change', updatePreview);
        }
    });

    // Radio Buttons Livraison
    document.querySelectorAll('input[name="shippingMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const priceCont = document.getElementById('shippingPriceContainer');
            const textCont = document.getElementById('shippingCustomTextContainer');
            if(priceCont) priceCont.classList.add('d-none');
            if(textCont) textCont.classList.add('d-none');

            if(e.target.value === 'fixed' && priceCont) priceCont.classList.remove('d-none');
            if(e.target.value === 'custom' && textCont) textCont.classList.remove('d-none');
            updatePreview();
        });
    });

    // Toggles Sections
    const toggleSettings = (toggleId, settingsId) => {
        const toggle = document.getElementById(toggleId);
        const settings = document.getElementById(settingsId);
        if(toggle && settings) {
            toggle.addEventListener('change', (e) => {
                e.target.checked ? settings.classList.remove('d-none') : settings.classList.add('d-none');
                updatePreview();
            });
        }
    };
    toggleSettings('whatsappSupportToggle', 'whatsappSettings');
    toggleSettings('stockScarcityToggle', 'stockScarcitySettings');
    toggleSettings('tyRedirectToggle', 'tyRedirectSettings');

    // Affichage options WhatsApp (Bouton vs Icone)
    const waStyle = document.getElementById('whatsappStyleSelect');
    const waTextGroup = document.getElementById('waTextGroup');
    if(waStyle && waTextGroup) {
        waStyle.addEventListener('change', (e) => {
            e.target.value === 'button' ? waTextGroup.classList.remove('d-none') : waTextGroup.classList.add('d-none');
            updatePreview(); // Force update pour changer l'affichage
        });
    }

    // Image Upload
    document.getElementById('productImageInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                uploadedImageURL = evt.target.result;
                const img = document.getElementById('previewImage');
                const ph = document.getElementById('previewImagePlaceholder');
                if(img) { img.src = uploadedImageURL; img.style.display = 'block'; }
                if(ph) ph.classList.add('d-none');
            };
            reader.readAsDataURL(file);
        }
    });

    // Bouton Ajouter Offre
    document.getElementById('addOfferBtn')?.addEventListener('click', addNewOffer);
}

// --- GESTION OFFRES ---
function renderOffersEditor() {
    const tbody = document.getElementById('offersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    offers.forEach((o, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="form-control form-control-sm text-center" value="${o.qty}" onchange="updOffer(${i}, 'qty', this.value)"></td>
            <td><input type="text" class="form-control form-control-sm" value="${o.name}" onchange="updOffer(${i}, 'name', this.value)"></td>
            <td><input type="number" class="form-control form-control-sm text-end" value="${o.price}" onchange="updOffer(${i}, 'price', this.value)"></td>
            <td class="text-center"><input type="radio" name="def" ${o.isDefault ? 'checked' : ''} onchange="setDef(${i})"></td>
            <td class="text-end"><button class="btn btn-sm text-danger border-0" onclick="remOffer(${i})"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}
window.updOffer = (i, f, v) => { offers[i][f] = (f === 'name' ? v : parseInt(v)); updatePreview(); };
window.setDef = (i) => { offers.forEach((o, x) => o.isDefault = (x === i)); updatePreview(); };
window.remOffer = (i) => { offers.splice(i, 1); renderOffersEditor(); updatePreview(); };
window.addNewOffer = () => { offers.push({ id: Date.now(), qty: 1, name: "Nouvelle Offre", price: 10000, isDefault: false }); renderOffersEditor(); updatePreview(); };


// --- PREVIEW ---
function updatePreview() {
    // 1. TIMER
    const showTimer = getCheck('timerToggle');
    const timerPos = getVal('timerPositionSelect');
    const timerInForm = getCheck('timerShowInForm');
    const duration = getVal('timerDurationInput', '15');
    const textPattern = getVal('timerTextPatternInput', 'Expire dans :');
    const bgColor = getVal('timerBgColor', '#fcd34d');
    const txtColor = getVal('timerTextColor', '#78350f');
    const style = getVal('timerStyleSelect', 'pill');

    const containers = {
        topbar: document.getElementById('previewTimerTop'),
        floating: document.getElementById('previewTimerFloating'),
        inline: document.getElementById('previewTimerInline'),
        form: document.getElementById('previewTimerForm')
    };

    Object.values(containers).forEach(el => { if(el) el.classList.add('d-none'); });

    const generateTimerHTML = (isMinimal = false) => {
        const timeDisplay = `<span style="font-family:monospace; font-size:1.1em;">${duration}:00</span>`;
        let css = `color:${txtColor};`;
        if (!isMinimal) css += `background:${bgColor};`;
        if (style === 'pill' && !isMinimal) css += 'border-radius: 50px; padding: 5px 15px;';
        if (style === 'box' && !isMinimal) css += 'border-radius: 4px; padding: 8px 12px;';
        return `<div style="${css}" class="shadow-sm d-inline-block"><i class="fas fa-clock me-1"></i> ${textPattern} ${timeDisplay}</div>`;
    };

    if (showTimer) {
        if (timerPos !== 'none' && containers[timerPos]) {
            containers[timerPos].classList.remove('d-none');
            if (timerPos === 'topbar') {
                containers[timerPos].style.background = bgColor;
                containers[timerPos].style.color = txtColor;
                containers[timerPos].innerHTML = `<i class="fas fa-clock me-1"></i> ${textPattern} ${duration}:00`;
            } else {
                containers[timerPos].innerHTML = generateTimerHTML(style === 'minimal');
            }
        }
        if (timerInForm && containers.form) {
            containers.form.classList.remove('d-none');
            containers.form.innerHTML = generateTimerHTML(false);
            if(containers.form.firstElementChild) containers.form.firstElementChild.style.width = "100%";
        }
    }

    // 2. STOCK SCARCITY
    const showStock = getCheck('stockScarcityToggle');
    const stockContainer = document.getElementById('previewStockBar');
    if(stockContainer) {
        if (!showStock) {
            stockContainer.classList.add('d-none');
        } else {
            stockContainer.classList.remove('d-none');
            const stockInputQty = parseInt(getVal('stockQtyInput', '7'));
            const stockStyle = getVal('stockStyleSelect', 'bar');
            const stockTxtPattern = getVal('stockTextPattern', 'Vite ! {stock} restants.');
            const stockColor = getVal('stockColorInput', '#dc2626');

            // Simulation simple : on affiche le max défini dans l'éditeur pour la preview
            // Dans la landing réelle, ce sera aléatoire si codé ainsi
            const finalText = stockTxtPattern.replace('{stock}', `<strong style="font-size:1.1em">${stockInputQty}</strong>`);

            let html = '';
            if (stockStyle === 'bar') {
                html = `<div class="d-flex justify-content-between small mb-1 fw-bold" style="color:${stockColor}">${finalText}</div>
                        <div class="progress" style="height: 8px; background-color: #e5e7eb;"><div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 85%; background-color: ${stockColor};"></div></div>`;
            } else if (stockStyle === 'pulse') {
                html = `<div class="d-inline-block px-3 py-2 rounded-pill fw-bold animate__animated animate__pulse animate__infinite" style="background-color: ${stockColor}20; color: ${stockColor}; border: 1px solid ${stockColor};">${finalText}</div>`;
            } else {
                html = `<div class="fw-bold py-2 border-bottom border-top" style="color:${stockColor}; border-color:${stockColor}20 !important;">${finalText}</div>`;
            }
            stockContainer.innerHTML = html;
        }
    }

    // 3. OFFRES
    const offerStyle = getVal('offersStyleSelect', 'modern-card');
    const offersContainer = document.getElementById('previewOffersList');
    if(offersContainer) {
        if (offerStyle === 'list') {
            offersContainer.className = 'd-flex flex-column gap-2';
            offersContainer.innerHTML = offers.map(o => renderOfferCard(o, false)).join('');
        } else if (offerStyle === 'modern-card') {
            offersContainer.className = 'row g-2';
            offersContainer.innerHTML = offers.map(o => `<div class="col-6">${renderOfferCard(o, true)}</div>`).join('');
        } else if (offerStyle === 'highlight') {
            offersContainer.className = 'd-flex flex-column gap-2';
            const sorted = [...offers].sort((a,b) => (b.isDefault === true) - (a.isDefault === true));
            offersContainer.innerHTML = sorted.map(o => renderOfferCard(o, false, o.isDefault)).join('');
        }
    }

    // 4. LIVRAISON
    const shipMode = document.querySelector('input[name="shippingMode"]:checked')?.value || 'free';
    const shipDisplay = document.getElementById('previewShippingDisplay');
    if(shipDisplay) {
        if (shipMode === 'free') {
            shipDisplay.innerHTML = '<i class="fas fa-truck me-1"></i> Livraison GRATUITE';
            shipDisplay.className = 'small fw-bold text-success text-center mb-3';
        } else if (shipMode === 'fixed') {
            const amount = getVal('shippingPriceInput', '0');
            shipDisplay.innerHTML = `<i class="fas fa-truck me-1"></i> Livraison : ${amount} FCFA`;
            shipDisplay.className = 'small fw-bold text-dark text-center mb-3';
        } else { 
            const txt = getVal('shippingCustomTextInput', 'Info Livraison');
            shipDisplay.innerHTML = `<i class="fas fa-info-circle me-1"></i> ${txt}`;
            shipDisplay.className = 'small fw-bold text-primary text-center mb-3';
        }
    }

    // 5. BOUTONS FLOTTANTS (CTA & WHATSAPP)
    updateFloatingButtons();

    // 6. FORMULAIRE
    const formText = getVal('formCtaTextInput', 'VALIDER');
    const formIcon = getVal('formCtaIconSelect', 'check');
    const formBtn = document.getElementById('previewFormSubmitBtn');
    if(formBtn) formBtn.innerHTML = `<i class="fas fa-${formIcon} me-2"></i> ${formText}`;
}

function updateFloatingButtons() {
    // CTA Principal
    const ctaText = getVal('ctaTextInput', 'COMMANDER');
    const ctaShape = getVal('ctaShapeSelect', 'pill');
    const ctaAnim = getVal('ctaAnimationSelect', 'pulse');
    const ctaColor = getVal('ctaColorInput', '#dc2626');
    
    const ctaBtn = document.getElementById('previewCtaBtn');
    if(ctaBtn) {
        ctaBtn.textContent = ctaText;
        ctaBtn.style.backgroundColor = ctaColor;
        
        // Reset classes mais garder la base
        ctaBtn.className = `floating-btn-wrapper text-center fw-bold text-white py-3 animate__animated`;
        if (ctaShape === 'pill') ctaBtn.classList.add('rounded-pill');
        else ctaBtn.classList.add('rounded-3');
        if (ctaAnim !== 'none') ctaBtn.classList.add(`animate__${ctaAnim}`, 'animate__infinite');
    }

    // WhatsApp
    const showWa = getCheck('whatsappSupportToggle');
    const waStyle = getVal('whatsappStyleSelect', 'button'); // icon or button
    const waPos = getVal('whatsappPosSelect', 'right'); // right, left, above
    const waColor = getVal('whatsappColorInput', '#25D366');
    const waText = getVal('whatsappTextInput', 'WhatsApp');
    
    const waBtnLarge = document.getElementById('previewWaButtonLarge');
    const waIcon = document.getElementById('previewWaIcon');

    if(waBtnLarge) waBtnLarge.classList.add('d-none');
    if(waIcon) {
        waIcon.classList.add('d-none');
        waIcon.classList.remove('wa-left', 'wa-right');
    }

    if (showWa) {
        if (waStyle === 'button') {
            // Bouton Large (au dessus du CTA)
            if(waBtnLarge) {
                waBtnLarge.classList.remove('d-none');
                waBtnLarge.style.backgroundColor = waColor;
                const span = waBtnLarge.querySelector('span');
                if(span) span.textContent = waText;
            }
        } else {
            // Icône Flottante
            if(waIcon) {
                waIcon.classList.remove('d-none');
                waIcon.style.backgroundColor = waColor;
                // Position
                if (waPos === 'left') waIcon.classList.add('wa-left');
                else waIcon.classList.add('wa-right'); 
            }
        }
    }
}

// --- HELPER RENDU OFFRES ---
function renderOfferCard(o, isCompact, isHighlight = false) {
    const borderClass = o.isDefault ? 'border-danger bg-danger bg-opacity-10' : 'border-light bg-white';
    const highlightStyle = isHighlight ? 'border: 2px solid #dc2626; transform: scale(1.02); box-shadow: 0 4px 12px rgba(220,38,38,0.15);' : '';
    const badgeHTML = isHighlight ? `<div class="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-danger text-uppercase" style="font-size:0.6rem;">Best Seller</div>` : '';

    return `
        <div class="p-2 border rounded ${borderClass} cursor-pointer position-relative" style="${highlightStyle}">
            ${badgeHTML}
            <div class="d-flex align-items-center justify-content-between ${isCompact ? 'flex-column text-center' : ''}">
                <div class="d-flex align-items-center">
                    <input type="radio" class="form-check-input me-2" name="previewOffer" ${o.isDefault ? 'checked' : ''}>
                    <div>
                        <div class="fw-bold text-dark ${isCompact ? 'small' : ''}">${o.name}</div>
                        <div class="text-muted" style="font-size: 0.7rem;">${o.qty} Unité(s)</div>
                    </div>
                </div>
                <div class="fw-bold text-danger ${isCompact ? 'mt-1' : ''}">${new Intl.NumberFormat('fr-FR').format(o.price)} FCFA</div>
            </div>
        </div>
    `;
}

// --- ACTIONS MODALE PREVIEW ---
window.openConversionModal = () => {
    const m = document.getElementById('conversionModal');
    if(m) m.classList.add('active');
};
window.closeConversionModal = () => {
    const m = document.getElementById('conversionModal');
    if(m) m.classList.remove('active');
};

// --- SAUVEGARDE & PUBLICATION ---
window.simPreview = function() {
    saveDataAndOpen('landing.html');
};

window.simPublish = function() {
    saveDataAndOpen(null); // Save only
    const btn = document.getElementById('saveAndPublishBtn');
    if(btn) {
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Publié !';
        btn.className = "btn btn-dark rounded-pill px-4 shadow-sm fw-bold";
        
        setTimeout(() => {
            btn.innerHTML = original;
            btn.className = "btn btn-success rounded-pill px-4 shadow-sm fw-bold";
            alert("Votre page a été mise à jour avec succès !");
        }, 1500);
    }
};

function saveDataAndOpen(url) {
    // Collecte Sécurisée
    const data = {
        // Produit
        productName: getVal('productSourceInput', 'Produit'),
        image: uploadedImageURL,
        offers: offers,
        offersStyle: getVal('offersStyleSelect', 'modern-card'),
        
        // Livraison
        shippingMode: document.querySelector('input[name="shippingMode"]:checked')?.value || 'free',
        shippingPrice: getVal('shippingPriceInput', '0'),
        shippingText: getVal('shippingCustomTextInput', ''),
        
        // Timer
        timerEnabled: getCheck('timerToggle'),
        timerPosition: getVal('timerPositionSelect', 'topbar'),
        timerInForm: getCheck('timerShowInForm'),
        timerStyle: getVal('timerStyleSelect', 'pill'),
        timerDuration: getVal('timerDurationInput', '15'),
        timerText: getVal('timerTextPatternInput', 'Expire dans :'),
        timerBg: getVal('timerBgColor', '#fcd34d'),
        timerColor: getVal('timerTextColor', '#78350f'),
        
        // Stock
        stockEnabled: getCheck('stockScarcityToggle'),
        stockQty: getVal('stockQtyInput', '7'),
        stockStyle: getVal('stockStyleSelect', 'bar'),
        stockText: getVal('stockTextPattern', 'Vite ! {stock} restants.'),
        stockColor: getVal('stockColorInput', '#dc2626'),
        stockType: 'random', // Par défaut, on force l'aléatoire pour la landing réelle

        // CTA
        ctaText: getVal('ctaTextInput', 'COMMANDER'),
        ctaShape: getVal('ctaShapeSelect', 'pill'),
        ctaAnimation: getVal('ctaAnimationSelect', 'pulse'),
        ctaColor: getVal('ctaColorInput', '#dc2626'),
        
        // WhatsApp
        whatsappEnabled: getCheck('whatsappSupportToggle'),
        whatsappNumber: getVal('whatsappNumberInput', ''),
        whatsappStyle: getVal('whatsappStyleSelect', 'button'),
        whatsappText: getVal('whatsappTextInput', 'WhatsApp'),
        whatsappPos: getVal('whatsappPosSelect', 'right'),
        whatsappColor: getVal('whatsappColorInput', '#25D366'),
        
        // Formulaire
        formCtaText: getVal('formCtaTextInput', 'VALIDER'),
        formCtaIcon: getVal('formCtaIconSelect', 'check'),
        
        // Tracking
        pixelFbId: getVal('pixelFbId'),
        pixelFbEvent: getVal('pixelFbEvent', 'Purchase'),
        pixelTtId: getVal('pixelTtId'),
        pixelTtEvent: getVal('pixelTtEvent', 'CompletePayment'),
        pixelGgId: getVal('pixelGgId'),
        
        // Thank You
        tyRedirectEnabled: getCheck('tyRedirectToggle'),
        tyStyle: document.querySelector('input[name="tyStyle"]:checked')?.value || 'card',
        tyTitle: getVal('tyTitleInput', 'Merci'),
        tyMsg: getVal('tyMsgInput', 'Commande reçue'),
        tyBtnText: getVal('tyBtnTextInput', 'Rejoindre VIP'),
        tyBtnLink: getVal('tyBtnLinkInput', '#'),
        tyBtnIcon: getVal('tyBtnIconSelect', 'whatsapp'),
        tyBtnColor: getVal('tyBtnColorInput', '#16a34a')
    };
    
    localStorage.setItem('winkshop_landing_data', JSON.stringify(data));
    
    if (url) {
        const win = window.open(url, '_blank');
        if(!win) alert("Veuillez autoriser les popups.");
    }
}