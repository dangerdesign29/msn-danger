import { supabase } from "@/integrations/supabase/client";

export const TAMANHO_MAXIMO = 25 * 1024 * 1024; // 25 MB

export type AnexoEnviado = {
  caminho: string;
  nome: string;
  tipo: string;
  tamanho: number;
};

function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
}

export async function enviarAnexo(
  userId: string,
  arquivo: File | Blob,
  nomeOriginal?: string,
): Promise<AnexoEnviado> {
  const nome = nomeOriginal ?? (arquivo instanceof File ? arquivo.name : "arquivo");
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new Error("Arquivo maior que 25 MB");
  }
  const caminho = `${userId}/${crypto.randomUUID()}-${nomeSeguro(nome)}`;
  const { error } = await supabase.storage.from("anexos").upload(caminho, arquivo, {
    contentType: arquivo.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return {
    caminho,
    nome,
    tipo: arquivo.type || "application/octet-stream",
    tamanho: arquivo.size,
  };
}

const cache = new Map<string, { url: string; expira: number }>();

export async function urlAssinada(caminho: string): Promise<string | null> {
  const agora = Date.now();
  const guardado = cache.get(caminho);
  if (guardado && guardado.expira > agora) return guardado.url;

  const { data, error } = await supabase.storage.from("anexos").createSignedUrl(caminho, 3600);
  if (error || !data?.signedUrl) return null;
  cache.set(caminho, { url: data.signedUrl, expira: agora + 55 * 60 * 1000 });
  return data.signedUrl;
}

export async function baixarAnexo(caminho: string, nome: string) {
  const { data, error } = await supabase.storage.from("anexos").download(caminho);
  if (error || !data) return false;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

export function formatarTamanho(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function iconeArquivo(tipo: string | null | undefined) {
  if (!tipo) return "📎";
  if (tipo.startsWith("image/")) return "🖼️";
  if (tipo.startsWith("video/")) return "🎬";
  if (tipo.startsWith("audio/")) return "🎵";
  if (tipo.includes("pdf")) return "📕";
  if (tipo.includes("zip") || tipo.includes("rar")) return "🗜️";
  if (tipo.includes("sheet") || tipo.includes("excel")) return "📊";
  if (tipo.includes("word") || tipo.includes("document")) return "📄";
  return "📎";
}