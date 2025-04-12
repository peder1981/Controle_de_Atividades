#!/bin/bash

# Script para preparar o projeto Controle de Atividades para o GitHub
echo "🚀 Preparando o projeto Controle de Atividades para o GitHub..."

# Verificar se o Git está instalado
if ! command -v git &> /dev/null; then
    echo "❌ Git não está instalado. Por favor, instale o Git primeiro."
    exit 1
fi

# Verificar se já existe um repositório Git
if [ ! -d ".git" ]; then
    echo "📁 Inicializando repositório Git..."
    git init
fi

# Verificar se o arquivo .gitignore existe e contém as entradas necessárias
if [ ! -f ".gitignore" ]; then
    echo "📝 Criando arquivo .gitignore..."
    cat > .gitignore << EOL
# Banco de dados SQLite
*.sqlite
*.sqlite3
*.db

# Arquivos de log
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Diretório de dependências
node_modules/
jspm_packages/

# Diretório de build
dist/
build/

# Arquivos de ambiente
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Arquivos de sistema
.DS_Store
Thumbs.db

# Arquivos de IDE e editores
.idea/
.vscode/
*.swp
*.swo
EOL
    echo "✅ Arquivo .gitignore criado com sucesso."
else
    echo "✅ Arquivo .gitignore já existe."
fi

# Verificar se o arquivo LICENSE existe
if [ ! -f "LICENSE" ]; then
    echo "📝 Criando arquivo LICENSE (MIT)..."
    cat > LICENSE << EOL
MIT License

Copyright (c) $(date +%Y) 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOL
    echo "✅ Arquivo LICENSE criado com sucesso."
else
    echo "✅ Arquivo LICENSE já existe."
fi

# Verificar se o package.json tem a versão correta
if grep -q '"version": "2.1.0"' package.json; then
    echo "✅ Versão do package.json está correta (2.1.0)."
else
    echo "⚠️ Atualizando a versão no package.json para 2.1.0..."
    sed -i 's/"version": ".*"/"version": "2.1.0"/g' package.json
    echo "✅ Versão atualizada com sucesso."
fi

# Criar um banco de dados de exemplo vazio (se não existir)
if [ ! -f "example-database.sqlite" ]; then
    echo "📊 Criando banco de dados de exemplo..."
    if [ -f "database.sqlite" ]; then
        # Criar uma cópia do banco de dados atual, mas remover dados sensíveis
        cp database.sqlite example-database.sqlite
        echo "✅ Banco de dados de exemplo criado com base no atual."
        echo "⚠️ IMPORTANTE: Verifique se o banco de dados de exemplo não contém dados sensíveis antes de fazer o commit."
    else
        # Criar um banco de dados vazio com a estrutura básica
        cat > create-example-db.js << EOL
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('example-database.sqlite');

