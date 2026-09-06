export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim().toUpperCase());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function publicQuestion(q: any) {
  return {
    id: q.id,
    type: q.type,
    topic: q.topic,
    prompt: q.prompt,
    options: q.options,
  };
}

export function userIdFromContext(ctx: any): string {
  const id = ctx?.userClaims?.sub;
  if (!id) throw new Error('Sessão de usuário inválida.');
  return String(id);
}
