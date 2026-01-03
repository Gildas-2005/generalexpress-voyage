/**
 * ARCHITECTE JS - À PROPOS
 * Animation de la Timeline au défilement
 */

function handleScrollAnimation() {
    const items = document.querySelectorAll('.timeline-item');
    const triggerBottom = window.innerHeight * 0.85;

    items.forEach(item => {
        const itemTop = item.getBoundingClientRect().top;

        if (itemTop < triggerBottom) {
            item.classList.add('show');
        }
    });
}

// Lancer au chargement et au scroll
window.addEventListener('scroll', handleScrollAnimation);
window.addEventListener('load', handleScrollAnimation);

// Effet de survol sur les cartes
document.querySelectorAll('.timeline-content').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = "scale(1.02)";
        card.style.transition = "0.3s";
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = "scale(1)";
    });
});