db.serialize(() => {
  // Criar tabela de usuários
  db.run(\`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )\`);

  // Criar tabela de tickets
  db.run(\`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )\`);

  // Criar tabela de histórico de tickets
  db.run(\`CREATE TABLE IF NOT EXISTS tickets_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets (id)
  )\`);

  // Inserir usuário de exemplo
  db.run(\`INSERT INTO users (name, email, password) VALUES (?, ?, ?)\`, 
    ['Usuário Exemplo', 'exemplo@email.com', '$2a$10$ExemploHashBcrypt1234567890ExemploHashBcrypt']);

  // Inserir tickets de exemplo
  db.run(\`INSERT INTO tickets (title, description, status, priority, user_id) 
    VALUES (?, ?, ?, ?, ?)\`, 
    ['Ticket de exemplo 1', 'Descrição do ticket de exemplo 1', 'aberto', 'média', 1]);
  
  db.run(\`INSERT INTO tickets (title, description, status, priority, user_id) 
    VALUES (?, ?, ?, ?, ?)\`, 
    ['Ticket de exemplo 2', 'Descrição do ticket de exemplo 2', 'em_andamento', 'alta', 1]);
  
  db.run(\`INSERT INTO tickets (title, description, status, priority, user_id) 
    VALUES (?, ?, ?, ?, ?)\`, 
    ['Ticket de exemplo 3', 'Descrição do ticket de exemplo 3', 'resolvido', 'baixa', 1]);

  // Inserir histórico de tickets de exemplo
  db.run(\`INSERT INTO tickets_history (ticket_id, old_status, new_status) 
    VALUES (?, ?, ?)\`, 
    [2, 'aberto', 'em_andamento']);
  
  db.run(\`INSERT INTO tickets_history (ticket_id, old_status, new_status) 
    VALUES (?, ?, ?)\`, 
    [3, 'aberto', 'em_andamento']);
  
  db.run(\`INSERT INTO tickets_history (ticket_id, old_status, new_status) 
    VALUES (?, ?, ?)\`, 
    [3, 'em_andamento', 'resolvido']);
});

db.close(() => {
  console.log('Banco de dados de exemplo criado com sucesso!');
});
EOL
        node create-example-db.js
        rm create-example-db.js
        echo "✅ Banco de dados de exemplo criado com estrutura básica."
    fi
else
    echo "✅ Banco de dados de exemplo já existe."
fi

# Criar arquivo para documentar como configurar o banco de dados
echo "📝 Criando arquivo de instruções para configuração inicial..."
cat > SETUP.md << EOL
# Configuração Inicial do Controle de Atividades

Este documento contém instruções para configurar o projeto Controle de Atividades pela primeira vez.

## Configuração do Banco de Dados

O projeto utiliza SQLite como banco de dados. Um arquivo de exemplo \`example-database.sqlite\` está incluído no repositório para referência, mas você precisará criar seu próprio arquivo de banco de dados para uso.

### Opção 1: Iniciar com banco de dados vazio

1. Inicie o servidor normalmente com \`npm start\` ou \`node server.js\`
2. O servidor criará automaticamente um novo arquivo \`database.sqlite\` com a estrutura necessária

### Opção 2: Usar o banco de dados de exemplo

1. Copie o arquivo de exemplo para criar seu banco de dados:
   \`\`\`bash
   cp example-database.sqlite database.sqlite
   \`\`\`
2. Inicie o servidor com \`npm start\` ou \`node server.js\`

## Credenciais de Exemplo

Se você usou o banco de dados de exemplo, pode fazer login com as seguintes credenciais:

- **Email**: exemplo@email.com
- **Senha**: senha123

**Importante**: Por segurança, altere estas credenciais após o primeiro login ou crie um novo usuário e exclua o usuário de exemplo.

## Próximos Passos

1. Personalize o projeto conforme suas necessidades
2. Configure um servidor para produção, se necessário
3. Implemente recursos adicionais conforme descrito no README.md
EOL
echo "✅ Arquivo SETUP.md criado com sucesso."

# Verificar se há arquivos grandes que não deveriam ser versionados
echo "🔍 Verificando arquivos grandes..."
find . -type f -size +10M | grep -v "node_modules" | while read file; do
    echo "⚠️ Arquivo grande encontrado: $file"
    echo "   Considere adicionar este arquivo ao .gitignore se não for necessário versioná-lo."
done

# Verificar se o banco de dados está no .gitignore
if grep -q "database.sqlite" .gitignore; then
    echo "✅ Arquivo database.sqlite está corretamente ignorado no .gitignore."
else
    echo "⚠️ AVISO: O arquivo database.sqlite não está explicitamente mencionado no .gitignore."
    echo "   Embora o padrão *.sqlite deva ignorá-lo, considere adicionar 'database.sqlite' explicitamente."
fi

# Preparar para commit
echo "📦 Preparando arquivos para commit..."
git add -A
git status

echo ""
echo "🎉 Preparação concluída! Para finalizar e enviar para o GitHub:"
echo ""
echo "1. Verifique os arquivos que serão commitados com 'git status'"
echo "2. Faça o commit com: git commit -m \"Versão 2.1.0: Preparação para GitHub\""
echo "3. Crie um repositório no GitHub (https://github.com/new)"
echo "4. Adicione o repositório remoto: git remote add origin https://github.com/SEU-USUARIO/controle-de-atividades.git"
echo "5. Envie o código: git push -u origin main"
echo ""
echo "⚠️ IMPORTANTE: Certifique-se de que nenhum dado sensível ou arquivo de banco de dados com dados reais está sendo enviado!"
