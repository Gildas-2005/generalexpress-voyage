// CONFIGURATION INNOVANTE : Détection de l'environnement
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://generalexpress-voyage-api.onrender.com/api';

let tousLesVoyages = []; // Mémoire vive pour le filtrage instantané

document.addEventListener('DOMContentLoaded', () => {
    fetchVoyages();
});

/**
 * Récupère les données depuis Render/Aiven de manière asynchrone
 */
async function fetchVoyages() {
    const container = document.getElementById('voyages-list');

    try {
        const response = await fetch(`${API_URL}/voyages`);
        
        if (!response.ok) throw new Error('Erreur réseau');
        
        tousLesVoyages = await response.json();
        afficherVoyages(tousLesVoyages);

    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = `
            <div class="error-msg">
                <i class="fas fa-wifi-slash"></i>
                <p>Connexion au serveur interrompue. Veuillez réessayer dans quelques instants.</p>
                <button onclick="location.reload()" class="btn-book">Actualiser</button>
            </div>`;
    }
}

/**
 * Génère le HTML pour chaque carte (Créativité & Performance)
 */
function afficherVoyages(data) {
    const container = document.getElementById('voyages-list');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = "<p class='no-result'>Aucun voyage ne correspond à votre recherche.</p>";
        return;
    }

    data.forEach(voyage => {
        const card = document.createElement('div');
        card.className = 'voyage-card animate-fade-in';
        
        // Structure Haute Gamme
        card.innerHTML = `
            <div class="voyage-tag ${voyage.classe === 'VIP' ? 'tag-vip' : 'tag-std'}">${voyage.classe}</div>
            <div class="img-wrapper">
                <img src="${voyage.image_url || 'https://images.unsplash.com/photo-1544672336-d7318e9b5d0b?w=800'}" alt="Bus">
            </div>
            <div class="voyage-body">
                <div class="route">
                    <span>${voyage.depart}</span>
                    <i class="fas fa-long-arrow-alt-right"></i>
                    <span>${voyage.arrivee}</span>
                </div>
                <div class="info-row">
                    <span><i class="far fa-clock"></i> ${voyage.heure_depart.substring(0, 5)}</span>
                    <span class="price-tag">${voyage.prix.toLocaleString()} FCFA</span>
                </div>
                <div class="seat-info">
                    <div class="progress-bar"><div class="fill" style="width: ${Math.random() * 100}%"></div></div>
                    <small>Places disponibles : ${voyage.places_disponibles}</small>
                </div>
                <button class="btn-reserve" onclick="selectionnerVoyage(${voyage.id})">
                    RÉSERVER MAINTENANT
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Filtrage innovant sans recharger la page
 */
function filtrerVoyages() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const classVal = document.getElementById('classFilter').value;

    const filtered = tousLesVoyages.filter(v => {
        const matchesSearch = v.depart.toLowerCase().includes(searchVal) || v.arrivee.toLowerCase().includes(searchVal);
        const matchesClass = classVal === 'all' || v.classe === classVal;
        return matchesSearch && matchesClass;
    });

    afficherVoyages(filtered);
}

function selectionnerVoyage(id) {
    localStorage.setItem('pending_reservation_id', id);
    // Redirection vers login avec une petite animation ou message
    window.location.href = 'login.html';
}