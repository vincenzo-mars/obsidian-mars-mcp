import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

export const VAULT_ROOT = (() => {
  return path.join(os.homedir(), "Documenti", "Obsidian");
})();

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
  const resolved = path.resolve(VAULT_ROOT, normalized);
  if (!resolved.startsWith(VAULT_ROOT + path.sep) && resolved !== VAULT_ROOT) {
    throw new Error(`Accesso negato: path fuori dalla vault`);
  }
  return resolved;
}

/**
 * Restituisce il path relativo alla vault root (per output user-friendly).
 */
export function relativePath(absolutePath: string): string {
  return path.relative(VAULT_ROOT, absolutePath);
}

/**
 * Verifica che la vault esista e sia accessibile.
 */
export async function checkVaultExists(): Promise<void> {
  try {
    await fs.access(VAULT_ROOT);
  } catch {
    throw new Error(
      `Vault non trovata: ${VAULT_ROOT}\nImposta VAULT_PATH nella variabile d'ambiente.`,
    );
  }
}

/**
 * Assicura che la directory padre di un file esista (crea se necessario).
 */
export async function ensureParentDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}
