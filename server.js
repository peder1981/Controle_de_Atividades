/**
 * Servidor backend para o Controle de Atividades
 * Utiliza SQLite para armazenamento permanente de dados
 */
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Conexão com o banco de dados
let db;

async function initDatabase() {
    // Abre a conexão com o banco de dados
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    // Cria as tabelas se não existirem
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_login TEXT,
            profile_image TEXT,
            role TEXT DEFAULT 'user',
            settings TEXT
        );

        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            resolved_at TEXT,
            category TEXT,
            assigned_to TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS tickets_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT NOT NULL,
            status TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id)
        );
        
        CREATE TABLE IF NOT EXISTS scheduled_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            report_type TEXT NOT NULL,
            parameters TEXT NOT NULL,
            schedule TEXT NOT NULL,
            email TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            last_run TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        CREATE TABLE IF NOT EXISTS metric_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            metric_type TEXT NOT NULL,
            condition TEXT NOT NULL,
            threshold REAL NOT NULL,
            email TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            last_triggered TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        CREATE TABLE IF NOT EXISTS alert_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id INTEGER NOT NULL,
            triggered_at TEXT NOT NULL,
            metric_value REAL NOT NULL,
            notification_sent INTEGER DEFAULT 0,
            FOREIGN KEY (alert_id) REFERENCES metric_alerts(id)
        );
    `);

    // Verifica se é necessário migrar dados históricos
    await migrateTicketsHistory();

    console.log('Banco de dados inicializado com sucesso');
}

// Função para migrar dados históricos para a tabela tickets_history
async function migrateTicketsHistory() {
    try {
        // Verifica se já existem registros na tabela tickets_history
        const historyCount = await db.get('SELECT COUNT(*) as count FROM tickets_history');
        
        // Se já existem registros, não é necessário migrar
        if (historyCount.count > 0) {
            console.log('Migração de histórico de tickets não é necessária');
            return;
        }
        
        // Busca todos os tickets existentes
        const tickets = await db.all('SELECT * FROM tickets');
        console.log(`Migrando histórico para ${tickets.length} tickets existentes`);
        
        // Para cada ticket, cria um registro histórico baseado no status atual
        for (const ticket of tickets) {
            // Registro inicial (quando o ticket foi criado)
            await db.run(
                'INSERT INTO tickets_history (ticket_id, status, updated_at) VALUES (?, ?, ?)',
                [ticket.id, 'open', ticket.created_at]
            );
            
            // Se o status atual não é 'open', adiciona um registro para o status atual
            if (ticket.status !== 'open') {
                await db.run(
                    'INSERT INTO tickets_history (ticket_id, status, updated_at) VALUES (?, ?, ?)',
                    [ticket.id, ticket.status, ticket.updated_at]
                );
            }
            
            // Se o ticket está resolvido, adiciona um registro para a resolução
            if (ticket.status === 'resolved' && ticket.resolved_at) {
                await db.run(
                    'INSERT INTO tickets_history (ticket_id, status, updated_at) VALUES (?, ?, ?)',
                    [ticket.id, 'resolved', ticket.resolved_at]
                );
            }
        }
        
        console.log('Migração de histórico de tickets concluída com sucesso');
    } catch (error) {
        console.error('Erro ao migrar histórico de tickets:', error);
    }
}

// Rotas de usuários
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validações
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios' });
        }

        // Verifica se o email é válido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Email inválido' });
        }

        // Verifica se o email já está em uso
        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Este email já está em uso' });
        }

        // Criptografa a senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Gera um ID único
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Cria o novo usuário
        await db.run(
            'INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, name, email.toLowerCase(), hashedPassword, new Date().toISOString()]
        );

        return res.status(201).json({ success: true, message: 'Usuário registrado com sucesso' });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validações
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
        }

        // Busca o usuário pelo email
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        // Verifica a senha
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Senha incorreta' });
        }

        // Atualiza o último login
        await db.run(
            'UPDATE users SET last_login = ? WHERE id = ?',
            [new Date().toISOString(), user.id]
        );

        // Cria a sessão do usuário (sem a senha)
        const sessionUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profile_image
        };

        return res.status(200).json({ success: true, user: sessionUser });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await db.get(
            'SELECT id, name, email, created_at, last_login, profile_image, role FROM users WHERE id = ?',
            [id]
        );
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await db.all(
            'SELECT id, name, email, role FROM users ORDER BY name'
        );
        
        return res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, profileImage, settings } = req.body;

        // Verifica se o usuário existe
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        // Atualiza os dados do usuário
        await db.run(
            'UPDATE users SET name = ?, email = ?, profile_image = ?, settings = ? WHERE id = ?',
            [
                name || user.name,
                email || user.email,
                profileImage !== undefined ? profileImage : user.profile_image,
                settings !== undefined ? JSON.stringify(settings) : user.settings,
                id
            ]
        );

        return res.status(200).json({ success: true, message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rotas de tickets
app.get('/api/tickets', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID do usuário é obrigatório' });
        }

        const tickets = await db.all('SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return res.status(200).json({ success: true, tickets });
    } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.post('/api/tickets', async (req, res) => {
    try {
        const { title, description, status, priority, userId, category } = req.body;

        // Validações
        if (!title || !userId) {
            return res.status(400).json({ success: false, message: 'Título e ID do usuário são obrigatórios' });
        }

        // Gera um ID único
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const now = new Date().toISOString();

        // Cria o novo ticket
        await db.run(
            'INSERT INTO tickets (id, title, description, status, priority, user_id, created_at, updated_at, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                id,
                title,
                description || '',
                status || 'open',
                priority || 'medium',
                userId,
                now,
                now,
                category || null
            ]
        );

        // Cria o histórico do ticket
        await db.run(
            'INSERT INTO tickets_history (ticket_id, status, updated_at) VALUES (?, ?, ?)',
            [id, status || 'open', now]
        );

        const newTicket = await db.get('SELECT * FROM tickets WHERE id = ?', [id]);
        return res.status(201).json({ success: true, ticket: newTicket });
    } catch (error) {
        console.error('Erro ao criar ticket:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.put('/api/tickets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority, category, assignedTo } = req.body;

        // Verifica se o ticket existe
        const ticket = await db.get('SELECT * FROM tickets WHERE id = ?', [id]);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado' });
        }

        const now = new Date().toISOString();
        
        // Verifica se o ticket está sendo resolvido
        const wasResolved = ticket.status !== 'resolved' && status === 'resolved';
        const resolvedAt = wasResolved ? now : (ticket.status === 'resolved' ? ticket.resolved_at : null);

        // Atualiza o ticket
        await db.run(
            'UPDATE tickets SET title = ?, description = ?, status = ?, priority = ?, updated_at = ?, resolved_at = ?, category = ?, assigned_to = ? WHERE id = ?',
            [
                title || ticket.title,
                description !== undefined ? description : ticket.description,
                status || ticket.status,
                priority || ticket.priority,
                now,
                resolvedAt,
                category !== undefined ? category : ticket.category,
                assignedTo !== undefined ? assignedTo : ticket.assigned_to,
                id
            ]
        );

        // Atualiza o histórico do ticket
        await db.run(
            'INSERT INTO tickets_history (ticket_id, status, updated_at) VALUES (?, ?, ?)',
            [id, status || ticket.status, now]
        );

        const updatedTicket = await db.get('SELECT * FROM tickets WHERE id = ?', [id]);
        return res.status(200).json({ success: true, ticket: updatedTicket });
    } catch (error) {
        console.error('Erro ao atualizar ticket:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.delete('/api/tickets/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica se o ticket existe
        const ticket = await db.get('SELECT * FROM tickets WHERE id = ?', [id]);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado' });
        }

        // Exclui o ticket
        await db.run('DELETE FROM tickets WHERE id = ?', [id]);
        await db.run('DELETE FROM tickets_history WHERE ticket_id = ?', [id]);
        return res.status(200).json({ success: true, message: 'Ticket excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir ticket:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rotas para dashboard
app.get('/api/dashboard/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Obtém todos os tickets do usuário
        const tickets = await db.all('SELECT * FROM tickets WHERE user_id = ?', [userId]);
        
        // Total de tickets
        const totalTickets = tickets.length;
        
        // Data atual
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        
        // Início da semana (domingo)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const weekStart = startOfWeek.toISOString();
        
        // Início do mês
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        // Tickets resolvidos hoje
        const resolvedToday = await db.all(
            'SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND status = ? AND updated_at >= ?', 
            [userId, 'resolved', today]
        );
        
        // Tickets resolvidos na semana
        const resolvedWeek = await db.all(
            'SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND status = ? AND updated_at >= ?', 
            [userId, 'resolved', weekStart]
        );
        
        // Tickets resolvidos no mês
        const resolvedMonth = await db.all(
            'SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND status = ? AND updated_at >= ?', 
            [userId, 'resolved', startOfMonth]
        );
        
        // Contagem por status
        const statusCounts = {
            open: 0,
            'in-progress': 0,
            resolved: 0
        };
        
        // Contagem por prioridade
        const priorityCounts = {
            low: 0,
            medium: 0,
            high: 0
        };
        
        // Conta os tickets por status e prioridade
        tickets.forEach(ticket => {
            // Conta por status
            if (statusCounts.hasOwnProperty(ticket.status)) {
                statusCounts[ticket.status]++;
            }
            
            // Conta por prioridade
            if (priorityCounts.hasOwnProperty(ticket.priority)) {
                priorityCounts[ticket.priority]++;
            }
        });
        
        // Cálculo dos tempos médios
        // 1. Tempo médio entre abertura e início do andamento
        const ticketsWithProgressTime = await db.all(`
            SELECT 
                t1.id,
                t1.created_at as created_at,
                t2.updated_at as in_progress_at
            FROM 
                tickets t1
            JOIN 
                (SELECT ticket_id, MIN(updated_at) as updated_at 
                FROM tickets_history 
                WHERE status = 'in-progress' 
                GROUP BY ticket_id) t2
            ON 
                t1.id = t2.ticket_id
            WHERE 
                t1.user_id = ?
        `, [userId]);
        
        let avgTimeToProgress = 0;
        if (ticketsWithProgressTime && ticketsWithProgressTime.length > 0) {
            let validTimeCount = 0;
            const totalTimeToProgress = ticketsWithProgressTime.reduce((sum, ticket) => {
                if (!ticket.created_at || !ticket.in_progress_at) return sum;
                
                const createdDate = new Date(ticket.created_at);
                const inProgressDate = new Date(ticket.in_progress_at);
                
                // Verifica se as datas são válidas
                if (isNaN(createdDate.getTime()) || isNaN(inProgressDate.getTime())) return sum;
                
                // Verifica se a data de progresso é posterior à data de criação
                if (inProgressDate <= createdDate) return sum;
                
                validTimeCount++;
                return sum + (inProgressDate - createdDate);
            }, 0);
            
            if (validTimeCount > 0) {
                avgTimeToProgress = totalTimeToProgress / validTimeCount / (1000 * 60 * 60 * 24); // Em dias
            }
        }
        
        // 2. Tempo médio entre abertura e resolução
        const resolvedTickets = tickets.filter(ticket => ticket.status === 'resolved' && ticket.resolved_at);
        let avgTimeToResolve = 0;
        if (resolvedTickets && resolvedTickets.length > 0) {
            let validTimeCount = 0;
            const totalTimeToResolve = resolvedTickets.reduce((sum, ticket) => {
                if (!ticket.created_at || !ticket.resolved_at) return sum;
                
                const createdDate = new Date(ticket.created_at);
                const resolvedDate = new Date(ticket.resolved_at);
                
                // Verifica se as datas são válidas
                if (isNaN(createdDate.getTime()) || isNaN(resolvedDate.getTime())) return sum;
                
                // Verifica se a data de resolução é posterior à data de criação
                if (resolvedDate <= createdDate) return sum;
                
                validTimeCount++;
                return sum + (resolvedDate - createdDate);
            }, 0);
            
            if (validTimeCount > 0) {
                avgTimeToResolve = totalTimeToResolve / validTimeCount / (1000 * 60 * 60 * 24); // Em dias
            }
        }
        
        // 3. Tempo médio entre início do andamento e resolução
        const ticketsWithProgressAndResolution = await db.all(`
            SELECT 
                t1.ticket_id,
                t1.updated_at as in_progress_at,
                t2.resolved_at
            FROM 
                (SELECT ticket_id, MIN(updated_at) as updated_at 
                FROM tickets_history 
                WHERE status = 'in-progress' 
                GROUP BY ticket_id) t1
            JOIN 
                tickets t2
            ON 
                t1.ticket_id = t2.id
            WHERE 
                t2.user_id = ? AND
                t2.status = 'resolved' AND
                t2.resolved_at IS NOT NULL
        `, [userId]);
        
        let avgTimeProgressToResolve = 0;
        if (ticketsWithProgressAndResolution && ticketsWithProgressAndResolution.length > 0) {
            let validTimeCount = 0;
            const totalTimeProgressToResolve = ticketsWithProgressAndResolution.reduce((sum, ticket) => {
                if (!ticket.in_progress_at || !ticket.resolved_at) return sum;
                
                const inProgressDate = new Date(ticket.in_progress_at);
                const resolvedDate = new Date(ticket.resolved_at);
                
                // Verifica se as datas são válidas
                if (isNaN(inProgressDate.getTime()) || isNaN(resolvedDate.getTime())) return sum;
                
                // Verifica se a data de resolução é posterior à data de início do andamento
                if (resolvedDate <= inProgressDate) return sum;
                
                validTimeCount++;
                return sum + (resolvedDate - inProgressDate);
            }, 0);
            
            if (validTimeCount > 0) {
                avgTimeProgressToResolve = totalTimeProgressToResolve / validTimeCount / (1000 * 60 * 60 * 24); // Em dias
            }
        }
        
        // Monta o objeto de resposta
        const dashboardData = {
            totalTickets,
            resolvedToday: resolvedToday[0].count,
            resolvedWeek: resolvedWeek[0].count,
            resolvedMonth: resolvedMonth[0].count,
            statusCounts,
            priorityCounts,
            avgTimeToProgress,
            avgTimeToResolve,
            avgTimeProgressToResolve
        };
        
        return res.status(200).json({
            success: true,
            dashboard: dashboardData
        });
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rotas para relatórios gerenciais
app.get('/api/reports/tickets', async (req, res) => {
    try {
        // Parâmetros de filtro
        const { 
            userId, 
            status, 
            priority, 
            category,
            startDate, 
            endDate, 
            assignedTo,
            sortBy = 'created_at',
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        // Construir a consulta SQL base
        let query = 'SELECT t.*, u.name as user_name, a.name as assigned_name FROM tickets t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN users a ON t.assigned_to = a.id WHERE 1=1';
        const params = [];

        // Adicionar filtros conforme os parâmetros
        if (userId) {
            query += ' AND t.user_id = ?';
            params.push(userId);
        }

        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        if (priority) {
            query += ' AND t.priority = ?';
            params.push(priority);
        }

        if (category) {
            query += ' AND t.category = ?';
            params.push(category);
        }

        if (assignedTo) {
            query += ' AND t.assigned_to = ?';
            params.push(assignedTo);
        }

        if (startDate) {
            query += ' AND t.created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND t.created_at <= ?';
            params.push(endDate);
        }

        // Adicionar ordenação
        query += ` ORDER BY t.${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;

        // Consulta para contar o total de registros
        const countQuery = query.replace('SELECT t.*, u.name as user_name, a.name as assigned_name', 'SELECT COUNT(*) as total');
        const countResult = await db.get(countQuery, params);
        const total = countResult.total;

        // Adicionar paginação
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        // Executar a consulta
        const tickets = await db.all(query, params);

        return res.status(200).json({
            success: true,
            tickets,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de tickets:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/api/reports/performance', async (req, res) => {
    try {
        const { 
            userId, 
            startDate, 
            endDate,
            groupBy = 'day' // day, week, month
        } = req.query;

        // Validação
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Datas de início e fim são obrigatórias' 
            });
        }

        // Formatar datas para SQLite
        const start = new Date(startDate).toISOString();
        const end = new Date(endDate).toISOString();

        // Construir a consulta SQL baseada no agrupamento
        let timeFormat;
        switch(groupBy) {
            case 'week':
                timeFormat = "strftime('%Y-%W', updated_at)"; // Ano-Semana
                break;
            case 'month':
                timeFormat = "strftime('%Y-%m', updated_at)"; // Ano-Mês
                break;
            default: // day
                timeFormat = "strftime('%Y-%m-%d', updated_at)"; // Ano-Mês-Dia
        }

        // Consulta para tickets resolvidos por período
        let query = `
            SELECT 
                ${timeFormat} as period,
                COUNT(*) as resolved_count
            FROM 
                tickets
            WHERE 
                status = 'resolved'
                AND updated_at BETWEEN ? AND ?
        `;

        const params = [start, end];

        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }

        query += ` GROUP BY ${timeFormat} ORDER BY period`;

        const resolvedByPeriod = await db.all(query, params);

        // Consulta para tempo médio de resolução por período
        let avgTimeQuery = `
            SELECT 
                ${timeFormat} as period,
                AVG((julianday(resolved_at) - julianday(created_at)) * 24 * 60) as avg_resolution_time_minutes
            FROM 
                tickets
            WHERE 
                status = 'resolved'
                AND resolved_at IS NOT NULL
                AND updated_at BETWEEN ? AND ?
        `;

        const avgTimeParams = [start, end];

        if (userId) {
            avgTimeQuery += ' AND user_id = ?';
            avgTimeParams.push(userId);
        }

        avgTimeQuery += ` GROUP BY ${timeFormat} ORDER BY period`;

        const avgTimeByPeriod = await db.all(avgTimeQuery, avgTimeParams);

        // Consulta para tickets criados por período
        let createdQuery = `
            SELECT 
                ${timeFormat} as period,
                COUNT(*) as created_count
            FROM 
                tickets
            WHERE 
                created_at BETWEEN ? AND ?
        `;

        const createdParams = [start, end];

        if (userId) {
            createdQuery += ' AND user_id = ?';
            createdParams.push(userId);
        }

        createdQuery += ` GROUP BY ${timeFormat} ORDER BY period`;

        const createdByPeriod = await db.all(createdQuery, createdParams);

        // Mesclar os resultados
        const periods = new Set([
            ...resolvedByPeriod.map(item => item.period),
            ...avgTimeByPeriod.map(item => item.period),
            ...createdByPeriod.map(item => item.period)
        ]);

        const performanceData = Array.from(periods).map(period => {
            const resolved = resolvedByPeriod.find(item => item.period === period);
            const avgTime = avgTimeByPeriod.find(item => item.period === period);
            const created = createdByPeriod.find(item => item.period === period);
            
            return {
                period,
                resolved_count: resolved ? resolved.resolved_count : 0,
                created_count: created ? created.created_count : 0,
                avg_resolution_time_minutes: avgTime ? avgTime.avg_resolution_time_minutes : 0
            };
        }).sort((a, b) => a.period.localeCompare(b.period));

        return res.status(200).json({
            success: true,
            performance: performanceData
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de desempenho:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/api/reports/categories', async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;

        // Construir a consulta SQL
        let query = `
            SELECT 
                category,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open
            FROM 
                tickets
            WHERE 
                1=1
        `;

        const params = [];

        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }

        if (startDate) {
            query += ' AND created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND created_at <= ?';
            params.push(endDate);
        }

        query += ' GROUP BY category ORDER BY total DESC';

        const categories = await db.all(query, params);

        return res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Erro ao gerar relatório por categorias:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/api/reports/users-performance', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Validação
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Datas de início e fim são obrigatórias' 
            });
        }

        // Formatar datas para SQLite
        const start = new Date(startDate).toISOString();
        const end = new Date(endDate).toISOString();

        // Consulta para desempenho dos usuários
        const query = `
            SELECT 
                u.id,
                u.name,
                COUNT(t.id) as total_tickets,
                SUM(CASE WHEN t.status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
                AVG(CASE WHEN t.status = 'resolved' AND t.resolved_at IS NOT NULL 
                    THEN (julianday(t.resolved_at) - julianday(t.created_at)) * 24 * 60 
                    ELSE NULL END) as avg_resolution_time_minutes
            FROM 
                users u
            LEFT JOIN 
                tickets t ON u.id = t.assigned_to AND t.created_at BETWEEN ? AND ?
            GROUP BY 
                u.id, u.name
            ORDER BY 
                resolved_tickets DESC
        `;

        const usersPerformance = await db.all(query, [start, end]);

        return res.status(200).json({
            success: true,
            users_performance: usersPerformance
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de desempenho por usuário:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/api/reports/export', async (req, res) => {
    try {
        const { type, ...filters } = req.query;
        
        let data;
        
        // Obter dados com base no tipo de relatório
        switch(type) {
            case 'tickets':
                // Reutilizar a lógica do relatório de tickets, mas sem paginação
                let query = 'SELECT t.*, u.name as user_name, a.name as assigned_name FROM tickets t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN users a ON t.assigned_to = a.id WHERE 1=1';
                const params = [];
                
                if (filters.userId) {
                    query += ' AND t.user_id = ?';
                    params.push(filters.userId);
                }
                
                if (filters.status) {
                    query += ' AND t.status = ?';
                    params.push(filters.status);
                }
                
                if (filters.priority) {
                    query += ' AND t.priority = ?';
                    params.push(filters.priority);
                }
                
                if (filters.category) {
                    query += ' AND t.category = ?';
                    params.push(filters.category);
                }
                
                if (filters.assignedTo) {
                    query += ' AND t.assigned_to = ?';
                    params.push(filters.assignedTo);
                }
                
                if (filters.startDate) {
                    query += ' AND t.created_at >= ?';
                    params.push(filters.startDate);
                }
                
                if (filters.endDate) {
                    query += ' AND t.created_at <= ?';
                    params.push(filters.endDate);
                }
                
                // Ordenação padrão
                query += ' ORDER BY t.created_at DESC';
                
                data = await db.all(query, params);
                break;
                
            case 'performance':
                // Reutilizar a lógica do relatório de desempenho
                if (!filters.startDate || !filters.endDate) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Datas de início e fim são obrigatórias' 
                    });
                }
                
                // Lógica similar à rota de performance
                // (simplificado para o exemplo)
                const performanceQuery = `
                    SELECT 
                        strftime('%Y-%m-%d', updated_at) as date,
                        COUNT(*) as resolved_count
                    FROM 
                        tickets
                    WHERE 
                        status = 'resolved'
                        AND updated_at BETWEEN ? AND ?
                    GROUP BY 
                        date
                    ORDER BY 
                        date
                `;
                
                data = await db.all(performanceQuery, [
                    new Date(filters.startDate).toISOString(),
                    new Date(filters.endDate).toISOString()
                ]);
                break;
                
            default:
                return res.status(400).json({ 
                    success: false, 
                    message: 'Tipo de relatório inválido' 
                });
        }
        
        // Formato CSV simples
        let csv = '';
        
        // Cabeçalhos
        if (data.length > 0) {
            csv = Object.keys(data[0]).join(',') + '\n';
        }
        
        // Dados
        data.forEach(row => {
            csv += Object.values(row).map(value => {
                // Escapar strings com vírgulas
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            }).join(',') + '\n';
        });
        
        // Configurar cabeçalhos para download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio-${type}-${new Date().toISOString().split('T')[0]}.csv`);
        
        return res.status(200).send(csv);
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Consultas adicionais parametrizáveis

