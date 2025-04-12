// Variáveis globais
let currentUser = null;
let categories = [];
let scheduledReports = [];
let metricAlerts = [];
let alertHistory = [];

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(storedUser);
    document.getElementById('userInfo').textContent = currentUser.name;
    
    // Configurar datepickers
    setupDatepickers();
    
    // Carregar categorias
    await loadCategories();
    
    // Carregar dados iniciais
    await Promise.all([
        loadScheduledReports(),
        loadMetricAlerts(),
        loadAlertHistory()
    ]);
    
    // Configurar eventos
    setupEventListeners();
    
    // Inicializar a primeira aba
    document.getElementById('trendFilterBtn').click();
});

// Configuração de datepickers
function setupDatepickers() {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const defaultOptions = {
        dateFormat: 'd/m/Y',
        locale: 'pt',
        maxDate: 'today'
    };
    
    // Datepickers para análise de tendências
    flatpickr('#trendStartDate', {
        ...defaultOptions,
        defaultDate: oneMonthAgo
    });
    
    flatpickr('#trendEndDate', {
        ...defaultOptions,
        defaultDate: today
    });
    
    // Datepickers para comparativo de períodos
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(today.getMonth() - 2);
    
    flatpickr('#compPeriod1Start', {
        ...defaultOptions,
        defaultDate: twoMonthsAgo
    });
    
    flatpickr('#compPeriod1End', {
        ...defaultOptions,
        defaultDate: oneMonthAgo
    });
    
    flatpickr('#compPeriod2Start', {
        ...defaultOptions,
        defaultDate: oneMonthAgo
    });
    
    flatpickr('#compPeriod2End', {
        ...defaultOptions,
        defaultDate: today
    });
}

// Carregar categorias
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error('Erro ao carregar categorias');
        }
        
        const data = await response.json();
        categories = data.categories || [];
        
        // Preencher selects de categorias
        const categorySelects = document.querySelectorAll('select[id$="Category"]');
        categorySelects.forEach(select => {
            // Manter a opção "Todas"
            const allOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            
            if (allOption) {
                select.appendChild(allOption);
            }
            
            // Adicionar categorias
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Erro ao carregar categorias', 'error');
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
    
    // Botões de filtro para relatórios
    document.getElementById('trendFilterBtn').addEventListener('click', loadTrendsReport);
    document.getElementById('compFilterBtn').addEventListener('click', loadComparisonReport);
    
    // Botões para relatórios agendados
    document.getElementById('newScheduledReportBtn').addEventListener('click', () => showScheduleReportModal());
    document.getElementById('trendScheduleBtn').addEventListener('click', () => scheduleCurrentReport('trends'));
    document.getElementById('saveScheduleBtn').addEventListener('click', saveScheduledReport);
    
    // Botões para alertas
    document.getElementById('newAlertBtn').addEventListener('click', () => showAlertModal());
    document.getElementById('saveAlertBtn').addEventListener('click', saveAlert);
    
    // Botão de confirmação
    document.getElementById('confirmBtn').addEventListener('click', handleConfirmAction);
}

// Utilitários
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
}

