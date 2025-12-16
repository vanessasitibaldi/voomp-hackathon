#!/bin/bash

# Script Principal de Gerenciamento dos Serviços Voomp
# Centraliza todas as operações de gerenciamento dos contêineres

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

# Função para mostrar banner
show_banner() {
    echo -e "${PURPLE}"
    echo "██╗   ██╗ ██████╗  ██████╗ ███╗   ███╗██████╗ "
    echo "██║   ██║██╔═══██╗██╔═══██╗████╗ ████║██╔══██╗"
    echo "██║   ██║██║   ██║██║   ██║██╔████╔██║██████╔╝"
    echo "╚██╗ ██╔╝██║   ██║██║   ██║██║╚██╔╝██║██╔═══╝ "
    echo " ╚████╔╝ ╚██████╔╝╚██████╔╝██║ ╚═╝ ██║██║     "
    echo "  ╚═══╝   ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝     "
    echo -e "${NC}"
    echo -e "${CYAN}Gerenciador de Serviços Voomp v1.0${NC}"
    echo "================================================"
    echo ""
}

# Função para mostrar status rápido
show_quick_status() {
    echo -e "${CYAN}📊 Status Rápido dos Serviços:${NC}"
    echo ""
    
    local services=("voomp-postgres:PostgreSQL" "voomp-evolution-db:Evolution DB" "voomp-evolution-redis:Redis" "voomp-n8n:N8N" "voomp-evolution:Evolution API")
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r container_name service_name <<< "$service_info"
        
        if docker ps --filter "name=$container_name" --format "table {{.Names}}" | grep -q "$container_name"; then
            local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
            if [ "$status" = "running" ]; then
                success "$service_name: Rodando"
            else
                error "$service_name: $status"
            fi
        else
            error "$service_name: Parado"
        fi
    done
    
    echo ""
    info "URLs dos Serviços:"
    info "  • N8N: http://localhost:5678"
    info "  • Evolution API: http://localhost:8080"
    echo ""
}

# Função para mostrar ajuda
show_help() {
    show_banner
    echo "Uso: $0 <comando> [opções]"
    echo ""
    echo -e "${YELLOW}Comandos Principais:${NC}"
    echo "  start                 Inicia todos os serviços com orquestração"
    echo "  stop                  Para todos os serviços"
    echo "  restart               Reinicia todos os serviços"
    echo "  status                Mostra status rápido dos serviços"
    echo "  monitor               Monitora os serviços em tempo real"
    echo ""
    echo -e "${YELLOW}Comandos de Gerenciamento:${NC}"
    echo "  logs [serviço]        Mostra logs de um serviço específico"
    echo "  clean                 Para e remove contêineres e volumes"
    echo "  reset                 Reset completo (para, remove tudo e reinicia)"
    echo "  update                Atualiza as imagens Docker"
    echo ""
    echo -e "${YELLOW}Comandos de Diagnóstico:${NC}"
    echo "  health                Verifica saúde detalhada dos serviços"
    echo "  debug [serviço]       Modo debug para um serviço específico"
    echo "  shell [serviço]       Abre shell no contêiner do serviço"
    echo ""
    echo -e "${YELLOW}Serviços Disponíveis:${NC}"
    echo "  postgres              PostgreSQL principal (N8N)"
    echo "  evolution-db          PostgreSQL do Evolution"
    echo "  redis                 Redis do Evolution"
    echo "  n8n                   N8N Workflow Automation"
    echo "  evolution             Evolution API"
    echo ""
    echo -e "${YELLOW}Exemplos:${NC}"
    echo "  $0 start              # Inicia todos os serviços"
    echo "  $0 logs evolution     # Mostra logs do Evolution API"
    echo "  $0 shell n8n          # Abre shell no contêiner N8N"
    echo "  $0 monitor --all      # Monitora com logs e estatísticas"
    echo ""
}

