# Controle de Atividades

![Versão](https://img.shields.io/badge/versão-2.3.1-blue)
![Licença](https://img.shields.io/badge/licença-MIT-green)

Uma aplicação web para gerenciamento de tickets e tarefas com armazenamento em banco de dados SQLite. Ideal para organização pessoal com persistência de dados.

## 📋 Funcionalidades

### Autenticação Segura
- Cadastro de usuários com nome, email e senha
- Armazenamento seguro de senhas com bcrypt
- Login simples e intuitivo

### Gerenciamento de Tickets
- Criação, edição e exclusão de tickets
- Categorização por status: aberto, em andamento, resolvido
- Priorização: baixa, média, alta
- Filtros para visualização personalizada

### Dashboard Estatístico
- Visão geral do total de tickets
- Acompanhamento de tickets resolvidos (hoje/semana/mês)
- Gráficos de distribuição por status e prioridade
- Métricas de tempo médio entre etapas do ciclo de vida dos tickets
  - Tempo entre abertura e início do andamento
  - Tempo entre abertura e resolução
  - Tempo entre início do andamento e resolução

### Relatórios Avançados
- Análise de tendências ao longo do tempo
- Comparativo entre diferentes períodos
- Métricas de eficiência por usuário ou categoria
- Análise de carga de trabalho
- Análise de tempo de resposta

### Automação e Alertas
- Agendamento de relatórios periódicos (diário, semanal, mensal)
- Alertas baseados em métricas configuráveis
- Notificações por e-mail
- Histórico de alertas disparados

### Interface e Experiência do Usuário
- Layout unificado e consistente em todas as páginas
- Suporte a modo escuro/claro com alternância em tempo real
- Design responsivo para todos os dispositivos
- Experiência visual coerente e moderna

## 🖥️ Interface

A aplicação possui uma interface minimalista e intuitiva, dividida em:

- **Tela de Login/Cadastro**: Acesso seguro à aplicação
- **Tela Principal**: Gerenciamento completo de tickets
- **Dashboard**: Visualização de estatísticas e métricas
- **Relatórios Avançados**: Análises detalhadas e configuração de automações

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3 e JavaScript
- **Backend**: Node.js com Express.js
- **Banco de Dados**: SQLite
- **Segurança**: bcryptjs para hash de senhas
- **Chart.js**: Geração de gráficos estatísticos
- **Bootstrap 5**: Framework CSS para interface responsiva
- **Bootstrap Icons**: Ícones modernos e consistentes
- **Font Awesome**: Ícones e elementos visuais adicionais
- **CORS**: Gerenciamento de requisições cross-origin
- **Node-cron**: Agendamento de tarefas
- **Nodemailer**: Envio de e-mails
- **Flatpickr**: Seletor de datas avançado

## 🚀 Como Executar

### Pré-requisitos
- Node.js (v14 ou superior)
- NPM (v6 ou superior)

### Instalação e Execução

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/controle-de-atividades.git
   cd controle-de-atividades
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor:
   ```bash
   node server.js
   ```

4. Acesse a aplicação no navegador:
   ```
   http://localhost:3000
   ```

## 📱 Responsividade

A aplicação é totalmente responsiva, adaptando-se a diferentes tamanhos de tela:
- Desktops e notebooks
- Tablets
- Smartphones

## 🔒 Segurança e Privacidade

- Dados armazenados em banco de dados SQLite
- Senhas protegidas com hash bcrypt
- API RESTful para comunicação segura entre frontend e backend

## 🔄 Versionamento e Git

### Configuração do .gitignore
O projeto inclui um arquivo `.gitignore` configurado para excluir:
- Arquivos de banco de dados SQLite (`*.sqlite`, `*.db`)
- Diretório `node_modules/`
- Arquivos de configuração de ambiente (`.env`)
- Arquivos de log
- Arquivos temporários do sistema

### Preparando para Commit
Antes de fazer commit para o GitHub, certifique-se de:
1. Verificar se o arquivo `database.sqlite` está no `.gitignore`
2. Parar o servidor Node.js se estiver em execução
3. Verificar se não há informações sensíveis no código

### Commits Recomendados
Organize seus commits de forma lógica:
```bash
git add .
git commit -m "Versão 2.3.1: Correções recentes e melhorias"
git push origin main
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Envie para o branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📊 Estrutura do Projeto

```
controle-de-atividades/
├── css/
│   ├── styles.css
│   └── main.css
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── tickets.js
│   ├── advanced-reports.js
│   └── theme.js
├── modules/
│   └── scheduler.js
├── node_modules/
├── .gitignore
├── database.sqlite (não versionado)
├── index.html
├── login.html
├── reports.html
├── advanced-reports.html
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

## 🛠️ Correções Recentes

### Versão 2.3.1 (12/04/2025)
- Corrigido problema de acesso à página de relatórios avançados
- Padronizada a gestão de autenticação entre as páginas
- Melhorada a experiência do usuário com criação automática de usuário para testes
- Atualizada a estrutura de arquivos CSS com arquivo unificado main.css

### Versão 2.3.0 (20/04/2025)
- Implementado layout unificado e consistente em todas as páginas
- Adicionado suporte a modo escuro/claro com alternância em tempo real
- Melhorada a experiência visual com design responsivo para todos os dispositivos

### Versão 2.2.0 (15/04/2025)
- Implementados relatórios avançados:
  - Análise de tendências
  - Comparativo de períodos
  - Métricas de eficiência
  - Análise de carga de trabalho
  - Análise de tempo de resposta
- Adicionado sistema de agendamento de relatórios
- Implementados alertas baseados em métricas configuráveis
- Adicionado sistema de notificações por e-mail
- Criada interface para gerenciamento de relatórios e alertas

### Versão 2.1.0 (12/04/2025)
- Adicionados três novos dashboards de métricas de tempo:
  - Tempo médio entre abertura e início do andamento
  - Tempo médio entre abertura e resolução
  - Tempo médio entre início do andamento e resolução
- Implementada tabela de histórico de tickets para rastreamento de status
- Melhorada a visualização de dados com gráfico comparativo de tempos médios
- Adicionada migração automática de dados históricos

## 🔮 Próximos Passos

Funcionalidades planejadas para versões futuras:

- Temas claro/escuro
- Exportação e importação de dados
- Categorias personalizáveis para tickets
- Notificações para tickets próximos do prazo
- Autenticação com JWT
- Painel administrativo
- Padronização de nomenclatura entre backend e frontend
- Centralização do tratamento de datas

---

Desenvolvido com ❤️ para simplificar o gerenciamento de tarefas diárias.
