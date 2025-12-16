#!/bin/bash

# Script de Orquestração dos Serviços Voomp
# Garante inicialização saudável e sequencial dos contêineres

set -e  # Para o script se algum comando falhar

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Função para verificar se um contêiner está saudável
wait_for_healthy() {
    local container_name=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    log "Aguardando $container_name ficar saudável..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker ps --filter "name=$container_name" --filter "health=healthy" --format "table {{.Names}}" | grep -q "$container_name"; then
            success "$container_name está saudável!"
            return 0
        fi
        
        if docker ps --filter "name=$container_name" --filter "status=exited" --format "table {{.Names}}" | grep -q "$container_name"; then
            error "$container_name falhou ao iniciar!"
            return 1
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    error "Timeout aguardando $container_name ficar saudável"
    return 1
}

# Função para verificar se um contêiner está rodando
wait_for_running() {
    local container_name=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    log "Aguardando $container_name iniciar..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker ps --filter "name=$container_name" --filter "status=running" --format "table {{.Names}}" | grep -q "$container_name"; then
            success "$container_name está rodando!"
            return 0
        fi
        
        if docker ps --filter "name=$container_name" --filter "status=exited" --format "table {{.Names}}" | grep -q "$container_name"; then
            error "$container_name falhou ao iniciar!"
            return 1
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    error "Timeout aguardando $container_name iniciar"
    return 1
}

# Função para verificar conectividade de banco
wait_for_postgres() {
    local container_name=$1
    local db_name=$2
    local user=$3
    local max_attempts=${4:-30}
    local attempt=1
    
    log "Verificando conectividade do PostgreSQL ($container_name)..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec "$container_name" pg_isready -U "$user" -d "$db_name" >/dev/null 2>&1; then
            success "PostgreSQL ($container_name) está aceitando conexões!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    error "Timeout aguardando PostgreSQL ($container_name) aceitar conexões"
    return 1
}

# Função para verificar API
wait_for_api() {
    local url=$1
    local service_name=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    log "Verificando API $service_name ($url)..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            success "API $service_name está respondendo!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    error "Timeout aguardando API $service_name responder"
    return 1
}

# Função principal
main() {
    log "🚀 Iniciando orquestração dos serviços Voomp..."
    
    # Parar serviços existentes se estiverem rodando
    log "Parando serviços existentes..."
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Limpar contêineres órfãos
    log "Limpando contêineres órfãos..."
    docker container prune -f >/dev/null 2>&1 || true
    
    echo ""
    log "=== FASE 1: Iniciando serviços de infraestrutura ==="
    
    # Iniciar bancos de dados primeiro
    log "Iniciando PostgreSQL principal..."
    docker-compose up -d postgres
    wait_for_running "voomp-postgres"
    wait_for_postgres "voomp-postgres" "n8n" "n8n"
    
    log "Iniciando PostgreSQL do Evolution..."
    docker-compose up -d evolution-db
    wait_for_running "voomp-evolution-db"
    wait_for_postgres "voomp-evolution-db" "evolution" "evolution"
    
    log "Iniciando Redis..."
    docker-compose up -d evolution-redis
    wait_for_running "voomp-evolution-redis"
    wait_for_healthy "voomp-evolution-redis"
    
    echo ""
    log "=== FASE 2: Iniciando serviços de aplicação ==="
    
    # Iniciar N8N
    log "Iniciando N8N..."
    docker-compose up -d n8n
    wait_for_running "voomp-n8n"
    
    # Aguardar N8N estar pronto
    log "Aguardando N8N processar migrações..."
    sleep 10
    wait_for_api "http://localhost:5678" "N8N"
    
    # Iniciar Evolution API
    log "Iniciando Evolution API..."
    docker-compose up -d evolution
    wait_for_running "voomp-evolution"
    
    # Aguardar Evolution API estar pronta
    log "Aguardando Evolution API inicializar..."
    sleep 15
    wait_for_api "http://localhost:8080" "Evolution API"
    
    echo ""
    log "=== FASE 3: Verificação final ==="
    
    # Status final
    log "Verificando status final dos serviços..."
    docker-compose ps
    
    echo ""
    success "🎉 Todos os serviços foram iniciados com sucesso!"
    echo ""
    log "📋 Serviços disponíveis:"
    log "   • N8N: http://localhost:5678"
    log "   • Evolution API: http://localhost:8080"
    log "   • PostgreSQL (N8N): localhost:5432"
    log "   • PostgreSQL (Evolution): localhost:5433"
    echo ""
    
    # Verificar se há erros do Redis
    log "Verificando logs do Evolution API por 10 segundos..."
    timeout 10s docker-compose logs -f evolution 2>/dev/null || true
    
    echo ""
    warning "Nota: Se você ver erros 'redis disconnected' no Evolution API, isso é um problema conhecido"
    warning "da imagem Docker, mas não afeta a funcionalidade da API."
    echo ""
    success "✨ Orquestração concluída! Todos os serviços estão prontos para uso."
}

# Função de limpeza em caso de interrupção
cleanup() {
    echo ""
    warning "Script interrompido. Limpando..."
    docker-compose down 2>/dev/null || true
    exit 1
}

# Capturar Ctrl+C
trap cleanup INT

# Verificar se docker e docker-compose estão disponíveis
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado ou não está no PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado ou não está no PATH"
    exit 1
fi

# Executar função principal
main "$@"