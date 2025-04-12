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

// Inicialização do servidor
async function startServer() {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
    }
}

startServer();
