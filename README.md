# Adegas

Sistema para adegas controlarem **estoque** (bebidas, cigarros, gelo...), **vendas**, **contas por mesa** e **financeiro**, com um **app** para o dia a dia no balcão e um **painel web** para a gestão. Os dois usam as mesmas regras. Cada pessoa da equipe entra com o próprio **PIN**, e o dono escolhe o que cada funcionário pode fazer.

A adega dos dados de exemplo se chama **Pop**, e o assistente com IA é o **Pop AI**: ele entende texto e **áudio** (mensagem de voz gravada na hora ou o áudio do WhatsApp).

📄 **Fluxo completo das telas, regras e próximas etapas:** [`docs/FLUXO.md`](docs/FLUXO.md)

📊 **Comparativo com o Cplug e direção de design:** [`docs/ANALISE-CPLUG.md`](docs/ANALISE-CPLUG.md)

🤖 **Pop AI, o assistente com IA (Gemini + MCP), por texto e por áudio:** [`docs/ASSISTENTE.md`](docs/ASSISTENTE.md)

## Estrutura

```
apps/
  mobile/   App (Expo + React Native) — Entrar (PIN); abas Início, Estoque, Financeiro,
            Relatórios, Pop AI; Nova venda, Pagamento, Mesas (conta, pedido, fechar),
            Entrada de produto, Produto, Nova movimentação, Conta, Usuários
  web/      Painel web (Vite + React) — Entrar (PIN), Início, Vender, Mesas, Entrada de
            produto, Estoque, Financeiro, Relatórios, Usuários, Pop AI
packages/
  core/     Regras compartilhadas: produtos, estoque, ajustes, custo médio, vendas, troco,
            contas por mesa, financeiro, relatórios, lembretes, usuários e permissões
  ia/       Pop AI: servidor MCP com tudo da plataforma + agente que usa o Gemini
            (texto e áudio)
docs/
  FLUXO.md  Fluxo do sistema
  ASSISTENTE.md  Pop AI, o assistente com IA
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

- **Entrar:** ao abrir, toque em quem está usando e digite o PIN. Nos dados de exemplo: **Dono 1234** (administrador, vê tudo), **Ana 1111** e **Bruno 2222** (funcionários). Faça o roteiro abaixo como **Dono**.
- **Venda no dinheiro:** Nova venda → 2 Heineken + 1 Gelo → Pagamento → Dinheiro → R$ 50,00. O troco deve ser **R$ 19,00**. Volte ao início: o "Vendido hoje" sobe R$ 31,00 e o Gelo passa a ter 3 em estoque.
- **Reposição:** no início, toque em **Repor** no Gelo → Unidade → 10 unidades a R$ 7,00 → Registrar. O estoque vai a 13 e o Gelo sai da lista de repor.
- **Produto novo:** Entrada (no app; "Entrada de produto" no painel) → Produto novo → preencha nome, preço e custo. Ele aparece na tela de venda.
- **Proteções:** tente vender mais do que tem em estoque, ou receber em dinheiro menos que o total. O sistema não deixa.
- **Estoque:** abra o Gelo → Ajustar → Perda, 1 unidade → Salvar. O estoque cai 1 e a perda aparece no Financeiro.
- **Financeiro:** Nova movimentação → Saída → Luz, água e internet → R$ 120,00. Ela entra no topo das movimentações e no "Para onde foi o dinheiro".
- **Relatórios:** troque o período (Hoje, 7 dias, 30 dias) e passe o mouse (ou toque) nas colunas.
- **Mesas:** no início, toque em **Mesas** → a mesa 10 já tem Coca, água e Skol. Abra → **Adicionar pedido na Mesa 10** → 1 água → **Lançar na Mesa 10**: o total sobe R$ 3,00 e a água sai do estoque. No painel, clicar nos produtos só monta o pedido ("Pedido novo · Mesa 10"); ele entra na conta ao clicar em **Lançar na Mesa 10**. Toque no − para tirar. **Fechar conta** → dividir por 2 → Dinheiro → R$ 100 mostra o troco. A mesa fica livre e a conta aparece no Financeiro como "Mesa 10". Toque numa mesa livre para abrir outra, ou digite um nome ("Balcão").
- **Níveis de acesso:** **Trocar usuário** (no app, toque no seu nome no topo do Início; no painel, no pé do menu) → **Ana, 1111**. Ela não vê Financeiro, Relatórios, Entrada, preço de custo, nem o − e o "Cancelar mesa" das mesas. Abra **Mesas** e lance um pedido: funciona.
- **Cadastrar funcionário:** entre como **Dono** → **Usuários** (no app, toque no seu nome no Início) → **Cadastrar funcionário** → nome "Carla", PIN 3333, deixe ligado só **Atender mesas** → Cadastrar. Troque de usuário e entre como Carla: ela só vê o Início e as Mesas.
- **Pop AI:** cole sua chave do Gemini (grátis em https://aistudio.google.com/apikey) na tela **Pop AI** → peça "Chegaram 2 fardos de Skol por R$ 33 cada". Ele registra a entrada; toque em **Ver estoque**: a Skol subiu 24. Depois peça "Me lembre de pagar a luz amanhã às 10h" e veja o lembrete no Início. Detalhes em [`docs/ASSISTENTE.md`](docs/ASSISTENTE.md).
- **Áudio:** na tela **Pop AI**, toque no **microfone** (o botão amarelo, quando o campo está vazio), fale "a mesa 7 pediu uma Coca e duas Skol" e toque na **seta**. O balão mostra o que ele entendeu ("“a mesa 7 pediu…”") e ele lança na mesa. O **clipe** 📎 manda um arquivo de áudio salvo, como o áudio do WhatsApp de um fornecedor. No navegador, permita o microfone quando ele pedir.

### Testes automáticos

```bash
npm test           # testes das regras (packages/core) e do assistente (packages/ia)
npm run typecheck  # checagem de tipos de tudo
```

`npm run mcp` sobe o servidor MCP da Adegas no terminal e `GEMINI_API_KEY=sua-chave npm run assistente` conversa com o Pop AI pelo terminal (nele, `/audio arquivo.ogg` manda um áudio; veja [`docs/ASSISTENTE.md`](docs/ASSISTENTE.md)).

`npm run previa` monta na pasta `site/` a mesma prévia publicada no GitHub (página inicial, painel e app).
