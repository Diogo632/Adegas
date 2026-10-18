# Pop AI — assistente com IA (Gemini + MCP)

O **Pop AI** é o assistente da adega **Pop**: uma conversa dentro do app (aba **Pop AI**) e do painel (menu **Pop AI**). Você escreve ou **fala** do seu jeito e ele consulta ou registra na plataforma: estoque, entradas, vendas, contas das mesas, financeiro, relatórios e lembretes.

## O que pedir

| Você escreve | O que ele faz |
|---|---|
| "Quanto tem de Skol?" | Mostra o estoque, o mínimo, quanto vendeu em 30 dias e para quantos dias o estoque dá |
| "O que preciso repor?" | Lista o que está abaixo do mínimo ou zerado |
| "Chegaram 3 fardos de Skol por R$ 33 cada" | **Registra a entrada**: soma no estoque, recalcula o custo médio e lança a despesa |
| "Chegou 1 caixa de Heineken 600 a R$ 7 a garrafa" (produto que não existe) | Pergunta categoria e preço de venda e **cadastra o produto** junto com a entrada |
| "Quebrou 2 garrafas de vinho" | **Ajusta o estoque** como perda |
| "Vendi 2 Red Bull no dinheiro, ele me deu 30" | **Registra a venda** e diz o troco |
| "A mesa 10 pediu uma Coca, uma água e uma Skol" | **Lança na conta da mesa 10** (abre a mesa se ainda não estiver aberta); os itens saem do estoque |
| "Tira uma Skol da mesa 10" | **Tira da conta** e devolve ao estoque |
| "Quanto deu a mesa 10?" / "Quanto fica para cada um, em 3?" | Mostra a conta da mesa e quanto dá por pessoa |
| "Fecha a mesa 10 no Pix" / "...no dinheiro, ele deu 100" | **Fecha a conta**: vira venda, entra no financeiro e diz o troco |
| "Quais mesas estão abertas?" | Lista as mesas abertas, o total em aberto e as fechadas hoje |
| "Paguei R$ 289,90 de luz no Pix" | **Lança a despesa** no financeiro |
| "Muda o preço da Brahma para R$ 5,50" | **Edita o produto** |
| "Qual o saldo do mês?" / "Quanto gastei com mercadoria em setembro?" | Busca o financeiro do período |
| "Como foram as vendas na última semana?" / "Qual o horário de pico?" | Busca o relatório de vendas |
| "Me lembre de pagar o boleto da distribuidora sexta às 10h" | **Cria um lembrete** (aparece no Início do app e do painel) |
| "Já paguei o boleto" | Conclui o lembrete |

Quando ele muda alguma coisa, aparece uma etiqueta verde com o que foi feito (ex.: "Registrar entrada · skol") e um atalho para conferir ("Ver estoque →"). Se faltar informação ou o nome servir para mais de um produto, ele pergunta antes de registrar.

## Por áudio

Tudo o que dá para escrever também dá para falar.

- **Gravar:** com o campo de texto vazio, o botão amarelo é um **microfone**. Toque, fale ("a mesa 7 pediu uma Coca e duas Skol") e toque na **seta** para mandar. O **✕** descarta. A gravação para sozinha em 5 minutos.
- **Mandar um arquivo:** o **clipe** 📎 abre os arquivos do aparelho. Serve para o áudio que um fornecedor mandou no WhatsApp (salve o áudio antes), recados gravados no celular, MP3, M4A, WAV, OGG/OPUS, AAC ou FLAC, de até uns 10 minutos.
- **O que acontece:** o Pop AI primeiro **transcreve** o áudio e mostra no seu balão o que entendeu (“Chegaram 2 fardos de Skol por 33 reais cada”). Depois responde e registra como se você tivesse escrito aquilo. Se a transcrição errar um nome ou número importante, ele confirma antes. Se o áudio for um recado de outra pessoa e não estiver claro o que fazer, ele resume e pergunta.
- **Microfone:** na primeira vez, o celular ou o navegador pergunta se pode usar o microfone; toque em **Permitir**. No navegador, o microfone só funciona em endereço seguro (a prévia do GitHub Pages e o `npm run web` servem).

Por baixo: no navegador (painel e app aberto no navegador), a gravação e os arquivos são convertidos para **WAV mono de 16 kHz** antes de ir para o Gemini; no celular, o app grava em WAV (iPhone) ou AAC (Android). A transcrição é um pedido separado ao Gemini, só com o áudio e a instrução de transcrever; a conversa recebe a transcrição marcada como "[Áudio transcrito]". Assim o áudio não fica sendo reenviado a cada mensagem.

## Como ligar (uma vez em cada aparelho)

