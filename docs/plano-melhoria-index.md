# Plano de melhoria — index.html (Aurora)

Este plano organiza o feedback recebido em um roteiro executável para a `index.html`. A ideia central é reduzir a sensação de "documentação técnica longa" e reforçar a sensação de "produto/toolkit premium", usando um sistema de fundo em camadas, mais narrativa entre seções, um encerramento visual forte antes do footer — e, na atualização deste documento, cortando conteúdo pesado da home para páginas dedicadas, mantendo a home como uma vitrine curta e a experiência completa em páginas próprias.

## Estrutura atual (mapeada no arquivo)

Para referência, estas são as seções reais hoje, na ordem em que aparecem, com seus `id` e `eyebrow`:

1. `#top` — Hero (mantém como está)
2. `#playground` — "Interactive Demo" (Live Text Playground)
3. `#effects` — "Animation Catalog" (All 20+ Effects)
4. `#modules` — "Plugin Modules" (Six Modules)
5. `#morph-card` — "Exclusive Elementor Widget" (Morph Card)
6. `#image-effects` — "Module 06 — Image Effects"
7. `#gradient-spotlight` — "Module 03 — Gradient & Spotlight"
8. `#glassmorphism` — "Module 04 — Glassmorphism"
9. `#elementor-panel` — "Native Editor Experience"
10. `#deep-dive` — "Deep Feature Showcase" (Engineered Text Motion)
11. `#editions` — "Distribution Roadmap" (Free vs Pro)
12. `#how-it-works` — "Architecture"
13. `.cta-section` (sem id) — CTA final, antes do footer
14. `.footer`

Ou seja, a estrutura que você descreveu no feedback já bate com o código — não é preciso "descobrir" nada, só reorganizar, redesenhar e inserir seções novas nos pontos certos.

## Cortes estratégicos: o que sai da home e vira página própria

Hoje a `index.html` tem 88 efeitos cadastrados em `ALL_EFFECTS` (confirmado no código, não é só estimativa) e mais 4 seções inteiras dedicadas a detalhar módulos individuais (`#morph-card`, `#image-effects`, `#gradient-spotlight`, `#glassmorphism`), além de duas seções de conteúdo mais técnico/institucional (`#deep-dive` "Engineered Motion" e `#how-it-works` "Architecture"). Isso é o grosso do "peso" da página. A lógica de corte que sugiro é: **a home vende a ideia e mostra o suficiente para convencer; as páginas dedicadas provam em profundidade para quem já está convencido e quer ver tudo.**

Cortes propostos, além do catálogo de efeitos que você já pediu:

**1. Catálogo de efeitos (88 → 8-10 na home)** — exatamente o que você pediu. A home mostra uma seleção curada, a nova página `/efeitos` (ou `/showcase`) recebe o catálogo completo com os filtros por categoria (`All · Reveal · Split · Glitch · Wave · Type · Creative`) que já estavam planejados no Bloco 4. Critério de curadoria sugerido para os 8-10 da home: misturar GSAP e Anime.js, cobrir pelo menos 4-5 categorias diferentes (não só "reveal"), e priorizar os efeitos com maior impacto visual em still-frame (pensando em quem só vê a home rolando rápido, sem parar pra interagir).

**2. Seções individuais de módulo (`#morph-card`, `#image-effects`, `#gradient-spotlight`, `#glassmorphism`) → página(s) de módulos** — hoje cada uma é uma seção completa própria na home (4 seções inteiras). Proposta: a home mantém só `#modules` como uma vitrine compacta dos 6 módulos (cards com preview, sem o detalhamento extenso), e cada card linka para o detalhe completo em uma página `/modulos` (com âncoras por módulo, tipo `/modulos#morph-card`) ou, se fizer sentido para SEO/compartilhamento, uma página por módulo. Isso sozinho já remove 4 seções pesadas do fluxo principal da home.

**3. `#deep-dive` "Engineered Motion" e `#how-it-works` "Architecture" → página de documentação/tecnologia** — são as duas seções mais "para quem já decidiu comprar" ou "para devs avaliando arquitetura", não para convencer um visitante novo. Sugiro tirar as duas da home e juntar numa página tipo `/como-funciona` ou dentro da futura página de documentação. Se ainda fizer sentido manter algum sinal disso na home, um bloco bem curto tipo "Built with GSAP & Anime.js — see how it works →" resolve, sem precisar da seção inteira.

