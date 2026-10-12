# Análise: Cplug × Adegas

Comparação com o **Cplug** (ConnectPlug), um dos sistemas mais usados hoje por adegas, para decidir o que copiar, o que evitar e onde está o nosso diferencial.

> **Como foi feita:** pelas páginas públicas do Cplug (site, planos, página de adegas), pelo manual oficial e por avaliações públicas (Reclame Aqui e App Store), via busca na internet. Não deu para abrir o site nem o app do Cplug direto daqui, então **não comparei o visual tela a tela**. A comparação de telas é pelo que o manual descreve. Valores e números são de outubro/2026 e podem mudar.

## 1. Quem é o Cplug

- Marca da **ConnectPlug**, fundada em 2015 em Curitiba e comprada pela **Locaweb (LWSA)** em 2021.
- Sistema **generalista**: restaurantes, bares, varejo, franquias e redes com várias lojas. Adega é um dos segmentos.
- Preço: planos de varejo **a partir de R$ 199 a R$ 249/mês** (as páginas divergem). TEF e alguns módulos são cobrados à parte.

## 2. Funcionalidades: Cplug × nós

| Funcionalidade | Cplug | Adegas hoje | Quando |
|---|---|---|---|
| Frente de caixa (Windows, Android, iOS) | ✅ | ✅ app + web | — |
| Busca por nome e categoria | ✅ | ✅ | — |
| Favoritos / mais vendidos na tela de venda | ✅ favoritos manuais | ✅ **mais vendidos automático** (nesta versão) | — |
| Pix, crédito, débito, dinheiro com troco | ✅ (+ voucher) | ✅ | — |
| Entrada de mercadoria | ✅ importando o XML da nota | ✅ manual, em fardo ou unidade, com custo médio | XML: futuro |
| Baixa de estoque automática e alerta de mínimo | ✅ | ✅ + ajuste por perda, consumo e contagem | — |
| Lote e validade | ✅ | ❌ | depois |
| Rótulo, safra e origem (vinhos) | ✅ | ❌ | só se fizer sentido |
| Abrir/fechar caixa, sangria e reforço | ✅ | ❌ | **etapa 5 (prioridade)** |
| Desconto e cupom na venda | ✅ | ❌ | etapa 5 |
| Leitor de código de barras pela câmera | ✅ bipagem contínua | ❌ | etapa 5 |
| TEF (valor vai sozinho para a maquininha) | ✅ pago à parte | ❌ | futuro |
| NFC-e / NF-e | ✅ | ❌ | depende da resposta à pergunta 5 do fluxo |
| Funciona sem internet | ✅ no PDV; no app está "previsto" | ❌ | decidir na etapa 2 |
| Catálogo no WhatsApp, delivery | ✅ | ❌ | futuro |
| Relatórios / BI | ✅ | ✅ por dia, hora, produto, categoria e forma | — |
| Várias lojas | ✅ | ❌ | pergunta 2 do fluxo |

**Ações rápidas do app do Cplug (PDV Pro):** cliente, desconto, sangria, reforço, vendedor e cupom, acessíveis da tela de venda. É uma boa ideia de organização: as ações secundárias ficam num lugar só e não poluem a tela.

## 3. O que os usuários reclamam

Fontes públicas, amostra pequena (quem reclama tende a ser quem teve problema):

- **Reclame Aqui:** 50 reclamações, 87,9% resolvidas, mas **tempo médio de resposta de ~17 dias**.
- **Suporte:** fila no chat, demora.
- **Implantação:** "não funcionou como foi vendido", tentativas de implantação que falharam e **multa para cancelar**.
- **Atualizações:** bugs depois de atualizar; o app *Gestão CPlug* tem **nota 3,0** na App Store (16 avaliações), com relato de não ver as vendas das lojas após uma atualização.
- **Estoque:** relato de controle de estoque não confiável depois de 3 anos de uso.
- **Complexidade:** recursos precisam ser ligados em menus de configuração (ex.: sangria fica em *Engrenagem › Configurações do PDV › Geral*).

Os depoimentos positivos (no site do próprio Cplug) elogiam a facilidade do PDV e o suporte.

## 4. Leitura

1. **O Cplug é completo, mas é feito para todo mundo.** Restaurante, franquia, varejo... Isso traz muitas telas, módulos e configurações. A página de adegas fala de rótulo, safra, origem e nota para restaurantes, o que é o perfil de **adega de vinhos/importadora**.
2. **A adega de bairro é outra coisa:** cerveja gelada, gelo, carvão, cigarro, energético, venda rápida à noite, muito Pix e dinheiro, compra em fardo. Ninguém está desenhando para ela.
3. **As reclamações não são de falta de recurso**, são de suporte, implantação e confiança. Um sistema simples, que funciona no primeiro dia sem implantação, já se diferencia.

## 5. Nosso posicionamento

