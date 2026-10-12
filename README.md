# Adegas

Sistema para adegas controlarem **estoque** (bebidas, cigarros, gelo...), **vendas** e **financeiro**, com um **app** para o dia a dia no balcão e um **painel web** para a gestão. Os dois usam as mesmas regras.

📄 **Fluxo completo das telas, regras e próximas etapas:** [`docs/FLUXO.md`](docs/FLUXO.md)

📊 **Comparativo com o Cplug e direção de design:** [`docs/ANALISE-CPLUG.md`](docs/ANALISE-CPLUG.md)

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

## Como testar

### No seu computador e no seu celular

1. Instale o [Node.js](https://nodejs.org) (versão LTS) no computador.
2. Baixe o projeto e instale as dependências:

   ```bash
   git clone -b claude/trusting-carson-fakp6a https://github.com/Diogo632/Adegas.git
   cd Adegas
   npm install
   ```

3. **Painel web:** rode `npm run web` e abra http://localhost:5173 no navegador.
4. **App no celular:**
   - instale o aplicativo **Expo Go** no celular (Play Store ou App Store);
   - deixe o celular e o computador **no mesmo Wi-Fi**;
   - rode `npm run app` no computador e escaneie o QR code que aparece (no Android, pelo próprio Expo Go; no iPhone, pela câmera).

Os dados ainda ficam só na memória: ao fechar ou recarregar, tudo volta para os dados de exemplo.

### Roteiro rápido

- **Venda no dinheiro:** Nova venda → 2 Heineken + 1 Gelo → Pagamento → Dinheiro → R$ 50,00. O troco deve ser **R$ 19,00**. Volte ao início: o "Vendido hoje" sobe R$ 31,00 e o Gelo passa a ter 3 em estoque.
- **Reposição:** no início, toque em **Repor** no Gelo → Unidade → 10 unidades a R$ 7,00 → Registrar. O estoque vai a 13 e o Gelo sai da lista de repor.
- **Produto novo:** Entrada de produto → Produto novo → preencha nome, preço e custo. Ele aparece na tela de venda.
- **Proteções:** tente vender mais do que tem em estoque, ou receber em dinheiro menos que o total. O sistema não deixa.

### Testes automáticos

```bash
npm test           # testes das regras (packages/core)
npm run typecheck  # checagem de tipos de tudo
```

`npm run build:demo --workspace @adegas/web` gera uma versão do painel que roda dentro de outra página (usada nas prévias por link).
