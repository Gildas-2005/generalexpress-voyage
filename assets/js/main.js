function rechercherVoyage() {
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