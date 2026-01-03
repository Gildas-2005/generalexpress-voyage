const API_URL = "https://generalexpress-voyage-api.onrender.com/api/voyages";

async function searchBuses() {
    const container = document.getElementById('bus-results');
    const origin = document.getElementById('origin').value;
    const dest = document.getElementById('destination').value;

    container.innerHTML = "<div class='info-msg'>Recherche des bus en cours...</div>";

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Filtrer par destination choisie
        const results = data.filter(bus => bus.arrivee.toLowerCase() === dest.toLowerCase());

        if(results.length === 0) {
            container.innerHTML = "<div class='info-msg'>Désolé, aucun bus trouvé pour ce trajet aujourd'hui.</div>";
            return;
        }

        container.innerHTML = results.map(bus => `
            <div class="bus-card ${bus.populaire ? 'vip' : ''}">
                <div class="bus-time">
                    <h2>${bus.heure_depart.substring(0,5)}</h2>
                    <p>Départ</p>
                </div>
                <div class="bus-info">
                    <span class="badge" style="color:${bus.populaire ? '#f37021' : '#7ab596'}">
                        ${bus.populaire ? 'BUS VIP CLIMATISÉ' : 'BUS CLASSIQUE'}
                    </span>
                    <h3>${bus.depart} <i class="fas fa-arrow-right"></i> ${bus.arrivee}</h3>
                    <p style="font-size:0.8rem; color:#666;"><i class="fas fa-wifi"></i> WiFi & Prises USB disponibles</p>
                </div>
                <div class="bus-price">
                    <span class="price-tag">${bus.prix_classique} FCFA</span>
                    <button class="btn-select" onclick="generateTicket('${bus.depart}', '${bus.arrivee}')">Réserver</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = "<div class='info-msg'>Erreur de connexion au terminal.</div>";
    }
}

function generateTicket(dep, arr) {
    document.getElementById('t-route').innerText = dep + " - " + arr;
    document.getElementById('ticketModal').style.display = 'block';
}

function closeTicket() {
    document.getElementById('ticketModal').style.display = 'none';
}

// Fermer la modale si on clique à côté
window.onclick = function(event) {
    if (event.target == document.getElementById('ticketModal')) closeTicket();
}