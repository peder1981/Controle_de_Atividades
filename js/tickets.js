/**
 * Módulo de gerenciamento de tickets
 * Responsável por criar, editar, excluir e listar tickets
 */
class TicketManager {
    constructor() {
        this.ticketsKey = 'ticketapp_tickets';
    }

    /**
     * Obtém todos os tickets do usuário atual
     * @param {string} userId - ID do usuário
     * @returns {Array} - Lista de tickets
     */
    getTickets(userId) {
        const ticketsData = localStorage.getItem(this.ticketsKey);
        if (!ticketsData) {
            return [];
        }

        try {
            const allTickets = JSON.parse(ticketsData);
            // Filtra apenas os tickets do usuário atual
            return allTickets.filter(ticket => ticket.userId === userId);
        } catch (e) {
            console.error('Erro ao carregar tickets:', e);
            return [];
        }
    }

    /**
     * Salva a lista de tickets no localStorage
     * @param {Array} tickets - Lista de tickets
     */
    saveTickets(tickets) {
        localStorage.setItem(this.ticketsKey, JSON.stringify(tickets));
    }

    /**
     * Cria um novo ticket
     * @param {Object} ticketData - Dados do ticket
     * @returns {Object} - Ticket criado
     */
    createTicket(ticketData) {
        if (!ticketData.title) {
            throw new Error('O título é obrigatório');
        }

        const allTickets = this.getAllTickets();
        
        const newTicket = {
            id: this.generateId(),
            title: ticketData.title,
            description: ticketData.description || '',
            status: ticketData.status || 'open',
            priority: ticketData.priority || 'medium',
            userId: ticketData.userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            resolvedAt: null
        };

        allTickets.push(newTicket);
        this.saveTickets(allTickets);

        return newTicket;
    }

    /**
     * Atualiza um ticket existente
     * @param {string} ticketId - ID do ticket
     * @param {Object} ticketData - Novos dados do ticket
     * @returns {Object|null} - Ticket atualizado ou null
     */
    updateTicket(ticketId, ticketData) {
        const allTickets = this.getAllTickets();
        const index = allTickets.findIndex(ticket => ticket.id === ticketId);

        if (index === -1) {
            return null;
        }

        const ticket = allTickets[index];
        
        // Verifica se o ticket está sendo resolvido
        const wasResolved = ticket.status !== 'resolved' && ticketData.status === 'resolved';
        
        // Atualiza os campos
        ticket.title = ticketData.title || ticket.title;
        ticket.description = ticketData.description !== undefined ? ticketData.description : ticket.description;
        ticket.status = ticketData.status || ticket.status;
        ticket.priority = ticketData.priority || ticket.priority;
        ticket.updatedAt = new Date().toISOString();
        
        // Se o ticket foi resolvido, atualiza a data de resolução
        if (wasResolved) {
            ticket.resolvedAt = new Date().toISOString();
        } else if (ticket.status !== 'resolved') {
            // Se o status não é resolvido, remove a data de resolução
            ticket.resolvedAt = null;
        }

        allTickets[index] = ticket;
        this.saveTickets(allTickets);

        return ticket;
    }

    /**
     * Exclui um ticket
     * @param {string} ticketId - ID do ticket
     * @returns {boolean} - True se o ticket foi excluído
     */
    deleteTicket(ticketId) {
        const allTickets = this.getAllTickets();
        const filteredTickets = allTickets.filter(ticket => ticket.id !== ticketId);
        
        if (filteredTickets.length === allTickets.length) {
            return false; // Nenhum ticket foi removido
        }
        
        this.saveTickets(filteredTickets);
        return true;
    }

    /**
     * Obtém um ticket pelo ID
     * @param {string} ticketId - ID do ticket
     * @returns {Object|null} - Ticket encontrado ou null
     */
    getTicketById(ticketId) {
        const allTickets = this.getAllTickets();
        return allTickets.find(ticket => ticket.id === ticketId) || null;
    }

    /**
     * Obtém todos os tickets de todos os usuários
     * @returns {Array} - Lista de todos os tickets
     */
    getAllTickets() {
        const ticketsData = localStorage.getItem(this.ticketsKey);
        if (!ticketsData) {
            return [];
        }

        try {
            return JSON.parse(ticketsData);
        } catch (e) {
            console.error('Erro ao carregar tickets:', e);
            return [];
        }
    }

    /**
     * Filtra tickets por status e/ou prioridade
     * @param {Array} tickets - Lista de tickets para filtrar
     * @param {string} status - Status para filtrar (opcional)
     * @param {string} priority - Prioridade para filtrar (opcional)
     * @returns {Array} - Lista de tickets filtrados
     */
    filterTickets(tickets, status, priority) {
        return tickets.filter(ticket => {
            const statusMatch = status === 'all' || ticket.status === status;
            const priorityMatch = priority === 'all' || ticket.priority === priority;
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
            if (!ticket.resolvedAt) return false;
            
            const resolvedDate = new Date(ticket.resolvedAt);
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

    /**
     * Gera um ID único
     * @returns {string} - ID único
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Exporta a instância do gerenciador de tickets
const ticketManager = new TicketManager();