**4. `#editions` (Free vs Pro) — mantém na home, mas enxuta** — diferente dos itens acima, essa seção tem função de conversão direta (o visitante decide comprar ali), então não deveria virar página separada — isso adicionaria fricção no meio do funil. Sugiro só simplificar visualmente (like já estava no plano original) em vez de cortar.

**5. Live Text Playground (`#playground`) — mantém, mas considerar uma versão "completa" separada** — o playground interativo é um forte argumento de venda por si só (deixa o visitante experimentar). Sugiro manter uma versão enxuta na home (menos controles visíveis, texto de exemplo já preenchido) e, se fizer sentido, um link "Abrir playground completo" para uma versão com todos os controles em `/playground` ou dentro de `/efeitos`. Isso é opcional — diferente dos cortes 1-3, não é urgente, é mais "nice to have" caso o playground atual já pareça denso.

Com os cortes 1-3 aplicados, a home cai de **14 seções** (contando as 4 de módulo individual) para cerca de **9-10 seções**, e o scroll total encolhe bastante mesmo sem remover nenhuma seção de conversão (elementor, editions, CTAs).

## Novo mapa do site

```
/ (HOME — enxuta)
  HERO (#top)                            — mantém
  INTRO CURTA (nova)                     — "Everything you need to create motion."
  PLAYGROUND (#playground)               — versão enxuta
  EFFECTS PREVIEW (#effects, 8-10)       — curadoria + "Ver todos os 88 efeitos →"
  SIX MODULES (#modules, overview)       — cards-resumo, cada um linkando pro detalhe
  BUILT FOR ELEMENTOR (#elementor-panel) — mantém, reforça copy
  WHY AURORA? (nova)                     — 4 argumentos objetivos
  FREE vs PRO (#editions)                — enxuta, mantém na home
  BIG CTA (.cta-section)                 — reforça copy + fundo com glow
  AURORA CTA SECTION (nova)              — só aurora-cta.webp, sem canvas
  FOOTER (simplificado)                  — fundo sólido, sem imagem/efeito

/efeitos (NOVA)
  Catálogo completo (88 efeitos) + filtros por categoria
  (herda o conteúdo que hoje está em #effects)

/modulos (NOVA — ou uma página por módulo)
  Detalhe completo de cada um dos 6 módulos
  (herda o conteúdo que hoje está em #morph-card, #image-effects,
   #gradient-spotlight, #glassmorphism, + os outros 2 módulos que
   hoje só aparecem resumidos em #modules)

/como-funciona (NOVA, opcional)
  Engineered Motion + Architecture
  (herda o conteúdo que hoje está em #deep-dive e #how-it-works)
```

A mudança mais importante de fluxo é: a home passa a ser uma vitrine curta e objetiva, e todo o conteúdo "de prova" (catálogo completo, detalhe de módulos, arquitetura técnica) migra para páginas próprias — sem perder nada do conteúdo já escrito, só reorganizando onde ele vive.

## Sistema de fundo em camadas

Hoje quase todas as seções usam o mesmo tom escuro (`--c-night`), o que nivela tudo e contribui para a sensação de lista comprida. Proposta de 3 níveis, aplicados via uma nova variável CSS por seção (`data-bg-level="1|2|3"` ou classes utilitárias):

- **Nível 1 — Normal**: fundo atual (`--c-night`, praticamente preto). Usado nas seções de conteúdo denso: playground, effects, modules, feature showcase.
- **Nível 2 — Destaque**: um azul ligeiramente mais claro (`#080B18` como sugerido), usado para marcar transições importantes: "Why Aurora?", "Built for Elementor", "Free vs Pro".
- **Nível 3 — Especial**: gradientes sutis com tons verde/azul/violeta em baixa opacidade (reaproveitando a paleta já usada no canvas aurora), usado em "Engineered Motion" e no CTA final antes da seção de imagem.

