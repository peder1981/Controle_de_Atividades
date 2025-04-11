#!/bin/bash

# Cores para melhorar a visualização no terminal
VERDE='\033[0;32m'
AZUL='\033[0;34m'
AMARELO='\033[1;33m'
SEM_COR='\033[0m'

echo -e "${AZUL}==================================================${SEM_COR}"
echo -e "${VERDE}      INICIANDO CONTROLE DE ATIVIDADES${SEM_COR}"
echo -e "${AZUL}==================================================${SEM_COR}"

# Verifica se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo -e "${AMARELO}Python 3 não encontrado. Tentando com Python...${SEM_COR}"
    
    if ! command -v python &> /dev/null; then
        echo -e "\n${AMARELO}Python não está instalado. Por favor, instale o Python para continuar.${SEM_COR}"
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

# Obtém o diretório atual
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Porta para o servidor
PORTA=8000

# Verifica se a porta está em uso
if lsof -Pi :$PORTA -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${AMARELO}A porta $PORTA já está em uso. Tentando a porta 8080...${SEM_COR}"
    PORTA=8080
    
    if lsof -Pi :$PORTA -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${AMARELO}A porta $PORTA também está em uso. Tentando a porta 9000...${SEM_COR}"
        PORTA=9000
        
        if lsof -Pi :$PORTA -sTCP:LISTEN -t >/dev/null ; then
            echo -e "${AMARELO}Todas as portas alternativas estão em uso. Por favor, feche alguma aplicação que esteja usando as portas 8000, 8080 ou 9000.${SEM_COR}"
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
$PYTHON_CMD -m http.server $PORTA
