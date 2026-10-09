// ======================================================
// DADOS DA ACADEMIA — edite aqui (aparecem no site todo)
// ======================================================
const ACADEMIA = {
  whatsapp: "5511914717422",            // DDI + DDD + número, só dígitos
  telefone: "(11) 91471-7422",
  endereco: "Rua Manuel Gaya, 806 — Vila Nova Mazzei, São Paulo/SP — CEP 02313-000",
  horario: "Das 5h às 22h",
  instagram: "",                        // ex.: "@corpoemente" (vazio = esconde a linha)
};

const linkWhats = (msg) =>
  `https://wa.me/${ACADEMIA.whatsapp}?text=${encodeURIComponent(msg)}`;

// Botões de WhatsApp com mensagem pronta
document.querySelectorAll('[data-whats]').forEach((el) => {
  el.href = linkWhats(el.dataset.whats);
  el.target = '_blank';
  el.rel = 'noopener';
});

// Informações de contato
document.querySelectorAll('[data-info]').forEach((el) => {
  const chave = el.dataset.info;
  if (!ACADEMIA[chave]) { el.closest("li")?.remove(); return; }
  el.textContent = ACADEMIA[chave];
  if (chave === 'instagram') {
    el.href = `https://instagram.com/${ACADEMIA.instagram.replace('@', '')}`;
  }
});

document.getElementById('ano').textContent = new Date().getFullYear();

// Menu: fundo ao rolar
const topo = document.getElementById('topo');
const aoRolar = () => topo.classList.toggle('rolado', window.scrollY > 40);
window.addEventListener('scroll', aoRolar, { passive: true });
aoRolar();

// Menu mobile
const hamburguer = document.getElementById('hamburguer');
const menu = document.getElementById('menu');
const fecharMenu = () => {
  menu.classList.remove('aberto');
  hamburguer.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
};
hamburguer.addEventListener('click', () => {
  const abrir = !menu.classList.contains('aberto');
  menu.classList.toggle('aberto', abrir);
  hamburguer.setAttribute('aria-expanded', String(abrir));
  document.body.style.overflow = abrir ? 'hidden' : '';
});
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', fecharMenu));

// Abas de planos
const abas = document.querySelectorAll('.aba');
const mostrarAba = (alvo) => {
  abas.forEach((aba) => {
    const ativa = aba.dataset.alvo === alvo;
    aba.classList.toggle('ativa', ativa);
    aba.setAttribute('aria-selected', String(ativa));
  });
  document.querySelectorAll('.painel').forEach((p) => {
    const ativo = p.id === `painel-${alvo}`;
    p.classList.toggle('ativo', ativo);
    p.hidden = !ativo;
  });
};
abas.forEach((aba) => aba.addEventListener('click', () => mostrarAba(aba.dataset.alvo)));
// Links "Ver planos" das modalidades abrem a aba certa
document.querySelectorAll('[data-aba]').forEach((el) =>
  el.addEventListener('click', () => mostrarAba(el.dataset.aba))
);

// Formulário → WhatsApp
document.getElementById('form-contato').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(e.target);
  const msg = `Olá! Meu nome é ${d.get('nome')} (${d.get('telefone')}). Tenho interesse em: ${d.get('interesse')}.`;
  window.open(linkWhats(msg), '_blank', 'noopener');
});

// ===== Animações de rolagem =====
// Itens lado a lado entram em sequência (um depois do outro)
document.querySelectorAll(".mod-grid, .cards, .be-grid, .numeros, .aulas").forEach((grupo) => {
  grupo.querySelectorAll(":scope > .reveal").forEach((el, i) => {
    el.style.setProperty("--atraso", `${i * 150}ms`);
  });
});

const obs = new IntersectionObserver((itens) => {
  itens.forEach((i) => {
    if (i.isIntersecting) {
      i.target.classList.add("visivel");
      obs.unobserve(i.target);
    }
  });
}, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));

// Vídeo do topo: movimento mais lento que a página (efeito de profundidade)
const heroVideo = document.getElementById("hero-video");
const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (heroVideo && !reduzirMovimento) {
  let agendado = false;
  window.addEventListener("scroll", () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      const y = Math.min(window.scrollY, window.innerHeight);
      heroVideo.style.setProperty("--parallax", `${y * 0.35}px`);
      agendado = false;
    });
  }, { passive: true });
}
// Garante que o vídeo toque em celulares que bloqueiam autoplay
heroVideo?.play?.().catch(() => {});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") heroVideo?.play?.().catch(() => {});
});
