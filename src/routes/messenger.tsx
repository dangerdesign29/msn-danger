import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import buddy from "@/assets/msn-buddy.png";
import { DrawModal } from "@/components/msn/DrawModal";
import { GamesModal } from "@/components/msn/GamesModal";
import { supabase } from "@/integrations/supabase/client";
import {
  EMOTICON_PALETTE,
  STATUS_LABEL,
  formatarHora,
  formatarMensagem,
  arquivoParaAvatar,
  playSound,
  type Contato,
  type Mensagem,
  type Perfil,
} from "@/lib/msn";

export const Route = createFileRoute("/messenger")({
  head: () => ({
    meta: [
      { title: "Messenger — Suas conversas | MSN" },
      {
        name: "description",
        content:
          "Lista de contatos, status, winks, toques de atenção, rabiscos e emoticons no clássico visual do Windows Live Messenger.",
      },
      { property: "og:title", content: "Messenger — Suas conversas | MSN" },
      {
        property: "og:description",
        content: "Converse em tempo real com o visual e os sons originais do MSN.",
      },
    ],
  }),
  component: Messenger,
});

type Toast = { id: number; titulo: string; texto: string };
type Prompt = {
  titulo: string;
  label: string;
  valor: string;
  onOk: (valor: string) => void;
};

