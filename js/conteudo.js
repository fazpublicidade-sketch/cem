// ======================================================
// Conteúdo que vem do painel: horários, grades, eventos e promoções.
// Lê do Supabase; se não estiver configurado ou falhar, usa js/dados-padrao.js.
// ======================================================
(() => {
  const DIAS = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const cfg = window.CM_CONFIG || {};
  const temBanco = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);

  // Monta elementos sem usar innerHTML com dados do banco (evita código malicioso)
  const el = (tag, attrs = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else e.setAttribute(k, v);
    }
    filhos.flat().filter(Boolean).forEach((f) => e.append(f));
    return e;
  };

  const ler = async (tabela, query) => {
    const r = await fetch(`${cfg.supabaseUrl}/rest/v1/${tabela}?${query}`, {
      headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` },
    });
    if (!r.ok) throw new Error(`${tabela}: ${r.status}`);
    return r.json();
  };

  const carregar = async () => {
    if (!temBanco) return window.CM_PADRAO;
    try {
      const [funcionamento, grade_aulas, publicacoes] = await Promise.all([
        ler("funcionamento", "select=*&order=ordem"),
        ler("grade_aulas", "select=*&ativo=eq.true&order=dia,hora"),
        ler("publicacoes", "select=*&order=destaque.desc,ordem,data_evento.asc.nullslast,criado_em.desc"),
      ]);
      return { funcionamento, grade_aulas, publicacoes };
    } catch (erro) {
      console.warn("Banco indisponível, usando horários padrão.", erro);
      return window.CM_PADRAO;
    }
  };

  // "07:00:00" → "07h" · "08:15" → "08h15"
  const hora = (h) => {
    const [hh, mm] = String(h).split(":");
    return mm && mm !== "00" ? `${hh}h${mm}` : `${hh}h`;
  };

  const diaHoje = () => {
    const d = new Date().getDay(); // 0 = domingo
    return d === 0 ? 7 : d;
  };

  // ---------- Funcionamento ----------
  const renderFuncionamento = (itens) => {
    const alvo = document.getElementById("funcionamento");
    if (!alvo) return;
    alvo.replaceChildren();
    const grupos = [
      ["academia", "Academia"],
      ["pilates", "Studio de Pilates"],
    ];
    grupos.forEach(([local, titulo]) => {
      const linhas = itens.filter((i) => i.local === local).sort((a, b) => a.ordem - b.ordem);
      if (!linhas.length) return;
      alvo.append(
        el("article", { class: "func reveal", "data-anim": "up" },
          el("h3", { text: titulo }),
          el("ul", {}, linhas.map((l) =>
            el("li", {}, el("span", { text: l.dias }), el("strong", { text: l.horario }))
          ))
        )
      );
    });
  };

  // ---------- Grades (por dia) ----------
  const renderGrade = (grade, itens) => {
    const alvo = document.getElementById(`grade-${grade}`);
    if (!alvo) return;
    alvo.replaceChildren();
    const daGrade = itens.filter((i) => i.grade === grade);
    const hoje = diaHoje();
    const dias = [...new Set(daGrade.map((i) => i.dia))].sort((a, b) => a - b);
    if (!dias.length) {
      alvo.append(el("p", { class: "vazio", text: "Grade em atualização. Fale com a gente pelo WhatsApp." }));
      return;
    }
    dias.forEach((dia) => {
      const aulas = daGrade.filter((i) => i.dia === dia).sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
      alvo.append(
        el("article", { class: `dia reveal${dia === hoje ? " dia--hoje" : ""}`, "data-anim": "up" },
          el("header", {}, el("h4", { text: DIAS[dia] }), dia === hoje ? el("span", { class: "dia__hoje", text: "Hoje" }) : null),
          el("ul", {}, aulas.map((a) =>
            el("li", { class: a.destaque ? "aula-destaque" : null },
              el("time", { text: hora(a.hora) }),
              el("span", {}, a.atividade, a.observacao ? el("small", { text: a.observacao }) : null)
            )
          ))
        )
      );
    });
  };

  // ---------- Eventos e promoções ----------
  const dataEvento = (iso) => {
    const d = new Date(iso);
    const data = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
    const h = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    return `${data} · ${h.replace(":00", "h").replace(":", "h")}`;
  };

  const renderPublicacoes = (itens) => {
    const alvo = document.getElementById("lista-publicacoes");
    if (!alvo) return;
    alvo.replaceChildren();
    if (!itens.length) {
      alvo.append(
        el("div", { class: "pub-vazio reveal", "data-anim": "up" },
          el("p", { text: "Novos eventos e promoções chegam em breve." }),
          el("a", { class: "link", href: "#", "data-whats": "Olá! Quero receber as novidades de eventos e promoções da Corpo & Mente.", text: "Quero receber as novidades →" })
        )
      );
    }
    itens.forEach((p) => {
      let botao = null;
      if (p.mensagem_whatsapp) botao = el("a", { class: "btn btn--verde", href: "#", "data-whats": p.mensagem_whatsapp, text: p.texto_botao || "Quero participar" });
      else if (p.link_botao && /^https?:\/\//i.test(p.link_botao)) botao = el("a", { class: "btn btn--verde", href: p.link_botao, target: "_blank", rel: "noopener", text: p.texto_botao || "Saiba mais" });

      const imagem = p.imagem_url && /^https:\/\//i.test(p.imagem_url)
        ? el("div", { class: "pub__img" }, el("img", { src: p.imagem_url, alt: p.titulo, loading: "lazy" }))
        : null;

      alvo.append(
        el("article", { class: `pub reveal${p.destaque ? " pub--destaque" : ""}`, "data-anim": "up" },
          imagem,
          el("div", { class: "pub__corpo" },
            el("p", { class: `pub__tipo pub__tipo--${p.tipo}`, text: p.tipo === "promocao" ? "Promoção" : "Evento" }),
            el("h3", { text: p.titulo }),
            p.data_evento ? el("p", { class: "pub__quando", text: dataEvento(p.data_evento) + (p.local ? ` · ${p.local}` : "") }) : null,
            p.descricao ? el("p", { class: "pub__desc", text: p.descricao }) : null,
            p.valido_ate && p.tipo === "promocao"
              ? el("p", { class: "pub__validade", text: `Válida até ${new Date(p.valido_ate + "T12:00:00").toLocaleDateString("pt-BR")}` })
              : null,
            botao
          )
        )
      );
    });
  };

  carregar().then((dados) => {
    renderFuncionamento(dados.funcionamento || []);
    renderGrade("coletivas", dados.grade_aulas || []);
    renderGrade("box", dados.grade_aulas || []);
    renderPublicacoes(dados.publicacoes || []);
    window.CM_ativarLinks?.(document);
    window.CM_animar?.(document);
  });
})();
