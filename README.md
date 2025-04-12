# Controle de Atividades

![Versão](https://img.shields.io/badge/versão-2.1.0-blue)
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

## 🖥️ Interface

A aplicação possui uma interface minimalista e intuitiva, dividida em:

- **Tela de Login/Cadastro**: Acesso seguro à aplicação
- **Tela Principal**: Gerenciamento completo de tickets
- **Dashboard**: Visualização de estatísticas e métricas

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3 e JavaScript
- **Backend**: Node.js com Express.js
- **Banco de Dados**: SQLite
- **Segurança**: bcryptjs para hash de senhas
- **Chart.js**: Geração de gráficos estatísticos
- **Font Awesome**: Ícones e elementos visuais
- **CORS**: Gerenciamento de requisições cross-origin

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
git commit -m "Versão 2.1.0: Adicionados dashboards de tempo médio e melhorias"
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
│   └── styles.css
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── dashboard.js
│   └── tickets.js
├── node_modules/
├── .gitignore
├── database.sqlite (não versionado)
├── index.html
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

## 🛠️ Correções Recentes

### Versão 2.1.0 (12/04/2025)
- Adicionados três novos dashboards de métricas de tempo:
  - Tempo médio entre abertura e início do andamento
  - Tempo médio entre abertura e resolução
  - Tempo médio entre início do andamento e resolução
- Implementada tabela de histórico de tickets para rastreamento de status
- Melhorada a visualização de dados com gráfico comparativo de tempos médios
- Adicionada migração automática de dados históricos

### Versão 2.0.1 (11/04/2025)
- Corrigido problema de exibição "Invalid Date" nos cards de tickets
- Adicionado tratamento de erro para formatação de datas
- Melhorada a compatibilidade entre os campos do backend e frontend
- Atualizada a documentação para incluir instruções de versionamento

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
