/**
 * Módulo de agendamento de relatórios e alertas
 * Controle de Atividades v2.2.0
 */

const cron = require('node-cron');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Configuração do transporte de e-mail
// Em produção, substitua por configurações reais do servidor SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password'
    }
});

// Referência ao banco de dados
let db;

/**
 * Inicializa o módulo de agendamento
 * @param {Object} database - Instância do banco de dados
 */
function init(database) {
    db = database;
    
    // Inicializa os agendamentos de relatórios
    initScheduledReports();
    
    // Inicializa a verificação de alertas
    initMetricAlerts();
    
    console.log('Módulo de agendamento inicializado');
}

/**
 * Inicializa os agendamentos de relatórios
 */
function initScheduledReports() {
    // Agendamento diário (8h da manhã)
    cron.schedule('0 8 * * *', async () => {
        console.log('Executando relatórios diários agendados');
        await runScheduledReports('daily');
    });
    
    // Agendamento semanal (Segunda-feira, 8h da manhã)
    cron.schedule('0 8 * * 1', async () => {
        console.log('Executando relatórios semanais agendados');
        await runScheduledReports('weekly');
    });
    
    // Agendamento mensal (Dia 1, 8h da manhã)
    cron.schedule('0 8 1 * *', async () => {
        console.log('Executando relatórios mensais agendados');
        await runScheduledReports('monthly');
    });
}

/**
 * Executa os relatórios agendados
 * @param {string} schedule - Tipo de agendamento (daily, weekly, monthly)
 */
async function runScheduledReports(schedule) {
    try {
        // Buscar relatórios agendados para o tipo de agendamento
        const reports = await db.all(
            'SELECT * FROM scheduled_reports WHERE schedule = ? AND active = 1',
            [schedule]
        );
        
        console.log(`Encontrados ${reports.length} relatórios agendados para execução ${schedule}`);
        
        // Executar cada relatório
        for (const report of reports) {
            try {
                // Gerar o relatório
                const reportData = await generateReport(report);
                
                // Enviar por e-mail
                await sendReportEmail(report, reportData);
                
                // Atualizar a data da última execução
                await db.run(
                    'UPDATE scheduled_reports SET last_run = ? WHERE id = ?',
                    [new Date().toISOString(), report.id]
                );
                
                console.log(`Relatório #${report.id} executado com sucesso`);
            } catch (error) {
                console.error(`Erro ao executar relatório #${report.id}:`, error);
            }
        }
    } catch (error) {
        console.error(`Erro ao buscar relatórios agendados (${schedule}):`, error);
    }
}

/**
 * Gera um relatório com base nas configurações
 * @param {Object} report - Configurações do relatório
 * @returns {Object} Dados do relatório
 */
async function generateReport(report) {
    try {
        const parameters = JSON.parse(report.parameters);
        const reportType = report.report_type;
        
        let data;
        
        // Gerar relatório com base no tipo
        switch (reportType) {
            case 'tickets':
                data = await generateTicketsReport(parameters);
                break;
            case 'performance':
                data = await generatePerformanceReport(parameters);
                break;
            case 'categories':
                data = await generateCategoriesReport(parameters);
                break;
            case 'users':
                data = await generateUsersReport(parameters);
                break;
            case 'trends':
                data = await generateTrendsReport(parameters);
                break;
            case 'comparison':
                data = await generateComparisonReport(parameters);
                break;
            case 'efficiency':
                data = await generateEfficiencyReport(parameters);
                break;
            case 'workload':
                data = await generateWorkloadReport(parameters);
                break;
            case 'response_time':
                data = await generateResponseTimeReport(parameters);
                break;
            default:
                throw new Error(`Tipo de relatório desconhecido: ${reportType}`);
        }
        
        return data;
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        throw error;
    }
}

/**
 * Gera relatório de tickets
 * @param {Object} parameters - Parâmetros do relatório
 * @returns {Object} Dados do relatório
 */
async function generateTicketsReport(parameters) {
    // Construir a consulta SQL
    let query = 'SELECT t.*, u.name as user_name, a.name as assigned_name FROM tickets t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN users a ON t.assigned_to = a.id WHERE 1=1';
    const params = [];
    
    // Adicionar filtros
    if (parameters.userId) {
        query += ' AND t.user_id = ?';
        params.push(parameters.userId);
    }
    
    if (parameters.status) {
        query += ' AND t.status = ?';
        params.push(parameters.status);
    }
    
    if (parameters.priority) {
        query += ' AND t.priority = ?';
        params.push(parameters.priority);
    }
    
    if (parameters.category) {
        query += ' AND t.category = ?';
        params.push(parameters.category);
    }
    
    if (parameters.startDate) {
        query += ' AND t.created_at >= ?';
        params.push(parameters.startDate);
    }
    
    if (parameters.endDate) {
        query += ' AND t.created_at <= ?';
        params.push(parameters.endDate);
    }
    
    // Ordenação
    query += ' ORDER BY t.created_at DESC';
    
    // Executar a consulta
    const tickets = await db.all(query, params);
    
    return {
        type: 'tickets',
        title: 'Relatório de Tickets',
        parameters,
        data: tickets,
        timestamp: new Date().toISOString()
    };
}

