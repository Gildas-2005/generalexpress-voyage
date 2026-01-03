/**
 * JS CONTACT - VALIDATION & ENVOI
 */

document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const status = document.getElementById('formStatus');
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    // Simulation d'envoi (Architecture UX)
    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    
    setTimeout(() => {
        if (name.length > 2 && email.includes('@')) {
            status.innerHTML = '<span class="success">Merci ' + name + ', votre message a été envoyé avec succès !</span>';
            document.getElementById('contactForm').reset();
        } else {
            status.innerHTML = '<span class="error">Veuillez remplir les champs correctement.</span>';
        }
    }, 1500);
});