function parseFormDate(dateString) {
    if (!dateString) return null;
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function showToast(message, type = 'info') {
    // Implementação simples de toast
    alert(message);
}

function showLoading(reportType, show = true) {
    const loadingElement = document.getElementById(`${reportType}Loading`);
    const contentElement = document.getElementById(`${reportType}Content`);
    
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
    
    if (contentElement) {
        contentElement.style.display = show ? 'none' : 'block';
    }
}

// Funções para relatórios agendados
async function loadScheduledReports() {
    try {
        showLoading('scheduled', true);
        
        const response = await fetch(`/api/scheduled-reports?userId=${currentUser.id}`);
        if (!response.ok) {
            throw new Error('Erro ao carregar relatórios agendados');
        }
        
        const data = await response.json();
        scheduledReports = data.reports || [];
        
        renderScheduledReports();
        
        showLoading('scheduled', false);
    } catch (error) {
        console.error('Erro ao carregar relatórios agendados:', error);
        showToast('Erro ao carregar relatórios agendados', 'error');
        showLoading('scheduled', false);
    }
}

function renderScheduledReports() {
    const tableBody = document.getElementById('scheduledReportsTable');
    tableBody.innerHTML = '';
    
    if (scheduledReports.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="text-center">Nenhum relatório agendado encontrado</td>';
        tableBody.appendChild(row);
        return;
    }
    
    scheduledReports.forEach(report => {
        const row = document.createElement('tr');
        
        // Converter parâmetros de string JSON para objeto
        const parameters = typeof report.parameters === 'string' 
            ? JSON.parse(report.parameters) 
            : report.parameters;
        
        row.innerHTML = `
            <td>${report.name}</td>
            <td>${getReportTypeName(report.report_type)}</td>
            <td>${getScheduleName(report.schedule)}</td>
            <td>${report.email}</td>
            <td>${report.active ? 
                '<span class="badge badge-success">Ativo</span>' : 
                '<span class="badge badge-danger">Inativo</span>'}</td>
            <td>${report.last_run ? formatDateTime(report.last_run) : 'Nunca'}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-report" data-id="${report.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-report" data-id="${report.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Adicionar event listeners para botões de edição e exclusão
    document.querySelectorAll('.edit-report').forEach(button => {
        button.addEventListener('click', () => {
            const reportId = button.getAttribute('data-id');
            const report = scheduledReports.find(r => r.id == reportId);
            if (report) {
                showScheduleReportModal(report);
            }
        });
    });
    
    document.querySelectorAll('.delete-report').forEach(button => {
        button.addEventListener('click', () => {
            const reportId = button.getAttribute('data-id');
            const report = scheduledReports.find(r => r.id == reportId);
            if (report) {
                showConfirmModal(
                    `Tem certeza que deseja excluir o relatório "${report.name}"?`,
                    () => deleteScheduledReport(reportId)
                );
            }
        });
    });
}

function getReportTypeName(type) {
    const types = {
        'tickets': 'Tickets',
        'performance': 'Desempenho',
        'categories': 'Categorias',
        'users': 'Desempenho por Usuário',
        'trends': 'Análise de Tendências',
        'comparison': 'Comparativo de Períodos',
        'efficiency': 'Métricas de Eficiência',
        'workload': 'Análise de Carga',
        'response_time': 'Tempo de Resposta'
    };
    
    return types[type] || type;
}

function getScheduleName(schedule) {
    const schedules = {
        'daily': 'Diário',
        'weekly': 'Semanal',
        'monthly': 'Mensal'
    };
    
    return schedules[schedule] || schedule;
}

function showScheduleReportModal(report = null) {
    const modal = new bootstrap.Modal(document.getElementById('scheduleReportModal'));
    const form = document.getElementById('scheduleReportForm');
    
    // Limpar formulário
    form.reset();
    
    // Preencher com dados do relatório, se fornecido
    if (report) {
        document.getElementById('scheduleReportId').value = report.id;
        document.getElementById('reportName').value = report.name;
        document.getElementById('reportType').value = report.report_type;
        document.getElementById('reportSchedule').value = report.schedule;
        document.getElementById('reportEmail').value = report.email;
        
        // Converter parâmetros de string JSON para objeto e depois de volta para string formatada
        const parameters = typeof report.parameters === 'string' 
            ? JSON.parse(report.parameters) 
            : report.parameters;
        
        document.getElementById('reportParameters').value = JSON.stringify(parameters, null, 2);
        
        // Atualizar título do modal
        document.querySelector('#scheduleReportModal .modal-title').textContent = 'Editar Relatório Agendado';
    } else {
        document.getElementById('scheduleReportId').value = '';
        document.querySelector('#scheduleReportModal .modal-title').textContent = 'Novo Relatório Agendado';
        
        // Preencher e-mail do usuário atual
        document.getElementById('reportEmail').value = currentUser.email || '';
    }
    
    modal.show();
}

function scheduleCurrentReport(reportType) {
    let parameters = {};
    let reportName = '';
    
    // Obter parâmetros com base no tipo de relatório
    if (reportType === 'trends') {
        const startDate = document.getElementById('trendStartDate').value;
        const endDate = document.getElementById('trendEndDate').value;
        const period = document.getElementById('trendPeriod').value;
        const metric = document.getElementById('trendMetric').value;
        const category = document.getElementById('trendCategory').value;
        
        parameters = {
            startDate: parseFormDate(startDate),
            endDate: parseFormDate(endDate),
            period,
            metric,
            category
        };
        
        reportName = `Análise de Tendências - ${metric}`;
    }
    
    // Mostrar modal com parâmetros preenchidos
    const modal = new bootstrap.Modal(document.getElementById('scheduleReportModal'));
    document.getElementById('scheduleReportId').value = '';
    document.getElementById('reportName').value = reportName;
    document.getElementById('reportType').value = reportType;
    document.getElementById('reportSchedule').value = 'weekly';
    document.getElementById('reportEmail').value = currentUser.email || '';
    document.getElementById('reportParameters').value = JSON.stringify(parameters, null, 2);
    
    document.querySelector('#scheduleReportModal .modal-title').textContent = 'Agendar Relatório';
    
    modal.show();
}

async function saveScheduledReport() {
    try {
        const reportId = document.getElementById('scheduleReportId').value;
        const name = document.getElementById('reportName').value;
        const reportType = document.getElementById('reportType').value;
        const schedule = document.getElementById('reportSchedule').value;
        const email = document.getElementById('reportEmail').value;
        const parametersText = document.getElementById('reportParameters').value;
        
        // Validações
        if (!name || !reportType || !schedule || !email || !parametersText) {
            showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }
        
        // Validar JSON
        let parameters;
        try {
            parameters = JSON.parse(parametersText);
        } catch (e) {
            showToast('Parâmetros inválidos. Verifique o formato JSON', 'error');
            return;
        }
        
        const reportData = {
            userId: currentUser.id,
            name,
            reportType,
            parameters,
            schedule,
            email
        };
        
        let response;
        
        if (reportId) {
            // Atualizar relatório existente
            response = await fetch(`/api/scheduled-reports/${reportId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...reportData,
                    active: true
                })
            });
        } else {
            // Criar novo relatório
            response = await fetch('/api/scheduled-reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });
        }
        
        if (!response.ok) {
            throw new Error('Erro ao salvar relatório agendado');
        }
        
        const result = await response.json();
        
        // Fechar modal
        bootstrap.Modal.getInstance(document.getElementById('scheduleReportModal')).hide();
        
        // Recarregar relatórios
        await loadScheduledReports();
        
        showToast(result.message || 'Relatório agendado com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao salvar relatório agendado:', error);
        showToast('Erro ao salvar relatório agendado', 'error');
    }
}

