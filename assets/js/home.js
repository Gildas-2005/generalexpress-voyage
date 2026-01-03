/**
 * ARCHITECTE JS - ACCUEIL
 * Gestion du chargement dynamique des voyages populaires
 */

const API_ENDPOINT = "https://generalexpress-voyage-api.onrender.com/api/voyages";

async function loadPopularDestinations() {
    const container = document.getElementById('popular-container');
    
    try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) throw new Error("Erreur de chargement");

        const data = await response.json();
        
        // On filtre pour n'avoir que les 4 premiers populaires
        const popularTrips = data.filter(trip => trip.populaire === 1).slice(0, 4);

        if (popularTrips.length === 0) {
            container.innerHTML = "<p>Aucune destination disponible pour le moment.</p>";
            return;
        }

        container.innerHTML = popularTrips.map(v => `
            <article class="dest-card">
                <img src="${v.image_url}" alt="${v.arrivee}">
                <div class="dest-body">
                    <h3>${v.depart} - ${v.arrivee}</h3>
                    <p style="color:#888; font-size:0.8rem; margin-bottom:15px;">Départ quotidien • Bus VIP</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:800; color:#f37021;">${v.prix_classique} F</span>
                        <a href="reservations.html" class="btn-reserve">Réserver</a>
                    </div>
                </div>
            </article>
        `).join('');

    } catch (error) {
        console.error("API Offline:", error);
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:40px;">
                <i class="fas fa-sync fa-spin" style="font-size:2rem; color:#f37021; margin-bottom:15px;"></i>
                <p>Connexion au terminal de voyage en cours...<br>Le serveur Render se réveille.</p>
            </div>`;
        // Tentative de reconnexion automatique
        setTimeout(loadPopularDestinations, 5000);
    }
}

document.addEventListener('DOMContentLoaded', loadPopularDestinations);