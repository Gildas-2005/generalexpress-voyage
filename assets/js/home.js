const API_URL = "https://generalexpress-voyage-api.onrender.com/api/voyages";

async function fetchPopularTrips() {
    const container = document.getElementById('popular-container');

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Erreur de connexion");

        const data = await response.json();
        
        // On filtre uniquement les trajets populaires (populaire = 1) et on en prend 4
        const populaires = data.filter(trip => trip.populaire === 1).slice(0, 4);

        if (populaires.length === 0) {
            container.innerHTML = "<p>Aucun trajet populaire trouvé.</p>";
            return;
        }

        container.innerHTML = ""; // On vide le chargeur

        populaires.forEach(v => {
            container.innerHTML += `
                <article class="travel-card">
                    <img src="${v.image_url}" class="card-img" alt="${v.arrivee}">
                    <div class="card-content">
                        <h3>${v.depart} <i class="fas fa-arrow-right" style="font-size:0.8rem; color:#7ab596;"></i> ${v.arrivee}</h3>
                        <p style="font-size:0.8rem; color:#888; margin-bottom:10px;"><i class="far fa-clock"></i> Départ: ${v.heure_depart.substring(0,5)}</p>
                        <div class="card-footer">
                            <span class="price">${v.prix_classique} FCFA</span>
                            <a href="reservations.html" class="btn-details">Réserver <i class="fas fa-chevron-right"></i></a>
                        </div>
                    </div>
                </article>
            `;
        });

    } catch (error) {
        console.error("API Error:", error);
        container.innerHTML = `
            <div class="loader-box">
                <i class="fas fa-sync fa-spin"></i>
                <p>Le serveur se réveille (Render)...<br>Affichage des trajets dans quelques secondes.</p>
            </div>`;
        // Réessayer après 5 secondes car Render met du temps à démarrer
        setTimeout(fetchPopularTrips, 5000);
    }
}

// Lancer la fonction au chargement
document.addEventListener('DOMContentLoaded', fetchPopularTrips);