// 1. Análise de tendências de tickets
app.get('/api/reports/trends', async (req, res) => {
    try {
        const { 
            userId, 
            period = 'month', // day, week, month, year
            metric = 'created', // created, resolved, resolution_time
            startDate,
            endDate,
            category
        } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Datas de início e fim são obrigatórias' 
            });
        }

        // Formatar datas para SQLite
        const start = new Date(startDate).toISOString();
        const end = new Date(endDate).toISOString();

        // Definir o formato de data com base no período
        let dateFormat;
        switch(period) {
            case 'day':
                dateFormat = "%Y-%m-%d";
                break;
            case 'week':
                dateFormat = "%Y-%W";
                break;
            case 'month':
                dateFormat = "%Y-%m";
                break;
            case 'year':
                dateFormat = "%Y";
                break;
            default:
                dateFormat = "%Y-%m-%d";
        }

        // Construir a consulta SQL com base na métrica selecionada
        let query, params = [];

        if (metric === 'created') {
            query = `
                SELECT 
                    strftime('${dateFormat}', created_at) as period,
                    COUNT(*) as count
                FROM 
                    tickets
                WHERE 
                    created_at BETWEEN ? AND ?
            `;
            params = [start, end];
        } else if (metric === 'resolved') {
            query = `
                SELECT 
                    strftime('${dateFormat}', resolved_at) as period,
                    COUNT(*) as count
                FROM 
                    tickets
                WHERE 
                    status = 'resolved'
                    AND resolved_at BETWEEN ? AND ?
            `;
            params = [start, end];
        } else if (metric === 'resolution_time') {
            query = `
                SELECT 
                    strftime('${dateFormat}', resolved_at) as period,
                    AVG((julianday(resolved_at) - julianday(created_at)) * 24 * 60) as avg_minutes
                FROM 
                    tickets
                WHERE 
                    status = 'resolved'
                    AND resolved_at IS NOT NULL
                    AND created_at IS NOT NULL
                    AND resolved_at BETWEEN ? AND ?
            `;
            params = [start, end];
        }

        // Adicionar filtros adicionais
        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        // Agrupar e ordenar
        query += ` GROUP BY period ORDER BY period`;

        const data = await db.all(query, params);

        return res.status(200).json({
            success: true,
            trends: data
        });
    } catch (error) {
        console.error('Erro ao gerar análise de tendências:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// 2. Comparativo entre períodos
app.get('/api/reports/period-comparison', async (req, res) => {
    try {
        const { 
            userId, 
            period1Start, 
            period1End,
            period2Start,
            period2End,
            metric = 'tickets' // tickets, resolution_time
        } = req.query;

        // Validação
        if (!period1Start || !period1End || !period2Start || !period2End) {
            return res.status(400).json({ 
                success: false, 
                message: 'Datas de início e fim para ambos os períodos são obrigatórias' 
            });
        }

        // Formatar datas para SQLite
        const start1 = new Date(period1Start).toISOString();
        const end1 = new Date(period1End).toISOString();
        const start2 = new Date(period2Start).toISOString();
        const end2 = new Date(period2End).toISOString();

        let period1Data, period2Data;
        let params1 = [], params2 = [];

        // Construir as consultas com base na métrica
        if (metric === 'tickets') {
            // Consulta para o período 1
            let query1 = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
                    SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
                FROM 
                    tickets
                WHERE 
                    created_at BETWEEN ? AND ?
            `;
            params1 = [start1, end1];

            // Consulta para o período 2
            let query2 = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
                    SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
                FROM 
                    tickets
                WHERE 
                    created_at BETWEEN ? AND ?
            `;
            params2 = [start2, end2];

            if (userId) {
                query1 += ' AND user_id = ?';
                params1.push(userId);
                query2 += ' AND user_id = ?';
                params2.push(userId);
            }

            period1Data = await db.get(query1, params1);
            period2Data = await db.get(query2, params2);
        } else if (metric === 'resolution_time') {
            // Consulta para o período 1
            let query1 = `
                SELECT 
                    AVG((julianday(resolved_at) - julianday(created_at)) * 24 * 60) as avg_minutes,
                    COUNT(*) as resolved_count
                FROM 
                    tickets
                WHERE 
                    status = 'resolved'
                    AND resolved_at IS NOT NULL
                    AND created_at IS NOT NULL
                    AND resolved_at BETWEEN ? AND ?
            `;
            params1 = [start1, end1];

            // Consulta para o período 2
            let query2 = `
                SELECT 
                    AVG((julianday(resolved_at) - julianday(created_at)) * 24 * 60) as avg_minutes,
                    COUNT(*) as resolved_count
                FROM 
                    tickets
                WHERE 
                    status = 'resolved'
                    AND resolved_at IS NOT NULL
                    AND created_at IS NOT NULL
                    AND resolved_at BETWEEN ? AND ?
            `;
            params2 = [start2, end2];

            if (userId) {
                query1 += ' AND user_id = ?';
                params1.push(userId);
                query2 += ' AND user_id = ?';
                params2.push(userId);
            }

            period1Data = await db.get(query1, params1);
            period2Data = await db.get(query2, params2);
        }

        // Calcular variações percentuais
        let comparison = {
            period1: {
                start: period1Start,
                end: period1End,
                data: period1Data
            },
            period2: {
                start: period2Start,
                end: period2End,
                data: period2Data
            },
            variations: {}
        };

        // Calcular variações percentuais para cada métrica
        if (metric === 'tickets') {
            comparison.variations.total = period1Data.total > 0 
                ? ((period2Data.total - period1Data.total) / period1Data.total * 100).toFixed(2) 
                : null;
            
            comparison.variations.open = period1Data.open > 0 
                ? ((period2Data.open - period1Data.open) / period1Data.open * 100).toFixed(2) 
                : null;
            
            comparison.variations.in_progress = period1Data.in_progress > 0 
                ? ((period2Data.in_progress - period1Data.in_progress) / period1Data.in_progress * 100).toFixed(2) 
                : null;
            
            comparison.variations.resolved = period1Data.resolved > 0 
                ? ((period2Data.resolved - period1Data.resolved) / period1Data.resolved * 100).toFixed(2) 
                : null;
        } else if (metric === 'resolution_time') {
            comparison.variations.avg_minutes = period1Data.avg_minutes > 0 
                ? ((period2Data.avg_minutes - period1Data.avg_minutes) / period1Data.avg_minutes * 100).toFixed(2) 
                : null;
            
            comparison.variations.resolved_count = period1Data.resolved_count > 0 
                ? ((period2Data.resolved_count - period1Data.resolved_count) / period1Data.resolved_count * 100).toFixed(2) 
                : null;
        }

        return res.status(200).json({
            success: true,
            comparison
        });
    } catch (error) {
        console.error('Erro ao gerar comparativo entre períodos:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// 3. Métricas de eficiência por usuário ou categoria
app.get('/api/reports/efficiency', async (req, res) => {
    try {
        const { 
            startDate, 
            endDate,
            groupBy = 'user', // user, category
            metric = 'resolution_time' // resolution_time, resolution_rate
        } = req.query;

        // Validação
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Datas de início e fim são obrigatórias' 
            });
        }

        // Formatar datas para SQLite
        const start = new Date(startDate).toISOString();
        const end = new Date(endDate).toISOString();

        // Construir a consulta SQL com base no agrupamento e métrica
        let query, params = [start, end];

        if (groupBy === 'user') {
            if (metric === 'resolution_time') {
                query = `
                    SELECT 
                        u.id,
                        u.name,
                        COUNT(t.id) as total_tickets,
                        SUM(CASE WHEN t.status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
                        AVG(CASE WHEN t.status = 'resolved' AND t.resolved_at IS NOT NULL 
                            THEN (julianday(t.resolved_at) - julianday(t.created_at)) * 24 * 60 
                            ELSE NULL END) as avg_resolution_time_minutes
                    FROM 
                        users u
                    LEFT JOIN 
                        tickets t ON u.id = t.assigned_to AND t.created_at BETWEEN ? AND ?
                    GROUP BY 
                        u.id, u.name
                    HAVING 
                        total_tickets > 0
                    ORDER BY 
                        avg_resolution_time_minutes ASC
                `;
            } else if (metric === 'resolution_rate') {
                query = `
                    SELECT 
                        u.id,
                        u.name,
                        COUNT(t.id) as total_tickets,
                        SUM(CASE WHEN t.status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
                        CASE WHEN COUNT(t.id) > 0 
                            THEN (SUM(CASE WHEN t.status = 'resolved' THEN 1 ELSE 0 END) * 100.0 / COUNT(t.id)) 
                            ELSE 0 END as resolution_rate
                    FROM 
                        users u
                    LEFT JOIN 
                        tickets t ON u.id = t.assigned_to AND t.created_at BETWEEN ? AND ?
                    GROUP BY 
                        u.id, u.name
                    HAVING 
                        total_tickets > 0
                    ORDER BY 
                        resolution_rate DESC
                `;
            }
        } else if (groupBy === 'category') {
            if (metric === 'resolution_time') {
                query = `
                    SELECT 
                        category,
                        COUNT(*) as total_tickets,
                        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
                        AVG(CASE WHEN status = 'resolved' AND resolved_at IS NOT NULL 
                            THEN (julianday(resolved_at) - julianday(created_at)) * 24 * 60 
                            ELSE NULL END) as avg_resolution_time_minutes
                    FROM 
                        tickets
                    WHERE 
                        created_at BETWEEN ? AND ?
                        AND category IS NOT NULL
                    GROUP BY 
                        category
                    ORDER BY 
                        avg_resolution_time_minutes ASC
                `;
            } else if (metric === 'resolution_rate') {
                query = `
                    SELECT 
                        category,
                        COUNT(*) as total_tickets,
                        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
                        (SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as resolution_rate
                    FROM 
                        tickets
                    WHERE 
                        created_at BETWEEN ? AND ?
                        AND category IS NOT NULL
                    GROUP BY 
                        category
                    ORDER BY 
                        resolution_rate DESC
                `;
            }
        }

        const data = await db.all(query, params);

        return res.status(200).json({
            success: true,
            efficiency: data
        });
    } catch (error) {
        console.error('Erro ao gerar métricas de eficiência:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// 4. Análise de carga de trabalho
app.get('/api/reports/workload', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Validação
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Datas de início e fim são obrigatórias' 
            });
        }

        // Formatar datas para SQLite
        const start = new Date(startDate).toISOString();
        const end = new Date(endDate).toISOString();

        // Consulta para carga de trabalho atual por usuário
        const currentWorkloadQuery = `
            SELECT 
                u.id,
                u.name,
                COUNT(CASE WHEN t.status != 'resolved' THEN t.id ELSE NULL END) as open_tickets,
                COUNT(CASE WHEN t.status = 'open' THEN t.id ELSE NULL END) as pending_tickets,
                COUNT(CASE WHEN t.status = 'in-progress' THEN t.id ELSE NULL END) as in_progress_tickets,
                COUNT(CASE WHEN t.priority = 'high' AND t.status != 'resolved' THEN t.id ELSE NULL END) as high_priority_tickets
            FROM 
                users u
            LEFT JOIN 
                tickets t ON u.id = t.assigned_to AND t.created_at BETWEEN ? AND ?
            GROUP BY 
                u.id, u.name
            ORDER BY 
                open_tickets DESC
        `;

        const workloadData = await db.all(currentWorkloadQuery, [start, end]);

        // Consulta para distribuição de tickets por dia da semana
        const weekdayDistributionQuery = `
            SELECT 
                strftime('%w', created_at) as weekday,
                COUNT(*) as ticket_count
            FROM 
                tickets
            WHERE 
                created_at BETWEEN ? AND ?
            GROUP BY 
                weekday
            ORDER BY 
                weekday
        `;

        const weekdayData = await db.all(weekdayDistributionQuery, [start, end]);

        // Mapear números de dias da semana para nomes
        const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const weekdayDistribution = weekdayData.map(item => ({
            weekday: weekdayNames[parseInt(item.weekday)],
            weekday_number: parseInt(item.weekday),
            ticket_count: item.ticket_count
        }));

        // Consulta para distribuição de tickets por hora do dia
        const hourDistributionQuery = `
            SELECT 
                strftime('%H', created_at) as hour,
                COUNT(*) as ticket_count
            FROM 
                tickets
            WHERE 
                created_at BETWEEN ? AND ?
            GROUP BY 
                hour
            ORDER BY 
                hour
        `;

        const hourData = await db.all(hourDistributionQuery, [start, end]);

        return res.status(200).json({
            success: true,
            workload: {
                user_workload: workloadData,
                weekday_distribution: weekdayDistribution,
                hour_distribution: hourData
            }
        });
    } catch (error) {
        console.error('Erro ao gerar análise de carga de trabalho:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// 5. Análise de tempo de resposta
app.get('/api/reports/response-time', async (req, res) => {
    try {
        const { 
            startDate, 
            endDate,
            userId,
            category,
            priority
        } = req.query;

        // Validação
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Datas de início e fim são obrigatórias' 
            });
        }

        // Formatar datas para SQLite
        const start = new Date(startDate).toISOString();
        const end = new Date(endDate).toISOString();

        // Consulta base
        let query = `
            SELECT 
                t.id,
                t.title,
                t.status,
                t.priority,
                t.category,
                t.created_at,
                MIN(h.updated_at) as first_action_at,
                (julianday(MIN(h.updated_at)) - julianday(t.created_at)) * 24 * 60 as response_time_minutes
            FROM 
                tickets t
            JOIN 
                tickets_history h ON t.id = h.ticket_id AND h.status != 'open'
            WHERE 
                t.created_at BETWEEN ? AND ?
        `;

        const params = [start, end];

        // Adicionar filtros adicionais
        if (userId) {
            query += ' AND t.user_id = ?';
            params.push(userId);
        }

        if (category) {
            query += ' AND t.category = ?';
            params.push(category);
        }

        if (priority) {
            query += ' AND t.priority = ?';
            params.push(priority);
        }

        // Agrupar e ordenar
        query += ` 
            GROUP BY 
                t.id
            ORDER BY 
                response_time_minutes DESC
        `;

        const detailedData = await db.all(query, params);

        // Calcular estatísticas
        let totalResponseTime = 0;
        let validTickets = 0;
        let maxResponseTime = 0;
        let minResponseTime = Number.MAX_SAFE_INTEGER;

        detailedData.forEach(ticket => {
            if (ticket.response_time_minutes) {
                totalResponseTime += ticket.response_time_minutes;
                validTickets++;
                
                if (ticket.response_time_minutes > maxResponseTime) {
                    maxResponseTime = ticket.response_time_minutes;
                }
                
                if (ticket.response_time_minutes < minResponseTime) {
                    minResponseTime = ticket.response_time_minutes;
                }
            }
        });

        const avgResponseTime = validTickets > 0 ? totalResponseTime / validTickets : 0;
        
        // Se não houver tickets válidos, definir min como 0
        if (validTickets === 0) {
            minResponseTime = 0;
        }

        // Agrupar por prioridade
        const priorityQuery = `
            SELECT 
                t.priority,
                AVG((julianday(MIN(h.updated_at)) - julianday(t.created_at)) * 24 * 60) as avg_response_time_minutes,
                COUNT(*) as ticket_count
            FROM 
                tickets t
            JOIN 
                tickets_history h ON t.id = h.ticket_id AND h.status != 'open'
            WHERE 
                t.created_at BETWEEN ? AND ?
                ${userId ? 'AND t.user_id = ?' : ''}
                ${category ? 'AND t.category = ?' : ''}
            GROUP BY 
                t.priority
            ORDER BY 
                avg_response_time_minutes
        `;

        const priorityParams = [start, end];
        if (userId) priorityParams.push(userId);
        if (category) priorityParams.push(category);

        const priorityData = await db.all(priorityQuery, priorityParams);

        return res.status(200).json({
            success: true,
            response_time: {
                statistics: {
                    avg_response_time_minutes: avgResponseTime,
                    max_response_time_minutes: maxResponseTime,
                    min_response_time_minutes: minResponseTime,
                    total_tickets_analyzed: validTickets
                },
                by_priority: priorityData,
                detailed_data: detailedData
            }
        });
    } catch (error) {
        console.error('Erro ao gerar análise de tempo de resposta:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rotas para relatórios agendados
app.get('/api/scheduled-reports', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do usuário é obrigatório' 
            });
        }
        
        const reports = await db.all(
            'SELECT * FROM scheduled_reports WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        return res.status(200).json({
            success: true,
            reports
        });
    } catch (error) {
        console.error('Erro ao buscar relatórios agendados:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.post('/api/scheduled-reports', async (req, res) => {
    try {
        const { 
            userId, 
            name,
            reportType, 
            parameters, 
            schedule, 
            email 
        } = req.body;
        
        // Validações
        if (!userId || !name || !reportType || !parameters || !schedule || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos os campos são obrigatórios' 
            });
        }
        
        // Validar e-mail
        if (!email.includes('@')) {
            return res.status(400).json({ 
                success: false, 
                message: 'E-mail inválido' 
            });
        }
        
        // Validar agendamento
        if (!['daily', 'weekly', 'monthly'].includes(schedule)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Agendamento deve ser daily, weekly ou monthly' 
            });
        }
        
        // Inserir no banco de dados
        const result = await db.run(
            `INSERT INTO scheduled_reports 
            (user_id, name, report_type, parameters, schedule, email, active, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
            [
                userId,
                name,
                reportType,
                JSON.stringify(parameters),
                schedule,
                email,
                new Date().toISOString()
            ]
        );
        
        // Buscar o relatório criado
        const report = await db.get(
            'SELECT * FROM scheduled_reports WHERE id = ?',
            [result.lastID]
        );
        
        return res.status(201).json({
            success: true,
            report,
            message: 'Relatório agendado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar relatório agendado:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.put('/api/scheduled-reports/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name,
            reportType, 
            parameters, 
            schedule, 
            email,
            active
        } = req.body;
        
        // Validações
        if (!name || !reportType || !parameters || !schedule || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos os campos são obrigatórios' 
            });
        }
        
        // Verificar se o relatório existe
        const existingReport = await db.get(
            'SELECT * FROM scheduled_reports WHERE id = ?',
            [id]
        );
        
        if (!existingReport) {
            return res.status(404).json({ 
                success: false, 
                message: 'Relatório agendado não encontrado' 
            });
        }
        
        // Atualizar no banco de dados
        await db.run(
            `UPDATE scheduled_reports 
            SET name = ?, report_type = ?, parameters = ?, schedule = ?, email = ?, active = ?
            WHERE id = ?`,
            [
                name,
                reportType,
                JSON.stringify(parameters),
                schedule,
                email,
                active ? 1 : 0,
                id
            ]
        );
        
        // Buscar o relatório atualizado
        const report = await db.get(
            'SELECT * FROM scheduled_reports WHERE id = ?',
            [id]
        );
        
        return res.status(200).json({
            success: true,
            report,
            message: 'Relatório agendado atualizado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao atualizar relatório agendado:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.delete('/api/scheduled-reports/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se o relatório existe
        const existingReport = await db.get(
            'SELECT * FROM scheduled_reports WHERE id = ?',
            [id]
        );
        
        if (!existingReport) {
            return res.status(404).json({ 
                success: false, 
                message: 'Relatório agendado não encontrado' 
            });
        }
        
        // Excluir do banco de dados
        await db.run(
            'DELETE FROM scheduled_reports WHERE id = ?',
            [id]
        );
        
        return res.status(200).json({
            success: true,
            message: 'Relatório agendado excluído com sucesso'
        });
    } catch (error) {
        console.error('Erro ao excluir relatório agendado:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rotas para alertas de métricas
app.get('/api/metric-alerts', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do usuário é obrigatório' 
            });
        }
        
        const alerts = await db.all(
            'SELECT * FROM metric_alerts WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        return res.status(200).json({
            success: true,
            alerts
        });
    } catch (error) {
        console.error('Erro ao buscar alertas de métricas:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.post('/api/metric-alerts', async (req, res) => {
    try {
        const { 
            userId, 
            name,
            metricType, 
            condition, 
            threshold, 
            email 
        } = req.body;
        
        // Validações
        if (!userId || !name || !metricType || !condition || threshold === undefined || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos os campos são obrigatórios' 
            });
        }
        
        // Validar e-mail
        if (!email.includes('@')) {
            return res.status(400).json({ 
                success: false, 
                message: 'E-mail inválido' 
            });
        }
        
        // Validar tipo de métrica
        if (!['open_tickets', 'resolution_time', 'response_time', 'high_priority_tickets'].includes(metricType)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tipo de métrica inválido' 
            });
        }
        
        // Validar condição
        if (!['>', '>=', '<', '<=', '=', '=='].includes(condition)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Condição inválida' 
            });
        }
        
        // Inserir no banco de dados
        const result = await db.run(
            `INSERT INTO metric_alerts 
            (user_id, name, metric_type, condition, threshold, email, active, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
            [
                userId,
                name,
                metricType,
                condition,
                threshold,
                email,
                new Date().toISOString()
            ]
        );
        
        // Buscar o alerta criado
        const alert = await db.get(
            'SELECT * FROM metric_alerts WHERE id = ?',
            [result.lastID]
        );
        
        return res.status(201).json({
            success: true,
            alert,
            message: 'Alerta de métrica criado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar alerta de métrica:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.put('/api/metric-alerts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name,
            metricType, 
            condition, 
            threshold, 
            email,
            active
        } = req.body;
        
        // Validações
        if (!name || !metricType || !condition || threshold === undefined || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos os campos são obrigatórios' 
            });
        }
        
        // Verificar se o alerta existe
        const existingAlert = await db.get(
            'SELECT * FROM metric_alerts WHERE id = ?',
            [id]
        );
        
        if (!existingAlert) {
            return res.status(404).json({ 
                success: false, 
                message: 'Alerta de métrica não encontrado' 
            });
        }
        
        // Atualizar no banco de dados
        await db.run(
            `UPDATE metric_alerts 
            SET name = ?, metric_type = ?, condition = ?, threshold = ?, email = ?, active = ?
            WHERE id = ?`,
            [
                name,
                metricType,
                condition,
                threshold,
                email,
                active ? 1 : 0,
                id
            ]
        );
        
        // Buscar o alerta atualizado
        const alert = await db.get(
            'SELECT * FROM metric_alerts WHERE id = ?',
            [id]
        );
        
        return res.status(200).json({
            success: true,
            alert,
            message: 'Alerta de métrica atualizado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao atualizar alerta de métrica:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.delete('/api/metric-alerts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se o alerta existe
        const existingAlert = await db.get(
            'SELECT * FROM metric_alerts WHERE id = ?',
            [id]
        );
        
        if (!existingAlert) {
            return res.status(404).json({ 
                success: false, 
                message: 'Alerta de métrica não encontrado' 
            });
        }
        
        // Excluir do banco de dados
        await db.run(
            'DELETE FROM metric_alerts WHERE id = ?',
            [id]
        );
        
        // Excluir histórico associado
        await db.run(
            'DELETE FROM alert_history WHERE alert_id = ?',
            [id]
        );
        
        return res.status(200).json({
            success: true,
            message: 'Alerta de métrica excluído com sucesso'
        });
    } catch (error) {
        console.error('Erro ao excluir alerta de métrica:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/api/alert-history', async (req, res) => {
    try {
        const { userId, alertId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do usuário é obrigatório' 
            });
        }
        
        let query = `
            SELECT h.*, a.name as alert_name, a.metric_type, a.condition, a.threshold
            FROM alert_history h
            JOIN metric_alerts a ON h.alert_id = a.id
            WHERE a.user_id = ?
        `;
        const params = [userId];
        
        if (alertId) {
            query += ' AND h.alert_id = ?';
            params.push(alertId);
        }
        
        query += ' ORDER BY h.triggered_at DESC';
        
        const history = await db.all(query, params);
        
        return res.status(200).json({
            success: true,
            history
        });
    } catch (error) {
        console.error('Erro ao buscar histórico de alertas:', error);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Inicialização do servidor
async function startServer() {
    try {
        await initDatabase();
        
        // Inicializar o módulo de agendamento
        const scheduler = require('./modules/scheduler');
        scheduler.init(db);
        
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
    }
}

startServer();
