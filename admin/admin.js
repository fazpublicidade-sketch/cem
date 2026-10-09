// ======================================================
// Painel administrativo — Corpo & Mente
// Login pelo Supabase Auth; quem pode alterar é decidido no banco
// (tabela "admins" + regras de segurança em supabase/schema.sql).
// ======================================================
(() => {
  const $ = (s) => document.querySelector(s);
  const cfg = window.CM_CONFIG || {};
  const DIAS = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const BUCKET = "midia";

  const telas = ["tela-config", "tela-login", "tela-senha", "tela-negado", "tela-painel"];
  const mostrarTela = (id) => {
    telas.forEach((t) => { $("#" + t).hidden = t !== id; });
    $("#topo-acoes").hidden = !["tela-painel", "tela-negado"].includes(id);
  };

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
    mostrarTela("tela-config");
    return;
  }
  // Link de "esqueci minha senha" ou de convite: lê antes de o Supabase limpar o endereço
  const emRecuperacao = /type=(recovery|invite)/.test(location.hash);
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  // ---------- utilidades ----------
  const el = (tag, attrs = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    filhos.flat().filter(Boolean).forEach((f) => e.append(f));
    return e;
  };

  let timerAviso;
  const aviso = (texto, erro = false) => {
    const a = $("#aviso");
    a.textContent = texto;
    a.className = "aviso" + (erro ? " aviso--erro" : "");
    a.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { a.hidden = true; }, erro ? 6000 : 2600);
  };

  const msg = (alvo, texto, tipo = "") => {
    const m = $(alvo);
    m.textContent = texto;
    m.className = "msg" + (tipo ? ` msg--${tipo}` : "");
  };

  const traduzErro = (e) => {
    const t = (e && (e.message || e.error_description)) || String(e);
    if (/Invalid login credentials/i.test(t)) return "E-mail ou senha incorretos.";
    if (/Email not confirmed/i.test(t)) return "E-mail ainda não confirmado.";
    if (/row-level security|permission denied/i.test(t)) return "Sem permissão para alterar. Confira se este e-mail está na lista de administradores.";
    return t;
  };

  const ocupado = async (botao, fn) => {
    botao.disabled = true;
    try { await fn(); } finally { botao.disabled = false; }
  };

  const hora = (h) => String(h || "").slice(0, 5);

  // ISO (banco) ⇄ valor do campo datetime-local (horário do computador)
  const isoParaLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const localParaIso = (v) => (v ? new Date(v).toISOString() : null);
  const vazioParaNull = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());

  // Botão de olho: mostra/esconde a senha digitada
  document.querySelectorAll(".ver-senha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const campo = botao.previousElementSibling;
      const mostrar = campo.type === "password";
      campo.type = mostrar ? "text" : "password";
      botao.setAttribute("aria-pressed", String(mostrar));
      botao.setAttribute("aria-label", mostrar ? "Esconder senha" : "Mostrar senha");
      campo.focus();
    });
  });
  // Ao enviar, volta a esconder (o navegador não guarda a senha como texto)
  document.querySelectorAll("#form-login, #form-senha").forEach((f) => f.addEventListener("submit", () => {
    f.querySelectorAll(".ver-senha").forEach((b) => {
      b.previousElementSibling.type = "password";
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", "Mostrar senha");
    });
  }));

  // ---------- login ----------
  const verificarAcesso = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return mostrarTela("tela-login");
    const { data, error } = await sb.from("admins").select("email").limit(1);
    if (error || !data.length) return mostrarTela("tela-negado");
    mostrarTela("tela-painel");
    abrirAba(abaAtual);
  };

  $("#form-login").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    ocupado(f.querySelector("[type=submit]"), async () => {
      msg("#msg-login", "Entrando…");
      const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.senha.value });
      if (error) return msg("#msg-login", traduzErro(error), "erro");
      msg("#msg-login", "");
      f.reset();
      verificarAcesso();
    });
  });

  $("#esqueci").addEventListener("click", async () => {
    const email = $("#form-login").email.value.trim();
    if (!email) return msg("#msg-login", "Digite seu e-mail acima e clique de novo em “Esqueci minha senha”.", "erro");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) return msg("#msg-login", traduzErro(error), "erro");
    msg("#msg-login", "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.", "ok");
  });

  $("#form-senha").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    ocupado(f.querySelector("[type=submit]"), async () => {
      const { error } = await sb.auth.updateUser({ password: f.senha.value });
      if (error) return msg("#msg-senha", traduzErro(error), "erro");
      f.reset();
      aviso("Senha alterada.");
      verificarAcesso();
    });
  });

  $("#sair").addEventListener("click", async () => {
    await sb.auth.signOut();
    mostrarTela("tela-login");
  });

  sb.auth.onAuthStateChange((evento) => {
    if (evento === "PASSWORD_RECOVERY") mostrarTela("tela-senha");
  });

  // ---------- abas ----------
  let abaAtual = "publicacoes";
  const abrirAba = (aba) => {
    abaAtual = aba;
    document.querySelectorAll(".aba").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === aba));
    $("#painel-publicacoes").hidden = aba !== "publicacoes";
    $("#painel-grade").hidden = !["coletivas", "box"].includes(aba);
    $("#painel-funcionamento").hidden = aba !== "funcionamento";
    $("#painel-parceiros").hidden = aba !== "parceiros";
    if (aba === "publicacoes") carregarPublicacoes();
    else if (aba === "parceiros") carregarParceiros();
    else if (aba === "funcionamento") carregarFuncionamento();
    else {
      $("#titulo-grade").textContent = aba === "box" ? "Box Mazzei · Hyrox e CrossMazzei" : "Aulas coletivas e lutas";
      fecharFormAula();
      carregarAulas();
    }
  };
  document.querySelectorAll(".aba").forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

  // ======================================================
  // EVENTOS E PROMOÇÕES
  // ======================================================
  const formPub = $("#form-pub");
  let pubEditando = null;   // registro em edição (ou null = novo)
  let removerImagem = false;

  const caminhoNoBucket = (url) => {
    const marca = `/storage/v1/object/public/${BUCKET}/`;
    const i = (url || "").indexOf(marca);
    return i >= 0 ? decodeURIComponent(url.slice(i + marca.length)) : null;
  };
  const apagarArquivo = async (url) => {
    const caminho = caminhoNoBucket(url);
    if (caminho) await sb.storage.from(BUCKET).remove([caminho]);
  };

  const abrirFormPub = (p = null) => {
    pubEditando = p;
    removerImagem = false;
    formPub.reset();
    $("#titulo-form-pub").textContent = p ? "Editar" : "Novo evento ou promoção";
    if (p) {
      for (const campo of ["tipo", "titulo", "descricao", "local", "valido_ate", "texto_botao", "link_botao", "mensagem_whatsapp", "ordem"]) {
        formPub[campo].value = p[campo] ?? "";
      }
      formPub.data_evento.value = isoParaLocal(p.data_evento);
      formPub.publicado.checked = p.publicado;
      formPub.destaque.checked = p.destaque;
    }
    const img = $("#previa-img");
    img.hidden = !(p && p.imagem_url);
    if (p && p.imagem_url) img.src = p.imagem_url;
    $("#remover-img").hidden = img.hidden;
    msg("#msg-pub", "");
    formPub.hidden = false;
    formPub.scrollIntoView({ behavior: "smooth", block: "start" });
    formPub.titulo.focus({ preventScroll: true });
  };
  const fecharFormPub = () => { formPub.hidden = true; pubEditando = null; };

  $("#nova-pub").addEventListener("click", () => abrirFormPub());
  $("#cancelar-pub").addEventListener("click", fecharFormPub);
  $("#remover-img").addEventListener("click", () => {
    removerImagem = true;
    formPub.imagem.value = "";
    $("#previa-img").hidden = true;
    $("#remover-img").hidden = true;
  });
  formPub.imagem.addEventListener("change", () => {
    const arq = formPub.imagem.files[0];
    if (!arq) return;
    if (arq.size > 5 * 1024 * 1024) {
      formPub.imagem.value = "";
      return msg("#msg-pub", "Imagem maior que 5 MB. Reduza o tamanho e tente de novo.", "erro");
    }
    const img = $("#previa-img");
    img.src = URL.createObjectURL(arq);
    img.hidden = false;
    removerImagem = false;
  });

  formPub.addEventListener("submit", (e) => {
    e.preventDefault();
    ocupado(formPub.querySelector("[type=submit]"), async () => {
      msg("#msg-pub", "Salvando…");
      const registro = {
        tipo: formPub.tipo.value,
        titulo: formPub.titulo.value.trim(),
        descricao: vazioParaNull(formPub.descricao.value),
        data_evento: localParaIso(formPub.data_evento.value),
        local: vazioParaNull(formPub.local.value),
        valido_ate: vazioParaNull(formPub.valido_ate.value),
        texto_botao: vazioParaNull(formPub.texto_botao.value),
        link_botao: vazioParaNull(formPub.link_botao.value),
        mensagem_whatsapp: vazioParaNull(formPub.mensagem_whatsapp.value),
        publicado: formPub.publicado.checked,
        destaque: formPub.destaque.checked,
        ordem: Number(formPub.ordem.value) || 0,
      };

      const imagemAntiga = pubEditando?.imagem_url || null;
      const arq = formPub.imagem.files[0];
      if (arq) {
        const ext = (arq.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const caminho = `publicacoes/${crypto.randomUUID()}.${ext}`;
        const { error } = await sb.storage.from(BUCKET).upload(caminho, arq, { contentType: arq.type, cacheControl: "31536000" });
        if (error) return msg("#msg-pub", "Erro ao enviar a imagem: " + traduzErro(error), "erro");
        registro.imagem_url = sb.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
      } else if (removerImagem) {
        registro.imagem_url = null;
      }

      const { error } = pubEditando
        ? await sb.from("publicacoes").update(registro).eq("id", pubEditando.id)
        : await sb.from("publicacoes").insert(registro);
      if (error) return msg("#msg-pub", traduzErro(error), "erro");

      if (imagemAntiga && (arq || removerImagem)) await apagarArquivo(imagemAntiga);
      fecharFormPub();
      aviso("Salvo! Já está no site.");
      carregarPublicacoes();
    });
  });

  const carregarPublicacoes = async () => {
    const lista = $("#lista-pub");
    const { data, error } = await sb.from("publicacoes").select("*")
      .order("destaque", { ascending: false }).order("ordem").order("criado_em", { ascending: false });
    lista.replaceChildren();
    if (error) return lista.append(el("p", { class: "vazio", text: traduzErro(error) }));
    if (!data.length) return lista.append(el("p", { class: "vazio", text: "Nenhum evento ou promoção ainda. Clique em “+ Novo”." }));

    const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
    data.forEach((p) => {
      const expirado = p.valido_ate && p.valido_ate < hoje;
      const detalhes = [
        p.data_evento ? new Date(p.data_evento).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : null,
        p.valido_ate ? `até ${new Date(p.valido_ate + "T12:00:00").toLocaleDateString("pt-BR")}` : null,
      ].filter(Boolean).join(" · ");

      lista.append(el("div", { class: "item" },
        p.imagem_url ? el("img", { class: "item__img", src: p.imagem_url, alt: "" }) : el("div", { class: "item__img" }),
        el("div", { class: "item__info" },
          el("strong", { text: p.titulo }),
          detalhes ? el("small", { text: detalhes }) : null,
          el("div", { class: "chips" },
            el("span", { class: "chip", text: p.tipo === "promocao" ? "Promoção" : "Evento" }),
            p.publicado && !expirado ? el("span", { class: "chip chip--verde", text: "No site" }) : null,
            !p.publicado ? el("span", { class: "chip", text: "Rascunho" }) : null,
            expirado ? el("span", { class: "chip chip--vermelho", text: "Expirado" }) : null,
            p.destaque ? el("span", { class: "chip chip--verde", text: "Destaque" }) : null
          )
        ),
        el("div", { class: "item__acoes" },
          el("button", { class: "btn btn--linha btn--p", text: p.publicado ? "Tirar do site" : "Publicar", onclick: async (ev) => {
            await ocupado(ev.currentTarget, async () => {
              const { error } = await sb.from("publicacoes").update({ publicado: !p.publicado }).eq("id", p.id);
              if (error) return aviso(traduzErro(error), true);
              carregarPublicacoes();
            });
          } }),
          el("button", { class: "btn btn--linha btn--p", text: "Editar", onclick: () => abrirFormPub(p) }),
          el("button", { class: "btn btn--perigo btn--p", text: "Excluir", onclick: async (ev) => {
            if (!confirm(`Excluir “${p.titulo}”? Isso não pode ser desfeito.`)) return;
            await ocupado(ev.currentTarget, async () => {
              const { error } = await sb.from("publicacoes").delete().eq("id", p.id);
              if (error) return aviso(traduzErro(error), true);
              await apagarArquivo(p.imagem_url);
              aviso("Excluído.");
              carregarPublicacoes();
            });
          } })
        )
      ));
    });
  };

  // ======================================================
  // GRADES (aulas coletivas / Box Mazzei)
  // ======================================================
  const formAula = $("#form-aula");
  let aulaEditando = null;

  const abrirFormAula = (a = null) => {
    aulaEditando = a;
    formAula.reset();
    $("#titulo-form-aula").textContent = a ? "Editar aula" : "Nova aula";
    if (a) {
      formAula.dia.value = a.dia;
      formAula.hora.value = hora(a.hora);
      formAula.atividade.value = a.atividade;
      formAula.observacao.value = a.observacao || "";
      formAula.destaque.checked = a.destaque;
      formAula.ativo.checked = a.ativo;
    }
    msg("#msg-aula", "");
    formAula.hidden = false;
    formAula.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const fecharFormAula = () => { formAula.hidden = true; aulaEditando = null; };

  $("#nova-aula").addEventListener("click", () => abrirFormAula());
  $("#cancelar-aula").addEventListener("click", fecharFormAula);

  formAula.addEventListener("submit", (e) => {
    e.preventDefault();
    ocupado(formAula.querySelector("[type=submit]"), async () => {
      const registro = {
        grade: abaAtual,
        dia: Number(formAula.dia.value),
        hora: formAula.hora.value,
        atividade: formAula.atividade.value.trim(),
        observacao: vazioParaNull(formAula.observacao.value),
        destaque: formAula.destaque.checked,
        ativo: formAula.ativo.checked,
      };
      const { error } = aulaEditando
        ? await sb.from("grade_aulas").update(registro).eq("id", aulaEditando.id)
        : await sb.from("grade_aulas").insert(registro);
      if (error) return msg("#msg-aula", traduzErro(error), "erro");
      fecharFormAula();
      aviso("Grade atualizada.");
      carregarAulas();
    });
  });

  const carregarAulas = async () => {
    const lista = $("#lista-aulas");
    const { data, error } = await sb.from("grade_aulas").select("*").eq("grade", abaAtual).order("dia").order("hora");
    lista.replaceChildren();
    if (error) return lista.append(el("p", { class: "vazio", text: traduzErro(error) }));
    if (!data.length) return lista.append(el("p", { class: "vazio", text: "Nenhuma aula nesta grade. Clique em “+ Nova aula”." }));

    for (let dia = 1; dia <= 7; dia++) {
      const doDia = data.filter((a) => a.dia === dia);
      if (!doDia.length) continue;
      lista.append(el("div", { class: "dia" },
        el("h3", { text: DIAS[dia] }),
        doDia.map((a) => el("div", { class: "aula" + (a.ativo ? "" : " aula--inativa") },
          el("time", { text: hora(a.hora) }),
          el("span", {}, a.atividade + (a.destaque ? " ★" : ""), a.observacao ? el("small", { text: a.observacao }) : null, !a.ativo ? el("small", { text: "Oculta no site" }) : null),
          el("button", { class: "btn btn--linha btn--p", text: "Editar", onclick: () => abrirFormAula(a) }),
          el("button", { class: "btn btn--perigo btn--p", text: "Excluir", "aria-label": `Excluir ${a.atividade} de ${DIAS[dia]} às ${hora(a.hora)}`, onclick: async (ev) => {
            if (!confirm(`Excluir ${a.atividade} de ${DIAS[dia]} às ${hora(a.hora)}?`)) return;
            await ocupado(ev.currentTarget, async () => {
              const { error } = await sb.from("grade_aulas").delete().eq("id", a.id);
              if (error) return aviso(traduzErro(error), true);
              aviso("Aula excluída.");
              carregarAulas();
            });
          } })
        ))
      ));
    }
  };

  // ======================================================
  // PARCEIROS
  // ======================================================
  const formParc = $("#form-parc");
  let parcEditando = null;
  const remover = { logo: false, foto: false };

  // Envia um arquivo de imagem e devolve a URL pública
  const enviarImagem = async (arq, pasta) => {
    const ext = (arq.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const caminho = `${pasta}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(caminho, arq, { contentType: arq.type, cacheControl: "31536000" });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
  };

  const ligarCampoImagem = (campo) => {
    const input = formParc[campo];
    const previa = $(`#previa-${campo}`);
    const botao = $(`#remover-${campo}`);
    input.addEventListener("change", () => {
      const arq = input.files[0];
      if (!arq) return;
      if (arq.size > 5 * 1024 * 1024) {
        input.value = "";
        return msg("#msg-parc", "Imagem maior que 5 MB. Reduza o tamanho e tente de novo.", "erro");
      }
      previa.src = URL.createObjectURL(arq);
      previa.hidden = false;
      botao.hidden = false;
      remover[campo] = false;
    });
    botao.addEventListener("click", () => {
      remover[campo] = true;
      input.value = "";
      previa.hidden = true;
      botao.hidden = true;
    });
  };
  ligarCampoImagem("logo");
  ligarCampoImagem("foto");

  const mostrarPrevia = (campo, url) => {
    const previa = $(`#previa-${campo}`);
    previa.hidden = !url;
    if (url) previa.src = url;
    $(`#remover-${campo}`).hidden = !url;
  };

  const abrirFormParc = (p = null) => {
    parcEditando = p;
    remover.logo = remover.foto = false;
    formParc.reset();
    $("#titulo-form-parc").textContent = p ? "Editar parceiro" : "Novo parceiro";
    if (p) {
      for (const campo of ["nome", "beneficio", "descricao", "link", "texto_botao", "ordem"]) formParc[campo].value = p[campo] ?? "";
      formParc.publicado.checked = p.publicado;
    }
    mostrarPrevia("logo", p?.logo_url);
    mostrarPrevia("foto", p?.foto_url);
    msg("#msg-parc", "");
    formParc.hidden = false;
    formParc.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const fecharFormParc = () => { formParc.hidden = true; parcEditando = null; };
  $("#novo-parc").addEventListener("click", () => abrirFormParc());
  $("#cancelar-parc").addEventListener("click", fecharFormParc);

  formParc.addEventListener("submit", (e) => {
    e.preventDefault();
    ocupado(formParc.querySelector("[type=submit]"), async () => {
      msg("#msg-parc", "Salvando…");
      const registro = {
        nome: formParc.nome.value.trim(),
        beneficio: vazioParaNull(formParc.beneficio.value),
        descricao: vazioParaNull(formParc.descricao.value),
        link: vazioParaNull(formParc.link.value),
        texto_botao: vazioParaNull(formParc.texto_botao.value),
        publicado: formParc.publicado.checked,
        ordem: Number(formParc.ordem.value) || 0,
      };
      const antigas = [];
      try {
        for (const campo of ["logo", "foto"]) {
          const coluna = `${campo}_url`;
          const arq = formParc[campo].files[0];
          if (arq) registro[coluna] = await enviarImagem(arq, "parceiros");
          else if (remover[campo]) registro[coluna] = null;
          if ((arq || remover[campo]) && parcEditando?.[coluna]) antigas.push(parcEditando[coluna]);
        }
      } catch (erro) {
        return msg("#msg-parc", "Erro ao enviar a imagem: " + traduzErro(erro), "erro");
      }
      const { error } = parcEditando
        ? await sb.from("parceiros").update(registro).eq("id", parcEditando.id)
        : await sb.from("parceiros").insert(registro);
      if (error) return msg("#msg-parc", traduzErro(error), "erro");
      for (const url of antigas) await apagarArquivo(url);
      fecharFormParc();
      aviso("Parceiro salvo! Já está no site.");
      carregarParceiros();
    });
  });

  const carregarParceiros = async () => {
    const lista = $("#lista-parc");
    const { data, error } = await sb.from("parceiros").select("*").order("ordem").order("nome");
    lista.replaceChildren();
    if (error) return lista.append(el("p", { class: "vazio", text: traduzErro(error) }));
    if (!data.length) return lista.append(el("p", { class: "vazio", text: "Nenhum parceiro ainda. Clique em “+ Novo parceiro”." }));
    data.forEach((p) => {
      lista.append(el("div", { class: "item" },
        p.logo_url || p.foto_url ? el("img", { class: "item__img item__img--logo", src: p.logo_url || p.foto_url, alt: "" }) : el("div", { class: "item__img" }),
        el("div", { class: "item__info" },
          el("strong", { text: p.nome }),
          p.beneficio ? el("small", { text: p.beneficio }) : null,
          el("div", { class: "chips" },
            p.publicado ? el("span", { class: "chip chip--verde", text: "No site" }) : el("span", { class: "chip", text: "Oculto" })
          )
        ),
        el("div", { class: "item__acoes" },
          el("button", { class: "btn btn--linha btn--p", text: "Editar", onclick: () => abrirFormParc(p) }),
          el("button", { class: "btn btn--perigo btn--p", text: "Excluir", onclick: async (ev) => {
            if (!confirm(`Excluir o parceiro “${p.nome}”? Isso não pode ser desfeito.`)) return;
            await ocupado(ev.currentTarget, async () => {
              const { error } = await sb.from("parceiros").delete().eq("id", p.id);
              if (error) return aviso(traduzErro(error), true);
              await apagarArquivo(p.logo_url);
              await apagarArquivo(p.foto_url);
              aviso("Parceiro excluído.");
              carregarParceiros();
            });
          } })
        )
      ));
    });
  };

  // ======================================================
  // FUNCIONAMENTO
  // ======================================================
  const linhaFunc = (f = {}) => {
    const local = el("select", {},
      el("option", { value: "academia", text: "Academia" }),
      el("option", { value: "pilates", text: "Pilates" }));
    local.value = f.local || "academia";
    const dias = el("input", { value: f.dias || "", placeholder: "Ex.: Segunda a sexta", "aria-label": "Dias" });
    const horario = el("input", { value: f.horario || "", placeholder: "Ex.: 05h às 22h", "aria-label": "Horário" });
    const ordem = el("input", { type: "number", value: f.ordem ?? 0, "aria-label": "Ordem" });

    const salvar = el("button", { class: "btn btn--verde btn--p", text: "Salvar", onclick: (ev) => ocupado(ev.currentTarget, async () => {
      const registro = { local: local.value, dias: dias.value.trim(), horario: horario.value.trim(), ordem: Number(ordem.value) || 0 };
      if (!registro.dias || !registro.horario) return aviso("Preencha os dias e o horário.", true);
      const { error } = f.id
        ? await sb.from("funcionamento").update(registro).eq("id", f.id)
        : await sb.from("funcionamento").insert(registro);
      if (error) return aviso(traduzErro(error), true);
      aviso("Horário salvo.");
      carregarFuncionamento();
    }) });
    const excluir = el("button", { class: "btn btn--perigo btn--p", text: "Excluir", onclick: (ev) => {
      if (!f.id) return ev.currentTarget.closest(".func-linha").remove();
      if (!confirm(`Excluir a linha “${f.dias}: ${f.horario}”?`)) return;
      ocupado(ev.currentTarget, async () => {
        const { error } = await sb.from("funcionamento").delete().eq("id", f.id);
        if (error) return aviso(traduzErro(error), true);
        carregarFuncionamento();
      });
    } });
    return el("div", { class: "func-linha" }, local, dias, horario, ordem, el("div", { class: "item__acoes" }, salvar, excluir));
  };

  const carregarFuncionamento = async () => {
    const lista = $("#lista-func");
    const { data, error } = await sb.from("funcionamento").select("*").order("ordem");
    lista.replaceChildren();
    if (error) return lista.append(el("p", { class: "vazio", text: traduzErro(error) }));
    data.forEach((f) => lista.append(linhaFunc(f)));
  };
  $("#nova-func").addEventListener("click", () => {
    const linha = linhaFunc({ ordem: 99 });
    $("#lista-func").append(linha);
    linha.querySelector("input").focus();
  });

  if (emRecuperacao) mostrarTela("tela-senha");
  else verificarAcesso();
})();
