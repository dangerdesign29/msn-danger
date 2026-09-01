import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import buddy from "@/assets/msn-buddy.png";
import { supabase } from "@/integrations/supabase/client";
import { playSound } from "@/lib/msn";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MSN Messenger — Entrar na sua conta" },
      {
        name: "description",
        content:
          "Reviva o Windows Live Messenger: entre com seu e-mail, adicione contatos e converse com winks, toques e emoticons clássicos.",
      },
      { property: "og:title", content: "MSN Messenger — Entrar na sua conta" },
      {
        property: "og:description",
        content:
          "Reviva o Windows Live Messenger: entre com seu e-mail, adicione contatos e converse com winks, toques e emoticons clássicos.",
      },
    ],
  }),
  component: Login,
});

type Aviso = { tipo: "error" | "success"; texto: string } | null;

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [cadastro, setCadastro] = useState(false);

  const [regNome, setRegNome] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regSenha, setRegSenha] = useState("");
  const [regConfirmar, setRegConfirmar] = useState("");
  const [regAviso, setRegAviso] = useState<Aviso>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/messenger" });
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setAviso(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setAviso({ tipo: "error", texto: "E-mail ou senha incorretos." });
      return;
    }
    playSound("login");
    navigate({ to: "/messenger" });
  }

  async function criarConta(e: React.FormEvent) {
    e.preventDefault();
    setRegAviso(null);
    if (regSenha !== regConfirmar) {
      setRegAviso({ tipo: "error", texto: "As senhas não conferem." });
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regSenha,
      options: {
        data: { nome: regNome },
        emailRedirectTo: `${window.location.origin}/messenger`,
      },
    });
    if (error) {
      setRegAviso({ tipo: "error", texto: error.message });
      return;
    }
    setRegAviso({ tipo: "success", texto: "Conta criada! Já pode entrar." });
    setEmail(regEmail);
  }

  return (
    <main className="msn-root msn-desktop">
      <h1 className="sr-only">Windows Live Messenger</h1>

      <section className="msn-window w-full max-w-[500px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <img src={buddy} alt="" width={20} height={20} className="h-5 w-5" />
            <span>Windows Live Messenger</span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Minimizar">
              _
            </button>
            <button type="button" aria-label="Fechar">
              ✕
            </button>
          </div>
        </div>

        <div className="msn-body flex flex-col gap-5 sm:flex-row">
          <div className="flex shrink-0 items-center justify-center sm:basis-[140px]">
            <img
              src={buddy}
              alt="Boneco do MSN Messenger"
              width={120}
              height={120}
              className="w-[120px]"
            />
          </div>

          <div className="flex-1">
            <h2 className="text-[18px] font-bold text-[#0054e3]">Entrar</h2>
            <p className="mb-5 text-[12px] text-[#666]">Com sua conta do Messenger</p>

            <form onSubmit={entrar}>
              <div className="mb-3">
                <label className="msn-label" htmlFor="loginEmail">
                  E-mail:
                </label>
                <input
                  id="loginEmail"
                  className="msn-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="msn-label" htmlFor="loginSenha">
                  Senha:
                </label>
                <input
                  id="loginSenha"
                  className="msn-input"
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>

              <div className="mb-4 flex items-center justify-between text-[11px] text-[#666]">
                <label className="flex items-center gap-1">
                  <input type="checkbox" /> Lembrar minha senha
                </label>
                <span className="msn-link font-normal">Esqueceu a senha?</span>
              </div>

              <button type="submit" className="msn-btn w-full" disabled={carregando}>
                {carregando ? "Conectando..." : "Entrar"}
              </button>
            </form>

            <p className="mt-4 text-center text-[12px] text-[#666]">
              Não tem conta?{" "}
              <button type="button" className="msn-link" onClick={() => setCadastro(true)}>
                Cadastre-se aqui
              </button>
            </p>

            {aviso && <div className={`msn-message-box ${aviso.tipo}`}>{aviso.texto}</div>}
          </div>
        </div>

        <div className="msn-statusbar">
          <span className="msn-dot" />
          <span>Conectando...</span>
        </div>
      </section>

      {cadastro && (
        <div className="msn-overlay">
          <div className="msn-window w-full max-w-[380px]">
            <div className="msn-titlebar">
              <div className="msn-titlebar-left">
                <span>Cadastro - Windows Live Messenger</span>
              </div>
              <div className="msn-titlebar-right">
                <button type="button" aria-label="Fechar" onClick={() => setCadastro(false)}>
                  ✕
                </button>
              </div>
            </div>

            <div className="msn-body">
              <form onSubmit={criarConta}>
                <div className="mb-3">
                  <label className="msn-label" htmlFor="regNome">
                    Nome:
                  </label>
                  <input
                    id="regNome"
                    className="msn-input"
                    required
                    value={regNome}
                    onChange={(e) => setRegNome(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="msn-label" htmlFor="regEmail">
                    E-mail:
                  </label>
                  <input
                    id="regEmail"
                    className="msn-input"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="msn-label" htmlFor="regSenha">
                    Senha:
                  </label>
                  <input
                    id="regSenha"
                    className="msn-input"
                    type="password"
                    required
                    minLength={6}
                    value={regSenha}
                    onChange={(e) => setRegSenha(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="msn-label" htmlFor="regConfirmar">
                    Confirmar Senha:
                  </label>
                  <input
                    id="regConfirmar"
                    className="msn-input"
                    type="password"
                    required
                    minLength={6}
                    value={regConfirmar}
                    onChange={(e) => setRegConfirmar(e.target.value)}
                  />
                </div>

                <button type="submit" className="msn-btn w-full">
                  Criar Conta
                </button>
              </form>

              {regAviso && (
                <div className={`msn-message-box ${regAviso.tipo}`}>{regAviso.texto}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
