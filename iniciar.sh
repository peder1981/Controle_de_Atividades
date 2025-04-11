#!/bin/bash

# Cores para melhorar a visualização no terminal
VERDE='\033[0;32m'
AZUL='\033[0;34m'
AMARELO='\033[1;33m'
SEM_COR='\033[0m'

echo -e "${AZUL}==================================================${SEM_COR}"
echo -e "${VERDE}      INICIANDO CONTROLE DE ATIVIDADES${SEM_COR}"
echo -e "${AZUL}==================================================${SEM_COR}"

# Verifica se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${AMARELO}Node.js não está instalado. Por favor, instale o Node.js para continuar.${SEM_COR}"
    exit 1
fi

# Verifica se npm está instalado
if ! command -v npm &> /dev/null; then
    echo -e "${AMARELO}npm não está instalado. Por favor, instale o npm para continuar.${SEM_COR}"
    exit 1
fi

# Obtém o diretório atual
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Porta para o servidor
PORTA=3000

# Verifica se a porta está em uso
if lsof -Pi :$PORTA -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${AMARELO}A porta $PORTA já está em uso. Tentando a porta 8080...${SEM_COR}"
    PORTA=8080
    
    if lsof -Pi :$PORTA -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${AMARELO}A porta $PORTA também está em uso. Tentando a porta 9000...${SEM_COR}"
        PORTA=9000
        
        if lsof -Pi :$PORTA -sTCP:LISTEN -t >/dev/null ; then
            echo -e "${AMARELO}Todas as portas alternativas estão em uso. Por favor, feche alguma aplicação que esteja usando as portas 3000, 8080 ou 9000.${SEM_COR}"
            exit 1
        fi
    fi
fi

# Inicia o servidor
echo -e "${VERDE}Iniciando servidor na porta $PORTA...${SEM_COR}"
echo -e "${AZUL}Acesse a aplicação em: ${VERDE}http://localhost:$PORTA${SEM_COR}"
echo -e "${AMARELO}Pressione Ctrl+C para encerrar o servidor${SEM_COR}"
echo -e "${AZUL}==================================================${SEM_COR}"

cd "$DIR"
# Atualiza a porta no arquivo server.js se necessário
if [ "$PORTA" != "3000" ]; then
    echo -e "${AMARELO}Ajustando a porta do servidor para $PORTA...${SEM_COR}"
    sed -i "s/const PORT = process.env.PORT || [0-9]*/const PORT = process.env.PORT || $PORTA/" server.js
fi

# Inicia o servidor Node.js
node server.js