# Função para executar comandos
execute_command() {
    local command=$1
    shift
    
    case $command in
        "start")
            log "Iniciando serviços com orquestração..."
            ./start-services.sh "$@"
            ;;
        "stop")
            log "Parando serviços..."
            ./stop-services.sh "$@"
            ;;
        "restart")
            log "Reiniciando serviços..."
            ./stop-services.sh
            sleep 2
            ./start-services.sh
            ;;
        "status")
            show_quick_status
            ;;
        "monitor")
            ./monitor-services.sh "$@"
            ;;
        "logs")
            local service=${1:-""}
            if [ -z "$service" ]; then
                error "Especifique um serviço. Use: $0 logs <serviço>"
                echo "Serviços: postgres, evolution-db, redis, n8n, evolution"
                exit 1
            fi
            
            local container_name="voomp-$service"
            if [ "$service" = "evolution-db" ]; then
                container_name="voomp-evolution-db"
            elif [ "$service" = "redis" ]; then
                container_name="voomp-evolution-redis"
            fi
            
            log "Mostrando logs de $service..."
            docker logs -f "$container_name"
            ;;
        "clean")
            warning "Isso irá parar e remover TODOS os contêineres e volumes!"
            read -p "Tem certeza? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                ./stop-services.sh --clean
            else
                log "Operação cancelada"
            fi
            ;;
        "reset")
            warning "Reset completo: para, remove tudo e reinicia!"
            read -p "Tem certeza? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                ./stop-services.sh --clean
                sleep 2
                ./start-services.sh
            else
                log "Operação cancelada"
            fi
            ;;
        "update")
            log "Atualizando imagens Docker..."
            docker-compose pull
            success "Imagens atualizadas! Use '$0 restart' para aplicar"
            ;;
        "health")
            ./monitor-services.sh --logs --stats
            ;;
        "debug")
            local service=${1:-""}
            if [ -z "$service" ]; then
                error "Especifique um serviço. Use: $0 debug <serviço>"
                exit 1
            fi
            
            local container_name="voomp-$service"
            if [ "$service" = "evolution-db" ]; then
                container_name="voomp-evolution-db"
            elif [ "$service" = "redis" ]; then
                container_name="voomp-evolution-redis"
            fi
            
            log "Modo debug para $service..."
            echo "Status do contêiner:"
            docker inspect "$container_name" --format='{{json .State}}' | jq '.' 2>/dev/null || docker inspect "$container_name" --format='{{.State}}'
            echo ""
            echo "Logs recentes:"
            docker logs --tail 50 "$container_name"
            ;;
        "shell")
            local service=${1:-""}
            if [ -z "$service" ]; then
                error "Especifique um serviço. Use: $0 shell <serviço>"
                exit 1
            fi
            
            local container_name="voomp-$service"
            if [ "$service" = "evolution-db" ]; then
                container_name="voomp-evolution-db"
            elif [ "$service" = "redis" ]; then
                container_name="voomp-evolution-redis"
            fi
            
            log "Abrindo shell em $service..."
            docker exec -it "$container_name" /bin/sh 2>/dev/null || docker exec -it "$container_name" /bin/bash
            ;;
        *)
            error "Comando desconhecido: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Verificar dependências
check_dependencies() {
    local missing_deps=()
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        error "Dependências não encontradas: ${missing_deps[*]}"
        echo ""
        info "Instale as dependências necessárias:"
        for dep in "${missing_deps[@]}"; do
            echo "  • $dep"
        done
        exit 1
    fi
}

# Verificar se os scripts auxiliares existem
check_scripts() {
    local missing_scripts=()
    
    if [ ! -f "start-services.sh" ]; then
        missing_scripts+=("start-services.sh")
    fi
    
    if [ ! -f "stop-services.sh" ]; then
        missing_scripts+=("stop-services.sh")
    fi
    
    if [ ! -f "monitor-services.sh" ]; then
        missing_scripts+=("monitor-services.sh")
    fi
    
    if [ ${#missing_scripts[@]} -gt 0 ]; then
        error "Scripts auxiliares não encontrados: ${missing_scripts[*]}"
        echo ""
        info "Certifique-se de que todos os scripts estão no mesmo diretório"
        exit 1
    fi
    
    # Tornar scripts executáveis
    chmod +x start-services.sh stop-services.sh monitor-services.sh 2>/dev/null || true
}

# Função principal
main() {
    # Verificar dependências
    check_dependencies
    check_scripts
    
    # Se nenhum argumento, mostrar status
    if [ $# -eq 0 ]; then
        show_banner
        show_quick_status
        echo ""
        info "Use '$0 help' para ver todos os comandos disponíveis"
        exit 0
    fi
    
    local command=$1
    shift
    
    # Comando de ajuda
    if [ "$command" = "help" ] || [ "$command" = "--help" ] || [ "$command" = "-h" ]; then
        show_help
        exit 0
    fi
    
    # Executar comando
    execute_command "$command" "$@"
}

# Executar função principal
main "$@"