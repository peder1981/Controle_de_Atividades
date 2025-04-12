/**
 * Gerenciador de tema para o Controle de Atividades
 * Versão: 2.2.0
 */

// Função para definir o tema
function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon('dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        updateThemeIcon('light');
    }
}

// Função para atualizar o ícone do tema
function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        if (theme === 'dark') {
            themeIcon.classList.remove('bi-moon-fill');
            themeIcon.classList.add('bi-sun-fill');
        } else {
            themeIcon.classList.remove('bi-sun-fill');
            themeIcon.classList.add('bi-moon-fill');
        }
    }
}

// Função para alternar o tema
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Atualizar gráficos se existirem
    updateCharts(newTheme);
}

// Função para atualizar os gráficos com o tema atual
function updateCharts(theme) {
    if (window.charts) {
        const textColor = theme === 'dark' ? '#e0e0e0' : '#343a40';
        const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        
        // Configuração global para Chart.js
        Chart.defaults.color = textColor;
        Chart.defaults.scale.grid.color = gridColor;
        
        // Atualizar cada gráfico
        Object.values(window.charts).forEach(chart => {
            if (chart && typeof chart.update === 'function') {
                chart.options.scales.x.ticks.color = textColor;
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.x.grid.color = gridColor;
                chart.options.scales.y.grid.color = gridColor;
                chart.update();
            }
        });
    }
}

// Inicializar o tema quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o elemento de alternância de tema existe
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) {
        // Criar o elemento de alternância de tema se não existir
        createThemeToggle();
    }
    
    // Aplicar o tema salvo ou o padrão
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Atualizar gráficos com o tema atual
    updateCharts(savedTheme);
});

// Função para criar o botão de alternância de tema
function createThemeToggle() {
    // Verificar se estamos em uma página com navbar Bootstrap
    const navbar = document.querySelector('.navbar-nav.ms-auto');
    if (navbar) {
        // Criar o item de lista para o botão de tema
        const themeItem = document.createElement('li');
        themeItem.className = 'nav-item';
        
        // Criar o botão de alternância de tema
        const themeButton = document.createElement('a');
        themeButton.className = 'nav-link theme-toggle';
        themeButton.href = '#';
        themeButton.id = 'theme-toggle';
        themeButton.innerHTML = '<i id="theme-icon" class="bi bi-moon-fill"></i>';
        themeButton.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
        
        // Adicionar o botão ao item de lista
        themeItem.appendChild(themeButton);
        
        // Adicionar o item de lista à navbar
        navbar.appendChild(themeItem);
    } else {
        // Para páginas sem navbar Bootstrap, adicionar ao corpo
        const themeButton = document.createElement('button');
        themeButton.className = 'theme-toggle-btn';
        themeButton.id = 'theme-toggle';
        themeButton.innerHTML = '<i id="theme-icon" class="bi bi-moon-fill"></i>';
        themeButton.addEventListener('click', toggleTheme);
        
        // Adicionar o botão ao corpo
        document.body.appendChild(themeButton);
    }
}
