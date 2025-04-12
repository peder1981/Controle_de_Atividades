# Contribuindo para o Controle de Atividades

Obrigado pelo seu interesse em contribuir para o projeto Controle de Atividades! Este documento fornece diretrizes para contribuir com o desenvolvimento do projeto.

## Como Contribuir

### 1. Configurando o Ambiente de Desenvolvimento

1. Faça um fork do repositório
2. Clone o seu fork:
   ```bash
   git clone https://github.com/seu-usuario/controle-de-atividades.git
   cd controle-de-atividades
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Configure o banco de dados seguindo as instruções no arquivo SETUP.md

### 2. Criando uma Branch

Crie uma branch para sua contribuição:
```bash
git checkout -b feature/nome-da-feature
```

Use prefixos como:
- `feature/` para novas funcionalidades
- `fix/` para correções de bugs
- `docs/` para atualizações na documentação
- `refactor/` para refatorações de código

### 3. Padrões de Código

- Mantenha o código limpo e bem documentado
- Siga as convenções de nomenclatura existentes
- Adicione comentários quando necessário para explicar lógicas complexas
- Mantenha funções pequenas e com responsabilidade única

### 4. Testes

- Teste manualmente suas alterações antes de enviar
- Garanta que todas as funcionalidades existentes continuem funcionando
- Considere adicionar testes automatizados para novas funcionalidades

### 5. Enviando uma Pull Request

1. Faça commit das suas alterações:
   ```bash
   git add .
   git commit -m "Descrição clara e concisa das alterações"
   ```
2. Envie para o seu fork:
   ```bash
   git push origin feature/nome-da-feature
   ```
3. Abra uma Pull Request no GitHub
4. Descreva detalhadamente as alterações realizadas
5. Mencione quaisquer problemas relacionados usando #numero-do-issue

### 6. Revisão de Código

- Esteja aberto a feedback e sugestões
- Responda a comentários e faça as alterações necessárias
- Seja paciente durante o processo de revisão

## Diretrizes para Issues

### Reportando Bugs

Ao reportar um bug, inclua:
- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs. comportamento atual
- Capturas de tela, se aplicável
- Informações sobre seu ambiente (navegador, sistema operacional)

### Sugerindo Melhorias

Para sugerir melhorias:
- Descreva claramente a funcionalidade proposta
- Explique por que essa melhoria seria útil
- Forneça exemplos de como a funcionalidade poderia funcionar
- Se possível, inclua mockups ou diagramas

## Estilo de Código

### JavaScript

- Use camelCase para variáveis e funções
- Use PascalCase para classes
- Use constantes para valores fixos
- Prefira arrow functions quando apropriado
- Use async/await para código assíncrono

### HTML/CSS

- Use classes semânticas
- Mantenha o CSS organizado e modular
- Siga as convenções de nomenclatura existentes

## Agradecimentos

Sua contribuição é muito valorizada! Juntos, podemos tornar o Controle de Atividades uma ferramenta ainda melhor para gerenciamento de tarefas.

---

Desenvolvido com ❤️ para simplificar o gerenciamento de tarefas diárias.
