/**
 * Módulo de autenticação
 * Responsável pelo gerenciamento de usuários, login e registro
 */
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.usersKey = 'ticketapp_users';
        this.sessionKey = 'ticketapp_session';
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
     * Criptografa a senha usando CryptoJS
     * @param {string} password - Senha em texto puro
     * @returns {string} - Senha criptografada
     */
    hashPassword(password) {
        // Usando SHA-256 para criptografar a senha
        return CryptoJS.SHA256(password).toString();
    }

    /**
     * Registra um novo usuário
     * @param {string} name - Nome do usuário
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     * @returns {Object} - Resultado da operação
     */
    register(name, email, password) {
        if (!name || !email || !password) {
            return { success: false, message: 'Todos os campos são obrigatórios' };
        }

        if (!this.isValidEmail(email)) {
            return { success: false, message: 'Email inválido' };
        }

        // Verifica se o email já está em uso
        const users = this.getUsers();
        if (users.find(user => user.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: 'Este email já está em uso' };
        }

        // Cria o novo usuário
        const newUser = {
            id: this.generateId(),
            name,
            email,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString()
        };

        // Adiciona o usuário à lista
        users.push(newUser);
        this.saveUsers(users);

        return { success: true, message: 'Usuário registrado com sucesso' };
    }

    /**
     * Realiza o login do usuário
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     * @returns {Object} - Resultado da operação
     */
    login(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Email e senha são obrigatórios' };
        }

        const users = this.getUsers();
        const user = users.find(user => user.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            return { success: false, message: 'Usuário não encontrado' };
        }

        const hashedPassword = this.hashPassword(password);
        if (user.password !== hashedPassword) {
            return { success: false, message: 'Senha incorreta' };
        }

        // Cria a sessão do usuário (sem a senha)
        const sessionUser = {
            id: user.id,
            name: user.name,
            email: user.email
        };

        this.currentUser = sessionUser;
        localStorage.setItem(this.sessionKey, JSON.stringify(sessionUser));

        return { success: true, user: sessionUser };
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
     * Obtém todos os usuários do localStorage
     * @returns {Array} - Lista de usuários
     */
    getUsers() {
        const usersData = localStorage.getItem(this.usersKey);
        if (!usersData) {
            return [];
        }

        try {
            return JSON.parse(usersData);
        } catch (e) {
            console.error('Erro ao carregar usuários:', e);
            return [];
        }
    }

    /**
     * Salva a lista de usuários no localStorage
     * @param {Array} users - Lista de usuários
     */
    saveUsers(users) {
        localStorage.setItem(this.usersKey, JSON.stringify(users));
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

    /**
     * Gera um ID único
     * @returns {string} - ID único
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Exporta a instância do gerenciador de autenticação
const authManager = new AuthManager();
