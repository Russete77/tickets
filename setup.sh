#!/bin/bash
# ============================================
# Ticketeria Digital - Setup Completo
# Pré-requisitos: Node.js 20+, Docker, Docker Compose
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║     Ticketeria Digital - Setup          ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# 1. Verificar pré-requisitos
# ============================================
echo -e "${YELLOW}[1/7] Verificando pré-requisitos...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Instale a versão 20+.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js versão $NODE_VERSION encontrada. Precisa da versão 20+.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Node.js $(node -v)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não encontrado.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ npm $(npm -v)${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado. Instale o Docker Desktop.${NC}"
    echo -e "${YELLOW}  Download: https://www.docker.com/products/docker-desktop/${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Docker $(docker --version | awk '{print $3}' | sed 's/,//')${NC}"

if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não encontrado.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Docker Compose disponível${NC}"

# ============================================
# 2. Subir PostgreSQL e Redis
# ============================================
echo ""
echo -e "${YELLOW}[2/7] Subindo PostgreSQL e Redis via Docker...${NC}"

cd ticketeria-api

# Verificar se os containers já estão rodando
if docker ps | grep -q ticketeria-postgres-dev; then
    echo -e "${GREEN}  ✅ PostgreSQL já está rodando${NC}"
else
    docker compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}  ✅ PostgreSQL e Redis iniciados${NC}"
fi

# Esperar PostgreSQL ficar pronto
echo -e "${BLUE}  ⏳ Aguardando PostgreSQL ficar pronto...${NC}"
for i in {1..30}; do
    if docker exec ticketeria-postgres-dev pg_isready -U postgres &> /dev/null; then
        echo -e "${GREEN}  ✅ PostgreSQL pronto!${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "${RED}❌ Timeout aguardando PostgreSQL. Verifique: docker logs ticketeria-postgres-dev${NC}"
        exit 1
    fi
    sleep 1
done

# Esperar Redis ficar pronto
echo -e "${BLUE}  ⏳ Aguardando Redis ficar pronto...${NC}"
for i in {1..15}; do
    if docker exec ticketeria-redis-dev redis-cli ping &> /dev/null; then
        echo -e "${GREEN}  ✅ Redis pronto!${NC}"
        break
    fi
    if [ "$i" -eq 15 ]; then
        echo -e "${RED}❌ Timeout aguardando Redis.${NC}"
        exit 1
    fi
    sleep 1
done

cd ..

# ============================================
# 3. Instalar dependências
# ============================================
echo ""
echo -e "${YELLOW}[3/7] Instalando dependências do monorepo...${NC}"
npm install
echo -e "${GREEN}  ✅ Dependências instaladas${NC}"

# ============================================
# 4. Build dos tipos compartilhados
# ============================================
echo ""
echo -e "${YELLOW}[4/7] Compilando pacote de tipos compartilhados...${NC}"
npm run build:types
echo -e "${GREEN}  ✅ @ticketeria/types compilado${NC}"

# ============================================
# 5. Gerar Prisma Client e rodar migrations
# ============================================
echo ""
echo -e "${YELLOW}[5/7] Configurando banco de dados...${NC}"

cd ticketeria-api

# Gerar Prisma Client
npx prisma generate
echo -e "${GREEN}  ✅ Prisma Client gerado${NC}"

# Criar migration inicial (se não existir)
if [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo -e "${BLUE}  📦 Criando migration inicial...${NC}"
    npx prisma migrate dev --name init
else
    echo -e "${BLUE}  📦 Aplicando migrations existentes...${NC}"
    npx prisma migrate dev
fi
echo -e "${GREEN}  ✅ Banco de dados sincronizado${NC}"

cd ..

# ============================================
# 6. Rodar seed (dados iniciais)
# ============================================
echo ""
echo -e "${YELLOW}[6/7] Populando banco com dados iniciais...${NC}"
npm run db:seed
echo -e "${GREEN}  ✅ Seed concluído${NC}"

# ============================================
# 7. Resumo
# ============================================
echo ""
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║          Setup Concluído! 🎉            ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}Para rodar o projeto, abra 2 terminais:${NC}"
echo ""
echo -e "  ${YELLOW}Terminal 1 (API):${NC}"
echo -e "    npm run dev:api"
echo ""
echo -e "  ${YELLOW}Terminal 2 (Web):${NC}"
echo -e "    npm run dev:web"
echo ""
echo -e "${GREEN}URLs:${NC}"
echo -e "  🌐 Web:      http://localhost:5173"
echo -e "  🔌 API:      http://localhost:3333"
echo -e "  📊 Prisma:   npx prisma studio (dentro de ticketeria-api/)"
echo -e "  📖 Swagger:  http://localhost:3333/api-docs"
echo ""
echo -e "${GREEN}Credenciais de teste:${NC}"
echo -e "  Admin:    admin@ticketeria.com.br / Admin@123456"
echo -e "  Produtor: produtor@example.com / Producer@123456"
echo -e "  Usuário:  usuario@example.com / Consumer@123456"
echo ""
echo -e "${YELLOW}Comandos úteis:${NC}"
echo -e "  npm run build           → Build completo"
echo -e "  npm run lint            → Verificar código"
echo -e "  npm run typecheck       → Verificar tipos"
echo -e "  npm run test            → Rodar testes da API"
echo -e "  npm run db:studio       → Abrir Prisma Studio"
echo ""
