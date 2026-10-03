# 2048

2048 em Angular 22 (zoneless, signals) com tabuleiros variados, peças especiais, poderes e modos de jogo. Funciona offline (PWA).

**Jogar:** https://2048-git-main-glaycows-projects.vercel.app

## Recursos

- **Modos:** Clássico, Contra o tempo, Desafio diário, Puzzle e Zen
- **Tabuleiros:** 3×3 a 8×8, Cruz, Losango, Anel, Pilares, Ampulheta
- **Peças especiais:** bomba, gelo, multiplicador e pedra
- **Poderes:** desfazer, trocar, remover e embaralhar

## Desenvolvimento

Requer Node 24 (`.nvmrc`).

```bash
npm install
npm start                    # http://localhost:4200
npm test -- --watch=false
npm run build
```

## Estrutura

```
src/app/core/engine/   motor do jogo em TypeScript puro (testado)
src/app/core/store/    estado com signals e persistência
src/app/core/pwa/      aviso de nova versão
src/app/features/      menu, jogo e puzzles
```

## Deploy

Vercel, configurado em `vercel.json` (build `npm run build`, saída `dist/game-2048/browser`, rewrites para as rotas do Angular e cache do service worker).

O workflow `.github/workflows/ci.yml` roda testes e build em cada push e PR.
