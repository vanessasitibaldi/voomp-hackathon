# Configuração do GitHub Pages

## Passos para ativar o GitHub Pages:

1. **Faça push do código para o GitHub:**

   ```bash
   git add .
   git commit -m "Configurar GitHub Pages"
   git push origin main
   ```

2. **Ative o GitHub Pages no repositório:**

   - Vá para as configurações do seu repositório no GitHub
   - Role até a seção "Pages"
   - Em "Source", selecione "GitHub Actions"

3. **Aguarde o deploy:**

   - O workflow será executado automaticamente
   - Você pode acompanhar o progresso na aba "Actions"

4. **Acesse sua página:**
   - Sua página estará disponível em: `https://[seu-usuario].github.io/voomp-whatsapp-monitor/`
   - A página de admin estará em: `https://[seu-usuario].github.io/voomp-whatsapp-monitor/admin`

## Observações importantes:

- **Nome do repositório:** Certifique-se de que o nome do repositório no GitHub seja `voomp-whatsapp-monitor` ou ajuste o `base` no `vite.config.ts`
- **Branch principal:** O deploy acontece automaticamente quando você faz push para a branch `main`
- **Atualizações:** Qualquer push para `main` irá atualizar automaticamente o site

## Estrutura criada:

- `.github/workflows/deploy.yml` - Workflow do GitHub Actions
- `src/public/404.html` - Página para lidar com roteamento SPA
- Modificações no `vite.config.ts` e `App.tsx` para suportar GitHub Pages
- Script no `package.json` para build otimizado

## Testando localmente:

Para testar como ficará no GitHub Pages:

```bash
npm run build:gh-pages
npx serve dist/public
```
