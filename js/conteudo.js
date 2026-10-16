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
      const [funcionamento, grade_aulas, publicacoes, parceiros, planos] = await Promise.all([
        ler("funcionamento", "select=*&order=ordem"),
        ler("grade_aulas", "select=*&ativo=eq.true&order=dia,hora"),
        ler("publicacoes", "select=*&order=destaque.desc,ordem,data_evento.asc.nullslast,criado_em.desc"),
        ler("parceiros", "select=*&publicado=eq.true&order=ordem,nome").catch(() => []),
        // null = tabela ainda não criada → usa os planos padrão
        ler("planos", "select=*&publicado=eq.true&order=ordem,nome").catch(() => null),
      ]);
      return { funcionamento, grade_aulas, publicacoes, parceiros, planos: planos ?? window.CM_PADRAO.planos };
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
    const dataBonita = data.charAt(0).toUpperCase() + data.slice(1);
    return `${dataBonita} · ${h.replace(":00", "h").replace(":", "h")}`;
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

  // ---------- Parceiros ----------
  const urlSegura = (u) => (u && /^https:\/\//i.test(u) ? u : null);

  const renderParceiros = (itens) => {
    const alvo = document.getElementById("lista-parceiros");
    if (!alvo) return;
    alvo.replaceChildren();
    alvo.hidden = !itens.length;
    itens.forEach((p) => {
      const link = p.link && /^https?:\/\//i.test(p.link) ? p.link : null;
      const foto = urlSegura(p.foto_url);
      const logo = urlSegura(p.logo_url);
      alvo.append(
        el("article", { class: `parc reveal${foto ? " parc--foto" : ""}`, "data-anim": "up" },
          foto ? el("div", { class: "parc__foto" }, el("img", { src: foto, alt: "", loading: "lazy" })) : null,
          el("div", { class: "parc__corpo" },
            el("div", { class: "parc__topo" },
              logo ? el("div", { class: "parc__logo" }, el("img", { src: logo, alt: `Logo ${p.nome}`, loading: "lazy" })) : null,
              el("h3", { text: p.nome })
            ),
            p.beneficio ? el("p", { class: "parc__beneficio", text: p.beneficio }) : null,
            p.descricao ? el("p", { class: "parc__desc", text: p.descricao }) : null,
            link ? el("a", { class: "link", href: link, target: "_blank", rel: "noopener", text: (p.texto_botao || "Conhecer") + " →" }) : null
          )
        )
      );
    });
  };

  // ---------- Planos ----------
  // "Musculação" → "musculacao" (usado nas abas e nos links "Ver planos")
  const slug = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Texto com **negrito**, sem permitir HTML
  const rico = (texto) => String(texto || "").split("**").map((parte, i) => (i % 2 ? el("strong", { text: parte }) : parte));

  const precoGrande = (p) => {
    const v = Number(p.preco);
    const inteiro = Math.floor(v + 1e-9);
    const centavos = String(Math.round((v - inteiro) * 100)).padStart(2, "0");
    return el("div", { class: "preco" },
      p.preco_prefixo ? el("span", { class: "preco__pre", text: p.preco_prefixo }) : null,
      el("span", { class: "preco__rs", text: "R$" }),
      el("span", { class: "preco__int", text: inteiro.toLocaleString("pt-BR") }),
      el("span", { class: "preco__dec" }, `,${centavos}`, p.preco_sufixo ? el("small", { text: p.preco_sufixo }) : null)
    );
  };

  const cartaoPlano = (p) => {
    const opcoes = Array.isArray(p.opcoes) ? p.opcoes.filter((o) => o && (o.titulo || o.valor)) : [];
    const itens = Array.isArray(p.itens) ? p.itens.filter(Boolean) : [];
    return el("article", { class: `plano reveal${p.destaque ? " plano--destaque" : ""}`, "data-anim": "up" },
      p.selo_topo ? el("p", { class: "plano__badge", text: p.selo_topo }) : null,
      el("p", { class: "plano__rotulo", text: "Plano" }),
      el("h3", { text: p.nome }),
      p.frequencia ? el("p", { class: "freq", text: p.frequencia }) : null,
      opcoes.length ? el("ul", { class: "opcoes" }, opcoes.map((o) =>
        el("li", {},
          el("div", {}, el("b", { text: o.titulo || "" }), o.detalhe ? el("small", { text: o.detalhe }) : null),
          el("span", {}, o.valor || "", p.preco_sufixo ? el("small", { text: p.preco_sufixo }) : null)
        )
      )) : null,
      itens.length ? el("ul", { class: "plano__itens" }, itens.map((i) => el("li", {}, rico(i)))) : null,
      p.preco != null && p.preco !== "" ? precoGrande(p) : null,
      p.condicao ? el("p", { class: `selo ${p.condicao_destaque ? "selo--verde" : "selo--cinza"}`, text: p.condicao }) : null,
      p.observacao ? el("p", { class: "plano__obs" }, rico(p.observacao)) : null,
      p.pagamento ? el("p", { class: "plano__pag", text: p.pagamento }) : null,
      el("a", {
        class: `btn ${p.destaque ? "btn--verde" : "btn--linha"} btn--bloco`,
        href: "#",
        "data-whats": p.mensagem_whatsapp || `Olá! Tenho interesse no Plano ${p.nome}.`,
        text: p.texto_botao || `Quero o ${p.nome}`,
      })
    );
  };

  const renderPlanos = (planos) => {
    const alvo = document.getElementById("planos-conteudo");
    if (!alvo) return;
    alvo.replaceChildren();
    if (!planos.length) {
      alvo.append(el("p", { class: "vazio", text: "Planos em atualização. Fale com a gente pelo WhatsApp." }));
      return;
    }
    // Categorias na ordem do primeiro plano de cada uma
    const categorias = [];
    planos.forEach((p) => { if (!categorias.includes(p.categoria)) categorias.push(p.categoria); });

    if (categorias.length > 1) {
      alvo.append(el("div", { class: "abas", role: "tablist" }, categorias.map((cat, i) =>
        el("button", { class: `aba${i === 0 ? " ativa" : ""}`, role: "tab", "aria-selected": String(i === 0), "data-alvo": slug(cat), text: cat })
      )));
    }
    categorias.forEach((cat, i) => {
      const doGrupo = planos.filter((p) => p.categoria === cat);
      const painel = el("div", { class: `painel${i === 0 ? " ativo" : ""}`, id: `painel-${slug(cat)}`, "data-categoria": slug(cat), role: "tabpanel" },
        el("div", { class: `cards${doGrupo.length === 2 ? " cards--2" : ""}` }, doGrupo.map(cartaoPlano))
      );
      if (i > 0) painel.hidden = true;
      alvo.append(painel);
    });
  };

  carregar().then((dados) => {
    renderPlanos(dados.planos || []);
    renderParceiros(dados.parceiros || []);
    renderFuncionamento(dados.funcionamento || []);
    renderGrade("coletivas", dados.grade_aulas || []);
    renderGrade("box", dados.grade_aulas || []);
    renderPublicacoes(dados.publicacoes || []);
    window.CM_ativarLinks?.(document);
    window.CM_animar?.(document);
  });
})();
