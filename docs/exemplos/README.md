# Kit de teste da entrada pela nota

Notas fiscais **fictícias**, só para testar o sistema. Não valem como nota: os DANFEs têm a marca "SEM VALOR FISCAL", os CNPJs são inválidos de propósito e os códigos das caixas da nota 4521 são de uso interno (começam com 2).

| Arquivo | O que é |
|---|---|
| [`danfe-nota-12345.pdf`](danfe-nota-12345.pdf) / [`.png`](danfe-nota-12345.png) | DANFE da nota 12345 (Distribuidora Central): Skol, Água e Gin. Total R$ 378,90 |
| [`nota-exemplo.xml`](nota-exemplo.xml) | XML da nota 12345 |
| [`codigo-da-nota.png`](codigo-da-nota.png), [`codigo-skol-caixa.png`](codigo-skol-caixa.png) | Código da nota 12345 e da caixa da Skol, soltos |
| [`danfe-nota-4521.pdf`](danfe-nota-4521.pdf) / [`.png`](danfe-nota-4521.png) | DANFE da nota 4521 (Bebidas Boa Vista): Heineken, Coca-Cola, Red Bull, Carvão, Amendoim e a cerveja Petra (produto novo). Total R$ 565,40 |
| [`nota-exemplo-2.xml`](nota-exemplo-2.xml) | XML da nota 4521 |
| [`etiquetas-nota-4521.png`](etiquetas-nota-4521.png) | Códigos de barras das 6 caixas da nota 4521, para a conferência |

## Como testar

1. Abra o DANFE (o PDF ou a imagem) na tela do computador ou imprima.
2. No sistema, vá em **Entrada → Chegou com nota fiscal?**
   - **App:** a câmera já abre. Aponte para o código de barras do DANFE, bem de perto, até ele ocupar a largura da mira.
   - **Painel:** clique em **Celular como leitor**, leia o QR Code com o celular e bipe o DANFE com ele. Ou use **Câmera deste aparelho**.
3. Aparece "Nota 4521 de 45.678.901/0001-00 lida". Mande o XML da mesma nota (**XML, foto ou PDF** no painel, **XML ou PDF** no app).
   - Para testar a leitura pela foto, mande a imagem do DANFE: o Pop AI lê os produtos (precisa da chave do Gemini).
4. Bipe as etiquetas das caixas: cada produto fica marcado como conferido.
5. Na Petra (produto novo), coloque o preço de venda e clique em **Dar entrada**.

| Nota | Entram | Total |
|---|---|---|
| 12345 | 39 unidades (2 cx Skol, 1 fd Água, 3 Gin) | R$ 378,90 |
| 4521 | 109 unidades (24 Heineken, 12 Coca, 24 Red Bull, 5 Carvão, 20 Amendoim, 24 Petra) | R$ 565,40 |

A mesma nota não entra duas vezes. Para repetir o teste, use a outra nota ou recarregue a página: por enquanto os dados ficam só na memória e voltam aos de exemplo.