async function deleteScheduledReport(reportId) {
    try {
        const response = await fetch(`/api/scheduled-reports/${reportId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir relatório agendado');
        }
        
        const result = await response.json();
        
        // Recarregar relatórios
        await loadScheduledReports();
        
        showToast(result.message || 'Relatório excluído com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao excluir relatório agendado:', error);
        showToast('Erro ao excluir relatório agendado', 'error');
    }
}

// Funções para alertas de métricas
async function loadMetricAlerts() {
    try {
        showLoading('alerts', true);
        
        const response = await fetch(`/api/metric-alerts?userId=${currentUser.id}`);
        if (!response.ok) {
            throw new Error('Erro ao carregar alertas de métricas');
        }
        
        const data = await response.json();
        metricAlerts = data.alerts || [];
        
        renderMetricAlerts();
        
        showLoading('alerts', false);
    } catch (error) {
        console.error('Erro ao carregar alertas de métricas:', error);
        showToast('Erro ao carregar alertas de métricas', 'error');
        showLoading('alerts', false);
    }
}

async function loadAlertHistory() {
    try {
        const response = await fetch(`/api/alert-history?userId=${currentUser.id}`);
        if (!response.ok) {
            throw new Error('Erro ao carregar histórico de alertas');
        }
        
        const data = await response.json();
        alertHistory = data.history || [];
        
        renderAlertHistory();
    } catch (error) {
        console.error('Erro ao carregar histórico de alertas:', error);
        showToast('Erro ao carregar histórico de alertas', 'error');
    }
}

function renderMetricAlerts() {
    const tableBody = document.getElementById('alertsTable');
    tableBody.innerHTML = '';
    
    if (metricAlerts.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" class="text-center">Nenhum alerta de métrica encontrado</td>';
        tableBody.appendChild(row);
        return;
    }
    
    metricAlerts.forEach(alert => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${alert.name}</td>
            <td>${getMetricTypeName(alert.metric_type)}</td>
            <td>${getConditionName(alert.condition)}</td>
            <td>${alert.threshold}</td>
            <td>${alert.email}</td>
            <td>${alert.active ? 
                '<span class="badge badge-success">Ativo</span>' : 
                '<span class="badge badge-danger">Inativo</span>'}</td>
            <td>${alert.last_triggered ? formatDateTime(alert.last_triggered) : 'Nunca'}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-alert" data-id="${alert.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-alert" data-id="${alert.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Adicionar event listeners para botões de edição e exclusão
    document.querySelectorAll('.edit-alert').forEach(button => {
        button.addEventListener('click', () => {
            const alertId = button.getAttribute('data-id');
            const alert = metricAlerts.find(a => a.id == alertId);
            if (alert) {
                showAlertModal(alert);
            }
        });
    });
    
    document.querySelectorAll('.delete-alert').forEach(button => {
        button.addEventListener('click', () => {
            const alertId = button.getAttribute('data-id');
            const alert = metricAlerts.find(a => a.id == alertId);
            if (alert) {
                showConfirmModal(
                    `Tem certeza que deseja excluir o alerta "${alert.name}"?`,
                    () => deleteAlert(alertId)
                );
            }
        });
    });
}

function renderAlertHistory() {
    const tableBody = document.getElementById('alertHistoryTable');
    tableBody.innerHTML = '';
    
    if (alertHistory.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">Nenhum histórico de alerta encontrado</td>';
        tableBody.appendChild(row);
        return;
    }
    
    alertHistory.forEach(history => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${history.alert_name}</td>
            <td>${formatDateTime(history.triggered_at)}</td>
            <td>${history.current_value}</td>
            <td>${getConditionName(history.condition)} ${history.threshold}</td>
            <td>${history.notification_sent ? 
                '<span class="badge badge-success">Enviada</span>' : 
                '<span class="badge badge-danger">Falha</span>'}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function getMetricTypeName(type) {
    const types = {
        'open_tickets': 'Tickets Abertos',
        'resolution_time': 'Tempo Médio de Resolução',
        'response_time': 'Tempo Médio de Resposta',
        'high_priority_tickets': 'Tickets de Alta Prioridade'
    };
    
    return types[type] || type;
}

function getConditionName(condition) {
    const conditions = {
        '>': 'Maior que',
        '>=': 'Maior ou igual a',
        '<': 'Menor que',
        '<=': 'Menor ou igual a',
        '=': 'Igual a',
        '==': 'Igual a'
    };
    
    return conditions[condition] || condition;
}

function showAlertModal(alert = null) {
    const modal = new bootstrap.Modal(document.getElementById('alertModal'));
    const form = document.getElementById('alertForm');
    
    // Limpar formulário
    form.reset();
    
    // Preencher com dados do alerta, se fornecido
    if (alert) {
        document.getElementById('alertId').value = alert.id;
        document.getElementById('alertName').value = alert.name;
        document.getElementById('metricType').value = alert.metric_type;
        document.getElementById('condition').value = alert.condition;
        document.getElementById('threshold').value = alert.threshold;
        document.getElementById('alertEmail').value = alert.email;
        document.getElementById('alertActive').checked = alert.active === 1;
        
        // Atualizar título do modal
        document.querySelector('#alertModal .modal-title').textContent = 'Editar Alerta';
    } else {
        document.getElementById('alertId').value = '';
        document.querySelector('#alertModal .modal-title').textContent = 'Novo Alerta';
        
        // Preencher e-mail do usuário atual
        document.getElementById('alertEmail').value = currentUser.email || '';
    }
    
    modal.show();
}

async function saveAlert() {
    try {
        const alertId = document.getElementById('alertId').value;
        const name = document.getElementById('alertName').value;
        const metricType = document.getElementById('metricType').value;
        const condition = document.getElementById('condition').value;
        const threshold = document.getElementById('threshold').value;
        const email = document.getElementById('alertEmail').value;
        const active = document.getElementById('alertActive').checked;
        
        // Validações
        if (!name || !metricType || !condition || threshold === '' || !email) {
            showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }
        
        const alertData = {
            userId: currentUser.id,
            name,
            metricType,
            condition,
            threshold: parseFloat(threshold),
            email,
            active
        };
        
        let response;
        
        if (alertId) {
            // Atualizar alerta existente
            response = await fetch(`/api/metric-alerts/${alertId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(alertData)
            });
        } else {
            // Criar novo alerta
            response = await fetch('/api/metric-alerts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(alertData)
            });
        }
        
        if (!response.ok) {
            throw new Error('Erro ao salvar alerta');
        }
        
        const result = await response.json();
        
        // Fechar modal
        bootstrap.Modal.getInstance(document.getElementById('alertModal')).hide();
        
        // Recarregar alertas
        await loadMetricAlerts();
        
        showToast(result.message || 'Alerta salvo com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao salvar alerta:', error);
        showToast('Erro ao salvar alerta', 'error');
    }
}

