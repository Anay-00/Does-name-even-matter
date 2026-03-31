// This file contains functions to handle animations for the MediSync AI landing page.

document.addEventListener('DOMContentLoaded', () => {
    initFloatingIcons();
    initAnimatedCounters();
});

function initFloatingIcons() {
    const icons = document.querySelectorAll('.floating-icon');
    icons.forEach(icon => {
        icon.classList.add('animate-float');
    });
}

function initAnimatedCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText;

            const increment = target / 200;

            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(updateCount, 1);
            } else {
                counter.innerText = target;
            }
        };
        updateCount();
    });
}