const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://generalexpress-voyage-api.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    chargerPlanning();
    // Innovation : Rafraîchissement automatique toutes les 5 minutes
    setInterval(chargerPlanning, 300000); 
});

async function chargerPlanning() {
    const tableBody = document.getElementById('horaires-body');

    try {
        const response = await fetch(`${API_URL}/voyages`);
        const voyages = await response.json();

        tableBody.innerHTML = '';

        if (voyages.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucun départ prévu aujourd\'hui.</td></tr>';
            return;
        }

        voyages.forEach(v => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${v.depart}</strong> <i class="fas fa-arrow-right" style="font-size: 0.8rem; color: var(--gold);"></i> <strong>${v.arrivee}</strong></td>
                <td>${v.heure_depart.substring(0, 5)}</td>
                <td><span style="font-weight: 500;">${v.classe}</span></td>
                <td><span class="status-badge status-ontime">À l'heure</span></td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Erreur horaires:", error);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Erreur de synchronisation avec le serveur.</td></tr>';
    }
}