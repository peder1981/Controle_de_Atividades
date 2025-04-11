/**
 * Módulo de Dashboard
 * Responsável por gerar estatísticas e gráficos
 */
class DashboardManager {
    constructor() {
        this.statusChart = null;
        this.priorityChart = null;
    }

    /**
     * Inicializa o dashboard
     * @param {Array} tickets - Lista de tickets do usuário
     */
    initialize(tickets) {
        this.updateStatistics(tickets);
        this.createCharts(tickets);
    }

    /**
     * Atualiza as estatísticas do dashboard
     * @param {Array} tickets - Lista de tickets do usuário
     */
    updateStatistics(tickets) {
        // Total de tickets
        document.getElementById('total-tickets').textContent = tickets.length;

        // Tickets resolvidos hoje
        const resolvedToday = ticketManager.getResolvedToday(tickets);
        document.getElementById('resolved-today').textContent = resolvedToday.length;

        // Tickets resolvidos na semana
        const resolvedWeek = ticketManager.getResolvedThisWeek(tickets);
        document.getElementById('resolved-week').textContent = resolvedWeek.length;

        // Tickets resolvidos no mês
        const resolvedMonth = ticketManager.getResolvedThisMonth(tickets);
        document.getElementById('resolved-month').textContent = resolvedMonth.length;
    }

    /**
     * Cria os gráficos do dashboard
     * @param {Array} tickets - Lista de tickets do usuário
     */
    createCharts(tickets) {
        this.createStatusChart(tickets);
        this.createPriorityChart(tickets);
    }

    /**
     * Cria o gráfico de status
     * @param {Array} tickets - Lista de tickets do usuário
     */
    createStatusChart(tickets) {
        const statusCounts = ticketManager.countTicketsByStatus(tickets);
        
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
                                const percentage = Math.round((value / total) * 100);
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
     * @param {Array} tickets - Lista de tickets do usuário
     */
    createPriorityChart(tickets) {
        const priorityCounts = ticketManager.countTicketsByPriority(tickets);
        
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
     * Atualiza o dashboard
     * @param {Array} tickets - Lista de tickets do usuário
     */
    update(tickets) {
        this.updateStatistics(tickets);
        this.createCharts(tickets);
    }
}

// Exporta a instância do gerenciador de dashboard
const dashboardManager = new DashboardManager();