Isso não exige nenhuma rearquitetura grande — dá para implementar com 2–3 classes CSS novas e aplicá-las seção a seção.

## Detalhamento por seção

### 1. Intro curta (nova, entre hero e playground)
Um bloco leve, só título + parágrafo curto ("Everything you need to create motion." + 1 linha de apoio), sem cards. Função: fazer a transição da hero para o "modo produto", preparando o usuário para entender que o que vem a seguir é um ecossistema, não demos soltas. Prioridade: média. Esforço: baixo (HTML/CSS simples, sem JS).

### 2. `#effects` — 20+ Text Animations
Reforçar como "peça de produto": número grande (20+) com tipografia editorial, subtítulo forte, e adicionar filtros por categoria acima da grade (`All · Reveal · Split · Glitch · Wave · Type · Creative`). Os filtros podem reutilizar o array `ALL_EFFECTS` já existente no JS (tem campo `tags`), então é viável tecnicamente sem reescrever o catálogo — só adicionar os botões de filtro e uma função que filtra `buildGrid()` por tag. Prioridade: alta (é uma das seções mais fortes do produto, mas hoje sub-explorada). Esforço: médio.

### 3. `#modules` — Six Creative Modules
Reformular para navegação lateral + preview: lista vertical dos 6 módulos à esquerda, painel de preview à direita que troca conforme hover/click no item da lista (reaproveitando visuais que já existem nas seções de módulo individuais, como thumbnails ou trechos de animação). Prioridade: alta (é a seção com maior potencial de virar "peça central", como você apontou). Esforço: alto (requer JS novo para troca de preview e reorganização de layout — candidato a ser feito em uma etapa própria).

### 4. Feature Showcase (morph-card, image-effects, gradient-spotlight, glassmorphism)
Não precisa reescrever o conteúdo de cada seção — a mudança é de moldura: adicionar numeração editorial (01/02/03/04) no eyebrow de cada uma, unificar o nível de fundo (nível 1, sem variação entre elas) para que se leiam como um único bloco de 4 partes, e reduzir o espaçamento vertical entre elas comparado ao restante da página. Prioridade: média. Esforço: baixo/médio (majoritariamente CSS).

### 5. `#elementor-panel` — Built for Elementor
Reforçar a mensagem comercial direta ("Designed for Elementor. No custom code. No complicated setup.") no eyebrow/título, já que o conteúdo visual (painel do editor) já existe. Prioridade: alta (baixo esforço, alto valor de conversão). Esforço: baixo.

### 6. Why Aurora? (nova, depois de `#elementor-panel`)
Quatro blocos numerados (01–04): Visual-first, Performance-minded, Built for Elementor, One toolkit — cada um com 1 frase de apoio. Fundo nível 2. Prioridade: alta. Esforço: baixo (HTML/CSS, sem JS).

### 7. `#deep-dive` — Engineered Motion
Mantém o conteúdo, aplica fundo nível 3 (gradiente sutil) para diferenciar da seção anterior. Prioridade: baixa. Esforço: baixo.

### 8. `#editions` — Free vs Pro
Simplificar visualmente para duas colunas bem diferenciadas (Free / Pro) com o Pro destacado (borda com gradiente, ou fundo levemente elevado), em vez de tabela extensa. Prioridade: média (impacta conversão, mas exige revisar conteúdo/copy atual, não só estilo). Esforço: médio.

### 9. `.cta-section` — Big CTA
Reforçar copy ("Your Elementor site doesn't have to look ordinary. Add motion. Add depth. Add Aurora.") e aplicar fundo nível 3 com glow, para funcionar como o clímax antes da seção de imagem final. Prioridade: média. Esforço: baixo.

## Especificação técnica: seção "Aurora CTA" + footer simplificado

Esta é a parte com instrução mais concreta e fechada, então já deixo especificada em detalhe para implementação direta:

**Nova seção (`.aurora-cta-section`)**, inserida entre `.cta-section` e `<footer class="footer">`:

- Ocupa a largura total, com altura generosa (algo como `min-height: 70svh` ou um valor fixo em `rem`, a ajustar visualmente).
- Fundo: **apenas** `assets/branding/aurora-cta.webp` via `background-image` + `background-size: cover` + `background-position: center`, com um leve overlay escuro (`::before` com gradiente `rgba(0,0,0,.2)→rgba(0,0,0,.75)` na parte inferior) para garantir legibilidade de texto por cima.
- **Sem** o canvas de aurora (`data-aurora-ribbons`) — diferente do que foi feito na hero e no footer atual. Ou seja, esta seção usa só a imagem estática, sem `initAuroraRibbons`.
- Conteúdo centralizado sobreposto: reaproveita o padrão de CTA já usado no site (eyebrow + título + subtítulo + botão "Get Aurora"), com algo como "Enter the Aurora" / "Bring your site to life." (o texto exato pode ser ajustado quando formos escrever a versão final).

**Footer simplificado (`.footer`)**:

- Reverte a mudança recente de background-image: volta a ser só `background-color: var(--c-night)` (ou uma cor levemente mais escura, tipo `#03050D` como você sugeriu), sem `background-image` e sem o canvas `data-aurora-ribbons` que adicionamos na última tarefa.
- Mantém a estrutura de conteúdo atual (logo + tagline, colunas Product/Resources/Community, linha de copyright) — só remove a camada visual, já que agora quem "assina" visualmente o encerramento da página é a nova seção `.aurora-cta-section` logo acima.
- Isso significa desfazer parte do trabalho que fizemos na tarefa anterior (o canvas aurora no footer sai; a imagem `aurora-footer.webp` deixa de ser usada no footer). Vale confirmar: `aurora-footer.webp` fica sem uso nessa nova proposta, a menos que você queira reaproveitá-la em outro lugar — posso manter o arquivo no projeto sem referenciá-lo, sem problema.

## Roadmap de execução sugerido

Dado o volume de mudanças, sugiro dividir a implementação em blocos, cada um committável de forma independente. Reordenei os blocos para priorizar os cortes de conteúdo (o que mais reduz o peso da home) antes dos retoques visuais finos:

**Bloco 1 (imediato, mais barato e visível)** — a parte que você já deixou bem definida:
reverter o footer para fundo sólido simples, remover o canvas aurora dele, e criar a nova seção `.aurora-cta-section` com `aurora-cta.webp` entre o CTA final e o footer.

**Bloco 2 — criar `/efeitos`** — extrair o catálogo completo (88 efeitos) de `#effects` para uma página própria, com os filtros por categoria. Na home, `#effects` passa a mostrar só 8-10 efeitos curados + link "Ver todos os 88 efeitos".

**Bloco 3 — criar `/modulos`** — extrair `#morph-card`, `#image-effects`, `#gradient-spotlight`, `#glassmorphism` (e detalhar os outros 2 módulos que hoje só aparecem resumidos) para uma página própria. Na home, `#modules` vira só uma vitrine compacta linkando pra lá.

**Bloco 4 — criar `/como-funciona` (opcional)** — extrair `#deep-dive` e `#how-it-works` para uma página técnica/institucional própria, tirando as duas da home.

**Bloco 5** — sistema de fundo em camadas (3 níveis) aplicado às seções que restaram na home, sem alterar conteúdo.

**Bloco 6** — seções novas de conteúdo na home: Intro curta (pós-hero) e "Why Aurora?".

**Bloco 7** — ajustes de copy/layout em `#elementor-panel`, `#editions` (agora mais enxuta) e `.cta-section`.

Cada bloco pode virar uma tarefa própria numa próxima conversa/sessão, testado com Playwright antes do commit, do mesmo jeito que fizemos nas correções anteriores. Os Blocos 2-4 são os que dependem de decisão sua sobre nomes de URL/arquivo (`efeitos.html`, `modulos.html`, `como-funciona.html`, ou outra convenção que você prefira) e sobre navegação (adicionar esses links no menu do topo e no footer).

---

Se você aprovar esse plano (ou pedir ajustes de prioridade/escopo, ou trocar os nomes/URLs das páginas novas), começo pelo Bloco 1, que já está fechado, e sigo pro Bloco 2 (`/efeitos`), que é o corte que você pediu diretamente.