function Messenger() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<Contato | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [emoticons, setEmoticons] = useState(false);
  const [desenho, setDesenho] = useState(false);
  const [jogos, setJogos] = useState(false);
  const [wink, setWink] = useState(false);
  const [tremendo, setTremendo] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; contato: Contato } | null>(null);

  const ativoRef = useRef<Contato | null>(null);
  ativoRef.current = ativo;
  const fimRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const notificar = useCallback((titulo: string, textoToast: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, titulo, texto: textoToast }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const tremer = useCallback(() => {
    setTremendo(true);
    playSound("nudge");
    setTimeout(() => setTremendo(false), 600);
  }, []);

  const piscar = useCallback(() => {
    setWink(true);
    playSound("wink");
    setTimeout(() => setWink(false), 1000);
  }, []);

  const carregarContatos = useCallback(async (uid: string) => {
    const { data: vinculos } = await supabase
      .from("contatos")
      .select("contato_id, apelido")
      .eq("usuario_id", uid);

    const ids = (vinculos ?? []).map((v) => v.contato_id);
    if (ids.length === 0) {
      setContatos([]);
      return;
    }
    const { data: perfis } = await supabase.from("perfis").select("*").in("id", ids);
    const lista = (perfis ?? []).map((p) => ({
      ...(p as Perfil),
      apelido: vinculos?.find((v) => v.contato_id === p.id)?.apelido ?? null,
    }));
    lista.sort((a, b) => {
      const pa = a.status === "offline" ? 1 : 0;
      const pb = b.status === "offline" ? 1 : 0;
      return pa - pb || (a.apelido ?? a.nome).localeCompare(b.apelido ?? b.nome);
    });
    setContatos(lista);
  }, []);

  const carregarMensagens = useCallback(async (uid: string, outro: string) => {
    const { data } = await supabase
      .from("mensagens")
      .select("*")
      .or(
        `and(remetente_id.eq.${uid},destinatario_id.eq.${outro}),and(remetente_id.eq.${outro},destinatario_id.eq.${uid})`,
      )
      .order("enviada_em", { ascending: true });
    setMensagens((data ?? []) as Mensagem[]);
  }, []);

  // Sessão + carga inicial
  useEffect(() => {
    let ativoEfeito = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativoEfeito) return;
      const session = data.session;
      if (!session) {
        navigate({ to: "/" });
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const { data: p } = await supabase.from("perfis").select("*").eq("id", uid).maybeSingle();
      if (p) setPerfil(p as Perfil);
      await supabase.from("perfis").update({ status: "online" }).eq("id", uid);
      await carregarContatos(uid);
      playSound("login");
    });
    return () => {
      ativoEfeito = false;
    };
  }, [navigate, carregarContatos]);

  // Tempo real: mensagens recebidas
  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel("msn-mensagens")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `destinatario_id=eq.${userId}`,
        },
        (payload) => {
          const msg = payload.new as Mensagem;
          const atual = ativoRef.current;
          if (atual && msg.remetente_id === atual.id) {
            setMensagens((m) => [...m, msg]);
          }
          if (msg.tipo === "nudge") {
            tremer();
            notificar("Toque de atenção!", "Alguém te chamou 📳");
          } else if (msg.tipo === "wink") {
            piscar();
            notificar("Wink recebido!", "Alguém te enviou um wink ⚡");
          } else {
            playSound("message");
            if (!atual || msg.remetente_id !== atual.id) {
              notificar(
                "Nova mensagem",
                msg.tipo === "drawing" ? "🎨 Um rabisco chegou" : formatarMensagem(msg.mensagem),
              );
            }
          }
        },
      )
      .subscribe();

    const canalPerfis = supabase
      .channel("msn-perfis")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "perfis" }, () => {
        void carregarContatos(userId);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
      void supabase.removeChannel(canalPerfis);
    };
  }, [userId, tremer, piscar, notificar, carregarContatos]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  useEffect(() => {
    if (!menu) return;
    const fechar = () => setMenu(null);
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, [menu]);

  const filtrados = useMemo(
    () =>
      contatos.filter((c) =>
        (c.apelido ?? c.nome).toLowerCase().includes(busca.trim().toLowerCase()),
      ),
    [contatos, busca],
  );

  async function abrirChat(contato: Contato) {
    setAtivo(contato);
    setEmoticons(false);
    if (userId) await carregarMensagens(userId, contato.id);
  }

  async function enviarPara(destino: Contato | null, conteudo: string, tipo: string) {
    if (!userId || !destino || !conteudo) return;
    const { data } = await supabase
      .from("mensagens")
      .insert({
        remetente_id: userId,
        destinatario_id: destino.id,
        mensagem: conteudo,
        tipo,
      })
      .select()
      .maybeSingle();
    if (data && ativoRef.current?.id === destino.id) {
      setMensagens((m) => [...m, data as Mensagem]);
    }
    playSound("send");
  }

  async function enviar(conteudo: string, tipo: string) {
    await enviarPara(ativo, conteudo, tipo);
  }

  async function enviarTexto() {
    const conteudo = texto.trim();
    if (!conteudo) return;
    setTexto("");
    await enviar(conteudo, "texto");
  }

  async function mudarStatus(status: string) {
    if (!userId) return;
    setPerfil((p) => (p ? { ...p, status } : p));
    await supabase.from("perfis").update({ status }).eq("id", userId);
  }

  async function trocarAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    try {
      const dataUrl = await arquivoParaAvatar(file);
      await supabase.from("perfis").update({ avatar_url: dataUrl }).eq("id", userId);
      setPerfil((p) => (p ? { ...p, avatar_url: dataUrl } : p));
      notificar("Foto atualizada", "Seu avatar foi trocado com sucesso.");
    } catch {
      notificar("Erro", "Não foi possível usar essa imagem.");
    } finally {
      e.target.value = "";
    }
  }

  async function sair() {
    if (userId) await supabase.from("perfis").update({ status: "offline" }).eq("id", userId);
    playSound("logout");
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  function pedirContato() {
    setPrompt({
      titulo: "Adicionar contato",
      label: "Digite o e-mail do contato:",
      valor: "",
      onOk: async (email) => {
        if (!email.trim() || !userId) return;
        const { data, error } = await supabase.rpc("adicionar_contato", { _email: email.trim() });
        if (error) {
          notificar("Erro", "Não foi possível adicionar o contato.");
          return;
        }
        if (data === "nao_encontrado") notificar("Ops", "Nenhum usuário com esse e-mail.");
        else if (data === "voce_mesmo") notificar("Ops", "Esse é o seu próprio e-mail.");
        else {
          notificar("Contato adicionado", "Já pode conversar!");
          await carregarContatos(userId);
        }
      },
    });
  }

  function pedirMusica() {
    setPrompt({
      titulo: "O que você está ouvindo?",
      label: "Música / artista:",
      valor: perfil?.musica ?? "",
      onOk: async (musica) => {
        if (!userId) return;
        await supabase.from("perfis").update({ musica: musica || null }).eq("id", userId);
        setPerfil((p) => (p ? { ...p, musica: musica || null } : p));
      },
    });
  }

  function editarApelido(contato: Contato) {
    setPrompt({
      titulo: "Editar apelido",
      label: `Novo apelido para ${contato.nome}:`,
      valor: contato.apelido ?? "",
      onOk: async (apelido) => {
        if (!userId) return;
        await supabase
          .from("contatos")
          .update({ apelido: apelido || null })
          .eq("usuario_id", userId)
          .eq("contato_id", contato.id);
        await carregarContatos(userId);
      },
    });
  }

  async function removerContato(contato: Contato) {
    if (!userId) return;
    await supabase
      .from("contatos")
      .delete()
      .eq("usuario_id", userId)
      .eq("contato_id", contato.id);
    if (ativo?.id === contato.id) setAtivo(null);
    await carregarContatos(userId);
  }

  const avatarDe = (url: string | null | undefined) => url || buddy;

  return (
    <div className={`msn-root ${tremendo ? "msn-shaking" : ""}`}>
      <h1 className="sr-only">Windows Live Messenger</h1>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={trocarAvatar}
      />

      <div className="msn-shell">
        {/* Painel de contatos */}
        <aside className="msn-contacts">
          <div className="msn-userinfo">
            <img
              src={avatarDe(perfil?.avatar_url)}
              alt="Sua foto"
              width={48}
              height={48}
              className="msn-avatar"
              title="Clique para trocar foto"
              onClick={() => fileRef.current?.click()}
            />
            <div className="flex-1">
              <div className="msn-username">{perfil?.nome ?? "Carregando..."}</div>
              {perfil?.musica && (
                <div className="text-[11px] text-[#666]">🎵 {perfil.musica}</div>
              )}
              <select
                className="msn-select mt-1"
                aria-label="Meu status"
                value={perfil?.status ?? "online"}
                onChange={(e) => mudarStatus(e.target.value)}
              >
                {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="msn-search border-b border-[#e0e0e0] p-2">
            <input
              placeholder="Buscar contatos..."
              aria-label="Buscar contatos"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {filtrados.length === 0 && (
              <p className="p-3 text-center text-[11px] text-[#999]">
                Nenhum contato ainda. Clique em ➕ Adicionar.
              </p>
            )}
            {filtrados.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`msn-contact ${ativo?.id === c.id ? "active" : ""}`}
                onClick={() => abrirChat(c)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, contato: c });
                }}
              >
                <img
                  src={avatarDe(c.avatar_url)}
                  alt=""
                  width={36}
                  height={36}
                  className="msn-contact-avatar"
                />
                <span className="min-w-0 flex-1">
                  <span className="msn-contact-name block truncate">{c.apelido ?? c.nome}</span>
                  <span className={`msn-contact-status ${c.status}`}>{c.status}</span>
                  {c.musica && (
                    <span className="block truncate text-[10px] text-[#666]">🎵 {c.musica}</span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-[#d4d4d4] p-2.5">
            <button type="button" className="msn-btn-small flex-1" onClick={pedirContato}>
              ➕ Adicionar
            </button>
            <button type="button" className="msn-btn-small flex-1" onClick={pedirMusica}>
              🎵 Música
            </button>
            <button type="button" className="msn-btn-small flex-1" onClick={sair}>
              🚪 Sair
            </button>
          </div>
        </aside>

        {/* Área de chat */}
        <section className="msn-chat">
          {!ativo ? (
            <div className="msn-empty">
              <img
                src={buddy}
                alt="MSN Messenger"
                width={128}
                height={128}
                loading="lazy"
                className="mb-5 w-32 opacity-50"
              />
              <h2 className="text-[16px] font-bold text-[#777]">Windows Live Messenger</h2>
              <p className="text-[13px]">Selecione um contato para começar a conversar</p>
              <p className="mt-2.5 text-[11px] text-[#aaa]">
                Clique com o botão direito no contato para:
                <br />⚡ Winks | 📳 Toque de atenção | 🎨 Desenho | 🎮 Jogos
              </p>
            </div>
          ) : (
            <>
              <div className="msn-chat-header">
                <img
                  src={avatarDe(ativo.avatar_url)}
                  alt=""
                  width={36}
                  height={36}
                  className="msn-contact-avatar"
                />
                <div>
                  <div className="text-[14px] font-bold text-[#333]">
                    {ativo.apelido ?? ativo.nome}
                  </div>
                  <div className={`msn-contact-status ${ativo.status}`}>{ativo.status}</div>
                </div>
              </div>

              <div className="msn-messages">
                {mensagens.map((m) => {
                  const meu = m.remetente_id === userId;
                  return (
                    <div key={m.id} className={`msn-msg ${meu ? "sent" : "received"}`}>
                      {m.tipo === "wink" && (
                        <div className="text-center">
                          <div className="text-[40px]">⚡</div>
                          <strong>Wink {meu ? "enviado" : "recebido"}!</strong>
                        </div>
                      )}
                      {m.tipo === "nudge" && (
                        <div className="text-center">
                          <div className="text-[30px]">📳</div>
                          <strong>Toque de atenção!</strong>
                        </div>
                      )}
                      {m.tipo === "drawing" && (
                        <div className="text-center">
                          <div className="text-[13px]">🎨 Desenho:</div>
                          <img
                            src={m.mensagem}
                            alt="Rabisco"
                            loading="lazy"
                            className="mt-1.5 max-w-[200px] border border-[#ccc]"
                          />
                        </div>
                      )}
                      {m.tipo === "texto" && <div>{formatarMensagem(m.mensagem)}</div>}
                      <div className="msn-msg-time">{formatarHora(m.enviada_em)}</div>
                    </div>
                  );
                })}
                <div ref={fimRef} />
              </div>

              <div className="msn-composer">
                <div className="mb-1.5 flex gap-1.5">
                  <button
                    type="button"
                    className="msn-tool"
                    title="Emoticons"
                    onClick={() => setEmoticons((v) => !v)}
                  >
                    😊
                  </button>
                  <button
                    type="button"
                    className="msn-tool"
                    title="Wink"
                    onClick={() => {
                      piscar();
                      void enviar("Wink!", "wink");
                    }}
                  >
                    ⚡
                  </button>
                  <button
                    type="button"
                    className="msn-tool"
                    title="Toque de atenção"
                    onClick={() => {
                      tremer();
                      void enviar("Toque de atenção!", "nudge");
                    }}
                  >
                    📳
                  </button>
                  <button
                    type="button"
                    className="msn-tool"
                    title="Desenho"
                    onClick={() => setDesenho(true)}
                  >
                    🎨
                  </button>
                  <button
                    type="button"
                    className="msn-tool"
                    title="Jogos"
                    onClick={() => setJogos(true)}
                  >
                    🎮
                  </button>
                </div>

                {emoticons && (
                  <div className="absolute bottom-[86px] left-2.5 z-50 grid grid-cols-8 gap-1 rounded border border-[#ccc] bg-white p-2.5 shadow-[2px_2px_10px_rgba(0,0,0,0.2)]">
                    {EMOTICON_PALETTE.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="h-[30px] w-[30px] rounded bg-[#f5f5f5] text-[18px] transition-colors hover:bg-[#e8f0fe]"
                        onClick={() => {
                          setTexto((t) => t + emoji);
                          setEmoticons(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5">
                  <textarea
                    className="msn-textarea"
                    placeholder="Digite sua mensagem..."
                    aria-label="Mensagem"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void enviarTexto();
                      }
                    }}
                  />
                  <button type="button" className="msn-btn px-5" onClick={() => void enviarTexto()}>
                    Enviar
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Menu de contexto */}
      {menu && (
        <div
          className="fixed z-[9999] min-w-[180px] rounded border border-[#ccc] bg-white py-1.5 shadow-[2px_2px_10px_rgba(0,0,0,0.2)]"
          style={{ left: menu.x, top: menu.y }}
        >
          {[
            { texto: "💬 Enviar mensagem", acao: () => void abrirChat(menu.contato) },
            { texto: "🎨 Enviar desenho", acao: () => { void abrirChat(menu.contato); setDesenho(true); } },
            {
              texto: "⚡ Enviar Wink",
              acao: async () => {
                await abrirChat(menu.contato);
                piscar();
                await enviarPara(menu.contato, "Wink!", "wink");
              },
            },
            {
              texto: "📳 Toque de atenção",
              acao: async () => {
                await abrirChat(menu.contato);
                tremer();
                await enviarPara(menu.contato, "Toque de atenção!", "nudge");
              },
            },
            { texto: "🎮 Jogar", acao: () => { void abrirChat(menu.contato); setJogos(true); } },
            { texto: "✏️ Editar apelido", acao: () => editarApelido(menu.contato) },
            { texto: "❌ Remover contato", acao: () => void removerContato(menu.contato) },
          ].map((op) => (
            <button
              key={op.texto}
              type="button"
              className="block w-full px-3 py-1.5 text-left text-[12px] text-[#333] hover:bg-[#e8f0fe]"
              onClick={() => {
                void op.acao();
                setMenu(null);
              }}
            >
              {op.texto}
            </button>
          ))}
        </div>
      )}

      {/* Wink em tela cheia */}
      {wink && <div className="msn-wink">⚡</div>}

      {/* Notificações */}
      <div className="msn-toast space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="msn-window">
            <div className="msn-titlebar">
              <div className="msn-titlebar-left">
                <span>{t.titulo}</span>
              </div>
            </div>
            <div className="p-2.5 text-[12px] text-[#333]">{t.texto}</div>
          </div>
        ))}
      </div>

      {/* Janela de entrada de texto (adicionar contato, música, apelido) */}
      {prompt && (
        <div className="msn-overlay">
          <form
            className="msn-window w-full max-w-[360px]"
            onSubmit={(e) => {
              e.preventDefault();
              const valor = new FormData(e.currentTarget).get("valor") as string;
              prompt.onOk(valor ?? "");
              setPrompt(null);
            }}
          >
            <div className="msn-titlebar">
              <div className="msn-titlebar-left">
                <span>{prompt.titulo}</span>
              </div>
              <div className="msn-titlebar-right">
                <button type="button" aria-label="Fechar" onClick={() => setPrompt(null)}>
                  ✕
                </button>
              </div>
            </div>
            <div className="msn-body">
              <label className="msn-label" htmlFor="promptValor">
                {prompt.label}
              </label>
              <input
                id="promptValor"
                name="valor"
                className="msn-input"
                defaultValue={prompt.valor}
                autoFocus
              />
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className="msn-btn-small" onClick={() => setPrompt(null)}>
                  Cancelar
                </button>
                <button type="submit" className="msn-btn px-4">
                  OK
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {desenho && ativo && (
        <DrawModal
          nomeContato={ativo.apelido ?? ativo.nome}
          onClose={() => setDesenho(false)}
          onSend={(dataUrl) => {
            setDesenho(false);
            void enviar(dataUrl, "drawing");
          }}
        />
      )}

      {jogos && ativo && (
        <GamesModal nomeContato={ativo.apelido ?? ativo.nome} onClose={() => setJogos(false)} />
      )}
    </div>
  );
}