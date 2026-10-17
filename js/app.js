// ========== Main App Logic ==========

document.addEventListener('DOMContentLoaded', () => {
    Auth.updateUI();
    renderOffers();
    renderAds();
    animateStats();
    setupSmoothScroll();
});

// Render offers on homepage
function renderOffers() {
    const grid = document.getElementById('offers-grid');
    if (!grid) return;

    const offers = Offers.getActive();
    
    if (offers.length === 0) {
        grid.innerHTML = '<div class="loading">No hay ofertas disponibles en este momento.</div>';
        return;
    }

    grid.innerHTML = offers.map(offer => `
        <div class="offer-card">
            <div class="offer-image">${offer.icon}</div>
            <div class="offer-body">
                ${offer.badge ? `<span class="offer-badge badge-${offer.badge}">${offer.badgeText}</span>` : ''}
                <h3 class="offer-title">${offer.name}</h3>
                <p class="offer-desc">${offer.description}</p>
                <div class="offer-price">
                    <div>
                        <div class="offer-commission">${offer.commission}</div>
                        <div class="offer-price-note">${offer.commissionType}</div>
                    </div>
                    <div style="text-align:right; font-size:12px; color:#6c757d;">
                        🎯 ${offer.target}
                    </div>
                </div>
                <a href="${offer.affiliateUrl}" class="btn btn-primary btn-block" onclick="Offers.trackClick(${offer.id})">
                    👉 Obtener acceso
                </a>
            </div>
        </div>
    `).join('');
}

// Render ad slots
function renderAds() {
    Ads.render('top-banner', 'ad-top-content');
    Ads.render('mid-rectangle', 'ad-mid-content');
}

// Animate stats counter
function animateStats() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.count);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target.toLocaleString();
            }
        };

        // Start when visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(counter);
                }
            });
        });

        observer.observe(counter);
    });
}

// Smooth scroll for anchor links
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Simulate real-time price updates
function startPriceUpdates() {
    setInterval(() => {
        // Small random fluctuation in displayed stats
        const statNumbers = document.querySelectorAll('.stat-number');
        if (statNumbers.length > 0) {
            // Just a visual pulse, actual numbers stay
            statNumbers.forEach(el => {
                el.style.transition = 'transform 0.3s';
                el.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    el.style.transform = 'scale(1)';
                }, 300);
            });
        }
    }, 30000); // Every 30 seconds
}

startPriceUpdates();
