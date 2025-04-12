/**
 * Arquivo de scripts para a página de relatórios gerenciais
 * Controle de Atividades v2.1.0
 */

// Variáveis globais
let currentUser = null;
let currentTicketsPage = 1;
let totalTicketsPages = 1;
let ticketsFilters = {};
let categories = [];
let users = [];
let charts = {};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação
    checkAuth();
    
    // Inicializar datepickers
    initDatepickers();
    
    // Inicializar eventos
    initEvents();
    
    // Carregar dados iniciais
    loadInitialData();
});

// Verificar autenticação
function checkAuth() {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userData);
        document.getElementById('userInfo').textContent = currentUser.name;
    } catch (error) {
        console.error('Erro ao processar dados do usuário:', error);
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

// Inicializar datepickers
function initDatepickers() {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const defaultOptions = {
        dateFormat: 'Y-m-d',
        locale: 'pt',
        altInput: true,
        altFormat: 'd/m/Y',
        maxDate: 'today'
    };
    
    // Datepickers para relatório de tickets
    flatpickr('#ticketStartDate', {
        ...defaultOptions,
        defaultDate: oneMonthAgo
    });
    
    flatpickr('#ticketEndDate', {
        ...defaultOptions,
        defaultDate: today
    });
    
    // Datepickers para relatório de desempenho
    flatpickr('#perfStartDate', {
        ...defaultOptions,
        defaultDate: oneMonthAgo
    });
    
    flatpickr('#perfEndDate', {
        ...defaultOptions,
        defaultDate: today
    });
    
    // Datepickers para relatório de categorias
    flatpickr('#catStartDate', {
        ...defaultOptions,
        defaultDate: oneMonthAgo
    });
    
    flatpickr('#catEndDate', {
        ...defaultOptions,
        defaultDate: today
    });
    
    // Datepickers para relatório de usuários
    flatpickr('#userStartDate', {
        ...defaultOptions,
        defaultDate: oneMonthAgo
    });
    
    flatpickr('#userEndDate', {
        ...defaultOptions,
        defaultDate: today
    });
}

// Inicializar eventos
function initEvents() {
    // Evento de logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
    
    // Eventos para filtros de tickets
    document.getElementById('ticketFilterBtn').addEventListener('click', () => {
        currentTicketsPage = 1;
        loadTicketsReport();
    });
    
    // Eventos para paginação de tickets
    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (currentTicketsPage > 1) {
            currentTicketsPage--;
            loadTicketsReport();
        }
    });
    
    document.getElementById('nextPageBtn').addEventListener('click', () => {
        if (currentTicketsPage < totalTicketsPages) {
            currentTicketsPage++;
            loadTicketsReport();
        }
    });
    
    // Eventos para exportação de tickets
    document.getElementById('ticketExportBtn').addEventListener('click', exportTicketsReport);
    
    // Eventos para filtros de desempenho
    document.getElementById('perfFilterBtn').addEventListener('click', loadPerformanceReport);
    
    // Eventos para exportação de desempenho
    document.getElementById('perfExportBtn').addEventListener('click', exportPerformanceReport);
    
    // Eventos para filtros de categorias
    document.getElementById('catFilterBtn').addEventListener('click', loadCategoriesReport);
    
    // Eventos para filtros de usuários
    document.getElementById('userFilterBtn').addEventListener('click', loadUsersPerformanceReport);
    
    // Eventos para mudança de tab
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (e) => {
            const targetId = e.target.getAttribute('data-bs-target');
            
            // Carregar dados específicos para cada tab
            switch (targetId) {
                case '#tickets-content':
                    if (!document.getElementById('ticketsTable').innerHTML) {
                        loadTicketsReport();
                    }
                    break;
                case '#performance-content':
                    if (!charts.ticketsChart) {
                        loadPerformanceReport();
                    }
                    break;
                case '#categories-content':
                    if (!charts.categoriesChart) {
                        loadCategoriesReport();
                    }
                    break;
                case '#users-content':
                    if (!charts.usersResolvedChart) {
                        loadUsersPerformanceReport();
                    }
                    break;
            }
        });
    });
}