1. Entre em **https://aistudio.google.com/apikey** com uma conta Google e toque em **Create API key** (Criar chave). Copie a chave (começa com `AIza…`).
2. No app: aba **Pop AI** → ícone de engrenagem → cole a chave → **Salvar**.
   No painel: menu **Pop AI** → **Configurar** → cole a chave → **Salvar**.

A chave fica guardada **só naquele aparelho** (no celular, no cofre do sistema; no navegador, no armazenamento do site). O plano gratuito do Gemini tem limite de uso por minuto e por dia; passando disso, o Google cobra na conta dele.

O modelo padrão é o **`gemini-3.8-flash`**. Se ele não existir para a sua chave, o assistente escolhe sozinho o Flash mais novo disponível. Dá para trocar no campo "Modelo".

## Como funciona

```mermaid
flowchart LR
    Pessoa(["Você<br/>texto ou áudio"]) --> Tela["📱 App / 💻 Painel<br/>tela Pop AI"]
    Tela --> Agente["🤖 Agente"]
    Agente <-->|"pergunta + lista de ferramentas<br/>(API do Gemini)"| Gemini[("Gemini")]
    Agente <-->|"MCP<br/>(listar e chamar ferramentas)"| Servidor["🧰 Servidor MCP da Adegas<br/>24 ferramentas"]
    Servidor --> Dados[("Dados da adega<br/>os mesmos das telas")]
```

0. Se a mensagem é um áudio, o Gemini primeiro só transcreve, e a tela mostra a transcrição.
1. O agente manda para o Gemini a sua mensagem e a lista de ferramentas que o **servidor MCP** da Adegas oferece.
2. O Gemini decide quais ferramentas usar (ex.: `consultar_produto` com "skol").
3. O agente chama a ferramenta **pelo protocolo MCP**, recebe o resultado e devolve ao Gemini.
4. Isso se repete até o Gemini escrever a resposta final.

O servidor MCP usa as mesmas regras do núcleo (`packages/core`) que as telas usam: uma entrada feita pelo assistente é igual a uma feita pela tela de Entrada de produto. No app e no painel, o servidor roda dentro do próprio aparelho e conversa com o agente pela memória.

### Ferramentas do servidor MCP

| Ferramenta | O que faz | Muda dados? | Quem pode |
|---|---|---|---|
| `buscar_produtos` | Lista produtos por nome, categoria e situação | não | Ver estoque |
| `consultar_produto` | Estoque, preço, custo, vendas em 30 dias, duração do estoque, últimas movimentações | não | Ver estoque |
| `resumo_estoque` | Total, valor parado e o que precisa repor | não | Ver estoque |
| `registrar_entrada` | Entrada de mercadoria (fardo ou unidade), com cadastro de produto novo | **sim** | Registrar entrada |
| `ajustar_estoque` | Perda, consumo próprio ou contagem | **sim** | Ajustar estoque |
| `editar_produto` | Nome, categoria, preço de venda, estoque mínimo | **sim** | Ajustar estoque |
| `registrar_venda` | Venda com forma de pagamento e troco | **sim** | Vender |
| `listar_mesas` | Mesas abertas (itens, total, tempo), total em aberto e fechadas hoje | não | Atender mesas |
| `consultar_mesa` | Conta de uma mesa, com divisão por pessoa | não | Atender mesas |
| `abrir_mesa` | Abre a conta de uma mesa | **sim** | Atender mesas |
| `lancar_na_mesa` | Lança pedidos na mesa (abre se precisar); saem do estoque | **sim** | Atender mesas |
| `remover_da_mesa` | Tira um item da conta e devolve ao estoque | **sim** | Corrigir mesas |
| `fechar_mesa` | Fecha a conta com a forma de pagamento (vira venda) | **sim** | Atender mesas |
| `cancelar_mesa` | Cancela a conta; tudo volta ao estoque | **sim** | Corrigir mesas |
| `resumo_do_dia` | Vendas, lucro, despesas e recebido por forma de pagamento de hoje | não | Financeiro |
| `resumo_financeiro` | Entradas, saídas, saldo, lucro, saídas por categoria e perdas de um período | não | Financeiro |
| `listar_lancamentos` | Movimentações do financeiro com filtros | não | Financeiro |
| `registrar_lancamento` | Despesa da loja ou outra entrada de dinheiro | **sim** | Financeiro |
| `excluir_lancamento` | Apaga uma movimentação lançada à mão | **sim** | Financeiro |
| `relatorio_vendas` | Faturamento, ticket, margem, melhores dias, picos, mais vendidos, parados, categorias | não | Financeiro |
| `criar_lembrete` | Lembrete com data e hora (e produto, se houver) | **sim** | todos |
| `listar_lembretes` | Pendentes (e concluídos, se pedir) | não | todos |
| `concluir_lembrete` | Marca como feito | **sim** | todos |
| `excluir_lembrete` | Apaga | **sim** | todos |