- **Feito para a adega de bairro**, não para todo tipo de comércio.
- **App primeiro**: o dono e o balconista usam o celular; o web é para olhar com calma.
- **Funciona no primeiro dia**: cadastra o produto na própria entrada de mercadoria, sem planilha nem implantação.
- **Sem menu escondido**: o que a adega usa todo dia está a no máximo 2 toques.
- **Estoque confiável**: toda venda e toda entrada mexem no estoque e no caixa pelas mesmas regras, no app e no web.

## 6. O que adotar e o que evitar

**Adotar (em ordem):**
1. *Mais vendidos* no topo da tela de venda — **feito nesta versão**.
2. **Caixa do dia**: abrir com troco inicial, sangria/reforço, fechar conferindo dinheiro, Pix e cartão. Puxar para a etapa 4.
3. **Ações rápidas** na venda (desconto, cliente, sangria) num único botão "Mais", em vez de vários botões na tela.
4. **Código de barras pela câmera** com bipagem contínua.
5. **Offline com sincronização**: adega vende à noite e a internet cai; decidir já na arquitetura da etapa 2.

**Evitar:**
- Configurações escondidas em menus para liberar o básico.
- Mesas, comandas, KDS e outros módulos de restaurante no menu principal.
- Contrato com multa e implantação: o produto precisa se explicar sozinho.

## 7. Direção de design

> **Atualização:** a pedido, o visual passou para **tema escuro** (preto, com detalhes em roxo escuro) e ganhou **animações** em JavaScript: botões que afundam e soltam uma onda de luz ao toque, telas que entram em cascata e números que contam até o valor. A tabela abaixo registra a primeira versão clara.

### Primeira versão (clara)

O pedido foi **simples e sofisticado**. Na prática:

| Antes | Agora |
|---|---|
| Vinho forte em tudo (topo, cartões, botões) | Base neutra (off-white e grafite); o **vinho só na ação principal** |
| Emojis como ícones | **Ícones de linha** (Lucide), iguais no app e no web |
| Uma cor para cada forma de pagamento | As 4 formas com o **mesmo peso visual** (ícone + nome); a escolhida fica preenchida |
| Fonte padrão do sistema | **Fraunces** (serifa) nos títulos, **Inter** no resto e nos números |
| Cartão de resumo vinho | Cartão **grafite** com o número do dia em destaque |
| Bordas e sombras variadas | Bordas finas, cantos arredondados iguais, mais espaço em branco |

## Fontes

- [Sistema para Adegas — CPlug](https://www.cplug.com.br/segmento/adegas) · [CPlug para adegas (varejo)](https://www.cplug.com.br/varejo/adegas) · [Landing page adega](https://www.cplug.com.br/lp/sistema-para-adega)
- [PDV CPlug](https://www.cplug.com.br/funcionalidades/pdv) · [Integração TEF](https://www.cplug.com.br/funcionalidades/integracao-tef) · [Gestão de estoque](https://www.cplug.com.br/funcionalidades/gestao-estoque) · [Planos varejo](https://www.cplug.com.br/planos-varejo) · [Varejo](https://www.cplug.com.br/varejo)
- [Manual — PDV Pro, visão geral do app](https://manual.cplug.com.br/books/pdv-pro/page/pdv-pro---vis%C3%A3o-geral-do-app/export/pdf) · [Manual — Balcão](https://manual.cplug.com.br/books/balc%C3%A3o/page/balc%C3%A3o---geral) · [Manual — Sangria/Reforço](https://manual.cplug.com.br/books/sangria-refor%C3%A7o-de-caixa/export/html) · [Manual — Fechamento de caixa](https://manual.cplug.com.br/books/fechamento-de-caixa/page/fechamento-de-caixa/export/html)
- [CPlug PDV PRO (ficha do app)](https://mwm.ai/apps/cplug-pdv-pro/6756498897) · [Gestão CPlug — App Store](https://apps.apple.com/br/app/gest%C3%A3o-cplug/id1497942934)
- [ConnectPlug no Reclame Aqui](https://www.reclameaqui.com.br/empresa/connect-plug/) · [Reclamação: sistema com problemas](https://www.reclameaqui.com.br/connect-plug/pdv-cplug-sistema-com-problemas-nao-adquiram_KslGueMRDrFWPkT5/) · [Reclamação: atendimento](https://www.reclameaqui.com.br/connect-plug/preco-de-sistemas-de-alto-nivel-mas-atendimento-e-servico-de-sistemas-gratuitos-fujam_oc5TVxjaZEFtysBK/) · [Reclamação: estoque](https://www.reclameaqui.com.br/connect-plug/fui-editado-pelo-reclame-aqui_oJIlEYRzyjdX6cg0/)
- [Locaweb compra a ConnectPlug (Mercado & Consumo)](https://mercadoeconsumo.com.br/27/01/2021/destaque-do-dia/na-5a-operacao-desde-a-abertura-de-capital-locaweb-compra-a-connectplug/amp/) · [Comparativo B2B Stack](https://www.b2bstack.com.br/product/connectplug)
