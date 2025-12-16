# 📦 Comandos NPM para Docker - Referência Rápida

## 🚀 Comandos Essenciais

```bash
# Iniciar todos os serviços
npm run docker:start

# Verificar status
npm run docker:status

# Parar todos os serviços
npm run docker:stop
```

## 📊 Monitoramento

```bash
# Monitor único
npm run docker:monitor

# Monitor contínuo (atualiza a cada 30s)
npm run docker:monitor:live

# Monitor completo (logs + stats + contínuo)
npm run docker:monitor:full

# Saúde detalhada
npm run docker:health
```

## 📋 Logs dos Serviços

```bash
# Evolution API
npm run docker:logs:evolution

# N8N
npm run docker:logs:n8n

# PostgreSQL
npm run docker:logs:postgres

# Redis
npm run docker:logs:redis
```

## 🔧 Debug e Shell

```bash
# Debug Evolution API
npm run docker:debug:evolution

# Debug N8N
npm run docker:debug:n8n

# Shell no Evolution API
npm run docker:shell:evolution

# Shell no N8N
npm run docker:shell:n8n
```

## 🛠️ Gerenciamento

```bash
# Reiniciar todos os serviços
npm run docker:restart

# Atualizar imagens Docker
npm run docker:update

# Limpeza completa (CUIDADO!)
npm run docker:clean

# Reset total (CUIDADO!)
npm run docker:reset
```

## 🎯 Workflow Diário

### Início do Dia

```bash
npm run docker:status    # Verificar status
npm run docker:start     # Iniciar se necessário
npm run docker:health    # Confirmar saúde
```

**O que acontece quando `npm run docker:start` é executado:**

1. 🔄 Para serviços existentes (se houver)
2. 🗄️ Inicia PostgreSQL (N8N)
3. 🗄️ Inicia PostgreSQL (Evolution)
4. 🔴 Inicia Redis com verificação de saúde
5. 🔧 Inicia N8N (aguarda DB estar pronto)
6. 🚀 Inicia Evolution API (aguarda DB e Redis)
7. ✅ Verifica se todas as APIs estão respondendo

**Tempo estimado:** 2-3 minutos

**Ordem de inicialização:**

1. **PostgreSQL** (N8N e Evolution)
2. **Redis** (com healthcheck)
3. **N8N** (aguarda DB estar pronto)
4. **Evolution API** (aguarda DB e Redis)

### Durante Desenvolvimento

```bash
# Terminal 1: Monitor contínuo
npm run docker:monitor:live

# Terminal 2: Logs quando necessário
npm run docker:logs:evolution
npm run docker:logs:n8n
```

### Final do Dia

```bash
npm run docker:stop      # Parar serviços
```

## 🆘 Solução de Problemas

```bash
# Serviço não funciona
npm run docker:logs:evolution
npm run docker:debug:evolution

# Tudo parou
npm run docker:restart

# Problemas graves
npm run docker:reset
```

## 🚨 Notas Importantes

### Backup e Dados

- Use `./voomp.sh clean` com **MUITO CUIDADO**
- Isso remove **TODOS** os dados dos bancos
- Para backup, pare os serviços e copie os volumes Docker

## 🌐 URLs dos Serviços

Após `npm run docker:start`:

- **N8N**: http://localhost:5678
- **Evolution API**: http://localhost:8080

## 💡 Dicas

1. **Use comandos NPM** para tarefas diárias
2. **Use `./voomp.sh help`** para opções avançadas
3. **Monitor contínuo** é útil durante desenvolvimento
4. **Ignore erros do Redis** - são cosméticos
5. **Comandos com `clean/reset`** apagam dados!