async function deleteAlert(alertId) {
    try {
        const response = await fetch(`/api/metric-alerts/${alertId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir alerta');
        }
        
        const result = await response.json();
        
        // Recarregar alertas e histórico
        await Promise.all([
            loadMetricAlerts(),
            loadAlertHistory()
        ]);
        
        showToast(result.message || 'Alerta excluído com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao excluir alerta:', error);
        showToast('Erro ao excluir alerta', 'error');
    }
}

// Funções para modal de confirmação
function showConfirmModal(message, confirmCallback) {
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    
    document.getElementById('confirmMessage').textContent = message;
    
    // Armazenar callback para uso posterior
    document.getElementById('confirmBtn').setAttribute('data-callback', confirmCallback.name);
    
    modal.show();
}

function handleConfirmAction() {
    const callbackName = document.getElementById('confirmBtn').getAttribute('data-callback');
    
    // Fechar modal
    bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
    
    // Executar callback
    if (callbackName === 'deleteScheduledReport') {
        const reportId = document.querySelector('.delete-report[data-id]').getAttribute('data-id');
        deleteScheduledReport(reportId);
    } else if (callbackName === 'deleteAlert') {
        const alertId = document.querySelector('.delete-alert[data-id]').getAttribute('data-id');
        deleteAlert(alertId);
    }
}

// Funções para relatórios
async function loadTrendsReport() {
    try {
        showLoading('trends', true);
        
        const startDate = document.getElementById('trendStartDate').value;
        const endDate = document.getElementById('trendEndDate').value;
        const period = document.getElementById('trendPeriod').value;
        const metric = document.getElementById('trendMetric').value;
        const category = document.getElementById('trendCategory').value;
        
        // Validações
        if (!startDate || !endDate) {
            showToast('Selecione as datas de início e fim', 'error');
            showLoading('trends', false);
            return;
        }
        
        // Converter datas para formato ISO
        const start = parseFormDate(startDate);
        const end = parseFormDate(endDate);
        
        // Construir URL com parâmetros
        let url = `/api/reports/trends?startDate=${start}&endDate=${end}&period=${period}&metric=${metric}`;
        
        if (category) {
            url += `&category=${encodeURIComponent(category)}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar relatório de tendências');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Erro ao carregar relatório de tendências');
        }
        
        // Renderizar dados
        renderTrendsReport(data, metric);
        
        showLoading('trends', false);
    } catch (error) {
        console.error('Erro ao carregar relatório de tendências:', error);
        showToast('Erro ao carregar relatório de tendências', 'error');
        showLoading('trends', false);
    }
}

