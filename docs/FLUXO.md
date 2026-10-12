# Fluxo do sistema — Adegas

Documento de referência do esqueleto: quais telas existem, o que cada uma faz e o que muda no estoque e no financeiro a cada ação. Serve de base para as próximas etapas.

## 1. Visão geral

| Peça | Para quem | Para quê |
|---|---|---|
| 📱 **App** (`apps/mobile`) | Quem está no balcão | Vender, dar entrada em mercadoria, ver o resumo do dia. Botões grandes, poucas etapas. |
| 💻 **Web** (`apps/web`) | Dono / gestão no computador | As mesmas ações, com mais informação na tela: frente de caixa com carrinho lateral, tabelas, histórico. Depois: relatórios. |
| 🧠 **Núcleo** (`packages/core`) | App e web | As regras ficam escritas uma vez só: preço, estoque, custo médio, troco e lançamentos. App e web calculam igual. |
| ☁️ **Banco na nuvem** (próxima etapa) | App e web | É por ele que app e web "conversam": uma venda feita no celular aparece no web na hora. |

```mermaid
flowchart LR
    App["📱 App<br/>(balcão)"] --> Nucleo
    Web["💻 Web<br/>(gestão)"] --> Nucleo
    Nucleo["🧠 Núcleo compartilhado<br/>estoque · vendas · financeiro"]
    App -. etapa 2 .-> Banco[("☁️ Banco na nuvem<br/>+ login")]
    Web -. etapa 2 .-> Banco
```

> **Hoje** os dados ficam na memória do aparelho/navegador e começam com produtos e vendas **de exemplo**. Ao fechar, volta tudo ao exemplo. Isso muda na etapa 2.

## 2. Mapa de telas

```mermaid
flowchart TD
    Inicio["🏠 Início<br/>resumo do dia"]
    Venda["🛒 Nova venda<br/>escolher produtos"]
    Pagamento["💳 Pagamento<br/>Pix · Crédito · Débito · Dinheiro"]
    VendaOk["✅ Venda registrada<br/>mostra o troco"]
    Entrada["📦 Entrada de produto"]
    EntradaOk["✅ Entrada registrada"]

    Inicio -->|Vender| Venda
    Venda -->|Pagamento →| Pagamento
    Pagamento -->|Confirmar| VendaOk
    VendaOk -->|Nova venda| Venda
    VendaOk -->|Voltar ao início| Inicio

    Inicio -->|Entrada| Entrada
    Inicio -->|"Repor (estoque baixo)"| Entrada
    Entrada -->|Registrar| EntradaOk
    EntradaOk -->|Registrar outra| Entrada
    EntradaOk -->|Voltar ao início| Inicio
```

**Gestão** (abas no app; menu lateral no web):

```mermaid
flowchart TD
    Estoque["📋 Estoque<br/>lista, situação, valor parado"]
    Produto["Produto<br/>histórico · ajustar · editar"]
    Financeiro["💰 Financeiro<br/>saldo, entradas, saídas"]
    NovaMov["Nova movimentação<br/>aluguel, luz, salário..."]
    Relatorios["📊 Relatórios<br/>por dia, hora, produto, categoria"]

    Estoque -->|toca no produto| Produto
    Produto -->|Registrar entrada| EntradaG["📦 Entrada de produto"]
    Financeiro -->|Nova movimentação| NovaMov
```

No **app**, a barra de baixo tem 4 abas: **Início, Estoque, Financeiro e Relatórios**. Vender e dar entrada continuam nos botões grandes do Início.

No **web**, "Nova venda" e "Pagamento" ficam numa tela só (produtos à esquerda, carrinho e pagamento à direita), porque a tela é grande. No **app** são duas telas, para cada uma ter pouca coisa. Na tela de Estoque do web, o produto escolhido abre num painel ao lado da tabela.

## 3. As telas

### 3.1 Início

Mostra, de cara:

- **Vendido hoje**: total do dia, número de vendas e lucro bruto.
- **Quanto entrou em cada forma de pagamento** (Pix, Crédito, Débito, Dinheiro). Ajuda a conferir o caixa e a maquininha.
- **Botões grandes**: Vender e Entrada.
- **⚠️ Estoque baixo**: produtos que chegaram no mínimo definido, cada um com o botão **Repor**, que abre a entrada já com o produto escolhido.
- **Últimas movimentações**: vendas (verde, +) e compras (vermelho, −).

No web aparecem ainda o **ticket médio** e as **compras do dia** com o saldo (vendas − compras).

### 3.2 Entrada de produto (chegou mercadoria)

Três passos na mesma tela:

1. **Qual produto chegou?** Busca um produto já cadastrado, ou cadastra um **produto novo** ali mesmo (nome, categoria, preço de venda e quando avisar estoque baixo).
2. **Como chegou?** **Fardo/caixa** (ex.: fardo com 12 latas) ou **unidade**. Informa quantos e o custo de cada fardo (ou unidade).
3. **Compra:** fornecedor (opcional) e **como foi pago** (Pix, crédito, débito, dinheiro).

