# 2048

2048 em Angular 22 (zoneless, signals) com tabuleiros variados, peças especiais, poderes e modos de jogo. Funciona offline (PWA).

**Jogar:** https://glaycow.github.io/2048/

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

O workflow `.github/workflows/deploy.yml` testa, gera o build e publica no GitHub Pages a cada push na `main`.