function renderTrendsReport(data, metric) {
    // Atualizar cabeçalho da tabela
    const headerText = metric === 'resolution_time' ? 'Tempo Médio (horas)' : 'Quantidade';
    document.getElementById('trendsValueHeader').textContent = headerText;
    
    // Renderizar tabela
    const tableBody = document.getElementById('trendsTable');
    tableBody.innerHTML = '';
    
    if (!data.trends || data.trends.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="2" class="text-center">Nenhum dado encontrado para o período selecionado</td>';
        tableBody.appendChild(row);
        return;
    }
    
    // Preparar dados para o gráfico
    const labels = [];
    const values = [];
    
    data.trends.forEach(item => {
        const row = document.createElement('tr');
        
        const formattedDate = formatDate(item.period);
        const value = metric === 'resolution_time' 
            ? (item.value / 60).toFixed(2) // Converter minutos para horas
            : item.value;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${value}</td>
        `;
        
        tableBody.appendChild(row);
        
        // Adicionar dados para o gráfico
        labels.push(formattedDate);
        values.push(value);
    });
    
    // Renderizar gráfico
    renderTrendsChart(labels, values, metric);
}

function renderTrendsChart(labels, values, metric) {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    
    // Destruir gráfico existente, se houver
    if (window.trendsChart) {
        window.trendsChart.destroy();
    }
    
    // Configurar título e cor com base na métrica
    let title = '';
    let color = '';
    
    switch (metric) {
        case 'created':
            title = 'Tickets Criados';
            color = 'rgba(54, 162, 235, 0.7)';
            break;
        case 'resolved':
            title = 'Tickets Resolvidos';
            color = 'rgba(75, 192, 192, 0.7)';
            break;
        case 'resolution_time':
            title = 'Tempo Médio de Resolução (horas)';
            color = 'rgba(255, 159, 64, 0.7)';
            break;
        default:
            title = 'Valor';
            color = 'rgba(54, 162, 235, 0.7)';
    }
    
    // Criar novo gráfico
    window.trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: values,
                backgroundColor: color,
                borderColor: color.replace('0.7', '1'),
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: metric === 'resolution_time' ? 2 : 0
                    }
                }
            }
        }
    });
}

async function loadComparisonReport() {
    try {
        showLoading('comparison', true);
        
        const period1Start = document.getElementById('compPeriod1Start').value;
        const period1End = document.getElementById('compPeriod1End').value;
        const period2Start = document.getElementById('compPeriod2Start').value;
        const period2End = document.getElementById('compPeriod2End').value;
        const metric = document.getElementById('compMetric').value;
        
        // Validações
        if (!period1Start || !period1End || !period2Start || !period2End) {
            showToast('Selecione as datas para ambos os períodos', 'error');
            showLoading('comparison', false);
            return;
        }
        
        // Converter datas para formato ISO
        const start1 = parseFormDate(period1Start);
        const end1 = parseFormDate(period1End);
        const start2 = parseFormDate(period2Start);
        const end2 = parseFormDate(period2End);
        
        // Construir URL com parâmetros
        const url = `/api/reports/period-comparison?period1Start=${start1}&period1End=${end1}&period2Start=${start2}&period2End=${end2}&metric=${metric}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar relatório comparativo');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Erro ao carregar relatório comparativo');
        }
        
        // Renderizar dados
        renderComparisonReport(data, metric);
        
        showLoading('comparison', false);
    } catch (error) {
        console.error('Erro ao carregar relatório comparativo:', error);
        showToast('Erro ao carregar relatório comparativo', 'error');
        showLoading('comparison', false);
    }
}

