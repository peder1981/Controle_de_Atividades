/**
 * Módulo de autenticação
 * Responsável pelo gerenciamento de usuários, login e registro
 */
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionKey = 'ticketapp_session';
        this.apiUrl = 'http://localhost:9000/api';
        this.init();
    }

    /**
     * Inicializa o gerenciador de autenticação
     */
    init() {
        // Verifica se já existe uma sessão ativa
        const sessionData = localStorage.getItem(this.sessionKey);
        if (sessionData) {
            try {
                this.currentUser = JSON.parse(sessionData);
            } catch (e) {
                console.error('Erro ao carregar sessão:', e);
                localStorage.removeItem(this.sessionKey);
            }
        }
    }

    /**
     * Registra um novo usuário
     * @param {string} name - Nome do usuário
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     * @returns {Promise<Object>} - Resultado da operação
     */
    async register(name, email, password) {
        if (!name || !email || !password) {
            return { success: false, message: 'Todos os campos são obrigatórios' };
        }

        if (!this.isValidEmail(email)) {
            return { success: false, message: 'Email inválido' };
        }

        try {
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            return { success: false, message: 'Erro ao conectar com o servidor' };
        }
    }

    /**
     * Realiza o login do usuário
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     * @returns {Promise<Object>} - Resultado da operação
     */
    async login(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Email e senha são obrigatórios' };
        }

        try {
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem(this.sessionKey, JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            return { success: false, message: 'Erro ao conectar com o servidor' };
        }
    }

    /**
     * Realiza o logout do usuário
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.sessionKey);
    }

    /**
     * Verifica se o usuário está autenticado
     * @returns {boolean} - True se estiver autenticado
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Obtém o usuário atual
     * @returns {Object|null} - Usuário atual ou null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Atualiza os dados do usuário atual
     * @param {Object} userData - Novos dados do usuário
     * @returns {Promise<Object>} - Resultado da operação
     */
    async updateUserProfile(userData) {
        if (!this.currentUser) {
            return { success: false, message: 'Usuário não autenticado' };
        }

        try {
            const response = await fetch(`${this.apiUrl}/users/${this.currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            if (data.success) {
                // Atualiza os dados do usuário na sessão
                this.currentUser = { ...this.currentUser, ...userData };
                localStorage.setItem(this.sessionKey, JSON.stringify(this.currentUser));
            }
            
            return data;
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            return { success: false, message: 'Erro ao conectar com o servidor' };
        }
    }

    /**
     * Verifica se um email é válido
     * @param {string} email - Email para validar
     * @returns {boolean} - True se for válido
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
}

// Exporta a instância do gerenciador de autenticação
const authManager = new AuthManager();
