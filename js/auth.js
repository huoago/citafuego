// ========== Auth System (localStorage-based) ==========

const Auth = {
    USERS_KEY: 'citafuego_users',
    SESSION_KEY: 'citafuego_session',

    init() {
        if (!localStorage.getItem(this.USERS_KEY)) {
            // Seed admin user
            const defaultUsers = [
                {
                    id: 1,
                    email: 'admin@citafuego.com',
                    password: 'admin123',
                    name: 'Administrador',
                    role: 'admin',
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(this.USERS_KEY, JSON.stringify(defaultUsers));
        }
    },

    getUsers() {
        return JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
    },

    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    register(name, email, password) {
        const users = this.getUsers();
        
        // Check if email exists
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Este correo ya está registrado' };
        }

        const newUser = {
            id: Date.now(),
            name,
            email,
            password, // In production, hash this!
            role: 'user',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveUsers(users);
        
        // Auto login
        this.login(email, password);
        
        return { success: true, message: 'Registro exitoso' };
    },

    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return { success: false, message: 'Correo o contraseña incorrectos' };
        }

        const session = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            loginAt: new Date().toISOString()
        };

        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        return { success: true, user: session };
    },

    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'index.html';
    },

    getCurrentUser() {
        const session = localStorage.getItem(this.SESSION_KEY);
        return session ? JSON.parse(session) : null;
    },

    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    requireAdmin() {
        if (!this.isAdmin()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    updateUI() {
        const user = this.getCurrentUser();
        const btnLogin = document.getElementById('btn-login');
        const btnRegister = document.getElementById('btn-register');
        
        if (user) {
            if (btnLogin) btnLogin.textContent = 'Mi cuenta';
            if (btnRegister) {
                btnRegister.textContent = 'Cerrar sesión';
                btnRegister.onclick = (e) => {
                    e.preventDefault();
                    this.logout();
                };
            }
        }
    }
};

// Initialize on load
Auth.init();