// Implementações dos outros geradores de relatórios seguiriam o mesmo padrão

/**
 * Envia um relatório por e-mail
 * @param {Object} report - Configurações do relatório
 * @param {Object} reportData - Dados do relatório
 */
async function sendReportEmail(report, reportData) {
    try {
        // Gerar CSV
        const csvContent = generateCSV(reportData.data);
        
        // Nome do arquivo temporário
        const fileName = `relatorio-${report.report_type}-${new Date().toISOString().split('T')[0]}.csv`;
        const filePath = path.join(__dirname, '..', 'temp', fileName);
        
        // Garantir que o diretório temp existe
        if (!fs.existsSync(path.join(__dirname, '..', 'temp'))) {
            fs.mkdirSync(path.join(__dirname, '..', 'temp'), { recursive: true });
        }
        
        // Salvar o arquivo CSV
        fs.writeFileSync(filePath, csvContent);
        
        // Enviar e-mail
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Sistema de Controle de Atividades" <sistema@example.com>',
            to: report.email,
            subject: `Relatório: ${reportData.title} - ${new Date().toLocaleDateString('pt-BR')}`,
            text: `Segue em anexo o relatório "${reportData.title}" gerado automaticamente.\n\nParâmetros: ${JSON.stringify(reportData.parameters, null, 2)}`,
            html: `
                <h2>Relatório: ${reportData.title}</h2>
                <p>Segue em anexo o relatório gerado automaticamente.</p>
                <h3>Parâmetros:</h3>
                <pre>${JSON.stringify(reportData.parameters, null, 2)}</pre>
                <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
            `,
            attachments: [
                {
                    filename: fileName,
                    path: filePath
                }
            ]
        });
        
        // Remover arquivo temporário
        fs.unlinkSync(filePath);
        
        console.log(`E-mail enviado para ${report.email} com o relatório ${report.report_type}`);
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        throw error;
    }
}

/**
 * Gera um arquivo CSV a partir de dados
 * @param {Array} data - Dados para o CSV
 * @returns {string} Conteúdo do CSV
 */
function generateCSV(data) {
    if (!data || data.length === 0) {
        return '';
    }
    
    // Cabeçalhos
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    
    // Dados
    data.forEach(row => {
        csv += headers.map(header => {
            const value = row[header];
            // Escapar strings com vírgulas
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value || '';
        }).join(',') + '\n';
    });
    
    return csv;
}

/**
 * Inicializa a verificação de alertas
 */
function initMetricAlerts() {
    // Verificar alertas a cada hora
    cron.schedule('0 */1 * * *', async () => {
        console.log('Verificando alertas de métricas');
        await checkMetricAlerts();
    });
}

/**
 * Verifica os alertas de métricas
 */
async function checkMetricAlerts() {
    try {
        // Buscar alertas ativos
        const alerts = await db.all(
            'SELECT * FROM metric_alerts WHERE active = 1'
        );
        
        console.log(`Verificando ${alerts.length} alertas ativos`);
        
        // Verificar cada alerta
        for (const alert of alerts) {
            try {
                // Verificar a métrica
                const { triggered, value } = await checkMetric(alert);
                
                if (triggered) {
                    // Registrar o alerta disparado
                    const alertHistoryId = await db.run(
                        'INSERT INTO alert_history (alert_id, triggered_at, metric_value, notification_sent) VALUES (?, ?, ?, 0)',
                        [alert.id, new Date().toISOString(), value]
                    );
                    
                    // Enviar notificação
                    await sendAlertNotification(alert, value);
                    
                    // Atualizar o histórico
                    await db.run(
                        'UPDATE alert_history SET notification_sent = 1 WHERE id = ?',
                        [alertHistoryId.lastID]
                    );
                    
                    // Atualizar a data do último disparo
                    await db.run(
                        'UPDATE metric_alerts SET last_triggered = ? WHERE id = ?',
                        [new Date().toISOString(), alert.id]
                    );
                    
                    console.log(`Alerta #${alert.id} disparado (valor: ${value})`);
                }
            } catch (error) {
                console.error(`Erro ao verificar alerta #${alert.id}:`, error);
            }
        }
    } catch (error) {
        console.error('Erro ao buscar alertas ativos:', error);
    }
}

/**
 * Verifica uma métrica específica
 * @param {Object} alert - Configuração do alerta
 * @returns {Object} Resultado da verificação
 */
async function checkMetric(alert) {
    const metricType = alert.metric_type;
    const condition = alert.condition;
    const threshold = alert.threshold;
    
    let value;
    
    // Obter o valor atual da métrica
    switch (metricType) {
        case 'open_tickets':
            value = await getOpenTicketsCount(alert.user_id);
            break;
        case 'resolution_time':
            value = await getAvgResolutionTime(alert.user_id);
            break;
        case 'response_time':
            value = await getAvgResponseTime(alert.user_id);
            break;
        case 'high_priority_tickets':
            value = await getHighPriorityTicketsCount(alert.user_id);
            break;
        default:
            throw new Error(`Tipo de métrica desconhecido: ${metricType}`);
    }
    
    // Verificar a condição
    let triggered = false;
    
    switch (condition) {
        case '>':
            triggered = value > threshold;
            break;
        case '>=':
            triggered = value >= threshold;
            break;
        case '<':
            triggered = value < threshold;
            break;
        case '<=':
            triggered = value <= threshold;
            break;
        case '=':
        case '==':
            triggered = value === threshold;
            break;
        default:
            throw new Error(`Condição desconhecida: ${condition}`);
    }
    
    return { triggered, value };
}