function renderComparisonReport(data, metric) {
    // Renderizar estatísticas do período 1
    const period1Stats = document.getElementById('period1Stats');
    period1Stats.innerHTML = renderPeriodStats(data.period1, metric);
    
    // Renderizar estatísticas do período 2
    const period2Stats = document.getElementById('period2Stats');
    period2Stats.innerHTML = renderPeriodStats(data.period2, metric);
    
    // Renderizar variação
    const variationStats = document.getElementById('variationStats');
    variationStats.innerHTML = renderVariationStats(data.variation, metric);
}

function renderPeriodStats(periodData, metric) {
    if (metric === 'tickets') {
        return `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Total de Tickets:</strong> ${periodData.total_tickets}</p>
                    <p><strong>Tickets Abertos:</strong> ${periodData.open_tickets}</p>
                    <p><strong>Tickets em Andamento:</strong> ${periodData.in_progress_tickets}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Tickets Resolvidos:</strong> ${periodData.resolved_tickets}</p>
                    <p><strong>Taxa de Resolução:</strong> ${(periodData.resolution_rate * 100).toFixed(2)}%</p>
                    <p><strong>Dias no Período:</strong> ${periodData.days_in_period}</p>
                </div>
            </div>
            <p><strong>Média de Tickets por Dia:</strong> ${periodData.avg_tickets_per_day.toFixed(2)}</p>
        `;
    } else {
        return `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Tempo Médio de Resolução:</strong> ${(periodData.avg_resolution_time / 60).toFixed(2)} horas</p>
                    <p><strong>Tempo Mínimo:</strong> ${(periodData.min_resolution_time / 60).toFixed(2)} horas</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Tempo Máximo:</strong> ${(periodData.max_resolution_time / 60).toFixed(2)} horas</p>
                    <p><strong>Total de Tickets Analisados:</strong> ${periodData.tickets_analyzed}</p>
                </div>
            </div>
        `;
    }
}

