#!/bin/bash

# Cores para melhorar a visualização no terminal
VERDE='\033[0;32m'
AZUL='\033[0;34m'
AMARELO='\033[1;33m'
SEM_COR='\033[0m'

# Função para verificar se uma porta está em uso
porta_em_uso() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null
    return $?
}

# Obtém o diretório atual
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

BACKEND_PORT=9000
FRONTEND_PORT=3000

cd "$DIR"

# Verifica Node.js e npm
if ! command -v node &> /dev/null; then
    echo -e "${AMARELO}Node.js não está instalado. Por favor, instale o Node.js para continuar.${SEM_COR}"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo -e "${AMARELO}npm não está instalado. Por favor, instale o npm para continuar.${SEM_COR}"
    exit 1
fi

# Verifica se o pacote 'serve' está disponível
if ! command -v serve &> /dev/null; then
    if ! npx --no-install serve --version &> /dev/null; then
        echo -e "${AMARELO}O pacote 'serve' não está instalado globalmente. Será usado via npx.\nSe preferir, instale globalmente: npm install -g serve${SEM_COR}"
    fi
fi

# Ajusta a porta do backend em server.js se necessário
sed -i "s/const PORT = process.env.PORT || [0-9]*/const PORT = process.env.PORT || $BACKEND_PORT/" server.js

# Mata processos antigos nas portas
for P in $BACKEND_PORT $FRONTEND_PORT; do
    PID=$(lsof -ti tcp:$P)
    if [ ! -z "$PID" ]; then
        echo -e "${AMARELO}Finalizando processo na porta $P (PID $PID)...${SEM_COR}"
        kill -9 $PID
    fi
done

# Inicia o backend
node server.js &
BACKEND_PID=$!
echo -e "${VERDE}Backend iniciado na porta $BACKEND_PORT (PID $BACKEND_PID)${SEM_COR}"

# Inicia o frontend
if command -v serve &> /dev/null; then
    serve . -l $FRONTEND_PORT &
    FRONTEND_PID=$!
else
    npx serve . -l $FRONTEND_PORT &
    FRONTEND_PID=$!
fi
echo -e "${VERDE}Frontend iniciado na porta $FRONTEND_PORT (PID $FRONTEND_PID)${SEM_COR}"

# Mensagens finais
sleep 1

echo -e "${AZUL}==================================================${SEM_COR}"
echo -e "${VERDE}      CONTROLE DE ATIVIDADES INICIADO${SEM_COR}"
echo -e "${AZUL}==================================================${SEM_COR}"
echo -e "${VERDE}Backend:${SEM_COR} http://localhost:$BACKEND_PORT"
echo -e "${VERDE}Frontend:${SEM_COR} http://localhost:$FRONTEND_PORT"
echo -e "${AMARELO}Pressione Ctrl+C para encerrar ambos os servidores${SEM_COR}"
echo -e "${AZUL}==================================================${SEM_COR}"

# Aguarda ambos processos
wait $BACKEND_PID $FRONTEND_PID