Enquanto preenche, o **resumo** mostra: quantas unidades entram, custo por unidade, **margem** sobre o preço de venda e total da compra.

**O que acontece ao registrar:**

- O estoque do produto **sobe** em unidades (4 fardos de 12 = +48 latas).
- O **custo médio** do produto é recalculado (ver regras abaixo).
- Entra uma **despesa** no financeiro, com a forma de pagamento usada.

### 3.3 Nova venda → Pagamento

**Nova venda:** os **mais vendidos** aparecem primeiro; depois busca por nome, filtro por categoria e botão **+** em cada produto. O carrinho não deixa passar do que tem em estoque. A barra de baixo mostra itens e total.

**Pagamento:**

1. Resumo do pedido e **total**.
2. **Como o cliente vai pagar?** Quatro botões grandes: **Pix**, **Crédito**, **Débito**, **Dinheiro**.
3. Cada forma mostra um lembrete:
   - Pix: conferir o Pix no app do banco antes de confirmar.
   - Crédito/Débito: passar na maquininha e confirmar quando aprovar.
   - **Dinheiro:** campo **valor recebido** com atalhos (valor exato e as próximas notas redondas, ex.: total R$ 31 → R$ 35, R$ 40, R$ 50) e o **troco** calculado na hora. Se faltar dinheiro, mostra quanto falta e não deixa confirmar.
4. **Confirmar** → tela de sucesso com o **troco em destaque**.

**O que acontece ao confirmar:**

- O estoque de cada item **baixa**.
- Entra uma **receita** no financeiro, na forma de pagamento escolhida.
- A venda guarda o custo de cada item naquele momento, para o lucro ficar certo mesmo se o custo mudar depois.

### 3.4 Estoque

- **Resumo:** valor parado em estoque (pelo custo), quanto entraria vendendo tudo, unidades e quantos produtos precisam de reposição.
- **Lista** com busca, filtros (**Todos / Precisa repor / Sem estoque**) e categoria. Cada produto mostra estoque, mínimo e a situação: **Em dia**, **Baixo** ou **Sem estoque**.
- **Produto** (tocando na linha):
  - **Histórico:** vendas, entradas e ajustes do produto, do mais recente para o mais antigo.
  - **Ajustar:** corrige o estoque sem venda nem compra:
    - **Perda ou quebra:** garrafa quebrada, vencido, gelo derretido;
    - **Consumo próprio:** uso da casa ou brinde;
    - **Contagem:** contou a prateleira e o número é outro (o estoque passa a ser o contado).
  - **Editar:** nome, categoria, preço de venda e estoque mínimo, mostrando a margem nova. A quantidade só muda por venda, entrada ou ajuste.

### 3.5 Financeiro

- **Período:** Hoje, 7 dias, 30 dias ou Este mês.
- **Saldo** do período (entrou menos saiu), **Entradas**, **Saídas** e **Lucro bruto** com a margem.
- **Recebido por forma de pagamento**, para conferir maquininha, Pix e gaveta.
- **Para onde foi o dinheiro:** saídas por categoria (mercadoria, aluguel, luz/água/internet, funcionários, impostos, manutenção, outras).
- **Perdas** do período (quebras e consumo, pelo custo). Não é saída de caixa, mas é dinheiro que saiu do estoque.
- **Movimentações** (Todas / Entradas / Saídas). As lançadas à mão podem ser excluídas; vendas e compras não, porque mexeram no estoque.
- **Nova movimentação:** saída (aluguel, luz, salário...) ou entrada (outras receitas), com categoria, valor e forma de pagamento.

### 3.6 Relatórios

- **Faturamento, ticket médio, lucro bruto e margem** do período.
- **Vendas por dia:** colunas com o faturamento de cada dia (passe o mouse ou toque para ver o valor e quantas vendas).
- **Horários de pico:** as 3 horas com mais vendas e o gráfico por hora, com as de pico em destaque. Serve para decidir horário de funcionário e quando gelar mais cerveja.
- **Mais vendidos:** quantidade, faturamento e lucro de cada produto.
- **Por categoria** e **por forma de pagamento**, com a fatia de cada uma.

## 4. O que cada ação muda

| Ação | Estoque | Financeiro |
|---|---|---|
| Venda | − quantidade vendida de cada produto | + receita (na forma de pagamento) |
| Entrada de produto | + unidades; recalcula o custo médio | − despesa (na forma de pagamento) |
| Produto novo | cria o produto já com o estoque da 1ª entrada | − despesa da 1ª entrada |
| Ajuste (perda, consumo) | − unidades | não mexe no caixa; aparece como **perda** (pelo custo) |
| Ajuste (contagem) | estoque passa a ser o contado | nada |
| Editar produto | nada (muda nome, preço, mínimo) | nada |
| Nova movimentação | nada | + entrada ou − saída, na categoria escolhida |

## 5. Regras de negócio (já implementadas no núcleo)

