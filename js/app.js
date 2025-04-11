/**
 * Aplicação principal
 * Responsável por conectar todos os módulos e implementar a interação com o usuário
 */
document.addEventListener('DOMContentLoaded', () => {
    // Elementos da tela de login
    const loginScreen = document.getElementById('login-screen');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    const goToRegister = document.getElementById('go-to-register');

    // Elementos da tela de cadastro
    const registerScreen = document.getElementById('register-screen');
    const registerName = document.getElementById('register-name');
    const registerEmail = document.getElementById('register-email');
    const registerPassword = document.getElementById('register-password');
    const registerBtn = document.getElementById('register-btn');
    const registerError = document.getElementById('register-error');
    const goToLogin = document.getElementById('go-to-login');

    // Elementos da tela principal
    const mainScreen = document.getElementById('main-screen');
    const logoutBtn = document.getElementById('logout-btn');
    const newTicketBtn = document.getElementById('new-ticket-btn');
    const ticketsList = document.getElementById('tickets-list');
    const statusFilter = document.getElementById('status-filter');
    const priorityFilter = document.getElementById('priority-filter');
    const goToDashboardBtn = document.getElementById('go-to-dashboard-btn');

    // Elementos da tela de dashboard
    const dashboardScreen = document.getElementById('dashboard-screen');
    const goToTicketsBtn = document.getElementById('go-to-tickets-btn');
    const logoutFromDashboardBtn = document.getElementById('logout-from-dashboard-btn');

    // Elementos do modal de ticket
    const ticketModal = document.getElementById('ticket-modal');
    const modalTitle = document.getElementById('modal-title');
    const ticketTitle = document.getElementById('ticket-title');
    const ticketDescription = document.getElementById('ticket-description');
    const ticketStatus = document.getElementById('ticket-status');
    const ticketPriority = document.getElementById('ticket-priority');
    const ticketId = document.getElementById('ticket-id');
    const saveTicketBtn = document.getElementById('save-ticket-btn');
    const closeModal = document.querySelector('.close-modal');

    // Elementos do modal de confirmação
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');

    // Variáveis de estado
    let currentTickets = [];
    let deleteTicketId = null;
    let confirmCallback = null;

    /**
     * Inicializa a aplicação
     */
    function init() {
        // Verifica se o usuário está autenticado
        if (authManager.isAuthenticated()) {
            showMainScreen();
            loadTickets();
        } else {
            showLoginScreen();
        }

        // Adiciona os event listeners
        setupEventListeners();
    }

    /**
     * Configura os event listeners
     */
    function setupEventListeners() {
        // Event listeners da tela de login
        loginBtn.addEventListener('click', handleLogin);
        goToRegister.addEventListener('click', () => {
            showRegisterScreen();
            clearAuthForms();
        });

        // Event listeners da tela de cadastro
        registerBtn.addEventListener('click', handleRegister);
        goToLogin.addEventListener('click', () => {
            showLoginScreen();
            clearAuthForms();
        });

        // Event listeners da tela principal
        logoutBtn.addEventListener('click', handleLogout);
        newTicketBtn.addEventListener('click', () => openTicketModal());
        statusFilter.addEventListener('change', filterTickets);
        priorityFilter.addEventListener('change', filterTickets);
        goToDashboardBtn.addEventListener('click', showDashboardScreen);

        // Event listeners da tela de dashboard
        goToTicketsBtn.addEventListener('click', showMainScreen);
        logoutFromDashboardBtn.addEventListener('click', handleLogout);

        // Event listeners do modal de ticket
        closeModal.addEventListener('click', closeTicketModal);
        saveTicketBtn.addEventListener('click', saveTicket);

        // Event listeners do modal de confirmação
        confirmYes.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            closeConfirmModal();
        });
        confirmNo.addEventListener('click', closeConfirmModal);

        // Fecha os modais ao clicar fora deles
        window.addEventListener('click', (e) => {
            if (e.target === ticketModal) {
                closeTicketModal();
            }
            if (e.target === confirmModal) {
                closeConfirmModal();
            }
        });
    }

    /**
     * Manipula o login do usuário
     */
    function handleLogin() {
        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        if (!email || !password) {
            showLoginError('Preencha todos os campos');
            return;
        }

        const result = authManager.login(email, password);

        if (result.success) {
            clearAuthForms();
            showMainScreen();
            loadTickets();
        } else {
            showLoginError(result.message);
        }
    }

    /**
     * Manipula o registro de um novo usuário
     */
    function handleRegister() {
        const name = registerName.value.trim();
        const email = registerEmail.value.trim();
        const password = registerPassword.value;

        if (!name || !email || !password) {
            showRegisterError('Preencha todos os campos');
            return;
        }

        const result = authManager.register(name, email, password);

        if (result.success) {
            clearAuthForms();
            showLoginScreen();
            alert('Cadastro realizado com sucesso! Faça login para continuar.');
        } else {
            showRegisterError(result.message);
        }
    }

    /**
     * Manipula o logout do usuário
     */
    function handleLogout() {
        authManager.logout();
        showLoginScreen();
        clearAuthForms();
    }

    /**
     * Carrega os tickets do usuário atual
     */
    function loadTickets() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        currentTickets = ticketManager.getTickets(user.id);
        renderTickets();
    }

    /**
     * Renderiza os tickets na tela
     */
    function renderTickets() {
        const statusValue = statusFilter.value;
        const priorityValue = priorityFilter.value;
        
        // Filtra os tickets
        const filteredTickets = ticketManager.filterTickets(
            currentTickets,
            statusValue,
            priorityValue
        );
        
        // Limpa a lista
        ticketsList.innerHTML = '';
        
        if (filteredTickets.length === 0) {
            ticketsList.innerHTML = '<div class="empty-state">Nenhum ticket encontrado</div>';
            return;
        }
        
        // Renderiza cada ticket
        filteredTickets.forEach(ticket => {
            const ticketCard = createTicketCard(ticket);
            ticketsList.appendChild(ticketCard);
        });
    }

    /**
     * Cria um card de ticket
     * @param {Object} ticket - Dados do ticket
     * @returns {HTMLElement} - Elemento do card
     */
    function createTicketCard(ticket) {
        const card = document.createElement('div');
        card.className = `ticket-card priority-${ticket.priority}`;
        
        // Formata as datas
        const createdDate = new Date(ticket.createdAt).toLocaleDateString('pt-BR');
        
        // Mapeia os status e prioridades para exibição
        const statusMap = {
            'open': 'Aberto',
            'in-progress': 'Em Andamento',
            'resolved': 'Resolvido'
        };
        
        const priorityMap = {
            'low': 'Baixa',
            'medium': 'Média',
            'high': 'Alta'
        };
        
        card.innerHTML = `
            <div class="ticket-header">
                <h3 class="ticket-title">${ticket.title}</h3>
            </div>
            <div class="ticket-description">${ticket.description || 'Sem descrição'}</div>
            <div class="ticket-meta">
                <span class="ticket-status status-${ticket.status}">${statusMap[ticket.status]}</span>
                <span class="ticket-priority priority-${ticket.priority}">${priorityMap[ticket.priority]}</span>
            </div>
            <div class="ticket-date">Criado em: ${createdDate}</div>
            <div class="ticket-actions">
                <button class="edit-btn" data-id="${ticket.id}">Editar</button>
                ${ticket.status !== 'resolved' ? 
                    `<button class="resolve-btn" data-id="${ticket.id}">Resolver</button>` : 
                    ''}
                <button class="delete-btn" data-id="${ticket.id}">Excluir</button>
            </div>
        `;
        
        // Adiciona event listeners aos botões
        card.querySelector('.edit-btn').addEventListener('click', () => {
            openTicketModal(ticket);
        });
        
        if (ticket.status !== 'resolved') {
            card.querySelector('.resolve-btn').addEventListener('click', () => {
                resolveTicket(ticket.id);
            });
        }
        
        card.querySelector('.delete-btn').addEventListener('click', () => {
            confirmDeleteTicket(ticket.id);
        });
        
        return card;
    }

    /**
     * Filtra os tickets com base nos filtros selecionados
     */
    function filterTickets() {
        renderTickets();
    }

    /**
     * Abre o modal de ticket
     * @param {Object} ticket - Ticket para editar (opcional)
     */
    function openTicketModal(ticket = null) {
        // Limpa o formulário
        ticketTitle.value = '';
        ticketDescription.value = '';
        ticketStatus.value = 'open';
        ticketPriority.value = 'medium';
        ticketId.value = '';
        
        // Se for edição, preenche o formulário
        if (ticket) {
            modalTitle.textContent = 'Editar Ticket';
            ticketTitle.value = ticket.title;
            ticketDescription.value = ticket.description;
            ticketStatus.value = ticket.status;
            ticketPriority.value = ticket.priority;
            ticketId.value = ticket.id;
        } else {
            modalTitle.textContent = 'Novo Ticket';
        }
        
        // Exibe o modal
        ticketModal.classList.remove('hidden');
    }

    /**
     * Fecha o modal de ticket
     */
    function closeTicketModal() {
        ticketModal.classList.add('hidden');
    }

    /**
     * Salva um ticket (novo ou editado)
     */
    function saveTicket() {
        const title = ticketTitle.value.trim();
        const description = ticketDescription.value.trim();
        const status = ticketStatus.value;
        const priority = ticketPriority.value;
        const id = ticketId.value;
        
        if (!title) {
            alert('O título é obrigatório');
            return;
        }
        
        const user = authManager.getCurrentUser();
        if (!user) return;
        
        try {
            if (id) {
                // Atualiza o ticket
                ticketManager.updateTicket(id, {
                    title,
                    description,
                    status,
                    priority
                });
            } else {
                // Cria um novo ticket
                ticketManager.createTicket({
                    title,
                    description,
                    status,
                    priority,
                    userId: user.id
                });
            }
            
            // Fecha o modal e atualiza a lista
            closeTicketModal();
            loadTickets();
        } catch (error) {
            alert(`Erro ao salvar ticket: ${error.message}`);
        }
    }

    /**
     * Resolve um ticket
     * @param {string} id - ID do ticket
     */
    function resolveTicket(id) {
        ticketManager.updateTicket(id, {
            status: 'resolved'
        });
        
        loadTickets();
    }

    /**
     * Confirma a exclusão de um ticket
     * @param {string} id - ID do ticket
     */
    function confirmDeleteTicket(id) {
        deleteTicketId = id;
        confirmMessage.textContent = 'Tem certeza que deseja excluir este ticket?';
        
        confirmCallback = () => {
            ticketManager.deleteTicket(deleteTicketId);
            loadTickets();
        };
        
        confirmModal.classList.remove('hidden');
    }

    /**
     * Fecha o modal de confirmação
     */
    function closeConfirmModal() {
        confirmModal.classList.add('hidden');
        deleteTicketId = null;
        confirmCallback = null;
    }

    /**
     * Exibe a tela de login
     */
    function showLoginScreen() {
        loginScreen.classList.remove('hidden');
        registerScreen.classList.add('hidden');
        mainScreen.classList.add('hidden');
        dashboardScreen.classList.add('hidden');
    }

    /**
     * Exibe a tela de cadastro
     */
    function showRegisterScreen() {
        registerScreen.classList.remove('hidden');
        loginScreen.classList.add('hidden');
        mainScreen.classList.add('hidden');
        dashboardScreen.classList.add('hidden');
    }

    /**
     * Exibe a tela principal
     */
    function showMainScreen() {
        mainScreen.classList.remove('hidden');
        loginScreen.classList.add('hidden');
        registerScreen.classList.add('hidden');
        dashboardScreen.classList.add('hidden');
        
        // Atualiza a lista de tickets
        loadTickets();
    }

    /**
     * Exibe a tela de dashboard
     */
    function showDashboardScreen() {
        dashboardScreen.classList.remove('hidden');
        mainScreen.classList.add('hidden');
        loginScreen.classList.add('hidden');
        registerScreen.classList.add('hidden');
        
        // Inicializa o dashboard
        dashboardManager.initialize(currentTickets);
    }

    /**
     * Exibe uma mensagem de erro na tela de login
     * @param {string} message - Mensagem de erro
     */
    function showLoginError(message) {
        loginError.textContent = message;
        loginError.classList.remove('hidden');
    }

    /**
     * Exibe uma mensagem de erro na tela de cadastro
     * @param {string} message - Mensagem de erro
     */
    function showRegisterError(message) {
        registerError.textContent = message;
        registerError.classList.remove('hidden');
    }

    /**
     * Limpa os formulários de autenticação
     */
    function clearAuthForms() {
        loginEmail.value = '';
        loginPassword.value = '';
        loginError.textContent = '';
        
        registerName.value = '';
        registerEmail.value = '';
        registerPassword.value = '';
        registerError.textContent = '';
    }

    // Inicializa a aplicação
    init();
});
