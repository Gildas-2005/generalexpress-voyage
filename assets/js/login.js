const authForm = document.getElementById('authForm');

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const nom = document.getElementById('nom')?.value; // Uniquement pour l'inscription

    const isLogin = document.getElementById('authBtn').innerText === "Se connecter";
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
        const response = await fetch(`https://votre-api-render.com${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (isLogin) {
                // SÉCURITÉ : On stocke le Token et le Nom
                localStorage.setItem('token', data.token);
                localStorage.setItem('userName', data.user.nom);
                
                alert(`Ravi de vous revoir, ${data.user.nom} !`);
                window.location.href = 'reservations.html'; // On l'envoie réserver
            } else {
                alert("Compte créé ! Vous pouvez maintenant vous connecter.");
                location.reload(); // Recharge pour qu'il se connecte
            }
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Erreur technique:", error);
        alert("Le serveur de voyage ne répond pas. Vérifiez votre connexion.");
    }
});