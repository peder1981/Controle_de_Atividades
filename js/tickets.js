/**
 * Módulo de gerenciamento de tickets
 * Responsável por criar, editar, excluir e listar tickets
 */
class TicketManager {
    constructor() {
        this.apiUrl = 'http://localhost:9000/api';
        this.tickets = [];
    }

    /**
     * Obtém todos os tickets do usuário atual
     * @param {string} userId - ID do usuário
     * @returns {Promise<Array>} - Lista de tickets
     */
    async getTickets(userId) {
        if (!userId) {
            console.error('ID do usuário é obrigatório');
            return [];
        }

        try {
            const response = await fetch(`${this.apiUrl}/tickets?userId=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                this.tickets = data.tickets;
                return data.tickets;
            } else {
                console.error('Erro ao buscar tickets:', data.message);
                return [];
            }
        } catch (error) {
            console.error('Erro ao buscar tickets:', error);
            return [];
        }
    }

    /**
     * Cria um novo ticket
     * @param {Object} ticketData - Dados do ticket
     * @returns {Promise<Object>} - Ticket criado
     */
    async createTicket(ticketData) {
        if (!ticketData.title) {
            throw new Error('O título é obrigatório');
        }

        try {
            const response = await fetch(`${this.apiUrl}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ticketData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Atualiza a lista local de tickets
                this.tickets.push(data.ticket);
                return data.ticket;
            } else {
                throw new Error(data.message || 'Erro ao criar ticket');
            }
        } catch (error) {
            console.error('Erro ao criar ticket:', error);
            throw error;
        }
    }

    /**
     * Atualiza um ticket existente
     * @param {string} ticketId - ID do ticket
     * @param {Object} ticketData - Novos dados do ticket
     * @returns {Promise<Object|null>} - Ticket atualizado ou null
     */
    async updateTicket(ticketId, ticketData) {
        try {
            const response = await fetch(`${this.apiUrl}/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ticketData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Atualiza o ticket na lista local
                const index = this.tickets.findIndex(ticket => ticket.id === ticketId);
                if (index !== -1) {
                    this.tickets[index] = data.ticket;
                }
                return data.ticket;
            } else {
                console.error('Erro ao atualizar ticket:', data.message);
                return null;
            }
        } catch (error) {
            console.error('Erro ao atualizar ticket:', error);
            return null;
        }
    }

    /**
     * Exclui um ticket
     * @param {string} ticketId - ID do ticket
     * @returns {Promise<boolean>} - True se o ticket foi excluído
     */
    async deleteTicket(ticketId) {
        try {
            const response = await fetch(`${this.apiUrl}/tickets/${ticketId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remove o ticket da lista local
                this.tickets = this.tickets.filter(ticket => ticket.id !== ticketId);
                return true;
            } else {
                console.error('Erro ao excluir ticket:', data.message);
                return false;
            }
        } catch (error) {
            console.error('Erro ao excluir ticket:', error);
            return false;
        }
    }

    /**
     * Obtém um ticket pelo ID
     * @param {string} ticketId - ID do ticket
     * @returns {Object|null} - Ticket encontrado ou null
     */
    getTicketById(ticketId) {
        return this.tickets.find(ticket => ticket.id === ticketId) || null;
    }

    /**
     * Filtra tickets por status e/ou prioridade
     * @param {Array} tickets - Lista de tickets para filtrar
     * @param {Array|string} statuses - Statuses para filtrar (opcional)
     * @param {Array|string} priorities - Prioridades para filtrar (opcional)
     * @returns {Array} - Lista de tickets filtrados
     */
    filterTickets(tickets, statuses, priorities) {
        // Normalize parameters to arrays
        const statusArray = Array.isArray(statuses) ? statuses : [statuses];
        const priorityArray = Array.isArray(priorities) ? priorities : [priorities];
        return tickets.filter(ticket => {
            const statusMatch = statusArray.includes('all') || statusArray.includes(ticket.status);
            const priorityMatch = priorityArray.includes('all') || priorityArray.includes(ticket.priority);
            return statusMatch && priorityMatch;
        });
    }

    /**
     * Obtém tickets resolvidos em um período específico
     * @param {Array} tickets - Lista de tickets
     * @param {Date} startDate - Data inicial
     * @param {Date} endDate - Data final
     * @returns {Array} - Tickets resolvidos no período
     */
    getResolvedTicketsInPeriod(tickets, startDate, endDate) {
        return tickets.filter(ticket => {
            if (!ticket.resolved_at) return false;
            
            const resolvedDate = new Date(ticket.resolved_at);
            return resolvedDate >= startDate && resolvedDate <= endDate;
        });
    }

    /**
     * Obtém tickets resolvidos hoje
     * @param {Array} tickets - Lista de tickets
     * @returns {Array} - Tickets resolvidos hoje
     */
    getResolvedToday(tickets) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return this.getResolvedTicketsInPeriod(tickets, today, tomorrow);
    }

    /**
     * Obtém tickets resolvidos na última semana
     * @param {Array} tickets - Lista de tickets
     * @returns {Array} - Tickets resolvidos na última semana
     */
    getResolvedThisWeek(tickets) {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        return this.getResolvedTicketsInPeriod(tickets, weekStart, today);
    }

    /**
     * Obtém tickets resolvidos no último mês
     * @param {Array} tickets - Lista de tickets
     * @returns {Array} - Tickets resolvidos no último mês
     */
    getResolvedThisMonth(tickets) {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        return this.getResolvedTicketsInPeriod(tickets, monthStart, today);
    }

    /**
     * Conta tickets por status
     * @param {Array} tickets - Lista de tickets
     * @returns {Object} - Contagem de tickets por status
     */
    countTicketsByStatus(tickets) {
        const counts = {
            open: 0,
            'in-progress': 0,
            resolved: 0
        };
        
        tickets.forEach(ticket => {
            if (counts[ticket.status] !== undefined) {
                counts[ticket.status]++;
            }
        });
        
        return counts;
    }

    /**
     * Conta tickets por prioridade
     * @param {Array} tickets - Lista de tickets
     * @returns {Object} - Contagem de tickets por prioridade
     */
    countTicketsByPriority(tickets) {
        const counts = {
            low: 0,
            medium: 0,
            high: 0
        };
        
        tickets.forEach(ticket => {
            if (counts[ticket.priority] !== undefined) {
                counts[ticket.priority]++;
            }
        });
        
        return counts;
    }
}

// Exporta a instância do gerenciador de tickets
const ticketManager = new TicketManager();
