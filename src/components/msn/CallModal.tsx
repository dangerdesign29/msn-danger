import { useEffect, useRef, useState } from "react";

import { enviarSinal, fecharCanalSinal, SERVIDORES_ICE, type Sinal } from "@/lib/rtc";
import { playSound } from "@/lib/msn";
import { pararToque, tocarToque } from "@/lib/toque";
import { PADROES, pararVibracao, vibrar } from "@/lib/vibrar";

export type ChamadaAtiva = {
  outroId: string;
  nome: string;
  video: boolean;
  papel: "chamando" | "recebendo";
  sdp?: RTCSessionDescriptionInit;
};

type Props = {
  userId: string;
  meuNome?: string | undefined;
  chamada: ChamadaAtiva;
  registrarSinal: (fn: ((s: Sinal) => void) | null) => void;
  onEncerrar: () => void;
};

export function CallModal({ userId, meuNome, chamada, registrarSinal, onEncerrar }: Props) {
  const [estado, setEstado] = useState<"preparando" | "chamando" | "ativa" | "erro">("preparando");
  const [erro, setErro] = useState("");
  const [semMic, setSemMic] = useState(false);
  const [semCam, setSemCam] = useState(!chamada.video);
  const [segundos, setSegundos] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const videoLocal = useRef<HTMLVideoElement | null>(null);
  const videoRemoto = useRef<HTMLVideoElement | null>(null);
  const audioRemoto = useRef<HTMLAudioElement | null>(null);
  const pendentes = useRef<RTCIceCandidateInit[]>([]);
  const encerrado = useRef(false);
  const semRespostaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let vivo = true;

    async function iniciar() {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: chamada.video ? { facingMode: "user" } : false,
        });
      } catch {
        setEstado("erro");
        setErro(
          chamada.video
            ? "Precisamos da sua permissão de câmera e microfone para a chamada."
            : "Precisamos da sua permissão de microfone para a chamada.",
        );
        void enviarSinal(chamada.outroId, { tipo: "chamada-fim", de: userId, motivo: "permissao" });
        return;
      }
      if (!vivo) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localRef.current = stream;
      if (videoLocal.current) videoLocal.current.srcObject = stream;

      const pc = new RTCPeerConnection(SERVIDORES_ICE);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (ev) => {
        const [remoto] = ev.streams;
        if (!remoto) return;
        // Audio sempre em um <audio> proprio: garante som mesmo em chamada de voz.
        if (audioRemoto.current) {
          audioRemoto.current.srcObject = remoto;
          void audioRemoto.current.play().catch(() => undefined);
        }
        if (videoRemoto.current) {
          videoRemoto.current.srcObject = remoto;
          void videoRemoto.current.play().catch(() => undefined);
        }
        setEstado("ativa");
        pararToque();
        pararVibracao();
      };
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          void enviarSinal(chamada.outroId, {
            tipo: "chamada-ice",
            de: userId,
            candidato: ev.candidate.toJSON(),
          });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setEstado("ativa");
          pararToque();
          pararVibracao();
        }
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          pararToque();
          setEstado("erro");
          setErro("A conexão caiu.");
        }
      };

      registrarSinal(async (s) => {
        if (s.tipo === "chamada-resposta") {
          await pc.setRemoteDescription(new RTCSessionDescription(s.sdp));
          for (const c of pendentes.current) await pc.addIceCandidate(new RTCIceCandidate(c));
          pendentes.current = [];
        } else if (s.tipo === "chamada-ice") {
          if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(s.candidato));
          else pendentes.current.push(s.candidato);
        } else if (s.tipo === "chamada-fim" || s.tipo === "chamada-recusada") {
          pararToque();
          onEncerrar();
        }
      });

      if (chamada.papel === "chamando") {
        const oferta = await pc.createOffer();
        await pc.setLocalDescription(oferta);
        setEstado("chamando");
        playSound("nudge");
        tocarToque("saida");
        vibrar(PADROES.chamada);
        await enviarSinal(chamada.outroId, {
          tipo: "chamada-oferta",
          de: userId,
          nome: meuNome ?? "",
          video: chamada.video,
          sdp: oferta,
        });
        // Sem resposta em 40s: encerra dos dois lados.
        semRespostaRef.current = setTimeout(() => {
          if (pc.connectionState !== "connected") {
            setEstado("erro");
            setErro("Ninguém atendeu a chamada.");
            pararToque();
            void enviarSinal(chamada.outroId, {
              tipo: "chamada-fim",
              de: userId,
              motivo: "sem-resposta",
            });
            setTimeout(onEncerrar, 1600);
          }
        }, 40000);
      } else if (chamada.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(chamada.sdp));
        const resposta = await pc.createAnswer();
        await pc.setLocalDescription(resposta);
        await enviarSinal(chamada.outroId, { tipo: "chamada-resposta", de: userId, sdp: resposta });
        for (const c of pendentes.current) await pc.addIceCandidate(new RTCIceCandidate(c));
        pendentes.current = [];
        setEstado("ativa");
      }
    }

    void iniciar();

    return () => {
      vivo = false;
      registrarSinal(null);
      if (semRespostaRef.current) clearTimeout(semRespostaRef.current);
      pararToque();
      pararVibracao();
      localRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      fecharCanalSinal(chamada.outroId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (estado === "ativa" && semRespostaRef.current) clearTimeout(semRespostaRef.current);
  }, [estado]);

  useEffect(() => {
    if (estado !== "ativa") return;
    const i = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [estado]);

  function desligar() {
    if (!encerrado.current) {
      encerrado.current = true;
      void enviarSinal(chamada.outroId, { tipo: "chamada-fim", de: userId });
    }
    pararToque();
    onEncerrar();
  }

  function alternarMic() {
    const faixa = localRef.current?.getAudioTracks()[0];
    if (!faixa) return;
    faixa.enabled = !faixa.enabled;
    setSemMic(!faixa.enabled);
    vibrar(PADROES.clique);
  }

  function alternarCam() {
    const faixa = localRef.current?.getVideoTracks()[0];
    if (!faixa) return;
    faixa.enabled = !faixa.enabled;
    setSemCam(!faixa.enabled);
    vibrar(PADROES.clique);
  }

  const tempo = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[520px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>
              {chamada.video ? "📹" : "📞"} Chamada com {chamada.nome}
            </span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Encerrar chamada" onClick={desligar}>
              ✕
            </button>
          </div>
        </div>

        <div className="msn-chamada-palco">
          <audio ref={audioRemoto} autoPlay playsInline className="hidden" />
          {chamada.video ? (
            <>
              <video ref={videoRemoto} autoPlay playsInline className="msn-video-remoto" />
              <video ref={videoLocal} autoPlay playsInline muted className="msn-video-local" />
            </>
          ) : (
            <>
              <video ref={videoRemoto} autoPlay playsInline className="hidden" />
              <div className="msn-chamada-audio">
                <div className={estado === "ativa" ? "msn-anim-pulsar text-[64px]" : "text-[64px]"}>
                  {estado === "ativa" ? "🔊" : "📞"}
                </div>
                <p className="text-[14px] font-bold text-white">{chamada.nome}</p>
              </div>
            </>
          )}

          <div className="msn-chamada-status">
            {estado === "preparando" && "Pedindo permissão..."}
            {estado === "chamando" && "Chamando… aguarde atender 📲"}
            {estado === "ativa" && `Em chamada — ${tempo}`}
            {estado === "erro" && erro}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 bg-[#f1f1f1] p-3">
          <button type="button" className="msn-btn-small px-3" onClick={alternarMic}>
            {semMic ? "🔇 Microfone off" : "🎙️ Microfone on"}
          </button>
          {chamada.video && (
            <button type="button" className="msn-btn-small px-3" onClick={alternarCam}>
              {semCam ? "📷 Câmera off" : "📹 Câmera on"}
            </button>
          )}
          <button type="button" className="msn-btn-desligar" onClick={desligar}>
            📴 Desligar
          </button>
        </div>
      </div>
    </div>
  );
}