Períodos: `hoje`, `7d`, `30d`, `mes` ou datas de início e fim (`AAAA-MM-DD`). Valores em reais.

### Só o que a pessoa logada pode fazer

O assistente trabalha **com as permissões de quem está usando** (veja "Usuários e níveis de acesso" em [`FLUXO.md`](FLUXO.md#39-usuários-e-níveis-de-acesso)):

- O servidor MCP do aparelho é criado **só com as ferramentas permitidas** (coluna "Quem pode" acima). Para a Ana, que não tem Financeiro, o Gemini nem fica sabendo que existem `resumo_financeiro` ou `relatorio_vendas`.
- Sem Financeiro, as respostas sobre produtos **não trazem preço de custo nem margem**.
- O agente diz ao Gemini quem está usando e o que a pessoa pode fazer; se ela pedir algo fora disso, ele explica que precisa de um administrador.
- Tudo o que o assistente registra fica com o **nome de quem estava logado**, igual às telas.
- O administrador usa todas as ferramentas. O servidor do terminal (abaixo) também, porque ali não há login.

## Usar o servidor MCP com outros programas

O mesmo servidor também roda no computador, pelo terminal (transporte stdio), para qualquer cliente MCP: **Gemini CLI**, Claude Desktop, editores de código etc. Nesse modo os dados ficam num arquivo, `~/.adegas/dados.json` (troque com a variável `ADEGAS_DADOS`), começando com os dados de exemplo.

Dentro da pasta do projeto, depois do `npm install`:

```bash
node --import tsx packages/ia/src/node/servidor-stdio.ts
```

**Gemini CLI** (`~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "adegas": {
      "command": "node",
      "args": ["--import", "tsx", "packages/ia/src/node/servidor-stdio.ts"],
      "cwd": "/caminho/para/Adegas"
    }
  }
}
```

**Pop AI no terminal** (usa o Gemini e sobe o servidor MCP como outro processo):

```bash
GEMINI_API_KEY=sua-chave npm run assistente
```

Nele, `/audio caminho/do/arquivo.ogg` manda um áudio (mostra a transcrição e responde).

## Cuidados e limites de hoje

- **Ele registra direto**, sem pedir confirmação, como combinado. Ele avisa o que fez e tudo fica no histórico (movimentações e histórico do produto). Ainda não existe "desfazer" para entradas e vendas: se errar, corrija com um ajuste de estoque.
- **Os dados ainda são de cada aparelho.** Até a etapa do banco na nuvem, o que o assistente registra no celular não aparece no painel de outro computador, e o servidor MCP do terminal usa o arquivo dele.
- **A chave do Gemini fica no aparelho** e a conversa vai direto do aparelho para o Google. Para testar, isso é suficiente. Com o banco na nuvem, o certo é a chamada ao Gemini passar por um servidor nosso, para a chave não ficar nos celulares. O limite por permissão já existe hoje (veja acima).
- Lembretes aparecem no Início, mas **ainda não tocam notificação** no celular.
- **Áudio vai para o Google** como o texto: a gravação é enviada ao Gemini para transcrever e não fica guardada no aparelho.
- Ainda não dá para mandar o áudio **direto do WhatsApp** pelo botão "Compartilhar": isso precisa do app publicado nas lojas (no Expo Go não dá). Por enquanto, salve o áudio e use o clipe 📎.
- Nas prévias abertas dentro do Claude a página não tem acesso à internet, então lá o assistente mostra um aviso e não conversa. Ele funciona na prévia do GitHub Pages, no `npm run web` / `npm run app` e no Expo Go.

## Onde está no código

```
packages/ia/src/
  ferramentas.ts   as 24 ferramentas (esquemas zod + o que cada uma faz)
  servidor.ts      servidor MCP (@modelcontextprotocol/server)
  local.ts         liga cliente e servidor MCP pela memória (app e painel)
  gemini.ts        chamada à API do Gemini (REST, sem SDK) e conversão dos esquemas
  agente.ts        o agente: conversa, transcreve áudio, chama ferramentas, guarda o histórico
  audio.ts         formatos de áudio aceitos, WAV e base64 (código puro)
  audio-navegador.ts  gravação e conversão para WAV no navegador
  react.ts         useAssistente() (enviar e enviarAudio), usado pelas telas
  node/            servidor stdio, arquivo de dados e assistente de terminal
apps/web/src/paginas/Assistente.tsx
apps/mobile/src/app/(abas)/assistente.tsx
apps/mobile/src/gravador.ts       gravação no celular (expo-audio) e escolha de arquivo
apps/mobile/src/gravador.web.ts   o mesmo na versão web do app
```
