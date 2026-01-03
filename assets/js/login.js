/**
 * JS LOGIN - AUTHENTICATION LOGIC
 */

function switchTab(type) {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));

    if(type === 'login') {
        tabs[0].classList.add('active');
        forms[0].classList.add('active');
    } else {
        tabs[1].classList.add('active');
        forms[1].classList.add('active');
    }
}

// SIMULATION DE CONNEXION
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    handleSuccess("Gildas Ngoumkwe"); // Simulation avec le nom fourni
});

document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    handleSuccess(name);
});

function handleSuccess(userName) {
    // 1. Faire disparaître le formulaire
    document.getElementById('auth-box').style.display = 'none';
    
    // 2. Afficher la zone de succès
    document.getElementById('success-box').style.display = 'block';
    document.getElementById('welcome-msg').innerText = "Bienvenue, " + userName + " !";

    // 3. Modifier la Navbar (Le login disparaît)
    const navAuth = document.getElementById('nav-auth');
    navAuth.innerHTML = `<span class="user-logged"><i class="fas fa-user-circle"></i> ${userName}</span>`;
    
    // Optionnel : Enregistrer dans le stockage local
    localStorage.setItem('user', userName);
}

function logout() {
    localStorage.removeItem('user');
    location.reload(); // Recharge la page pour réinitialiser
}

// Vérifier si déjà connecté au chargement
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('user');
    if(savedUser) handleSuccess(savedUser);
});