# Adegas

Sistema para adegas controlarem **estoque** (bebidas, cigarros, gelo...), **vendas** e **financeiro**, com um **app** para o dia a dia no balcão e um **painel web** para a gestão. Os dois usam as mesmas regras.

📄 **Fluxo completo das telas, regras e próximas etapas:** [`docs/FLUXO.md`](docs/FLUXO.md)

📊 **Comparativo com o Cplug e direção de design:** [`docs/ANALISE-CPLUG.md`](docs/ANALISE-CPLUG.md)

## Estrutura

```
apps/
  mobile/   App (Expo + React Native) — abas Início, Estoque, Financeiro, Relatórios;
            Nova venda, Pagamento, Entrada de produto, Produto, Nova movimentação
  web/      Painel web (Vite + React) — Início, Vender, Entrada de produto, Estoque,
            Financeiro, Relatórios
packages/
  core/     Regras compartilhadas: produtos, estoque, ajustes, custo médio, vendas, troco,
            financeiro, relatórios
docs/
  FLUXO.md  Fluxo do sistema
```

> Os dados ainda ficam na memória e começam com produtos e 30 dias de vendas, compras e contas de exemplo. O banco na nuvem (para app e web verem os mesmos dados) é a próxima etapa.

## Como testar

### Pelo GitHub, sem instalar nada

A cada envio de código, o GitHub roda os testes e publica uma prévia em **https://diogo632.github.io/Adegas/** (app e painel, com dados de exemplo).

Para ligar a prévia, **uma vez só**:

1. No GitHub, abra o repositório **Adegas** → **Settings** → **Pages** (menu da esquerda).
2. Em **Build and deployment**, escolha **Source: Deploy from a branch**.
3. Em **Branch**, escolha **gh-pages** e a pasta **/ (root)** → **Save**.
4. Espere 1 ou 2 minutos e abra https://diogo632.github.io/Adegas/ (no celular, toque em **App**).

O andamento fica na aba **Actions**: verde = testes passaram e a prévia foi atualizada.

**Não apareceu a novidade?** Depois que a aba **Actions** fica verde, o GitHub ainda leva 1 ou 2 minutos para trocar o site, e o navegador pode mostrar a cópia antiga por até 10 minutos. Veja a linha **"Versão de …"** no fim da página inicial: se a data não for a do último envio, recarregue forçando (computador: **Ctrl+Shift+R**, no Mac **Cmd+Shift+R**; celular: abra o link numa **aba anônima**).

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
- **Estoque:** abra o Gelo → Ajustar → Perda, 1 unidade → Salvar. O estoque cai 1 e a perda aparece no Financeiro.
- **Financeiro:** Nova movimentação → Saída → Luz, água e internet → R$ 120,00. Ela entra no topo das movimentações e no "Para onde foi o dinheiro".
- **Relatórios:** troque o período (Hoje, 7 dias, 30 dias) e passe o mouse (ou toque) nas colunas.

### Testes automáticos

```bash
npm test           # testes das regras (packages/core)
npm run typecheck  # checagem de tipos de tudo
```

`npm run previa` monta na pasta `site/` a mesma prévia publicada no GitHub (página inicial, painel e app).
