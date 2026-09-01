import { useRef, useState } from "react";

type Props = {
  nomeContato: string;
  onClose: () => void;
  onSend: (dataUrl: string) => void;
};

export function DrawModal({ nomeContato, onClose, onSend }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pintando = useRef(false);
  const [cor, setCor] = useState("#000000");
  const [espessura, setEspessura] = useState(3);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    };
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    pintando.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function desenhar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!pintando.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineWidth = espessura;
    ctx.strokeStyle = cor;
    ctx.lineCap = "round";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function parar() {
    pintando.current = false;
    canvasRef.current?.getContext("2d")?.beginPath();
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[520px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>Rabisco para {nomeContato}</span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Fechar" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 border-b border-[#ccc] bg-[#f1f1f1] p-2.5">
          <input
            type="color"
            aria-label="Cor do pincel"
            className="h-[30px] w-[30px] cursor-pointer"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
          />
          <input
            type="range"
            aria-label="Espessura do pincel"
            min={1}
            max={10}
            value={espessura}
            onChange={(e) => setEspessura(Number(e.target.value))}
            className="w-[100px]"
          />
          <button type="button" className="msn-btn-small" onClick={limpar}>
            🗑️ Limpar
          </button>
          <button
            type="button"
            className="msn-btn-small"
            onClick={() => {
              const url = canvasRef.current?.toDataURL("image/png");
              if (url) onSend(url);
            }}
          >
            📨 Enviar
          </button>
        </div>

        <div className="flex justify-center bg-[#ece9d8] p-2.5">
          <canvas
            ref={canvasRef}
            width={480}
            height={360}
            onPointerDown={iniciar}
            onPointerMove={desenhar}
            onPointerUp={parar}
            onPointerLeave={parar}
            className="max-w-full cursor-crosshair touch-none border border-[#999] bg-white"
          />
        </div>
      </div>
    </div>
  );
}
