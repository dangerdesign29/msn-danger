import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import buddy from "@/assets/msn-buddy.png";
import { Anexo } from "@/components/msn/Anexo";
import { BuscarModal } from "@/components/msn/BuscarModal";
import { CallModal, type ChamadaAtiva } from "@/components/msn/CallModal";
import { DrawModal } from "@/components/msn/DrawModal";
import { GamesModal, type JogoId } from "@/components/msn/GamesModal";
import { GrupoModal } from "@/components/msn/GrupoModal";
import { InstalarApp } from "@/components/msn/InstalarApp";
import { JogoOnline, type Sessao } from "@/components/msn/JogoOnline";
import { ThemeModal } from "@/components/msn/ThemeModal";
import { WinksModal } from "@/components/msn/WinksModal";
import { supabase } from "@/integrations/supabase/client";
import { enviarAnexo } from "@/lib/anexos";
import { estaOnline, lerConversa, lerListas, salvarConversa, salvarListas } from "@/lib/cache";
import { esvaziarFila, enfileirar, lerFila } from "@/lib/fila";
import {
  jaPerguntou,
  mostrarNotificacao,
  pedirPermissao,
  permissaoAtual,
} from "@/lib/notificacoes";
import { enviarPush } from "@/lib/push.functions";
import { ativarPush, registrarServiceWorker, suportaPush } from "@/lib/push";
import { canalConversa, canalPessoal, enviarSinal, type Sinal } from "@/lib/rtc";
import { pararToque, tocarToque } from "@/lib/toque";
import { PADROES, pararVibracao, vibrar } from "@/lib/vibrar";
import {
  EMOTICON_PALETTE,
  STATUS_LABEL,
  arquivoParaAvatar,
  formatarHora,
  formatarMensagem,
  playSound,
  type Contato,
  type Conversa,
  type Grupo,
  type Mensagem,
  type Perfil,
} from "@/lib/msn";
import { aplicarTema, lerTemaLocal, salvarTemaLocal, TEMA_PADRAO, type Tema } from "@/lib/tema";
import { acharWink, type Wink } from "@/lib/winks";