/**
 * Obtém a contagem de tickets abertos
 * @param {string} userId - ID do usuário (opcional)
 * @returns {number} Contagem de tickets
 */
async function getOpenTicketsCount(userId) {
    let query = 'SELECT COUNT(*) as count FROM tickets WHERE status != ?';
    const params = ['resolved'];
    
    if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
    }
    
    const result = await db.get(query, params);
    return result.count;
}

/**
 * Obtém o tempo médio de resolução
 * @param {string} userId - ID do usuário (opcional)
 * @returns {number} Tempo médio em minutos
 */
async function getAvgResolutionTime(userId) {
    let query = `
        SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24 * 60) as avg_time
        FROM tickets
        WHERE status = 'resolved' AND resolved_at IS NOT NULL
    `;
    const params = [];
    
    if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
    }
    
    const result = await db.get(query, params);
    return result.avg_time || 0;
}

/**
 * Obtém o tempo médio de resposta
 * @param {string} userId - ID do usuário (opcional)
 * @returns {number} Tempo médio em minutos
 */
async function getAvgResponseTime(userId) {
    let query = `
        SELECT AVG((julianday(MIN(h.updated_at)) - julianday(t.created_at)) * 24 * 60) as avg_time
        FROM tickets t
        JOIN tickets_history h ON t.id = h.ticket_id AND h.status != 'open'
        WHERE 1=1
    `;
    const params = [];
    
    if (userId) {
        query += ' AND t.user_id = ?';
        params.push(userId);
    }
    
    query += ' GROUP BY t.id';
    
    const results = await db.all(query, params);
    
    if (results.length === 0) {
        return 0;
    }
    
    // Calcular média
    const sum = results.reduce((total, item) => total + (item.avg_time || 0), 0);
    return sum / results.length;
}

/**
 * Obtém a contagem de tickets de alta prioridade
 * @param {string} userId - ID do usuário (opcional)
 * @returns {number} Contagem de tickets
 */
async function getHighPriorityTicketsCount(userId) {
    let query = "SELECT COUNT(*) as count FROM tickets WHERE priority = ? AND status != 'resolved'";
    const params = ['high'];
    
    if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
    }
    
    const result = await db.get(query, params);
    return result.count;
}

/**
 * Envia uma notificação de alerta
 * @param {Object} alert - Configuração do alerta
 * @param {number} value - Valor atual da métrica
 */
async function sendAlertNotification(alert, value) {
    try {
        // Obter informações do usuário
        const user = await db.get('SELECT name FROM users WHERE id = ?', [alert.user_id]);
        
        // Descrições amigáveis para métricas
        const metricDescriptions = {
            'open_tickets': 'Tickets abertos',
            'resolution_time': 'Tempo médio de resolução (minutos)',
            'response_time': 'Tempo médio de resposta (minutos)',
            'high_priority_tickets': 'Tickets de alta prioridade'
        };
        
        // Enviar e-mail
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Sistema de Controle de Atividades" <sistema@example.com>',
            to: alert.email,
            subject: `ALERTA: ${alert.name} - Limite atingido`,
            text: `
                Olá ${user ? user.name : ''},
                
                O alerta "${alert.name}" foi disparado.
                
                Métrica: ${metricDescriptions[alert.metric_type] || alert.metric_type}
                Condição: ${alert.condition} ${alert.threshold}
                Valor atual: ${value}
                
                Acesse o sistema para mais detalhes.
                
                Atenciosamente,
                Sistema de Controle de Atividades
            `,
            html: `
                <h2>ALERTA: ${alert.name}</h2>
                <p>Olá ${user ? user.name : ''},</p>
                <p>O alerta <strong>"${alert.name}"</strong> foi disparado.</p>
                <table border="1" cellpadding="5" cellspacing="0">
                    <tr>
                        <th>Métrica</th>
                        <td>${metricDescriptions[alert.metric_type] || alert.metric_type}</td>
                    </tr>
                    <tr>
                        <th>Condição</th>
                        <td>${alert.condition} ${alert.threshold}</td>
                    </tr>
                    <tr>
                        <th>Valor atual</th>
                        <td>${value}</td>
                    </tr>
                </table>
                <p>Acesse o sistema para mais detalhes.</p>
                <p>Atenciosamente,<br>Sistema de Controle de Atividades</p>
            `
        });
        
        console.log(`Notificação de alerta enviada para ${alert.email}`);
    } catch (error) {
        console.error('Erro ao enviar notificação de alerta:', error);
        throw error;
    }
}

// Exportar funções
module.exports = {
    init,
    runScheduledReports,
    checkMetricAlerts
};
