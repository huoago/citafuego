// ========== Offers / Products Database ==========

const Offers = {
    KEY: 'citafuego_offers',

    defaultOffers: [
        {
            id: 1,
            name: 'FuegoCitas Premium',
            description: 'La plataforma de citas #1 en Latinoamérica. Match inteligente, chat ilimitado y videollamadas.',
            icon: '💘',
            commission: '$4.50',
            commissionType: 'CPA',
            payout: '$4.50 por registro pagado',
            badge: 'hot',
            badgeText: '🔥 HOT',
            target: 'Latinoamérica, España',
            status: 'active',
            clicks: 1250,
            conversions: 89,
            createdAt: '2026-01-15',
            affiliateUrl: 'https://example.com/offer1'
        },
        {
            id: 2,
            name: 'AI Amor Virtual',
            description: 'Novia virtual con IA. Conversaciones realistas, fotos generadas y atención personalizada.',
            icon: '🤖',
            commission: '35%',
            commissionType: 'RevShare',
            payout: '35% recurrente de suscripciones',
            badge: 'new',
            badgeText: '✨ NUEVO',
            target: 'México, Colombia, Argentina',
            status: 'active',
            clicks: 890,
            conversions: 67,
            createdAt: '2026-09-01',
            affiliateUrl: 'https://example.com/offer2'
        },
        {
            id: 3,
            name: 'Noche de Pasión',
            description: 'Citas casuales sin compromiso. Para adultos que buscan diversión inmediata.',
            icon: '🔥',
            commission: '$6.00',
            commissionType: 'CPA',
            payout: '$6.00 por registro verificado',
            badge: 'top',
            badgeText: '⭐ TOP',
            target: 'Perú, Chile, Ecuador',
            status: 'active',
            clicks: 2100,
            conversions: 156,
            createdAt: '2025-11-20',
            affiliateUrl: 'https://example.com/offer3'
        },
        {
            id: 4,
            name: 'Match Perfecto VIP',
            description: 'Citas serias para relaciones a largo plazo. Test de compatibilidad avanzado.',
            icon: '💍',
            commission: '$3.75',
            commissionType: 'CPA',
            payout: '$3.75 por registro premium',
            badge: '',
            badgeText: '',
            target: 'Toda Latinoamérica',
            status: 'active',
            clicks: 650,
            conversions: 42,
            createdAt: '2026-03-10',
            affiliateUrl: 'https://example.com/offer4'
        },
        {
            id: 5,
            name: 'Encuentro Ardiente',
            description: 'Encuentros locales discretos. Privacidad garantizada y perfiles verificados.',
            icon: '🌶️',
            commission: '$5.25',
            commissionType: 'CPA',
            payout: '$5.25 por suscripción activa',
            badge: 'hot',
            badgeText: '🔥 HOT',
            target: 'Brasil, México, España',
            status: 'active',
            clicks: 1780,
            conversions: 112,
            createdAt: '2026-05-08',
            affiliateUrl: 'https://example.com/offer5'
        },
        {
            id: 6,
            name: 'CitaRápida Pro',
            description: 'Speed dating online y presencial. Eventos semanales en las principales ciudades.',
            icon: '⚡',
            commission: '$2.50',
            commissionType: 'CPA',
            payout: '$2.50 por registro a evento',
            badge: '',
            badgeText: '',
            target: 'Colombia, Perú, Chile',
            status: 'paused',
            clicks: 340,
            conversions: 18,
            createdAt: '2026-07-01',
            affiliateUrl: 'https://example.com/offer6'
        }
    ],

    init() {
        if (!localStorage.getItem(this.KEY)) {
            localStorage.setItem(this.KEY, JSON.stringify(this.defaultOffers));
        }
    },

    getAll() {
        return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    },

    getActive() {
        return this.getAll().filter(o => o.status === 'active');
    },

    getById(id) {
        return this.getAll().find(o => o.id === parseInt(id));
    },

    add(offer) {
        const offers = this.getAll();
        offer.id = Date.now();
        offer.createdAt = new Date().toISOString().split('T')[0];
        offer.clicks = 0;
        offer.conversions = 0;
        offers.push(offer);
        localStorage.setItem(this.KEY, JSON.stringify(offers));
        return offer;
    },

    update(id, data) {
        const offers = this.getAll();
        const index = offers.findIndex(o => o.id === parseInt(id));
        if (index !== -1) {
            offers[index] = { ...offers[index], ...data };
            localStorage.setItem(this.KEY, JSON.stringify(offers));
            return offers[index];
        }
        return null;
    },

    delete(id) {
        let offers = this.getAll();
        offers = offers.filter(o => o.id !== parseInt(id));
        localStorage.setItem(this.KEY, JSON.stringify(offers));
    },

    trackClick(id) {
        const offers = this.getAll();
        const offer = offers.find(o => o.id === parseInt(id));
        if (offer) {
            offer.clicks++;
            localStorage.setItem(this.KEY, JSON.stringify(offers));
        }
    },

    getStats() {
        const offers = this.getAll();
        return {
            total: offers.length,
            active: offers.filter(o => o.status === 'active').length,
            paused: offers.filter(o => o.status === 'paused').length,
            totalClicks: offers.reduce((sum, o) => sum + o.clicks, 0),
            totalConversions: offers.reduce((sum, o) => sum + o.conversions, 0)
        };
    }
};

// Initialize
Offers.init();
