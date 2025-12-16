#!/bin/bash

# Script para parar os serviços Voomp de forma organizada
# Garante que os serviços sejam parados na ordem correta

set -e

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

# Função para parar um contêiner específico
stop_container() {
    local container_name=$1
    
    if docker ps --filter "name=$container_name" --format "table {{.Names}}" | grep -q "$container_name"; then
        log "Parando $container_name..."
        docker stop "$container_name" >/dev/null 2>&1 || true
        success "$container_name parado"
    else
        warning "$container_name não está rodando"
    fi
}

# Função para remover um contêiner específico
remove_container() {
    local container_name=$1
    
    if docker ps -a --filter "name=$container_name" --format "table {{.Names}}" | grep -q "$container_name"; then
        log "Removendo $container_name..."
        docker rm "$container_name" >/dev/null 2>&1 || true
        success "$container_name removido"
    fi
}

# Função principal
main() {
    local remove_containers=${1:-false}
    local remove_volumes=${2:-false}
    
    log "🛑 Parando serviços Voomp..."
    
    echo ""
    log "=== FASE 1: Parando serviços de aplicação ==="
    
    # Parar serviços de aplicação primeiro
    stop_container "voomp-evolution"
    stop_container "voomp-n8n"
    
    echo ""
    log "=== FASE 2: Parando serviços de infraestrutura ==="
    
    # Parar serviços de infraestrutura
    stop_container "voomp-evolution-redis"
    stop_container "voomp-evolution-db"
    stop_container "voomp-postgres"
    
    # Se solicitado, remover contêineres
    if [ "$remove_containers" = "true" ]; then
        echo ""
        log "=== FASE 3: Removendo contêineres ==="
        
        remove_container "voomp-evolution"
        remove_container "voomp-n8n"
        remove_container "voomp-evolution-redis"
        remove_container "voomp-evolution-db"
        remove_container "voomp-postgres"
    fi
    
    # Se solicitado, remover volumes
    if [ "$remove_volumes" = "true" ]; then
        echo ""
        log "=== FASE 4: Removendo volumes ==="
        warning "Isso irá apagar TODOS os dados dos bancos!"
        read -p "Tem certeza? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            success "Volumes removidos"
        else
            log "Remoção de volumes cancelada"
        fi
    fi
    
    # Remover rede se não houver contêineres usando
    log "Limpando redes órfãs..."
    docker network prune -f >/dev/null 2>&1 || true
    
    echo ""
    log "Status final:"
    docker-compose ps
    
    echo ""
    success "🎉 Serviços parados com sucesso!"
}

# Função de ajuda
show_help() {
    echo "Uso: $0 [opções]"
    echo ""
    echo "Opções:"
    echo "  --remove-containers    Remove os contêineres após parar"
    echo "  --remove-volumes       Remove os volumes (APAGA DADOS!)"
    echo "  --clean               Remove contêineres e volumes"
    echo "  --help                Mostra esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0                    # Apenas para os serviços"
    echo "  $0 --remove-containers # Para e remove contêineres"
    echo "  $0 --clean            # Para, remove contêineres e volumes"
}

# Processar argumentos
remove_containers=false
remove_volumes=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --remove-containers)
            remove_containers=true
            shift
            ;;
        --remove-volumes)
            remove_volumes=true
            shift
            ;;
        --clean)
            remove_containers=true
            remove_volumes=true
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

# Verificar se docker está disponível
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado ou não está no PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado ou não está no PATH"
    exit 1
fi

# Executar função principal
main "$remove_containers" "$remove_volumes"