function renderVariationStats(variation, metric) {
    let html = '<div class="row">';
    
    if (metric === 'tickets') {
        html += `
            <div class="col-md-4">
                <p><strong>Total de Tickets:</strong> 
                    <span class="${getVariationClass(variation.total_tickets)}">
                        ${formatVariation(variation.total_tickets)}%
                    </span>
                </p>
                <p><strong>Tickets Abertos:</strong> 
                    <span class="${getVariationClass(variation.open_tickets)}">
                        ${formatVariation(variation.open_tickets)}%
                    </span>
                </p>
            </div>
            <div class="col-md-4">
                <p><strong>Tickets em Andamento:</strong> 
                    <span class="${getVariationClass(variation.in_progress_tickets)}">
                        ${formatVariation(variation.in_progress_tickets)}%
                    </span>
                </p>
                <p><strong>Tickets Resolvidos:</strong> 
                    <span class="${getVariationClass(variation.resolved_tickets)}">
                        ${formatVariation(variation.resolved_tickets)}%
                    </span>
                </p>
            </div>
            <div class="col-md-4">
                <p><strong>Taxa de Resolução:</strong> 
                    <span class="${getVariationClass(variation.resolution_rate)}">
                        ${formatVariation(variation.resolution_rate)}%
                    </span>
                </p>
                <p><strong>Média de Tickets por Dia:</strong> 
                    <span class="${getVariationClass(variation.avg_tickets_per_day)}">
                        ${formatVariation(variation.avg_tickets_per_day)}%
                    </span>
                </p>
            </div>
        `;
    } else {
        html += `
            <div class="col-md-12 text-center">
                <p><strong>Tempo Médio de Resolução:</strong> 
                    <span class="${getVariationClass(-variation.avg_resolution_time)}">
                        ${formatVariation(variation.avg_resolution_time)}%
                    </span>
                </p>
                <p><small>Nota: Uma variação negativa no tempo de resolução indica uma melhoria (resolução mais rápida).</small></p>
            </div>
        `;
    }
    
    html += '</div>';
    
    return html;
}

function getVariationClass(value) {
    if (value > 0) {
        return 'text-success';
    } else if (value < 0) {
        return 'text-danger';
    } else {
        return 'text-muted';
    }
}

function formatVariation(value) {
    const sign = value > 0 ? '+' : '';
    return sign + value.toFixed(2);
}
