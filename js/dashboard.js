/**
 * Módulo de Dashboard
 * Responsável por gerar estatísticas e gráficos
 */
class DashboardManager {
    constructor() {
        this.statusChart = null;
        this.priorityChart = null;
        this.timeMetricsChart = null;
        this.apiUrl = 'http://localhost:9000/api';
    }

    /**
     * Inicializa o dashboard
     * @param {string} userId - ID do usuário
     */
    async initialize(userId) {
        if (!userId) {
            console.error('ID do usuário é obrigatório para inicializar o dashboard');
            return;
        }
        
        try {
            const dashboardData = await this.fetchDashboardData(userId);
            this.updateStatistics(dashboardData);
            this.createCharts(dashboardData);
            this.createTimeMetricsChart(dashboardData);
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
        }
    }

    /**
     * Busca os dados do dashboard no servidor
     * @param {string} userId - ID do usuário
     * @returns {Promise<Object>} - Dados do dashboard
     */
    async fetchDashboardData(userId) {
        try {
            const response = await fetch(`${this.apiUrl}/dashboard/${userId}`);
            const data = await response.json();
            
            if (data.success) {
                return data.dashboard;
            } else {
                console.error('Erro ao buscar dados do dashboard:', data.message);
                return {
                    totalTickets: 0,
                    resolvedToday: 0,
                    resolvedWeek: 0,
                    resolvedMonth: 0,
                    statusCounts: { open: 0, 'in-progress': 0, resolved: 0 },
                    priorityCounts: { low: 0, medium: 0, high: 0 },
                    avgTimeToProgress: 0,
                    avgTimeToResolve: 0,
                    avgTimeProgressToResolve: 0
                };
            }
        } catch (error) {
            console.error('Erro ao buscar dados do dashboard:', error);
            return {
                totalTickets: 0,
                resolvedToday: 0,
                resolvedWeek: 0,
                resolvedMonth: 0,
                statusCounts: { open: 0, 'in-progress': 0, resolved: 0 },
                priorityCounts: { low: 0, medium: 0, high: 0 },
                avgTimeToProgress: 0,
                avgTimeToResolve: 0,
                avgTimeProgressToResolve: 0
            };
        }
    }

    /**
     * Atualiza as estatísticas do dashboard
     * @param {Object} dashboardData - Dados do dashboard
     */
    updateStatistics(dashboardData) {
        // Total de tickets
        document.getElementById('total-tickets').textContent = dashboardData.totalTickets;

        // Tickets resolvidos hoje
        document.getElementById('resolved-today').textContent = dashboardData.resolvedToday;

        // Tickets resolvidos na semana
        document.getElementById('resolved-week').textContent = dashboardData.resolvedWeek;

        // Tickets resolvidos no mês
        document.getElementById('resolved-month').textContent = dashboardData.resolvedMonth;
        
        // Tempos médios
        const formatTime = (days) => {
            if (days < 1) {
                const hours = Math.round(days * 24);
                return hours === 1 ? '1 hora' : `${hours} horas`;
            } else {
                const roundedDays = Math.round(days * 10) / 10;
                return roundedDays === 1 ? '1 dia' : `${roundedDays} dias`;
            }
        };
        
        // Tempo médio entre abertura e início do andamento
        document.getElementById('avg-time-to-progress').textContent = formatTime(dashboardData.avgTimeToProgress);
        
        // Tempo médio entre abertura e resolução
        document.getElementById('avg-time-to-resolve').textContent = formatTime(dashboardData.avgTimeToResolve);
        
        // Tempo médio entre início do andamento e resolução
        document.getElementById('avg-time-progress-to-resolve').textContent = formatTime(dashboardData.avgTimeProgressToResolve);
    }

    /**
     * Cria os gráficos do dashboard
     * @param {Object} dashboardData - Dados do dashboard
     */
    createCharts(dashboardData) {
        this.createStatusChart(dashboardData.statusCounts);
        this.createPriorityChart(dashboardData.priorityCounts);
    }

    /**
     * Cria o gráfico de status
     * @param {Object} statusCounts - Contagem de tickets por status
     */
    createStatusChart(statusCounts) {
        const ctx = document.getElementById('status-chart').getContext('2d');
        
        // Destrói o gráfico anterior se existir
        if (this.statusChart) {
            this.statusChart.destroy();
        }
        
        this.statusChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Aberto', 'Em Andamento', 'Resolvido'],
                datasets: [{
                    data: [statusCounts.open, statusCounts['in-progress'], statusCounts.resolved],
                    backgroundColor: [
                        '#4a6fa5', // Azul
                        '#ffc107', // Amarelo
                        '#28a745'  // Verde
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria o gráfico de prioridades
     * @param {Object} priorityCounts - Contagem de tickets por prioridade
     */
    createPriorityChart(priorityCounts) {
        const ctx = document.getElementById('priority-chart').getContext('2d');
        
        // Destrói o gráfico anterior se existir
        if (this.priorityChart) {
            this.priorityChart.destroy();
        }
        
        this.priorityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Baixa', 'Média', 'Alta'],
                datasets: [{
                    label: 'Tickets por Prioridade',
                    data: [priorityCounts.low, priorityCounts.medium, priorityCounts.high],
                    backgroundColor: [
                        '#28a745', // Verde
                        '#ffc107', // Amarelo
                        '#dc3545'  // Vermelho
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    /**
     * Cria o gráfico de métricas de tempo
     * @param {Object} dashboardData - Dados do dashboard
     */
    createTimeMetricsChart(dashboardData) {
        const ctx = document.getElementById('time-metrics-chart').getContext('2d');
        
        // Destrói o gráfico anterior se existir
        if (this.timeMetricsChart) {
            this.timeMetricsChart.destroy();
        }
        
        this.timeMetricsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [
                    'Abertura → Andamento', 
                    'Abertura → Resolução', 
                    'Andamento → Resolução'
                ],
                datasets: [{
                    label: 'Tempo Médio (Dias)',
                    data: [
                        dashboardData.avgTimeToProgress, 
                        dashboardData.avgTimeToResolve, 
                        dashboardData.avgTimeProgressToResolve
                    ],
                    backgroundColor: [
                        '#4a6fa5', // Azul
                        '#28a745', // Verde
                        '#6f42c1'  // Roxo
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Dias'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw || 0;
                                if (value < 1) {
                                    const hours = Math.round(value * 24);
                                    return `Tempo médio: ${hours} hora(s)`;
                                } else {
                                    const days = Math.round(value * 10) / 10;
                                    return `Tempo médio: ${days} dia(s)`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Atualiza o dashboard
     * @param {string} userId - ID do usuário
     */
    async update(userId) {
        try {
            const dashboardData = await this.fetchDashboardData(userId);
            this.updateStatistics(dashboardData);
            this.createCharts(dashboardData);
            this.createTimeMetricsChart(dashboardData);
        } catch (error) {
            console.error('Erro ao atualizar dashboard:', error);
        }
    }
}

// Exporta a instância do gerenciador de dashboard
const dashboardManager = new DashboardManager();