export const Route = createFileRoute("/messenger")({
  head: () => ({
    meta: [
      { title: "Messenger — Suas conversas | MSN" },
      {
        name: "description",
        content:
          "Converse em tempo real: contatos, grupos, anexos, áudios, winks animados, emoticons e temas personalizáveis no visual clássico do MSN.",
      },
      { property: "og:title", content: "Messenger — Suas conversas | MSN" },
      {
        property: "og:description",
        content: "Grupos, anexos, winks animados e temas no clássico visual do Windows Live Messenger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Messenger,
});

const PAGINA = 30;
const REACOES_RAPIDAS = ["👍", "😂", "😮", "😢", "❤️", "🔥"] as const;

type Toast = { id: number; titulo: string; texto: string };
type Prompt = { titulo: string; label: string; valor: string; onOk: (v: string) => void };

function Messenger() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [buscaMsg, setBuscaMsg] = useState("");
  const [buscandoMsg, setBuscandoMsg] = useState(false);
  const [texto, setTexto] = useState("");
  const [emoticons, setEmoticons] = useState(false);
  const [desenho, setDesenho] = useState(false);
  const [jogos, setJogos] = useState(false);
  const [winksAberto, setWinksAberto] = useState(false);
  const [buscarAberto, setBuscarAberto] = useState(false);
  const [temaAberto, setTemaAberto] = useState(false);
  const [tema, setTema] = useState<Tema>(TEMA_PADRAO);
  const [winkAtivo, setWinkAtivo] = useState<Wink | null>(null);
  const [tremendo, setTremendo] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; contato: Contato } | null>(null);
  const [mostrarChat, setMostrarChat] = useState(false);
  const [chamada, setChamada] = useState<ChamadaAtiva | null>(null);
  const [recebendo, setRecebendo] = useState<ChamadaAtiva | null>(null);
  const [jogoSessao, setJogoSessao] = useState<Sessao | null>(null);
  const [jogoAguardando, setJogoAguardando] = useState(false);
  const [convite, setConvite] = useState<{ de: string; nome: string; jogo: JogoId } | null>(null);
  const [pedirNotif, setPedirNotif] = useState(false);
  const [online, setOnline] = useState(true);
  const [digitando, setDigitando] = useState<string | null>(null);
  const [grupoAberto, setGrupoAberto] = useState<Grupo | null>(null);
  const [pushAtivo, setPushAtivo] = useState(false);
  const [respondendo, setRespondendo] = useState<Mensagem | null>(null);
  const [reacoes, setReacoes] = useState<Record<string, { emoji: string; usuario_id: string }[]>>({});
  const [barraReacao, setBarraReacao] = useState<string | null>(null);
  const [naFila, setNaFila] = useState(0);

  const ativoRef = useRef<Conversa | null>(null);
  ativoRef.current = ativo;
  const contatosRef = useRef<Contato[]>([]);
  const chamadaRef = useRef<ChamadaAtiva | null>(null);
  chamadaRef.current = chamada ?? recebendo;
  const sinalRef = useRef<((s: Sinal) => void) | null>(null);
  const fimRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<HTMLInputElement | null>(null);
  const anexoRef = useRef<HTMLInputElement | null>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const digitandoCanalRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const digitandoEnviadoRef = useRef(0);
  const pararDigitarRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limparDigitandoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registrarSinal = useCallback((fn: ((s: Sinal) => void) | null) => {
    sinalRef.current = fn;
  }, []);

  const nomeDe = useCallback((id: string) => {
    const c = contatosRef.current.find((x) => x.id === id);
    return c ? (c.apelido ?? c.nome) : "Contato";
  }, []);

  const notificar = useCallback((titulo: string, textoToast: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, titulo, texto: textoToast }]);
    mostrarNotificacao(titulo, textoToast);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const tremer = useCallback(() => {
    setTremendo(true);
    playSound("nudge");
    vibrar(PADROES.toque);
    setTimeout(() => setTremendo(false), 600);
  }, []);

  const tocarWink = useCallback((w: Wink) => {
    setWinkAtivo(w);
    playSound(w.som);
    vibrar(PADROES.wink);
    setTimeout(() => setWinkAtivo(null), 1600);
  }, []);

  // ---------- carregamentos ----------
  const carregarContatos = useCallback(async (uid: string) => {
    const { data: vinculos } = await supabase
      .from("contatos")
      .select("contato_id, apelido")
      .eq("usuario_id", uid);
    const ids = (vinculos ?? []).map((v) => v.contato_id);
    if (ids.length === 0) {
      setContatos([]);
      contatosRef.current = [];
      return;
    }
    const { data: perfis } = await supabase.from("perfis").select("*").in("id", ids);
    const lista = (perfis ?? []).map((p) => ({
      ...(p as unknown as Perfil),
      apelido: vinculos?.find((v) => v.contato_id === p.id)?.apelido ?? null,
    }));
    lista.sort((a, b) => {
      const pa = a.status === "offline" ? 1 : 0;
      const pb = b.status === "offline" ? 1 : 0;
      return pa - pb || (a.apelido ?? a.nome).localeCompare(b.apelido ?? b.nome);
    });
    setContatos(lista);
    contatosRef.current = lista;
    salvarListas({ contatos: lista });
  }, []);

  const carregarGrupos = useCallback(async () => {
    const { data } = await supabase.from("grupos").select("*").order("criado_em");
    const lista = (data ?? []) as unknown as Grupo[];
    setGrupos(lista);
    salvarListas({ grupos: lista });
  }, []);

  const filtroConversa = useCallback((uid: string, c: Conversa) => {
    if (c.tipo === "grupo") return { coluna: "grupo_id", valor: c.id, uid };
    return { coluna: "dm", valor: c.id, uid };
  }, []);

  const consultaBase = useCallback((uid: string, c: Conversa) => {
    const q = supabase.from("mensagens").select("*");
    if (c.tipo === "grupo") return q.eq("grupo_id", c.id);
    return q
      .is("grupo_id", null)
      .or(
        `and(remetente_id.eq.${uid},destinatario_id.eq.${c.id}),and(remetente_id.eq.${c.id},destinatario_id.eq.${uid})`,
      );
  }, []);

  const marcarLidas = useCallback(async (uid: string, c: Conversa) => {
    if (c.tipo !== "dm") return;
    await supabase
      .from("mensagens")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq("destinatario_id", uid)
      .eq("remetente_id", c.id)
      .eq("lida", false);
  }, []);

  const carregarMensagens = useCallback(
    async (uid: string, c: Conversa) => {
      const cache = lerConversa(c);
      if (cache.length > 0) setMensagens(cache);
      const { data } = await consultaBase(uid, c)
        .order("enviada_em", { ascending: false })
        .limit(PAGINA);
      if (!data) {
        setTemMais(false);
        return;
      }
      const lista = ((data ?? []) as unknown as Mensagem[]).slice().reverse();
      setMensagens(lista);
      setTemMais((data ?? []).length === PAGINA);
      salvarConversa(c, lista);
      await marcarLidas(uid, c);
    },
    [consultaBase, marcarLidas],
  );

  async function carregarAntigas() {
    if (!userId || !ativo || mensagens.length === 0) return;
    const maisAntiga = mensagens[0]!.enviada_em;
    const { data } = await consultaBase(userId, ativo)
      .lt("enviada_em", maisAntiga)
      .order("enviada_em", { ascending: false })
      .limit(PAGINA);
    const lista = ((data ?? []) as unknown as Mensagem[]).slice().reverse();
    setMensagens((m) => [...lista, ...m]);
    setTemMais((data ?? []).length === PAGINA);
  }

  async function buscarNoHistorico(termo: string) {
    if (!userId || !ativo) return;
    setBuscaMsg(termo);
    if (!termo.trim()) {
      setBuscandoMsg(false);
      await carregarMensagens(userId, ativo);
      return;
    }
    setBuscandoMsg(true);
    const { data } = await consultaBase(userId, ativo)
      .ilike("mensagem", `%${termo.trim()}%`)
      .order("enviada_em", { ascending: false })
      .limit(100);
    setMensagens(((data ?? []) as unknown as Mensagem[]).slice().reverse());
    setTemMais(false);
  }

  // ---------- sessão ----------
  useEffect(() => {
    let vivo = true;
    aplicarTema(lerTemaLocal());
    setTema(lerTemaLocal());
    const cache = lerListas();
    if (cache) {
      if (cache.perfil) setPerfil(cache.perfil);
      setContatos(cache.contatos);
      contatosRef.current = cache.contatos;
      setGrupos(cache.grupos);
    }
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      const session = data.session;
      if (!session) {
        void navigate({ to: "/" });
        return;
      }
      const uid = session.user.id;
      setUserId(uid);
      const { data: p } = await supabase.from("perfis").select("*").eq("id", uid).maybeSingle();
      if (p) {
        setPerfil(p as unknown as Perfil);
        salvarListas({ perfil: p as unknown as Perfil });
        const salvo = (p as { tema?: unknown }).tema as Tema | null;
        if (salvo && typeof salvo === "object") {
          const t = { ...TEMA_PADRAO, ...salvo };
          setTema(t);
          aplicarTema(t);
          salvarTemaLocal(t);
        }
      }
      await supabase.from("perfis").update({ status: "online" }).eq("id", uid);
      await carregarContatos(uid);
      await carregarGrupos();
      playSound("login");
    });
    return () => {
      vivo = false;
    };
  }, [navigate, carregarContatos, carregarGrupos]);

  // ---------- tempo real ----------
  useEffect(() => {
    if (!userId) return;

    const receber = (msg: Mensagem) => {
      const atual = ativoRef.current;
      const daConversa =
        atual &&
        (atual.tipo === "grupo"
          ? msg.grupo_id === atual.id
          : msg.grupo_id === null &&
            (msg.remetente_id === atual.id || msg.destinatario_id === atual.id));

      if (daConversa) {
        setMensagens((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
        if (atual) void marcarLidas(userId, atual);
      } else {
        void supabase
          .from("mensagens")
          .update({ entregue_em: new Date().toISOString() })
          .eq("id", msg.id)
          .is("entregue_em", null);
      }

      if (msg.tipo === "nudge") {
        tremer();
        notificar("Toque de atenção!", "Alguém te chamou 📳");
      } else if (msg.tipo === "wink") {
        const w = acharWink(msg.mensagem);
        if (w) tocarWink(w);
        else playSound("wink");
        notificar("Wink recebido!", w ? `${w.emoji} ${w.frase}` : "Você recebeu um wink ⚡");
      } else {
        playSound("message");
        vibrar(PADROES.mensagem);
        if (!daConversa) {
          notificar(
            "Nova mensagem",
            msg.tipo === "drawing"
              ? "🎨 Um rabisco chegou"
              : msg.anexo_url
                ? `📎 ${msg.anexo_nome ?? "Anexo"}`
                : formatarMensagem(msg.mensagem),
          );
        }
      }
      void carregarContatos(userId);
    };

    const canalDm = supabase
      .channel("msn-dm")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `destinatario_id=eq.${userId}`,
        },
        (p) => receber(p.new as Mensagem),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mensagens",
          filter: `remetente_id=eq.${userId}`,
        },
        (p) => {
          const msg = p.new as Mensagem;
          setMensagens((m) => m.map((x) => (x.id === msg.id ? { ...x, ...msg } : x)));
        },
      )
      .subscribe();

    const canalGrupos = supabase
      .channel("msn-grupo-msgs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens" },
        (p) => {
          const msg = p.new as Mensagem;
          if (!msg.grupo_id || msg.remetente_id === userId) return;
          receber(msg);
        },
      )
      .subscribe();

    const canalOutros = supabase
      .channel("msn-listas")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "perfis" }, () => {
        void carregarContatos(userId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contatos" }, () => {
        void carregarContatos(userId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "grupo_membros" }, () => {
        void carregarGrupos();
      })
      .subscribe();

    const intervalo = setInterval(() => {
      void carregarContatos(userId);
      void carregarGrupos();
    }, 20000);

    return () => {
      void supabase.removeChannel(canalDm);
      void supabase.removeChannel(canalGrupos);
      void supabase.removeChannel(canalOutros);
      clearInterval(intervalo);
    };
  }, [userId, tremer, tocarWink, notificar, carregarContatos, carregarGrupos, marcarLidas]);

  useEffect(() => {
    if (!buscandoMsg) fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, buscandoMsg]);

  // ---------- sinalização de chamadas e jogos ----------
  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(canalPessoal(userId))
      .on("broadcast", { event: "sinal" }, ({ payload }) => {
        const s = payload as Sinal;
        if (s.tipo === "chamada-oferta") {
          if (chamadaRef.current) {
            void enviarSinal(s.de, { tipo: "chamada-fim", de: userId, motivo: "ocupado" });
            return;
          }
          setRecebendo({
            outroId: s.de,
            nome: s.nome || nomeDe(s.de),
            video: s.video,
            papel: "recebendo",
            sdp: s.sdp,
          });
          playSound("nudge");
          tocarToque("entrada");
          vibrar(PADROES.chamada);
          mostrarNotificacao(
            `${s.nome || nomeDe(s.de)} está te chamando`,
            s.video ? "📹 Chamada de vídeo — toque para atender" : "📞 Chamada de voz — toque para atender",
            { tag: "msn-chamada", sempre: true, urgente: true },
          );
          return;
        }
        if (s.tipo === "jogo-convite") {
          setConvite({ de: s.de, nome: nomeDe(s.de), jogo: s.jogo as JogoId });
          playSound("wink");
          vibrar(PADROES.wink);
          return;
        }
        if (s.tipo === "jogo-aceito") {
          setJogoAguardando(false);
          setJogos(false);
          setJogoSessao({
            jogo: s.jogo as JogoId,
            outroId: s.de,
            nome: nomeDe(s.de),
            anfitriao: true,
          });
          return;
        }
        if (s.tipo === "jogo-recusado") {
          setJogoAguardando(false);
          notificar("Jogo recusado", `${nomeDe(s.de)} não quer jogar agora.`);
          return;
        }
        if (s.tipo === "chamada-fim" && !sinalRef.current) {
          setRecebendo(null);
          pararToque();
          pararVibracao();
          return;
        }
        sinalRef.current?.(s);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [userId, nomeDe, notificar]);

  // ---------- permissão de notificações ----------
  useEffect(() => {
    if (!userId) return;
    if (permissaoAtual() === "default" && !jaPerguntou()) {
      const t = setTimeout(() => setPedirNotif(true), 2500);
      return () => clearTimeout(t);
    }
    return;
  }, [userId]);

  // ---------- push real (service worker) ----------
  useEffect(() => {
    if (!userId) return;
    void registrarServiceWorker();
    if (!suportaPush()) return;
    if (permissaoAtual() === "granted") {
      void ativarPush().then((r) => setPushAtivo(r === "ok"));
    }
  }, [userId]);

  // ---------- modo offline ----------
  useEffect(() => {
    setOnline(estaOnline());
    const ligou = () => setOnline(true);
    const caiu = () => setOnline(false);
    window.addEventListener("online", ligou);
    window.addEventListener("offline", caiu);
    return () => {
      window.removeEventListener("online", ligou);
      window.removeEventListener("offline", caiu);
    };
  }, []);

  // ---------- fila de envio (mensagens feitas sem internet) ----------
  useEffect(() => {
    if (!userId) return;
    setNaFila(lerFila().length);
    let ocupado = false;
    const tentar = async () => {
      if (ocupado || !estaOnline() || lerFila().length === 0) return;
      ocupado = true;
      const enviadas = await esvaziarFila(userId);
      ocupado = false;
      setNaFila(lerFila().length);
      if (enviadas > 0) {
        playSound("send");
        notificar("Mensagens enviadas", `${enviadas} mensagem(ns) da fila foram entregues.`);
        setMensagens((m) => m.filter((x) => !x.pendente));
        const atual = ativoRef.current;
        if (atual) await carregarMensagens(userId, atual);
      }
    };
    void tentar();
    window.addEventListener("online", tentar);
    const intervalo = setInterval(() => void tentar(), 10000);
    return () => {
      window.removeEventListener("online", tentar);
      clearInterval(intervalo);
    };
  }, [userId, notificar, carregarMensagens]);

  useEffect(() => {
    if (ativo && mensagens.length > 0 && !buscandoMsg) salvarConversa(ativo, mensagens);
  }, [ativo, mensagens, buscandoMsg]);

  // ---------- reações ----------
  const idsReais = useMemo(
    () => mensagens.filter((m) => !m.pendente).map((m) => m.id),
    [mensagens],
  );
  const chaveIds = idsReais.join(",");

  const carregarReacoes = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setReacoes({});
      return;
    }
    const { data } = await supabase
      .from("reacoes")
      .select("mensagem_id, emoji, usuario_id")
      .in("mensagem_id", ids);
    const mapa: Record<string, { emoji: string; usuario_id: string }[]> = {};
    for (const r of data ?? []) {
      (mapa[r.mensagem_id] ??= []).push({ emoji: r.emoji, usuario_id: r.usuario_id });
    }
    setReacoes(mapa);
  }, []);

  useEffect(() => {
    const ids = chaveIds ? chaveIds.split(",") : [];
    void carregarReacoes(ids);
    if (ids.length === 0) return;
    const canal = supabase
      .channel("msn-reacoes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reacoes" }, () => {
        void carregarReacoes(ids);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [chaveIds, carregarReacoes]);

  async function alternarReacao(mensagemId: string, emoji: string) {
    if (!userId) return;
    setBarraReacao(null);
    vibrar(PADROES.clique);
    const minhas = (reacoes[mensagemId] ?? []).filter(
      (r) => r.usuario_id === userId && r.emoji === emoji,
    );
    if (minhas.length > 0) {
      await supabase
        .from("reacoes")
        .delete()
        .eq("mensagem_id", mensagemId)
        .eq("usuario_id", userId)
        .eq("emoji", emoji);
    } else {
      await supabase
        .from("reacoes")
        .insert({ mensagem_id: mensagemId, usuario_id: userId, emoji });
      playSound("wink");
    }
    await carregarReacoes(chaveIds ? chaveIds.split(",") : []);
  }

  // ---------- "digitando…" em tempo real ----------
  useEffect(() => {
    if (!userId || !ativo) {
      setDigitando(null);
      return;
    }
    const canal = supabase
      .channel(canalConversa(ativo.tipo, ativo.id, userId), {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "digitando" }, ({ payload }) => {
        const p = payload as { de: string; nome: string; ativo: boolean };
        if (p.de === userId) return;
        if (limparDigitandoRef.current) clearTimeout(limparDigitandoRef.current);
        if (!p.ativo) {
          setDigitando(null);
          return;
        }
        setDigitando(p.nome);
        limparDigitandoRef.current = setTimeout(() => setDigitando(null), 5000);
      })
      .subscribe();
    digitandoCanalRef.current = canal;
    return () => {
      digitandoCanalRef.current = null;
      setDigitando(null);
      if (limparDigitandoRef.current) clearTimeout(limparDigitandoRef.current);
      void supabase.removeChannel(canal);
    };
  }, [userId, ativo]);

  const avisarDigitando = useCallback(
    (ativoAgora: boolean) => {
      const canal = digitandoCanalRef.current;
      if (!canal || !userId) return;
      const agora = Date.now();
      if (ativoAgora && agora - digitandoEnviadoRef.current < 1800) return;
      digitandoEnviadoRef.current = ativoAgora ? agora : 0;
      void canal.send({
        type: "broadcast",
        event: "digitando",
        payload: { de: userId, nome: perfil?.nome ?? "Contato", ativo: ativoAgora },
      });
    },
    [userId, perfil?.nome],
  );

  const digitou = useCallback(() => {
    avisarDigitando(true);
    if (pararDigitarRef.current) clearTimeout(pararDigitarRef.current);
    pararDigitarRef.current = setTimeout(() => avisarDigitando(false), 2500);
  }, [avisarDigitando]);

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
  const gruposFiltrados = useMemo(
    () => grupos.filter((g) => g.nome.toLowerCase().includes(busca.trim().toLowerCase())),
    [grupos, busca],
  );

  // ---------- ações ----------
  async function abrirConversa(c: Conversa) {
    setAtivo(c);
    setEmoticons(false);
    setBuscaMsg("");
    setBuscandoMsg(false);
    setMostrarChat(true);
    vibrar(PADROES.clique);
    if (userId) await carregarMensagens(userId, c);
  }

  function iniciarChamada(video: boolean) {
    if (!ativo || ativo.tipo !== "dm") return;
    vibrar(PADROES.clique);
    setChamada({ outroId: ativo.id, nome: ativo.nome, video, papel: "chamando" });
    // Avisa por push para o contato atender mesmo com o app fechado.
    void enviarPush({
      data: {
        paraId: ativo.id,
        titulo: `${perfil?.nome ?? "Alguém"} está te chamando`,
        corpo: video ? "📹 Chamada de vídeo — abra para atender" : "📞 Chamada de voz — abra para atender",
      },
    }).catch(() => {});
  }

  function convidarJogo(jogo: JogoId) {
    if (!userId || !ativo || ativo.tipo !== "dm") return;
    setJogoAguardando(true);
    void enviarSinal(ativo.id, {
      tipo: "jogo-convite",
      de: userId,
      nome: perfil?.nome ?? "Contato",
      jogo,
    });
  }

  const conversaDoContato = (c: Contato): Conversa => ({
    tipo: "dm",
    id: c.id,
    nome: c.apelido ?? c.nome,
    avatar: c.avatar_url,
    status: c.status,
  });

  async function enviarEm(
    destino: Conversa | null,
    conteudo: string,
    tipo: string,
    anexo?: { caminho: string; nome: string; tipo: string; tamanho: number },
    respondeA?: string | null,
  ) {
    if (!userId || !destino) return;
    // Sem internet: guarda na fila local e mostra como pendente.
    if (!estaOnline() && !anexo) {
      const item = enfileirar({
        conversaTipo: destino.tipo,
        conversaId: destino.id,
        mensagem: conteudo,
        tipo,
        responde_a: respondeA ?? null,
      });
      setNaFila(lerFila().length);
      if (ativoRef.current?.id === destino.id) {
        setMensagens((m) => [
          ...m,
          {
            id: item.id,
            remetente_id: userId,
            destinatario_id: destino.tipo === "dm" ? destino.id : null,
            grupo_id: destino.tipo === "grupo" ? destino.id : null,
            mensagem: conteudo,
            tipo,
            lida: false,
            enviada_em: item.criado_em,
            lida_em: null,
            entregue_em: null,
            anexo_url: null,
            anexo_nome: null,
            anexo_tipo: null,
            anexo_tamanho: null,
            responde_a: respondeA ?? null,
            pendente: true,
          },
        ]);
      }
      return;
    }

    const { data, error } = await supabase
      .from("mensagens")
      .insert({
        remetente_id: userId,
        destinatario_id: destino.tipo === "dm" ? destino.id : null,
        grupo_id: destino.tipo === "grupo" ? destino.id : null,
        mensagem: conteudo,
        tipo,
        responde_a: respondeA ?? null,
        anexo_url: anexo?.caminho ?? null,
        anexo_nome: anexo?.nome ?? null,
        anexo_tipo: anexo?.tipo ?? null,
        anexo_tamanho: anexo?.tamanho ?? null,
      })
      .select()
      .maybeSingle();
    if (error && !anexo) {
      enfileirar({
        conversaTipo: destino.tipo,
        conversaId: destino.id,
        mensagem: conteudo,
        tipo,
        responde_a: respondeA ?? null,
      });
      setNaFila(lerFila().length);
      notificar("Sem conexão", "Sua mensagem ficou na fila e sai sozinha quando a internet voltar.");
      return;
    }
    if (data && ativoRef.current?.id === destino.id) {
      setMensagens((m) => [...m, data as unknown as Mensagem]);
    }
    playSound("send");
    void enviarPush({
      data: {
        ...(destino.tipo === "grupo" ? { grupoId: destino.id } : { paraId: destino.id }),
        titulo:
          destino.tipo === "grupo"
            ? `${perfil?.nome ?? "Alguém"} em ${destino.nome}`
            : (perfil?.nome ?? "Nova mensagem"),
        corpo:
          tipo === "texto" ? conteudo.slice(0, 120) : tipo === "anexo" ? "📎 Enviou um arquivo" : "✨ Enviou um wink",
      },
    }).catch(() => {});
  }

  async function enviarTexto() {
    const conteudo = texto.trim();
    if (!conteudo) return;
    setTexto("");
    const alvo = respondendo?.id ?? null;
    setRespondendo(null);
    if (pararDigitarRef.current) clearTimeout(pararDigitarRef.current);
    avisarDigitando(false);
    await enviarEm(ativo, conteudo, "texto", undefined, alvo);
  }

  async function enviarArquivo(arquivo: File | Blob, nome?: string) {
    if (!userId || !ativo) return;
    setEnviandoAnexo(true);
    try {
      const info = await enviarAnexo(userId, arquivo, nome);
      await enviarEm(ativo, info.nome, "anexo", info);
    } catch (e) {
      notificar("Erro no anexo", e instanceof Error ? e.message : "Falha ao enviar arquivo.");
    } finally {
      setEnviandoAnexo(false);
    }
  }

  async function alternarGravacao() {
    if (gravando) {
      gravadorRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const pedacos: Blob[] = [];
      rec.ondataavailable = (e) => pedacos.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setGravando(false);
        const blob = new Blob(pedacos, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 0) void enviarArquivo(blob, `audio-${Date.now()}.webm`);
      };
      gravadorRef.current = rec;
      rec.start();
      setGravando(true);
    } catch {
      notificar("Microfone", "Não foi possível acessar o microfone.");
    }
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

  async function salvarTema(novo: Tema) {
    setTema(novo);
    aplicarTema(novo);
    salvarTemaLocal(novo);
    setTemaAberto(false);
    if (userId) {
      await supabase
        .from("perfis")
        .update({ tema: novo as unknown as never })
        .eq("id", userId);
    }
    notificar("Tema salvo", "Sua aparência foi atualizada.");
  }

  async function sair() {
    if (userId) await supabase.from("perfis").update({ status: "offline" }).eq("id", userId);
    playSound("logout");
    await supabase.auth.signOut();
    void navigate({ to: "/" });
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

  function selo(m: Mensagem) {
    if (m.remetente_id !== userId || m.grupo_id) return null;
    if (m.pendente) return <span className="msn-selo" title="Na fila, sem internet">🕒</span>;
    if (m.lida) return <span className="msn-selo lida" title="Lida">✓✓</span>;
    if (m.entregue_em) return <span className="msn-selo" title="Entregue">✓✓</span>;
    return <span className="msn-selo" title="Enviada">✓</span>;
  }

  function resumoMsg(m: Mensagem) {
    if (m.tipo === "texto") return m.mensagem.slice(0, 90);
    if (m.tipo === "anexo") return `📎 ${m.anexo_nome ?? "arquivo"}`;
    if (m.tipo === "drawing") return "🎨 Desenho";
    if (m.tipo === "wink") return "⚡ Wink";
    return "📳 Toque de atenção";
  }

  return (
    <div className={`msn-root ${tremendo ? "msn-shaking" : ""}`}>
      <h1 className="sr-only">Windows Live Messenger</h1>

      {!online && (
        <div className="msn-offline" role="status">
          📴 Sem internet — mostrando conversas salvas no aparelho
        </div>
      )}
      {online && pushAtivo && <span className="sr-only">Notificações push ativas</span>}

      <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={trocarAvatar} />
      <input
        ref={anexoRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void enviarArquivo(f);
          e.target.value = "";
        }}
      />

      <div className={`msn-shell ${mostrarChat ? "mostrar-chat" : ""}`}>
        <aside className="msn-contacts">
          <div className="msn-userinfo">
            <img
              src={avatarDe(perfil?.avatar_url)}
              alt="Sua foto"
              width={48}
              height={48}
              className="msn-avatar"
              title="Clique para trocar foto"
              onClick={() => avatarRef.current?.click()}
            />
            <div className="flex-1">
              <div className="msn-username">{perfil?.nome ?? "Carregando..."}</div>
              {perfil?.musica && <div className="text-[11px] text-[#666]">🎵 {perfil.musica}</div>}
              <select
                className="msn-select mt-1"
                aria-label="Meu status"
                value={perfil?.status ?? "online"}
                onChange={(e) => void mudarStatus(e.target.value)}
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
              placeholder="Filtrar contatos e grupos..."
              aria-label="Filtrar contatos e grupos"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {gruposFiltrados.length > 0 && (
              <p className="px-2 py-1 text-[10px] font-bold uppercase text-[#888]">Grupos</p>
            )}
            {gruposFiltrados.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`msn-contact ${ativo?.tipo === "grupo" && ativo.id === g.id ? "active" : ""}`}
                onClick={() =>
                  void abrirConversa({
                    tipo: "grupo",
                    id: g.id,
                    nome: g.nome,
                    avatar: g.avatar_url,
                    status: "online",
                  })
                }
              >
                <span className="msn-grupo-icone">👥</span>
                <span className="min-w-0 flex-1">
                  <span className="msn-contact-name block truncate">{g.nome}</span>
                  <span className="msn-contact-status online">grupo</span>
                </span>
              </button>
            ))}

            <p className="px-2 py-1 text-[10px] font-bold uppercase text-[#888]">Contatos</p>
            {filtrados.length === 0 && (
              <p className="p-3 text-center text-[11px] text-[#999]">
                Nenhum contato ainda. Clique em 🔎 Encontrar.
              </p>
            )}
            {filtrados.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`msn-contact ${ativo?.tipo === "dm" && ativo.id === c.id ? "active" : ""}`}
                onClick={() => void abrirConversa(conversaDoContato(c))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, contato: c });
                }}
              >
                <img src={avatarDe(c.avatar_url)} alt="" width={36} height={36} className="msn-contact-avatar" />
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
            <button type="button" className="msn-btn-small flex-1" onClick={() => setBuscarAberto(true)}>
              🔎 Encontrar
            </button>
            <button type="button" className="msn-btn-small flex-1" onClick={() => setTemaAberto(true)}>
              🎨 Tema
            </button>
            <button type="button" className="msn-btn-small flex-1" onClick={pedirMusica}>
              🎵 Música
            </button>
            <button type="button" className="msn-btn-small flex-1" onClick={() => void sair()}>
              🚪 Sair
            </button>
          </div>
        </aside>

        <section className="msn-chat">
          {!ativo ? (
            <div className="msn-empty">
              <img src={buddy} alt="MSN Messenger" width={128} height={128} loading="lazy" className="mb-5 w-32 opacity-50" />
              <h2 className="text-[16px] font-bold text-[#777]">Windows Live Messenger</h2>
              <p className="text-[13px]">Selecione um contato ou grupo para começar</p>
              <p className="mt-2.5 text-[11px] text-[#aaa]">
                ⚡ Winks | 📳 Toque | 🎨 Desenho | 🎮 Jogos | 📎 Anexos | 🎤 Áudio
              </p>
            </div>
          ) : (
            <>
              <div className="msn-chat-header">
                <button
                  type="button"
                  className="msn-btn-small md:hidden"
                  aria-label="Voltar para contatos"
                  onClick={() => setMostrarChat(false)}
                >
                  ←
                </button>
                {ativo.tipo === "grupo" ? (
                  <span className="msn-grupo-icone">👥</span>
                ) : (
                  <img src={avatarDe(ativo.avatar)} alt="" width={36} height={36} className="msn-contact-avatar" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold text-[#333]">{ativo.nome}</div>
                  <div className={`msn-contact-status ${ativo.status}`}>
                    {ativo.tipo === "grupo" ? "conversa em grupo" : ativo.status}
                  </div>
                </div>
                {ativo.tipo === "dm" && (
                  <>
                    <button
                      type="button"
                      className="msn-tool"
                      title="Chamada de voz"
                      onClick={() => iniciarChamada(false)}
                    >
                      📞
                    </button>
                    <button
                      type="button"
                      className="msn-tool"
                      title="Chamada de vídeo"
                      onClick={() => iniciarChamada(true)}
                    >
                      📹
                    </button>
                  </>
                )}
                {ativo.tipo === "grupo" && (
                  <button
                    type="button"
                    className="msn-tool"
                    title="Membros do grupo"
                    onClick={() => {
                      const g = grupos.find((x) => x.id === ativo.id);
                      if (g) setGrupoAberto(g);
                    }}
                  >
                    ⚙️
                  </button>
                )}
                <input
                  className="msn-input hidden w-[150px] sm:block"
                  placeholder="Buscar no histórico"
                  aria-label="Buscar no histórico da conversa"
                  value={buscaMsg}
                  onChange={(e) => void buscarNoHistorico(e.target.value)}
                />
              </div>

              <div className="msn-messages">
                {buscandoMsg && (
                  <p className="text-center text-[11px] text-[#777]">
                    {mensagens.length} resultado(s) para “{buscaMsg}”
                  </p>
                )}
                {!buscandoMsg && temMais && (
                  <button type="button" className="msn-btn-small mx-auto" onClick={() => void carregarAntigas()}>
                    ↑ Carregar mensagens antigas
                  </button>
                )}
                {mensagens.map((m) => {
                  const meu = m.remetente_id === userId;
                  const w = m.tipo === "wink" ? acharWink(m.mensagem) : undefined;
                  const citada = m.responde_a
                    ? mensagens.find((x) => x.id === m.responde_a)
                    : undefined;
                  const reagidas = reacoes[m.id] ?? [];
                  const agrupadas = Array.from(
                    reagidas.reduce((mapa, r) => {
                      const atual = mapa.get(r.emoji) ?? { total: 0, minha: false };
                      mapa.set(r.emoji, {
                        total: atual.total + 1,
                        minha: atual.minha || r.usuario_id === userId,
                      });
                      return mapa;
                    }, new Map<string, { total: number; minha: boolean }>()),
                  );
                  return (
                    <div key={m.id} className={`msn-msg ${meu ? "sent" : "received"} ${m.pendente ? "pendente" : ""}`}>
                      {citada && (
                        <div className="msn-citacao">
                          <strong>{citada.remetente_id === userId ? "Você" : ativo.nome}</strong>
                          <span>{resumoMsg(citada)}</span>
                        </div>
                      )}
                      {m.tipo === "wink" && (
                        <div className="text-center">
                          <div className={`text-[40px] msn-anim-${w?.anim ?? "zoom"}`}>{w?.emoji ?? "⚡"}</div>
                          <strong>{w?.frase ?? "Wink!"}</strong>
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
                          <img src={m.mensagem} alt="Rabisco" loading="lazy" className="mt-1.5 max-w-[200px] border border-[#ccc]" />
                        </div>
                      )}
                      {m.tipo === "anexo" && m.anexo_url && (
                        <Anexo
                          caminho={m.anexo_url}
                          nome={m.anexo_nome ?? "arquivo"}
                          tipo={m.anexo_tipo ?? "application/octet-stream"}
                          tamanho={m.anexo_tamanho}
                        />
                      )}
                      {m.tipo === "texto" && <div>{formatarMensagem(m.mensagem)}</div>}
                      {agrupadas.length > 0 && (
                        <div className="msn-reacoes">
                          {agrupadas.map(([emoji, info]) => (
                            <button
                              key={emoji}
                              type="button"
                              className={`msn-reacao ${info.minha ? "minha" : ""}`}
                              onClick={() => void alternarReacao(m.id, emoji)}
                            >
                              {emoji} {info.total}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="msn-msg-time">
                        {formatarHora(m.enviada_em)} {selo(m)}
                      </div>
                      {!m.pendente && (
                        <div className="msn-msg-acoes">
                          <button
                            type="button"
                            title="Responder"
                            onClick={() => {
                              setRespondendo(m);
                              vibrar(PADROES.clique);
                            }}
                          >
                            ↩
                          </button>
                          <button
                            type="button"
                            title="Reagir"
                            onClick={() => setBarraReacao((v) => (v === m.id ? null : m.id))}
                          >
                            😊
                          </button>
                          {barraReacao === m.id && (
                            <div className="msn-reacao-barra">
                              {REACOES_RAPIDAS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => void alternarReacao(m.id, emoji)}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={fimRef} />
              </div>

              <div className="msn-composer">
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  <button type="button" className="msn-tool" title="Emoticons" onClick={() => setEmoticons((v) => !v)}>
                    😊
                  </button>
                  <button type="button" className="msn-tool" title="Galeria de winks" onClick={() => setWinksAberto(true)}>
                    ⚡
                  </button>
                  <button
                    type="button"
                    className="msn-tool"
                    title="Toque de atenção"
                    onClick={() => {
                      tremer();
                      void enviarEm(ativo, "Toque de atenção!", "nudge");
                    }}
                  >
                    📳
                  </button>
                  <button type="button" className="msn-tool" title="Desenho" onClick={() => setDesenho(true)}>
                    🎨
                  </button>
                  <button type="button" className="msn-tool" title="Jogos" onClick={() => setJogos(true)}>
                    🎮
                  </button>
                  <button
                    type="button"
                    className="msn-tool"
                    title="Enviar arquivo, imagem ou vídeo"
                    onClick={() => anexoRef.current?.click()}
                    disabled={enviandoAnexo}
                  >
                    📎
                  </button>
                  <button
                    type="button"
                    className={`msn-tool ${gravando ? "msn-gravando" : ""}`}
                    title={gravando ? "Parar e enviar áudio" : "Gravar áudio"}
                    onClick={() => void alternarGravacao()}
                  >
                    {gravando ? "⏹" : "🎤"}
                  </button>
                  {enviandoAnexo && <span className="self-center text-[11px] text-[#555]">Enviando anexo…</span>}
                </div>

                {emoticons && (
                  <div className="absolute bottom-[96px] left-2.5 z-50 grid grid-cols-8 gap-1 rounded border border-[#ccc] bg-white p-2.5 shadow-[2px_2px_10px_rgba(0,0,0,0.2)]">
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

                {digitando && (
                  <div className="msn-digitando" aria-live="polite">
                    <span className="msn-digitando-bolinhas">
                      <i />
                      <i />
                      <i />
                    </span>
                    {digitando} está digitando…
                  </div>
                )}

                <div className="flex gap-1.5">
                  <textarea
                    className="msn-textarea"
                    placeholder="Digite sua mensagem..."
                    aria-label="Mensagem"
                    value={texto}
                    onChange={(e) => {
                      setTexto(e.target.value);
                      if (e.target.value.trim()) digitou();
                    }}
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

      {menu && (
        <div
          className="fixed z-[9999] min-w-[180px] rounded border border-[#ccc] bg-white py-1.5 shadow-[2px_2px_10px_rgba(0,0,0,0.2)]"
          style={{ left: menu.x, top: menu.y }}
        >
          {[
            { texto: "💬 Enviar mensagem", acao: () => abrirConversa(conversaDoContato(menu.contato)) },
            {
              texto: "🎨 Enviar desenho",
              acao: async () => {
                await abrirConversa(conversaDoContato(menu.contato));
                setDesenho(true);
              },
            },
            {
              texto: "⚡ Galeria de winks",
              acao: async () => {
                await abrirConversa(conversaDoContato(menu.contato));
                setWinksAberto(true);
              },
            },
            {
              texto: "📳 Toque de atenção",
              acao: async () => {
                const conv = conversaDoContato(menu.contato);
                await abrirConversa(conv);
                tremer();
                await enviarEm(conv, "Toque de atenção!", "nudge");
              },
            },
            {
              texto: "🎮 Jogar",
              acao: async () => {
                await abrirConversa(conversaDoContato(menu.contato));
                setJogos(true);
              },
            },
            { texto: "✏️ Editar apelido", acao: async () => editarApelido(menu.contato) },
            { texto: "❌ Remover contato", acao: () => removerContato(menu.contato) },
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

      {winkAtivo && (
        <div className={`msn-wink msn-anim-${winkAtivo.anim}`}>{winkAtivo.emoji}</div>
      )}

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
              <input id="promptValor" name="valor" className="msn-input" defaultValue={prompt.valor} autoFocus />
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

      {buscarAberto && (
        <BuscarModal
          onClose={() => setBuscarAberto(false)}
          onAdicionado={() => {
            if (userId) void carregarContatos(userId);
          }}
          onGrupoCriado={async (id) => {
            setBuscarAberto(false);
            await carregarGrupos();
            notificar("Grupo criado", "Já pode conversar com a turma!");
            void abrirConversa({ tipo: "grupo", id, nome: "Novo grupo", avatar: null, status: "online" });
          }}
        />
      )}

      {temaAberto && (
        <ThemeModal tema={tema} onClose={() => setTemaAberto(false)} onSalvar={(t) => void salvarTema(t)} />
      )}

      {winksAberto && ativo && (
        <WinksModal
          onClose={() => setWinksAberto(false)}
          onEnviar={(w) => {
            setWinksAberto(false);
            tocarWink(w);
            void enviarEm(ativo, w.id, "wink");
          }}
        />
      )}

      {desenho && ativo && (
        <DrawModal
          nomeContato={ativo.nome}
          onClose={() => setDesenho(false)}
          onSend={(dataUrl) => {
            setDesenho(false);
            void enviarEm(ativo, dataUrl, "drawing");
          }}
        />
      )}

      {jogos && ativo && ativo.tipo === "dm" && (
        <GamesModal
          nomeContato={ativo.nome}
          aguardando={jogoAguardando}
          onConvidar={convidarJogo}
          onClose={() => {
            setJogos(false);
            setJogoAguardando(false);
          }}
        />
      )}

      {jogoSessao && userId && (
        <JogoOnline
          userId={userId}
          sessao={jogoSessao}
          registrarSinal={registrarSinal}
          onClose={() => setJogoSessao(null)}
        />
      )}

      {convite && userId && (
        <div className="msn-overlay">
          <div className="msn-window w-full max-w-[340px]">
            <div className="msn-titlebar">
              <div className="msn-titlebar-left">
                <span>🎮 Convite para jogar</span>
              </div>
            </div>
            <div className="msn-body text-center">
              <p className="text-[13px] text-[#333]">
                <strong>{convite.nome}</strong> te chamou para jogar{" "}
                <strong>
                  {convite.jogo === "velha"
                    ? "Jogo da Velha"
                    : convite.jogo === "pedra"
                      ? "Pedra, Papel e Tesoura"
                      : "Jogo da Memória"}
                </strong>
                .
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  className="msn-btn-small px-3"
                  onClick={() => {
                    void enviarSinal(convite.de, { tipo: "jogo-recusado", de: userId });
                    setConvite(null);
                  }}
                >
                  Agora não
                </button>
                <button
                  type="button"
                  className="msn-btn px-4"
                  onClick={() => {
                    void enviarSinal(convite.de, {
                      tipo: "jogo-aceito",
                      de: userId,
                      jogo: convite.jogo,
                    });
                    setJogoSessao({
                      jogo: convite.jogo,
                      outroId: convite.de,
                      nome: convite.nome,
                      anfitriao: false,
                    });
                    setConvite(null);
                  }}
                >
                  Jogar!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {recebendo && userId && (
        <div className="msn-overlay">
          <div className="msn-window w-full max-w-[340px]">
            <div className="msn-titlebar">
              <div className="msn-titlebar-left">
                <span>{recebendo.video ? "📹" : "📞"} Chamada recebida</span>
              </div>
            </div>
            <div className="msn-body text-center">
              <div className="msn-chamando-icone text-[52px]">📞</div>
              <p className="text-[14px] font-bold text-[#333]">{recebendo.nome}</p>
              <p className="text-[12px] text-[#666]">
                está te chamando {recebendo.video ? "em vídeo" : "por voz"}…
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  className="msn-btn-desligar"
                  onClick={() => {
                    void enviarSinal(recebendo.outroId, { tipo: "chamada-recusada", de: userId });
                    pararToque();
                    pararVibracao();
                    setRecebendo(null);
                  }}
                >
                  📴 Recusar
                </button>
                <button
                  type="button"
                  className="msn-btn px-4"
                  onClick={() => {
                    pararToque();
                    pararVibracao();
                    setChamada(recebendo);
                    setRecebendo(null);
                  }}
                >
                  ✅ Atender
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {chamada && userId && (
        <CallModal
          userId={userId}
          meuNome={perfil?.nome ?? undefined}
          chamada={chamada}
          registrarSinal={registrarSinal}
          onEncerrar={() => {
            pararToque();
            pararVibracao();
            setChamada(null);
          }}
        />
      )}

      {pedirNotif && (
        <div className="msn-instalar">
          <span className="text-[24px]">🔔</span>
          <div className="min-w-0 flex-1 text-[11px] leading-tight text-[#333]">
            <strong className="block text-[12px]">Ativar notificações</strong>
            Avisamos quando chegar mensagem, toque ou chamada mesmo com o app fechado.
          </div>
          <button
            type="button"
            className="msn-btn px-3 py-1 text-[11px]"
            onClick={async () => {
              const r = await pedirPermissao();
              setPedirNotif(false);
              if (r === "granted") {
                notificar("Notificações ativadas", "Agora você não perde nada 🔔");
                const p = await ativarPush();
                setPushAtivo(p === "ok");
              }
            }}
          >
            Permitir
          </button>
          <button type="button" className="msn-btn-small" aria-label="Dispensar" onClick={() => setPedirNotif(false)}>
            ✕
          </button>
        </div>
      )}

      {!pedirNotif && <InstalarApp />}

      {grupoAberto && (
        <GrupoModal
          grupo={grupoAberto}
          contatos={contatos}
          onClose={() => setGrupoAberto(null)}
          onMudou={() => void carregarGrupos()}
          onSaiu={() => {
            setGrupoAberto(null);
            setAtivo(null);
            void carregarGrupos();
          }}
        />
      )}
    </div>
  );
}