// Carregar dados iniciais
async function loadInitialData() {
    try {
        // Carregar categorias únicas
        const ticketsResponse = await fetch(`/api/tickets?userId=${currentUser.id}`);
        const ticketsData = await ticketsResponse.json();
        
        if (ticketsData.success) {
            // Extrair categorias únicas
            const uniqueCategories = [...new Set(ticketsData.tickets
                .filter(ticket => ticket.category)
                .map(ticket => ticket.category))];
            
            // Preencher select de categorias
            const categorySelect = document.getElementById('ticketCategory');
            uniqueCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            
            categories = uniqueCategories;
        }
        
        // Carregar usuários para o filtro de atribuição
        const usersResponse = await fetch('/api/users');
        const usersData = await usersResponse.json();
        
        if (usersData.success) {
            // Preencher select de usuários
            const userSelect = document.getElementById('ticketAssignedTo');
            usersData.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                userSelect.appendChild(option);
            });
            
            users = usersData.users;
        }
        
        // Carregar relatório de tickets inicial
        loadTicketsReport();
        
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        showError('Erro ao carregar dados iniciais. Por favor, tente novamente mais tarde.');
    }
}

// Carregar relatório de tickets
async function loadTicketsReport() {
    try {
        // Mostrar loading
        document.getElementById('ticketsLoading').style.display = 'flex';
        document.getElementById('ticketsContent').style.display = 'none';
        
        // Obter filtros
        const filters = {
            userId: currentUser.id,
            status: document.getElementById('ticketStatus').value,
            priority: document.getElementById('ticketPriority').value,
            category: document.getElementById('ticketCategory').value,
            assignedTo: document.getElementById('ticketAssignedTo').value,
            startDate: document.getElementById('ticketStartDate').value,
            endDate: document.getElementById('ticketEndDate').value,
            sortBy: document.getElementById('ticketSortBy').value,
            sortOrder: document.getElementById('ticketSortOrder').value,
            page: currentTicketsPage,
            limit: 10
        };
        
        // Salvar filtros para exportação
        ticketsFilters = {...filters};
        
        // Construir URL com parâmetros
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        
        // Fazer requisição
        const response = await fetch(`/api/reports/tickets?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
            // Atualizar paginação
            totalTicketsPages = data.pagination.pages;
            document.getElementById('ticketsPagination').textContent = 
                `Mostrando ${data.tickets.length} de ${data.pagination.total} registros`;
            
            // Atualizar botões de paginação
            document.getElementById('prevPageBtn').disabled = currentTicketsPage <= 1;
            document.getElementById('nextPageBtn').disabled = currentTicketsPage >= totalTicketsPages;
            
            // Renderizar tabela
            renderTicketsTable(data.tickets);
        } else {
            showError(data.message || 'Erro ao carregar relatório de tickets');
        }
    } catch (error) {
        console.error('Erro ao carregar relatório de tickets:', error);
        showError('Erro ao carregar relatório de tickets. Por favor, tente novamente mais tarde.');
    } finally {
        // Esconder loading
        document.getElementById('ticketsLoading').style.display = 'none';
        document.getElementById('ticketsContent').style.display = 'block';
    }
}

// Renderizar tabela de tickets
function renderTicketsTable(tickets) {
    const tbody = document.getElementById('ticketsTable');
    tbody.innerHTML = '';
    
    if (tickets.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="9" class="text-center">Nenhum registro encontrado</td>';
        tbody.appendChild(tr);
        return;
    }
    
    tickets.forEach(ticket => {
        const tr = document.createElement('tr');
        
        // Formatar datas
        const createdAt = new Date(ticket.created_at).toLocaleDateString('pt-BR');
        const updatedAt = new Date(ticket.updated_at).toLocaleDateString('pt-BR');
        
        // Formatar status
        let statusBadge = '';
        switch (ticket.status) {
            case 'open':
                statusBadge = '<span class="badge bg-secondary">Aberto</span>';
                break;
            case 'in-progress':
                statusBadge = '<span class="badge bg-primary">Em andamento</span>';
                break;
            case 'resolved':
                statusBadge = '<span class="badge bg-success">Resolvido</span>';
                break;
            default:
                statusBadge = `<span class="badge bg-secondary">${ticket.status}</span>`;
        }
        
        // Formatar prioridade
        let priorityBadge = '';
        switch (ticket.priority) {
            case 'low':
                priorityBadge = '<span class="badge bg-info">Baixa</span>';
                break;
            case 'medium':
                priorityBadge = '<span class="badge bg-warning">Média</span>';
                break;
            case 'high':
                priorityBadge = '<span class="badge bg-danger">Alta</span>';
                break;
            default:
                priorityBadge = `<span class="badge bg-secondary">${ticket.priority}</span>`;
        }
        
        tr.innerHTML = `
            <td>${ticket.id.substring(0, 8)}...</td>
            <td>${ticket.title}</td>
            <td>${statusBadge}</td>
            <td>${priorityBadge}</td>
            <td>${ticket.category || '-'}</td>
            <td>${ticket.user_name || '-'}</td>
            <td>${ticket.assigned_name || '-'}</td>
            <td>${createdAt}</td>
            <td>${updatedAt}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Exportar relatório de tickets
function exportTicketsReport() {
    // Construir URL com parâmetros
    const params = new URLSearchParams();
    params.append('type', 'tickets');
    
    Object.entries(ticketsFilters).forEach(([key, value]) => {
        if (value && key !== 'page' && key !== 'limit') {
            params.append(key, value);
        }
    });
    
    // Abrir URL em nova aba
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
}

// Carregar relatório de desempenho
async function loadPerformanceReport() {
    try {
        // Mostrar loading
        document.getElementById('performanceLoading').style.display = 'flex';
        document.getElementById('performanceContent').style.display = 'none';
        
        // Obter filtros
        const startDate = document.getElementById('perfStartDate').value;
        const endDate = document.getElementById('perfEndDate').value;
        const groupBy = document.getElementById('perfGroupBy').value;
        
        if (!startDate || !endDate) {
            showError('Por favor, selecione as datas de início e fim');
            return;
        }
        
        // Construir URL com parâmetros
        const params = new URLSearchParams({
            userId: currentUser.id,
            startDate,
            endDate,
            groupBy
        });
        
        // Fazer requisição
        const response = await fetch(`/api/reports/performance?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
            renderPerformanceCharts(data.performance);
        } else {
            showError(data.message || 'Erro ao carregar relatório de desempenho');
        }
    } catch (error) {
        console.error('Erro ao carregar relatório de desempenho:', error);
        showError('Erro ao carregar relatório de desempenho. Por favor, tente novamente mais tarde.');
    } finally {
        // Esconder loading
        document.getElementById('performanceLoading').style.display = 'none';
        document.getElementById('performanceContent').style.display = 'block';
    }
}

// Renderizar gráficos de desempenho
function renderPerformanceCharts(performanceData) {
    // Preparar dados para os gráficos
    const periods = performanceData.map(item => item.period);
    const createdCounts = performanceData.map(item => item.created_count);
    const resolvedCounts = performanceData.map(item => item.resolved_count);
    const avgTimes = performanceData.map(item => item.avg_resolution_time_minutes);
    
    // Destruir gráficos existentes se houver
    if (charts.ticketsChart) {
        charts.ticketsChart.destroy();
    }
    
    if (charts.timeChart) {
        charts.timeChart.destroy();
    }
    
    // Criar gráfico de tickets criados vs. resolvidos
    const ticketsCtx = document.getElementById('ticketsChart').getContext('2d');
    charts.ticketsChart = new Chart(ticketsCtx, {
        type: 'bar',
        data: {
            labels: periods,
            datasets: [
                {
                    label: 'Tickets Criados',
                    data: createdCounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Tickets Resolvidos',
                    data: resolvedCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Período'
                    }
                }
            }
        }
    });
    
    // Criar gráfico de tempo médio de resolução
    const timeCtx = document.getElementById('timeChart').getContext('2d');
    charts.timeChart = new Chart(timeCtx, {
        type: 'line',
        data: {
            labels: periods,
            datasets: [
                {
                    label: 'Tempo Médio de Resolução (minutos)',
                    data: avgTimes,
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Minutos'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Período'
                    }
                }
            }
        }
    });
}

// Exportar relatório de desempenho
function exportPerformanceReport() {
    // Obter filtros
    const startDate = document.getElementById('perfStartDate').value;
    const endDate = document.getElementById('perfEndDate').value;
    
    if (!startDate || !endDate) {
        showError('Por favor, selecione as datas de início e fim');
        return;
    }
    
    // Construir URL com parâmetros
    const params = new URLSearchParams({
        type: 'performance',
        userId: currentUser.id,
        startDate,
        endDate
    });
    
    // Abrir URL em nova aba
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
}

// Carregar relatório por categorias
async function loadCategoriesReport() {
    try {
        // Mostrar loading
        document.getElementById('categoriesLoading').style.display = 'flex';
        document.getElementById('categoriesContent').style.display = 'none';
        
        // Obter filtros
        const startDate = document.getElementById('catStartDate').value;
        const endDate = document.getElementById('catEndDate').value;
        
        if (!startDate || !endDate) {
            showError('Por favor, selecione as datas de início e fim');
            return;
        }
        
        // Construir URL com parâmetros
        const params = new URLSearchParams({
            userId: currentUser.id,
            startDate,
            endDate
        });
        
        // Fazer requisição
        const response = await fetch(`/api/reports/categories?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
            renderCategoriesCharts(data.categories);
            renderCategoriesTable(data.categories);
        } else {
            showError(data.message || 'Erro ao carregar relatório por categorias');
        }
    } catch (error) {
        console.error('Erro ao carregar relatório por categorias:', error);
        showError('Erro ao carregar relatório por categorias. Por favor, tente novamente mais tarde.');
    } finally {
        // Esconder loading
        document.getElementById('categoriesLoading').style.display = 'none';
        document.getElementById('categoriesContent').style.display = 'block';
    }
}

// Renderizar gráficos de categorias
function renderCategoriesCharts(categoriesData) {
    // Preparar dados para os gráficos
    const categories = categoriesData.map(item => item.category || 'Sem categoria');
    const totals = categoriesData.map(item => item.total);
    
    // Dados para o gráfico de status por categoria
    const openCounts = categoriesData.map(item => item.open);
    const inProgressCounts = categoriesData.map(item => item.in_progress);
    const resolvedCounts = categoriesData.map(item => item.resolved);
    
    // Destruir gráficos existentes se houver
    if (charts.categoriesChart) {
        charts.categoriesChart.destroy();
    }
    
    if (charts.categoryStatusChart) {
        charts.categoryStatusChart.destroy();
    }
    
    // Criar gráfico de distribuição por categoria
    const categoriesCtx = document.getElementById('categoriesChart').getContext('2d');
    charts.categoriesChart = new Chart(categoriesCtx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [
                {
                    data: totals,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)',
                        'rgba(255, 159, 64, 0.5)',
                        'rgba(199, 199, 199, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)'
                    ],
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
    
    // Criar gráfico de status por categoria
    const categoryStatusCtx = document.getElementById('categoryStatusChart').getContext('2d');
    charts.categoryStatusChart = new Chart(categoryStatusCtx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: 'Abertos',
                    data: openCounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Em Andamento',
                    data: inProgressCounts,
                    backgroundColor: 'rgba(255, 206, 86, 0.5)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Resolvidos',
                    data: resolvedCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            }
        }
    });
}

// Renderizar tabela de categorias
function renderCategoriesTable(categoriesData) {
    const tbody = document.getElementById('categoriesTable');
    tbody.innerHTML = '';
    
    if (categoriesData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" class="text-center">Nenhum registro encontrado</td>';
        tbody.appendChild(tr);
        return;
    }
    
    categoriesData.forEach(category => {
        const tr = document.createElement('tr');
        
        // Calcular porcentagem de resolvidos
        const percentResolved = category.total > 0 
            ? ((category.resolved / category.total) * 100).toFixed(2) 
            : '0.00';
        
        tr.innerHTML = `
            <td>${category.category || 'Sem categoria'}</td>
            <td>${category.total}</td>
            <td>${category.open}</td>
            <td>${category.in_progress}</td>
            <td>${category.resolved}</td>
            <td>${percentResolved}%</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Carregar relatório de desempenho por usuário
async function loadUsersPerformanceReport() {
    try {
        // Mostrar loading
        document.getElementById('usersLoading').style.display = 'flex';
        document.getElementById('usersContent').style.display = 'none';
        
        // Obter filtros
        const startDate = document.getElementById('userStartDate').value;
        const endDate = document.getElementById('userEndDate').value;
        
        if (!startDate || !endDate) {
            showError('Por favor, selecione as datas de início e fim');
            return;
        }
        
        // Construir URL com parâmetros
        const params = new URLSearchParams({
            startDate,
            endDate
        });
        
        // Fazer requisição
        const response = await fetch(`/api/reports/users-performance?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
            renderUsersPerformanceCharts(data.users_performance);
            renderUsersPerformanceTable(data.users_performance);
        } else {
            showError(data.message || 'Erro ao carregar relatório de desempenho por usuário');
        }
    } catch (error) {
        console.error('Erro ao carregar relatório de desempenho por usuário:', error);
        showError('Erro ao carregar relatório de desempenho por usuário. Por favor, tente novamente mais tarde.');
    } finally {
        // Esconder loading
        document.getElementById('usersLoading').style.display = 'none';
        document.getElementById('usersContent').style.display = 'block';
    }
}

// Renderizar gráficos de desempenho por usuário
function renderUsersPerformanceCharts(usersData) {
    // Filtrar usuários sem tickets
    const usersWithTickets = usersData.filter(user => user.total_tickets > 0);
    
    // Preparar dados para os gráficos
    const userNames = usersWithTickets.map(user => user.name);
    const resolvedCounts = usersWithTickets.map(user => user.resolved_tickets);
    const avgTimes = usersWithTickets.map(user => user.avg_resolution_time_minutes);
    
    // Destruir gráficos existentes se houver
    if (charts.usersResolvedChart) {
        charts.usersResolvedChart.destroy();
    }
    
    if (charts.usersTimeChart) {
        charts.usersTimeChart.destroy();
    }
    
    // Criar gráfico de tickets resolvidos por usuário
    const usersResolvedCtx = document.getElementById('usersResolvedChart').getContext('2d');
    charts.usersResolvedChart = new Chart(usersResolvedCtx, {
        type: 'bar',
        data: {
            labels: userNames,
            datasets: [
                {
                    label: 'Tickets Resolvidos',
                    data: resolvedCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                }
            }
        }
    });
    
    // Criar gráfico de tempo médio de resolução por usuário
    const usersTimeCtx = document.getElementById('usersTimeChart').getContext('2d');
    charts.usersTimeChart = new Chart(usersTimeCtx, {
        type: 'bar',
        data: {
            labels: userNames,
            datasets: [
                {
                    label: 'Tempo Médio de Resolução (minutos)',
                    data: avgTimes,
                    backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Minutos'
                    }
                }
            }
        }
    });
}

// Renderizar tabela de desempenho por usuário
function renderUsersPerformanceTable(usersData) {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';
    
    if (usersData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="text-center">Nenhum registro encontrado</td>';
        tbody.appendChild(tr);
        return;
    }
    
    usersData.forEach(user => {
        const tr = document.createElement('tr');
        
        // Calcular porcentagem de resolvidos
        const percentResolved = user.total_tickets > 0 
            ? ((user.resolved_tickets / user.total_tickets) * 100).toFixed(2) 
            : '0.00';
        
        // Formatar tempo médio
        const avgTime = user.avg_resolution_time_minutes 
            ? user.avg_resolution_time_minutes.toFixed(2) 
            : '-';
        
        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.total_tickets}</td>
            <td>${user.resolved_tickets}</td>
            <td>${percentResolved}%</td>
            <td>${avgTime}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Função para exibir mensagens de erro
function showError(message) {
    alert(message);
}
