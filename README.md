# Text Animations for Elementor

> Plugin WordPress que adiciona **animações de texto avançadas** (GSAP + Anime.js) e **animação staggered de elementos filhos** à aba **Avançado** do Elementor — sem código, direto no painel.

---

## ✨ Funcionalidades

### 🔤 Módulo 1 — Animação de Texto

Disponível em **qualquer widget** do Elementor (Heading, Text Editor, Button etc.) via **Avançado → ✨ Animação de Texto (PTA)**.

Divide o conteúdo textual automaticamente em **letras**, **palavras** ou **linhas** e aplica uma das 20 animações disponíveis, disparadas no scroll ou ao carregar a página.

| # | Biblioteca | Nome | Efeito |
|---|-----------|------|--------|
| gs-1 | GSAP | Fade Up | Letras sobem com fade |
| gs-2 | GSAP | Clip Reveal | Surge de baixo, mascarado |
| gs-3 | GSAP | Scramble Text | Embaralha → revela o texto final |
| gs-4 | GSAP | Elastic Bounce | Quica com ease elástico |
| gs-5 | GSAP | 3D Flip | Rotação Y em perspectiva 3D |
| gs-6 | GSAP | Slide In | Desliza da esquerda |
| gs-7 | GSAP | Scale Up | Cresce do zero |
| gs-8 | GSAP | Wave | Deslocamento Y senoidal |
| gs-9 | GSAP | Bounce Drop | Cai de cima com bounce |
| gs-10 | GSAP | Glitch | Sacudida digital + estabiliza |
| ml-1 | Anime.js | Float Up | Sobe suavemente com easeOutExpo |
| ml-2 | Anime.js | Scale In | Escala de 0.2 → 1 com back ease |
| ml-3 | Anime.js | Drop Down | Cai de cima com easeOutExpo |
| ml-4 | Anime.js | Slide From Right | Desliza da direita |
| ml-5 | Anime.js | Wave | Onda senoidal por índice |
| ml-6 | Anime.js | Flip X | Giro em 3D no eixo X |
| ml-7 | Anime.js | Typewriter | Datilografia, letra por letra |
| ml-8 | Anime.js | Blur Reveal | Desfoca → nítido |
| ml-9 | Anime.js | Skew In | Inclina + fade |
| ml-10 | Anime.js | Explosion | Escala grande → normal |

**Controles disponíveis por animação:**
- Biblioteca (GSAP / Anime.js)
- Tipo de animação
- Dividir por (Letras / Palavras / Linhas)
- Duração (ms)
- Delay inicial (ms)
- Delay entre unidades — stagger (ms)
- Disparar ao: scroll ou carregamento
- Threshold de visibilidade (%)
- Repetir ao re-entrar na viewport

---

### 🎬 Módulo 2 — Animar Elementos Filhos

Disponível em **Sections, Columns, Containers e Widgets** via **Avançado → 🎬 Animar Elementos Filhos (PTA)**.

Aplica uma animação de entrada em cascata (stagger) a cada elemento filho, um após o outro, com delay configurável.

**Animações disponíveis:**
| Nome | Efeito |
|------|--------|
| Fade Up | Sobe com fade (padrão) |
| Fade Down | Desce com fade |
| Fade In | Apenas opacidade |
| Slide Esquerda | Desliza da esquerda |
| Slide Direita | Desliza da direita |
| Zoom In | Cresce de 65% → 100% |
| Zoom Out | Encolhe de 135% → 100% |
| Flip Up | Rotação 3D no eixo X |
| Rotate In | Rotação Z + scale |
| Bounce In | Sobe com ease elástico |

**Controles disponíveis:**
- Tipo de animação
- Seletor CSS dos filhos (personalizável)
- Duração por filho (ms)
- Delay inicial (ms)
- Delay entre filhos — stagger (ms)
- Disparar ao: scroll ou carregamento
- Threshold de visibilidade (%)
- Repetir ao re-entrar na viewport

---

## 📦 Instalação

### Via upload de arquivo ZIP

1. Baixe o repositório como `.zip`
2. No painel WordPress, vá em **Plugins → Adicionar Novo → Enviar Plugin**
3. Selecione o `.zip` e clique em **Instalar Agora**
4. Ative o plugin

### Via FTP / arquivo

1. Clone este repositório dentro de `wp-content/plugins/`:

```bash
git clone https://github.com/seu-usuario/plugin-text-animations.git \
  wp-content/plugins/plugin-text-animations
```

2. Ative o plugin no painel WordPress

---

## 🔧 Requisitos

| Requisito | Versão mínima |
|-----------|--------------|
| WordPress | 5.9+ |
| PHP | 7.4+ |
| Elementor | 3.0+ |
| Elementor Pro | Não obrigatório |

As bibliotecas de animação são carregadas automaticamente via CDN (sem necessidade de instalação extra):
- **GSAP 3.12** — [cdnjs.cloudflare.com](https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js)
- **Anime.js 3.2** — [cdnjs.cloudflare.com](https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js)

---

## 🗂️ Estrutura do Projeto

```
plugin-text-animations/
├── plugin-text-animations.php              ← Bootstrap principal
├── includes/
│   ├── class-plugin-core.php               ← Singleton: carrega módulos e assets
│   ├── class-text-animation-controls.php   ← Controles de animação de texto
│   └── class-children-animation-controls.php ← Controles de animação de filhos
├── assets/
│   ├── js/
│   │   ├── text-animations.js              ← 20 animações (GSAP + Anime.js)
│   │   └── children-animations.js          ← Stagger de filhos (GSAP)
│   └── css/
│       └── text-animations.css             ← Estilos base e helpers
├── LICENSE
└── README.md
```

---

## 🛠️ Como funciona internamente

1. **PHP registra controles** na aba Avançado do Elementor via hooks:
   - `elementor/element/common/section_effects/after_section_end`
   - `elementor/element/section/section_effects/after_section_end`
   - `elementor/element/container/section_effects/after_section_end`

2. **PHP injeta `data-*` attributes** no wrapper do elemento via:
   - `elementor/frontend/element/before_render`

3. **JavaScript** detecta os elementos por `data-pta-enable="1"` / `data-ptac-enable="1"`, usa `IntersectionObserver` para disparar no scroll e aplica as animações via GSAP ou Anime.js.

---

## 🔒 Segurança & Acessibilidade

- Seletor CSS dos filhos é sanitizado via regex no PHP
- Todos os atributos são passados por `esc_attr()`
- Textos divididos recebem `aria-label` com o conteúdo original e `aria-hidden="true"` nos spans individuais
- Suporte total a `prefers-reduced-motion` via CSS media query

---

## 📝 Licença

Este projeto é distribuído sob a licença [MIT](./LICENSE).

---

## 🤝 Contribuindo

Pull requests são bem-vindos! Para mudanças maiores, abra uma Issue primeiro para discutir o que você gostaria de mudar.

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-animacao`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona animação nova'`)
4. Push para a branch (`git push origin feature/nova-animacao`)
5. Abra um Pull Request

---

## 💡 Inspirações

- [Moving Letters — Tobias Ahlin](https://tobiasahlin.com/moving-letters/)
- [GSAP — GreenSock](https://gsap.com/)
- [Anime.js](https://animejs.com/)
