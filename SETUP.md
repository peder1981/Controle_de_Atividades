# Configuração Inicial do Controle de Atividades

Este documento contém instruções para configurar o projeto Controle de Atividades pela primeira vez.

## Configuração do Banco de Dados

O projeto utiliza SQLite como banco de dados. Um arquivo de exemplo `example-database.sqlite` está incluído no repositório para referência, mas você precisará criar seu próprio arquivo de banco de dados para uso.

### Opção 1: Iniciar com banco de dados vazio

1. Inicie o servidor normalmente com `npm start` ou `node server.js`
2. O servidor criará automaticamente um novo arquivo `database.sqlite` com a estrutura necessária

### Opção 2: Usar o banco de dados de exemplo

1. Copie o arquivo de exemplo para criar seu banco de dados:
   ```bash
   cp example-database.sqlite database.sqlite
   ```
2. Inicie o servidor com `npm start` ou `node server.js`

## Credenciais de Exemplo

Se você usou o banco de dados de exemplo, pode fazer login com as seguintes credenciais:

- **Email**: exemplo@email.com
- **Senha**: senha123

**Importante**: Por segurança, altere estas credenciais após o primeiro login ou crie um novo usuário e exclua o usuário de exemplo.

## Próximos Passos

1. Personalize o projeto conforme suas necessidades
2. Configure um servidor para produção, se necessário
3. Implemente recursos adicionais conforme descrito no README.md
