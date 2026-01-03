function rechercherVoyage() {


function updateMenu() {
    const userName = localStorage.getItem('userName');
    const loginBtn = document.querySelector('.btn-login');

    if (userName && loginBtn) {
        loginBtn.innerHTML = `<i class="fas fa-user"></i> ${userName}`;
        loginBtn.style.background = "#27ae60"; // Vert pour dire "Connecté"
        loginBtn.href = "#"; // Évite de retourner au login
        
        // Ajouter un bouton de déconnexion si nécessaire
    }
}
updateMenu();

    const depart = document.getElementById('depart').value;
    const arrivee = document.getElementById('arrivee').value;
    const date = document.getElementById('date-voyage').value;

    if(!depart || !arrivee || !date) {
        alert("Veuillez remplir tous les champs pour rechercher un voyage.");
        return;
    }

    // On stocke les choix pour les utiliser sur la page réservations
    localStorage.setItem('recherche_depart', depart);
    localStorage.setItem('recherche_arrivee', arrivee);
    
    // On redirige vers l'onglet réservations
    window.location.href = "reservations.html";
    
    
}