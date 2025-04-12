# Guia de Implantação do Controle de Atividades

Este documento fornece instruções para implantar o Controle de Atividades em diferentes ambientes: desenvolvimento, teste e produção.

## Ambientes

### Ambiente de Desenvolvimento

O ambiente de desenvolvimento é usado para desenvolvimento local e testes iniciais.

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/controle-de-atividades.git
   cd controle-de-atividades
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o banco de dados seguindo as instruções no arquivo SETUP.md

4. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Acesse a aplicação em `http://localhost:3000`

### Ambiente de Teste

O ambiente de teste é usado para testes mais abrangentes antes da implantação em produção.

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/controle-de-atividades.git
   cd controle-de-atividades
   ```

2. Instale as dependências (apenas de produção):
   ```bash
   npm install --production
   ```

3. Configure um banco de dados de teste:
   ```bash
   cp example-database.sqlite test-database.sqlite
   ```

4. Crie um arquivo de configuração para o ambiente de teste:
   ```bash
   echo 'export PORT=3001' > .env.test
   echo 'export DB_PATH=./test-database.sqlite' >> .env.test
   ```

5. Inicie o servidor com as configurações de teste:
   ```bash
   source .env.test && node server.js
   ```

6. Execute testes manuais ou automatizados contra `http://localhost:3001`

### Ambiente de Produção

O ambiente de produção é o ambiente final onde a aplicação será disponibilizada para os usuários.

#### Opção 1: Servidor Dedicado ou VPS

1. Conecte-se ao seu servidor via SSH:
   ```bash
   ssh usuario@seu-servidor
   ```

2. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/controle-de-atividades.git
   cd controle-de-atividades
   ```

3. Instale as dependências (apenas de produção):
   ```bash
   npm install --production
   ```

4. Configure o banco de dados de produção:
   ```bash
   # Crie um diretório de dados que não seja acessível via web
   mkdir -p /var/data/controle-atividades
   touch /var/data/controle-atividades/production.sqlite
   chmod 700 /var/data/controle-atividades
   ```

5. Crie um arquivo de configuração para produção:
   ```bash
   echo 'export PORT=3000' > .env.production
   echo 'export DB_PATH=/var/data/controle-atividades/production.sqlite' >> .env.production
   ```

6. Configure um processo de gerenciamento como PM2:
   ```bash
   npm install -g pm2
   source .env.production && pm2 start server.js --name controle-atividades
   pm2 save
   pm2 startup
   ```

7. Configure um proxy reverso com Nginx ou Apache para servir a aplicação com HTTPS

#### Opção 2: Serviços de Hospedagem PaaS (Heroku, Render, Railway, etc.)

1. Crie uma conta no serviço de hospedagem escolhido

2. Instale a CLI do serviço, se disponível (exemplo para Heroku):
   ```bash
   npm install -g heroku
   heroku login
   ```

3. Crie uma nova aplicação:
   ```bash
   heroku create controle-atividades
   ```

4. Adicione um banco de dados (exemplo para Heroku com PostgreSQL):
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

5. Modifique o arquivo server.js para suportar o banco de dados do serviço (será necessário adaptar o código para PostgreSQL ou outro banco suportado)

6. Implante a aplicação:
   ```bash
   git push heroku main
   ```

7. Abra a aplicação:
   ```bash
   heroku open
   ```

## Considerações de Segurança

1. **Sempre use HTTPS em produção**
   - Obtenha um certificado SSL (Let's Encrypt é gratuito)
   - Configure seu servidor web para redirecionar HTTP para HTTPS

2. **Proteja o banco de dados**
   - Armazene o arquivo SQLite em um diretório não acessível via web
   - Defina permissões restritas (chmod 700)
   - Faça backups regulares

3. **Variáveis de ambiente**
   - Nunca armazene senhas ou chaves no código-fonte
   - Use variáveis de ambiente para configurações sensíveis

4. **Atualizações de segurança**
   - Mantenha as dependências atualizadas: `npm audit fix`
   - Verifique regularmente por vulnerabilidades: `npm audit`

5. **Implementação futura de JWT**
   - Quando implementar autenticação JWT, defina um segredo forte e único
   - Considere a rotação periódica de chaves

## Monitoramento e Manutenção

1. **Logs**
   - Configure logs adequados para monitorar a aplicação
   - Considere um serviço de agregação de logs (Papertrail, Loggly)

2. **Monitoramento de desempenho**
   - Implemente monitoramento básico de CPU, memória e disco
   - Considere ferramentas como New Relic ou Datadog para aplicações maiores

3. **Backups**
   - Configure backups automáticos do banco de dados
   - Teste regularmente a restauração dos backups

4. **Atualizações**
   - Planeje janelas de manutenção para atualizações
   - Teste todas as atualizações em ambiente de teste antes de aplicar em produção

## Escalabilidade

Para aplicações com maior carga:

1. **Considere migrar para um banco de dados mais robusto**
   - PostgreSQL, MySQL ou MongoDB são boas opções
   - Mantenha a estrutura de dados compatível para facilitar a migração

2. **Implemente cache**
   - Redis para cache de sessão e dados frequentemente acessados
   - Cache de consultas frequentes ao banco de dados

3. **Arquitetura distribuída**
   - Separe o frontend do backend (API RESTful)
   - Considere uma arquitetura de microserviços para componentes específicos

---

Desenvolvido com ❤️ para simplificar o gerenciamento de tarefas diárias.