- **Dinheiro em centavos.** Todo valor é guardado como número inteiro de centavos (R$ 12,50 = 1250), para não errar arredondamento. O campo aceita "12", "12,5", "1.234,56" ou "R$ 12,50".
- **Não vende o que não tem.** O carrinho para no estoque, e a venda é recusada se o estoque mudou nesse meio-tempo.
- **Custo médio ponderado.** Ex.: 10 latas a R$ 3,00 + chegam 10 a R$ 4,00 → 20 latas a R$ 3,50.
- **Fardo × unidade.** Compra em fardo, vende em unidade: o estoque é sempre contado em unidades.
- **Estoque baixo.** Cada produto tem um mínimo; ao chegar nele (ou abaixo), aparece no alerta.
- **Lucro bruto** = vendas − custo dos produtos vendidos. **Saldo** = tudo que entrou − tudo que saiu no período.
- **Situação do estoque:** zerado = sem estoque; no mínimo ou abaixo = baixo; acima = em dia.
- **Perda** = unidades que saíram por ajuste × custo médio no momento do ajuste.

## 6. Dados guardados

```mermaid
erDiagram
    PRODUTO ||--o{ ITEM_VENDA : "vendido em"
    PRODUTO ||--o{ ENTRADA : "recebe"
    VENDA ||--|{ ITEM_VENDA : tem
    VENDA ||--|{ LANCAMENTO : "gera receita"
    ENTRADA ||--|| LANCAMENTO : "gera despesa"
    PRODUTO ||--o{ AJUSTE : "corrigido por"

    PRODUTO {
        texto nome
        categoria categoria
        centavos precoVenda
        centavos custoMedio
        int estoque
        int estoqueMinimo
    }
    ENTRADA {
        data data
        texto embalagem "fardo ou unidade"
        int unidades
        centavos custoTotal
        texto fornecedor
        forma formaPagamento
    }
    VENDA {
        data data
        centavos total
        centavos custoTotal
        centavos valorRecebido
        centavos troco
    }
    ITEM_VENDA {
        int quantidade
        centavos precoUnitario
        centavos custoUnitario
    }
    LANCAMENTO {
        data data
        texto tipo "receita ou despesa"
        texto origem "venda, compra ou manual"
        texto categoria "vendas, mercadoria, aluguel..."
        centavos valor
        forma formaPagamento
    }
    AJUSTE {
        data data
        texto motivo "perda, consumo ou contagem"
        int quantidadeAntes
        int quantidadeDepois
        centavos custoUnitario
        texto observacao
    }
```

Categorias iniciais: Cervejas, Destilados, Vinhos, Refri e água, Energéticos, Cigarros, Gelo e carvão, Petiscos, Outros.

## 7. Etapas

| Etapa | O que entra | Situação |
|---|---|---|
| **1. Esqueleto** | Telas de Início, Entrada de produto e Venda/Pagamento no app e no web; regras de estoque, custo médio, troco e financeiro | ✅ pronto |
| **1.1 Design** | Visual neutro e sofisticado, ícones de linha, "mais vendidos" na venda. Comparativo com o Cplug em [`ANALISE-CPLUG.md`](ANALISE-CPLUG.md) | ✅ pronto |
| **1.2 Tema escuro e animações** | Preto com detalhes em roxo escuro; animações em JavaScript nos botões, na troca de telas e nos números (contam até o valor) | ✅ pronto |
| **2. Banco na nuvem + login** | App e web passam a ver os mesmos dados em tempo real; login do dono. Sugestão: **Supabase** (banco Postgres, login e tempo real prontos, plano grátis para começar). Já pensar em **funcionar sem internet** | próxima |
| **3. Estoque** | Lista com situação e valor parado, editar produto e preço, ajuste por perda/consumo/contagem, histórico do produto | ✅ pronto (lote e validade ficam para depois) |
| **4. Financeiro e relatórios** | Períodos, saldo, entradas e saídas, despesas da loja, recebido por forma, perdas; relatórios por dia, hora, produto, categoria e forma | ✅ pronto |
| **5. Caixa do dia** | **Abrir/fechar o caixa, sangria e reforço**, conferência do dinheiro da gaveta, taxa da maquininha | |
| **6. Extras** | Leitor de código de barras pela câmera, desconto na venda, pagamento dividido (parte Pix, parte dinheiro — o modelo de venda já aceita), fiado, perfis dono/funcionário, publicar o app nas lojas | |

## 8. Perguntas para decidir antes da etapa 2

1. **Funcionários** vão usar o app? Se sim, o que eles **não** podem ver ou fazer (ex.: ver lucro, dar entrada)?
2. É **uma loja** ou mais de uma?
3. Vende **fiado** / tem cliente com conta?
4. Quer descontar a **taxa da maquininha** automaticamente (ex.: crédito 3%, débito 1,5%) para o lucro ficar real?
5. Vai precisar emitir **nota fiscal** (NFC-e) pelo sistema?
6. Faz sentido o app funcionar **sem internet** e sincronizar depois?
