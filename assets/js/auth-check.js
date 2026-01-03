// Ce script vérifie si l'utilisateur est connecté
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token'); // On cherche la clé de sécurité

    // Si on est sur la page de réservation et qu'il n'y a pas de token
    if (window.location.pathname.includes('reservations.html') && !token) {
        alert("Pour garantir votre sécurité et valider votre billet, merci de vous connecter.");
        window.location.href = 'login.html'; // Redirection forcée
    }
});