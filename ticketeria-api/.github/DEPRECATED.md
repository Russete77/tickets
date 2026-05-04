# Deprecated workflows

GitHub Actions só executa workflows em `.github/workflows/` na **raiz do repositório**. Os yml dentro de `ticketeria-api/.github/workflows/` e `ticketeria-web/.github/workflows/` nunca rodaram em CI.

Workflow consolidado para o monorepo está em `.github/workflows/ci.yml` e `.github/workflows/deploy.yml` na raiz, criado em 2026-05-03 (Auditoria CTO).

Esses arquivos podem ser removidos com segurança — mantive apenas para referência histórica.
