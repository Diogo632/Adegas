# Adegas

Sistema para adegas controlarem **estoque** (bebidas, cigarros, gelo...), **vendas** e **financeiro**, com um **app** para o dia a dia no balcão e um **painel web** para a gestão. Os dois usam as mesmas regras.

📄 **Fluxo completo das telas, regras e próximas etapas:** [`docs/FLUXO.md`](docs/FLUXO.md)

## Estrutura

```
apps/
  mobile/   App (Expo + React Native) — Início, Nova venda, Pagamento, Entrada de produto
  web/      Painel web (Vite + React) — Início, Vender (frente de caixa), Entrada de produto
packages/
  core/     Regras compartilhadas: produtos, estoque, custo médio, vendas, troco, financeiro
docs/
  FLUXO.md  Fluxo do sistema
```

> Etapa atual: **esqueleto**. Os dados ficam na memória e começam com produtos e vendas de exemplo. O banco na nuvem (para app e web verem os mesmos dados) é a próxima etapa.

## Como rodar

Precisa de [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install        # uma vez, na pasta raiz

npm run web        # painel web em http://localhost:5173
npm run app        # app: escaneie o QR code com o aplicativo Expo Go no celular
```

Outros comandos:

```bash
npm test           # testes das regras (packages/core)
npm run typecheck  # checagem de tipos de tudo
```
