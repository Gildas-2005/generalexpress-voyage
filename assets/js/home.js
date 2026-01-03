// L'ASTUCE : Mets ton lien Render ici
const API_URL = "https://generalexpress-voyage-api.onrender.com/api"; 

async function chargerAccueil() {
    const container = document.getElementById('popular-container');
    if (!container) return; // Sécurité si l'ID n'est pas trouvé

    try {
        const response = await fetch(`${API_URL}/voyages`);
        const voyages = await response.json();

        // On filtre pour n'afficher que les trajets populaires sur l'accueil
        const populaires = voyages.filter(v => v.populaire === 1);

        container.innerHTML = ""; // On nettoie le message vide

        populaires.forEach(v => {
            // On injecte les cartes en respectant ton nouveau style Classique/VIP
            container.innerHTML += `
                <div class="voyage-card">
                    <div class="img-wrapper">
                        <img src="${v.image_url}" alt="${v.arrivee}">
                        <span class="badge-pop">POPULAIRE</span>
                    </div>
                    <div style="padding:15px">
                        <h3 style="margin:0">${v.depart} <i class="fas fa-arrow-right" style="font-size:0.8rem; color:var(--gold)"></i> ${v.arrivee}</h3>
                        <p style="font-size:0.8rem; color:gray; margin-top:5px">
                            <i class="far fa-clock"></i> Départ: ${v.heure_depart.substring(0,5)}
                        </p>
                    </div>
                    <div class="price-container">
                        <div class="price-box">
                            <span>CLASSIQUE</span>
                            <strong>${v.prix_classique.toLocaleString()} F</strong>
                        </div>
                        <div class="price-box vip">
                            <span>VIP</span>
                            <strong>${v.prix_vip.toLocaleString()} F</strong>
                        </div>
                    </div>
                    <button class="btn-reserve" onclick="window.location.href='reservations.html'">
                        RÉSERVER MAINTENANT
                    </button>
                </div>
            `;
        });

    } catch (error) {
        console.error("Erreur de chargement accueil:", error);
        container.innerHTML = "<p style='text-align:center; width:100%;'>Connexion au serveur Général Express en cours...</p>";
    }
}

// Lancement automatique au chargement de la page
document.addEventListener('DOMContentLoaded', chargerAccueil);