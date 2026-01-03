const API_URL = "https://generalexpress-voyage-api.onrender.com/api"; // L'astuce de tout à l'heure !

async function loadPopularVoyages() {
    const container = document.getElementById('popular-container');
    
    try {
        const response = await fetch(`${API_URL}/voyages`);
        const data = await response.json();
        
        // Filtrer uniquement les voyages populaires
        const populaires = data.filter(v => v.populaire === 1);
        
        container.innerHTML = ""; // On enlève le loader

        populaires.forEach(v => {
            container.innerHTML += `
                <div class="voyage-card">
                    <div class="img-wrapper">
                        <img src="${v.image_url}" alt="${v.arrivee}">
                        <span class="badge-pop">TOP DESTINATION</span>
                    </div>
                    <div style="padding: 20px;">
                        <h3 style="margin:0">${v.depart} <i class="fas fa-arrow-right" style="color:var(--gold)"></i> ${v.arrivee}</h3>
                        <p style="color:#666; font-size:0.9rem"><i class="far fa-clock"></i> Départ: ${v.heure_depart.substring(0,5)}</p>
                    </div>
                    <div class="price-container">
                        <div class="price-box">
                            <span class="label">CLASSIQUE</span>
                            <span class="amount">${v.prix_classique} F</span>
                        </div>
                        <div class="price-box vip">
                            <span class="label">VIP</span>
                            <span class="amount">${v.prix_vip} F</span>
                        </div>
                    </div>
                    <button class="btn-book-home" onclick="window.location.href='reservations.html'">
                        Réserver cette ligne
                    </button>
                </div>
            `;
        });
    } catch (error) {
        container.innerHTML = "<p>Erreur de connexion aux serveurs de l'agence.</p>";
    }
}

document.addEventListener('DOMContentLoaded', loadPopularVoyages);