/**
 * JS HORAIRES - DYNAMIQUE
 * Synchronisation avec l'API General Express
 */

const API_ENDPOINT = "https://generalexpress-voyage-api.onrender.com/api/voyages";
let scheduleData = [];

async function initSchedule() {
    // Afficher la date du jour
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('fr-FR', options);

    await fetchSchedule();
}

async function fetchSchedule() {
    const tbody = document.getElementById('schedule-body');
    
    try {
        const response = await fetch(API_ENDPOINT);
        scheduleData = await response.json();
        
        renderTable(scheduleData);

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">Erreur de connexion au serveur... Tentative de reconnexion.</td></tr>`;
        setTimeout(fetchSchedule, 5000);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('schedule-body');
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">Aucun départ prévu.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td><i class="fas fa-bus" style="color:#7ab596; margin-right:8px;"></i> ${item.depart}</td>
            <td><strong>${item.arrivee}</strong></td>
            <td><i class="far fa-clock"></i> ${item.heure_depart.substring(0,5)}</td>
            <td><span style="font-size:0.8rem; color:#64748b;">${item.populaire ? 'PREMIUM' : 'STANDARD'}</span></td>
            <td><span class="status ${getStatusClass(item.heure_depart)}">${getStatusLabel(item.heure_depart)}</span></td>
            <td><a href="reservations.html" class="btn-book-small">Réserver</a></td>
        </tr>
    `).join('');
}

// Logique pour simuler un statut selon l'heure (Architecture UX)
function getStatusClass(time) {
    const hour = parseInt(time.split(':')[0]);
    if (hour > 18) return 'departed';
    if (hour > 12) return 'boarding';
    return 'on-time';
}

function getStatusLabel(time) {
    const hour = parseInt(time.split(':')[0]);
    if (hour > 18) return 'DÉPARTI';
    if (hour > 12) return 'EMBARQUEMENT';
    return 'À L\'HEURE';
}

function filterSchedule() {
    const query = document.getElementById('scheduleSearch').value.toLowerCase();
    const filtered = scheduleData.filter(item => 
        item.arrivee.toLowerCase().includes(query) || 
        item.depart.toLowerCase().includes(query)
    );
    renderTable(filtered);
}

document.addEventListener('DOMContentLoaded', initSchedule);