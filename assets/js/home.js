/**
 * ARCHITECTURE HOME.JS
 * Responsabilité : Gérer les interactions de l'accueil et le fetch des données populaires.
 */

const API_CONFIG = {
    BASE_URL: "https://generalexpress-voyage-api.onrender.com/api",
    TIMEOUT: 10000
};

async function initHome() {
    console.log("🚀 Initialisation de l'architecture Accueil...");
    await fetchPopularDestinations();
}

/**
 * Récupère les voyages avec le flag 'populaire'
 */
async function fetchPopularDestinations() {
    const container = document.getElementById('popular-container');
    
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/voyages`);
        if (!response.ok) throw new Error("Réponse API instable");
        
        const voyages = await response.json();
        const populaires = voyages.filter(v => v.populaire === 1);

        renderPopular(populaires, container);
    } catch (error) {
        console.error("❌ Erreur Architecturale:", error);
        container.innerHTML = `
            <div class="error-msg">
                <i class="fas fa-exclamation-triangle"></i>
                Le serveur se réveille. Merci de patienter 30 secondes...
            </div>`;
    }
}

/**
 * Injection propre dans le DOM avec templates
 */
function renderPopular(data, target) {
    if (data.length === 0) {
        target.innerHTML = "<p>Aucune promotion disponible pour le moment.</p>";
        return;
    }

    target.innerHTML = data.map(v => `
        <article class="dest-card animate-in">
            <div class="dest-img">
                <img src="${v.image_url}" alt="${v.arrivee}" loading="lazy">
                <span class="badge">Promotion</span>
            </div>
            <div class="card-body" style="padding: 20px;">
                <h3 style="margin-bottom: 10px;">${v.depart} <i class="fas fa-long-arrow-alt-right"></i> ${v.arrivee}</h3>
                <div class="prices" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="display: block; font-size: 0.7rem; color: #999;">À partir de</span>
                        <strong style="font-size: 1.2rem; color: var(--orange);">${v.prix_classique} FCFA</strong>
                    </div>
                    <a href="reservations.html" class="btn-circle"><i class="fas fa-chevron-right"></i></a>
                </div>
            </div>
        </article>
    `).join('');
}

// Lancement au chargement du DOM
document.addEventListener('DOMContentLoaded', initHome);