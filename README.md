# Controle de Atividades

![Versão](https://img.shields.io/badge/versão-1.0.0-blue)
![Licença](https://img.shields.io/badge/licença-MIT-green)

Uma aplicação web minimalista para gerenciamento de tickets e tarefas com armazenamento local no navegador. Ideal para organização pessoal sem necessidade de infraestrutura externa.

## 📋 Funcionalidades

### Autenticação Segura
- Cadastro de usuários com nome, email e senha
- Armazenamento seguro de senhas com criptografia
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

## 🖥️ Interface

A aplicação possui uma interface minimalista e intuitiva, dividida em:

- **Tela de Login/Cadastro**: Acesso seguro à aplicação
- **Tela Principal**: Gerenciamento completo de tickets
- **Dashboard**: Visualização de estatísticas e métricas

## 🛠️ Tecnologias Utilizadas

- **HTML5, CSS3 e JavaScript**: Base da aplicação
- **LocalStorage**: Armazenamento de dados no navegador
- **CryptoJS**: Criptografia de senhas
- **Chart.js**: Geração de gráficos estatísticos
- **Font Awesome**: Ícones e elementos visuais

## 🚀 Como Executar

### Pré-requisitos
- Navegador web moderno
- Python (para servidor local)

### Instalação e Execução

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/controle-de-atividades.git
   cd controle-de-atividades
   ```

2. Execute o script de inicialização:
   ```bash
   ./iniciar.sh
   ```

3. Acesse a aplicação no navegador:
   ```
   http://localhost:8000
   ```

> **Nota**: O script tentará as portas 8000, 8080 e 9000 caso alguma esteja ocupada.

## 📱 Responsividade

A aplicação é totalmente responsiva, adaptando-se a diferentes tamanhos de tela:
- Desktops e notebooks
- Tablets
- Smartphones

## 🔒 Segurança e Privacidade

- Todos os dados são armazenados localmente no navegador do usuário
- Senhas criptografadas com algoritmo SHA-256
- Sem envio de dados para servidores externos

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
├── index.html
├── iniciar.sh
└── README.md
```

## 🔮 Próximos Passos

Funcionalidades planejadas para versões futuras:

- Temas claro/escuro
- Exportação e importação de dados
- Categorias personalizáveis para tickets
- Notificações para tickets próximos do prazo
- Sincronização entre dispositivos

---

Desenvolvido com ❤️ para simplificar o gerenciamento de tarefas diárias.
