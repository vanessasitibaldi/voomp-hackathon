#!/bin/bash

# Script de Monitoramento dos Serviços Voomp
# Verifica a saúde e status de todos os contêineres

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Função para verificar status de um contêiner
check_container_status() {
    local container_name=$1
    local expected_port=$2
    
    if docker ps --filter "name=$container_name" --format "table {{.Names}}" | grep -q "$container_name"; then
        local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
        
        if [ "$status" = "running" ]; then
            if [ "$health" = "healthy" ]; then
                success "$container_name: Rodando e Saudável"
            elif [ "$health" = "unhealthy" ]; then
                error "$container_name: Rodando mas Não Saudável"
            elif [ "$health" = "starting" ]; then
                warning "$container_name: Rodando (verificando saúde...)"
            else
                success "$container_name: Rodando"
            fi
            
            # Verificar porta se especificada
            if [ -n "$expected_port" ]; then
                if netstat -tuln 2>/dev/null | grep -q ":$expected_port " || ss -tuln 2>/dev/null | grep -q ":$expected_port "; then
                    info "  └─ Porta $expected_port: Aberta"
                else
                    warning "  └─ Porta $expected_port: Não acessível"
                fi
            fi
        else
            error "$container_name: $status"
        fi
    else
        error "$container_name: Não encontrado"
    fi
}

# Função para verificar API
check_api_health() {
    local url=$1
    local service_name=$2
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        success "$service_name API: Respondendo (HTTP $response)"
    elif [ "$response" = "000" ]; then
        error "$service_name API: Não acessível"
    else
        warning "$service_name API: HTTP $response"
    fi
}

# Função para verificar conectividade do banco
check_database_connectivity() {
    local container_name=$1
    local db_name=$2
    local user=$3
    
    if docker exec "$container_name" pg_isready -U "$user" -d "$db_name" >/dev/null 2>&1; then
        success "$container_name DB: Aceitando conexões"
    else
        error "$container_name DB: Não está aceitando conexões"
    fi
}

# Função para verificar Redis
check_redis_connectivity() {
    local container_name=$1
    
    if docker exec "$container_name" redis-cli ping >/dev/null 2>&1; then
        success "$container_name: Respondendo ao PING"
    else
        error "$container_name: Não está respondendo"
    fi
}

# Função para mostrar logs recentes com erros
show_recent_errors() {
    local container_name=$1
    local lines=${2:-20}
    
    echo -e "${PURPLE}📋 Logs recentes de $container_name (últimas $lines linhas):${NC}"
    docker logs --tail "$lines" "$container_name" 2>&1 | grep -i "error\|fail\|exception" | tail -5 || echo "  Nenhum erro recente encontrado"
    echo ""
}

# Função para mostrar uso de recursos
show_resource_usage() {
    echo -e "${PURPLE}📊 Uso de Recursos:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}" | head -6
    echo ""
}

# Função principal de monitoramento
main() {
    local show_logs=${1:-false}
    local show_stats=${2:-false}
    local continuous=${3:-false}
    
    while true; do
        clear
        echo -e "${CYAN}🔍 Monitor de Serviços Voomp - $(date)${NC}"
        echo "=================================================================="
        echo ""
        
        log "Verificando status dos contêineres..."
        echo ""
        
        # Verificar contêineres
        check_container_status "voomp-postgres" "5432"
        check_container_status "voomp-evolution-db" "5433"
        check_container_status "voomp-evolution-redis"
        check_container_status "voomp-n8n" "5678"
        check_container_status "voomp-evolution" "8080"
        
        echo ""
        log "Verificando conectividade dos bancos de dados..."
        echo ""
        
        # Verificar bancos de dados
        if docker ps --filter "name=voomp-postgres" --format "table {{.Names}}" | grep -q "voomp-postgres"; then
            check_database_connectivity "voomp-postgres" "n8n" "n8n"
        fi
        
        if docker ps --filter "name=voomp-evolution-db" --format "table {{.Names}}" | grep -q "voomp-evolution-db"; then
            check_database_connectivity "voomp-evolution-db" "evolution" "evolution"
        fi
        
        # Verificar Redis
        if docker ps --filter "name=voomp-evolution-redis" --format "table {{.Names}}" | grep -q "voomp-evolution-redis"; then
            check_redis_connectivity "voomp-evolution-redis"
        fi
        
        echo ""
        log "Verificando APIs..."
        echo ""
        
        # Verificar APIs
        check_api_health "http://localhost:5678" "N8N"
        check_api_health "http://localhost:8080" "Evolution"
        
        # Mostrar estatísticas se solicitado
        if [ "$show_stats" = "true" ]; then
            echo ""
            show_resource_usage
        fi
        
        # Mostrar logs se solicitado
        if [ "$show_logs" = "true" ]; then
            echo ""
            log "Verificando logs recentes por erros..."
            echo ""
            
            for container in voomp-postgres voomp-evolution-db voomp-evolution-redis voomp-n8n voomp-evolution; do
                if docker ps --filter "name=$container" --format "table {{.Names}}" | grep -q "$container"; then
                    show_recent_errors "$container" 10
                fi
            done
        fi
        
        echo ""
        echo "=================================================================="
        info "Serviços disponíveis:"
        info "  • N8N: http://localhost:5678"
        info "  • Evolution API: http://localhost:8080"
        info "  • Evolution API: http://localhost:8080/manager"
        echo ""
        
        # Se não for contínuo, sair
        if [ "$continuous" != "true" ]; then
            break
        fi
        
        echo -e "${YELLOW}Atualizando em 30 segundos... (Ctrl+C para sair)${NC}"
        sleep 30
    done
}

# Função de ajuda
show_help() {
    echo "Uso: $0 [opções]"
    echo ""
    echo "Opções:"
    echo "  --logs        Mostra logs recentes com erros"
    echo "  --stats       Mostra estatísticas de uso de recursos"
    echo "  --continuous  Monitora continuamente (atualiza a cada 30s)"
    echo "  --all         Equivale a --logs --stats --continuous"
    echo "  --help        Mostra esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0                   # Verificação única"
    echo "  $0 --logs            # Verificação com logs de erro"
    echo "  $0 --continuous      # Monitoramento contínuo"
    echo "  $0 --all             # Monitoramento completo"
}

# Processar argumentos
show_logs=false
show_stats=false
continuous=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --logs)
            show_logs=true
            shift
            ;;
        --stats)
            show_stats=true
            shift
            ;;
        --continuous)
            continuous=true
            shift
            ;;
        --all)
            show_logs=true
            show_stats=true
            continuous=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verificar dependências
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado ou não está no PATH"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    warning "curl não encontrado - verificações de API serão limitadas"
fi

# Capturar Ctrl+C para monitoramento contínuo
if [ "$continuous" = "true" ]; then
    trap 'echo -e "\n${YELLOW}Monitoramento interrompido.${NC}"; exit 0' INT
fi

# Executar função principal
main "$show_logs" "$show_stats" "$continuous"