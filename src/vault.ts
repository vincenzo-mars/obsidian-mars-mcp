import * as fs from "fs/promises";
import * as path from "path";

if (!process.env.VAULT_PATH) {
  throw new Error("Variabile d'ambiente VAULT_PATH non impostata.");
}

export const VAULT_PATH = path.resolve(process.env.VAULT_PATH);

/**
 * Risolve un path relativo alla vault e verifica che non esca dalla root.
 * Aggiunge automaticamente l'estensione .md se mancante.
 */
export function resolvePath(notePath: string, addExtension = true): string {
  let normalized = notePath;
  if (
    addExtension &&
    !normalized.endsWith(".md") &&
    !path.extname(normalized)
  ) {
    normalized += ".md";
  }
  const resolved = path.resolve(VAULT_PATH, normalized);
  if (!resolved.startsWith(VAULT_PATH + path.sep) && resolved !== VAULT_PATH) {
    throw new Error(`Accesso negato: path fuori dalla vault`);
  }
  return resolved;
}

/**
 * Restituisce il path relativo alla vault root (per output user-friendly).
 */
export function relativePath(absolutePath: string): string {
  return path.relative(VAULT_PATH, absolutePath);
}

/**
 * Verifica che la vault esista e sia accessibile.
 */
export async function checkVaultExists(): Promise<void> {
  try {
    await fs.access(VAULT_PATH);
  } catch {
    throw new Error(
      `Vault non trovata: ${VAULT_PATH}\nImposta VAULT_PATH nella variabile d'ambiente.`,
    );
  }
}

/**
 * Assicura che la directory padre di un file esista (crea se necessario).
 */
export async function ensureParentDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}
