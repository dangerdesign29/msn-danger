/** Toque de chamada (ring/ringback) gerado por WebAudio, no estilo MSN. */
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let ganho: GainNode | null = null;

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx || ctx.state === "closed") ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function bipe(freq: number, inicio: number, duracao: number, volume: number) {
  const c = contexto();
  if (!c || !ganho) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + inicio);
  g.gain.linearRampToValueAtTime(volume, c.currentTime + inicio + 0.03);
  g.gain.setValueAtTime(volume, c.currentTime + inicio + duracao - 0.05);
  g.gain.linearRampToValueAtTime(0, c.currentTime + inicio + duracao);
  osc.connect(g).connect(ganho);
  osc.start(c.currentTime + inicio);
  osc.stop(c.currentTime + inicio + duracao + 0.02);
}

/**
 * Inicia o toque em loop.
 * `entrada` = chamada recebida (mais alto), `saida` = ringback de quem liga.
 */
export function tocarToque(modo: "entrada" | "saida" = "entrada") {
  const c = contexto();
  if (!c) return;
  pararToque();
  ganho = c.createGain();
  ganho.gain.value = modo === "entrada" ? 0.16 : 0.07;
  ganho.connect(c.destination);

  const ciclo = () => {
    if (modo === "entrada") {
      bipe(880, 0, 0.32, 1);
      bipe(1046, 0.36, 0.32, 1);
      bipe(880, 0.9, 0.32, 1);
      bipe(1046, 1.26, 0.32, 1);
    } else {
      bipe(440, 0, 0.8, 1);
    }
  };
  ciclo();
  timer = setInterval(ciclo, modo === "entrada" ? 2600 : 3000);
}

export function pararToque() {
  if (timer) clearInterval(timer);
  timer = null;
  if (ganho) {
    try {
      ganho.disconnect();
    } catch {
      /* ignora */
    }
    ganho = null;
  }
}
