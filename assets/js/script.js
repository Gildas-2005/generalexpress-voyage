const API_URL = "https://generalexpress-voyage-api.onrender.com/api/voyages";

async function loadDestinations() {
    const container = document.getElementById('popular-container');
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        // On prend les 4 premiers
        const items = data.slice(0, 4);

        container.innerHTML = items.map(trip => `
            <div class="card">
                <img src="${trip.image_url}" alt="bus">
                <div class="card-content">
                    <h3>${trip.depart} - ${trip.arrivee}</h3>
                    <p style="color: #7ab596; font-weight: bold;">${trip.prix_classique} FCFA</p>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = "<p>Connexion au serveur...</p>";
    }
}

document.addEventListener('DOMContentLoaded', loadDestinations);