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
    const goToReportsBtn = document.getElementById('go-to-reports-btn');
    const goToAdvancedReportsBtn = document.getElementById('go-to-advanced-reports-btn');

    // Elementos da tela de dashboard
    const dashboardScreen = document.getElementById('dashboard-screen');
    const goToTicketsBtn = document.getElementById('go-to-tickets-btn');
    const logoutFromDashboardBtn = document.getElementById('logout-from-dashboard-btn');
    const goToReportsFromDashboardBtn = document.getElementById('go-to-reports-from-dashboard-btn');
    const goToAdvancedReportsFromDashboardBtn = document.getElementById('go-to-advanced-reports-from-dashboard-btn');

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
    async function init() {
        // Verifica se o usuário está autenticado
        if (authManager.isAuthenticated()) {
            showMainScreen();
            await loadTickets();
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
        goToReportsBtn.addEventListener('click', navigateToReports);
        goToAdvancedReportsBtn.addEventListener('click', navigateToAdvancedReports);

        // Event listeners da tela de dashboard
        goToTicketsBtn.addEventListener('click', showMainScreen);
        logoutFromDashboardBtn.addEventListener('click', handleLogout);
        goToReportsFromDashboardBtn.addEventListener('click', navigateToReports);
        goToAdvancedReportsFromDashboardBtn.addEventListener('click', navigateToAdvancedReports);

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
    async function handleLogin() {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        
        if (!email || !password) {
            showLoginError('Email e senha são obrigatórios');
            return;
        }
        
        try {
            const result = await authManager.login(email, password);
            
            if (result.success) {
                showMainScreen();
                clearAuthForms();
            } else {
                showLoginError(result.message);
            }
        } catch (error) {
            showLoginError('Erro ao fazer login. Tente novamente.');
            console.error('Erro de login:', error);
        }
    }

    /**
     * Manipula o registro de um novo usuário
     */
    async function handleRegister() {
        const name = registerName.value.trim();
        const email = registerEmail.value.trim();
        const password = registerPassword.value.trim();
        
        if (!name || !email || !password) {
            showRegisterError('Todos os campos são obrigatórios');
            return;
        }
        
        try {
            const result = await authManager.register(name, email, password);
            
            if (result.success) {
                showLoginScreen();
                clearAuthForms();
                alert('Conta criada com sucesso! Faça login para continuar.');
            } else {
                showRegisterError(result.message);
            }
        } catch (error) {
            showRegisterError('Erro ao criar conta. Tente novamente.');
            console.error('Erro de registro:', error);
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
    async function loadTickets() {
        const user = authManager.getCurrentUser();
        if (!user) return;
        
        try {
            currentTickets = await ticketManager.getTickets(user.id);
            renderTickets();
        } catch (error) {
            console.error('Erro ao carregar tickets:', error);
        }
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
    async function saveTicket() {
        const id = ticketId.value;
        const title = ticketTitle.value.trim();
        const description = ticketDescription.value.trim();
        const status = ticketStatus.value;
        const priority = ticketPriority.value;
        
        if (!title) {
            alert('O título é obrigatório');
            return;
        }
        
        const user = authManager.getCurrentUser();
        if (!user) return;
        
        try {
            if (id) {
                // Atualiza o ticket
                await ticketManager.updateTicket(id, {
                    title,
                    description,
                    status,
                    priority
                });
            } else {
                // Cria um novo ticket
                await ticketManager.createTicket({
                    title,
                    description,
                    status,
                    priority,
                    userId: user.id
                });
            }
            
            // Fecha o modal e atualiza a lista
            closeTicketModal();
            await loadTickets();
        } catch (error) {
            alert(`Erro ao salvar ticket: ${error.message}`);
        }
    }

    /**
     * Resolve um ticket
     * @param {string} id - ID do ticket
     */
    async function resolveTicket(id) {
        try {
            await ticketManager.updateTicket(id, {
                status: 'resolved'
            });
            
            await loadTickets();
        } catch (error) {
            console.error('Erro ao resolver ticket:', error);
            alert('Erro ao resolver ticket. Tente novamente.');
        }
    }

    /**
     * Confirma a exclusão de um ticket
     * @param {string} id - ID do ticket
     */
    function confirmDeleteTicket(id) {
        deleteTicketId = id;
        confirmMessage.textContent = 'Tem certeza que deseja excluir este ticket?';
        
        confirmCallback = async () => {
            try {
                await ticketManager.deleteTicket(deleteTicketId);
                await loadTickets();
            } catch (error) {
                console.error('Erro ao excluir ticket:', error);
                alert('Erro ao excluir ticket. Tente novamente.');
            }
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
        
        // Inicializa o dashboard com o ID do usuário atual
        const user = authManager.getCurrentUser();
        if (user) {
            dashboardManager.initialize(user.id);
        }
    }

    /**
     * Navega para a página de relatórios
     */
    function navigateToReports() {
        // Redireciona para a página de relatórios
        window.location.href = 'reports.html';
    }

    /**
     * Navega para a página de relatórios avançados
     */
    function navigateToAdvancedReports() {
        // Salva o usuário atual no localStorage para manter a sessão
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser) {
            // Redireciona para a página de relatórios avançados
            window.location.href = '/advanced-reports.html';
        } else {
            // Se não houver usuário logado, redireciona para a página de login
            window.location.href = '/login.html';
        }
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

    /**
     * Cria um card de ticket
     * @param {Object} ticket - Dados do ticket
     * @returns {HTMLElement} - Elemento do card
     */
    function createTicketCard(ticket) {
        const card = document.createElement('div');
        card.className = `ticket-card priority-${ticket.priority}`;
        
        // Formata as datas
        let createdDate = 'Data indisponível';
        try {
            if (ticket.created_at) {
                createdDate = new Date(ticket.created_at).toLocaleDateString('pt-BR');
            }
        } catch (error) {
            console.error('Erro ao formatar data:', error);
        }
        
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

    // Inicializa a aplicação
    init();
});
