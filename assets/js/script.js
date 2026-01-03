const API_URL = "https://generalexpress-voyage-api.onrender.com/api/voyages";

async function loadData() {
    const container = document.getElementById('popular-container');
    
    try {
        const response = await fetch(API_URL);
        const voyages = await response.json();
        
        // On affiche les 4 premiers voyages populaires
        const display = voyages.filter(v => v.populaire === 1).slice(0, 4);

        container.innerHTML = display.map(v => `
            <div class="dest-card">
                <img src="${v.image_url}" alt="${v.arrivee}">
                <div class="dest-info">
                    <span style="float:right; color:var(--green); font-weight:bold; font-size:0.8rem;">En savoir plus</span>
                    <h3>${v.depart} - ${v.arrivee}</h3>
                    <p style="font-size:0.75rem; color:#777;">Dès ${v.prix} FCFA</p>
                </div>
            </div>
        `).join('');

    } catch (err) {
        container.innerHTML = "<p>Chargement des offres...</p>";
    }
}

document.addEventListener('DOMContentLoaded', loadData);