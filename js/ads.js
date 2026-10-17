// ========== Ad Slots Management ==========

const Ads = {
    KEY: 'citafuego_ads',

    defaultAds: [
        {
            id: 1,
            slot: 'top-banner',
            title: 'Publicidad superior',
            image: '',
            link: '#',
            html: '',
            active: true,
            impressions: 0,
            clicks: 0
        },
        {
            id: 2,
            slot: 'mid-rectangle',
            title: 'Rectángulo central',
            image: '',
            link: '#',
            html: '',
            active: true,
            impressions: 0,
            clicks: 0
        },
        {
            id: 3,
            slot: 'sidebar',
            title: 'Barra lateral',
            image: '',
            link: '#',
            html: '',
            active: true,
            impressions: 0,
            clicks: 0
        }
    ],

    init() {
        if (!localStorage.getItem(this.KEY)) {
            localStorage.setItem(this.KEY, JSON.stringify(this.defaultAds));
        }
    },

    getAll() {
        return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    },

    getBySlot(slotName) {
        return this.getAll().filter(a => a.slot === slotName && a.active);
    },

    render(slotName, containerId) {
        const ads = this.getBySlot(slotName);
        const container = document.getElementById(containerId);
        
        if (!container) return;

        if (ads.length === 0) {
            container.innerHTML = `
                <a href="#" class="ad-link">
                    <div class="ad-placeholder">📢 Espacio publicitario disponible - contacto: admin@citafuego.com</div>
                </a>
            `;
            return;
        }

        container.innerHTML = ads.map(ad => {
            if (ad.html) {
                return ad.html;
            }
            return `
                <a href="${ad.link}" class="ad-link" data-ad-id="${ad.id}" target="_blank">
                    <div class="ad-placeholder">${ad.title}${ad.image ? `<img src="${ad.image}" alt="${ad.title}" style="max-width:100%;">` : ''}</div>
                </a>
            `;
        }).join('');

        // Track clicks
        container.querySelectorAll('.ad-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const adId = link.dataset.adId;
                if (adId) this.trackClick(adId);
            });
        });
    },

    trackImpression(id) {
        const ads = this.getAll();
        const ad = ads.find(a => a.id === parseInt(id));
        if (ad) {
            ad.impressions++;
            localStorage.setItem(this.KEY, JSON.stringify(ads));
        }
    },

    trackClick(id) {
        const ads = this.getAll();
        const ad = ads.find(a => a.id === parseInt(id));
        if (ad) {
            ad.clicks++;
            localStorage.setItem(this.KEY, JSON.stringify(ads));
        }
    },

    update(id, data) {
        const ads = this.getAll();
        const index = ads.findIndex(a => a.id === parseInt(id));
        if (index !== -1) {
            ads[index] = { ...ads[index], ...data };
            localStorage.setItem(this.KEY, JSON.stringify(ads));
        }
    },

    getStats() {
        const ads = this.getAll();
        return {
            total: ads.length,
            active: ads.filter(a => a.active).length,
            totalImpressions: ads.reduce((sum, a) => sum + a.impressions, 0),
            totalClicks: ads.reduce((sum, a) => sum + a.clicks, 0)
        };
    }
};

// Initialize
Ads.init();
