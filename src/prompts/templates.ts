export const LEARNING_NOTE_PROMPT = `Crea una nuova nota di formazione professionale sul tema "{{topic}}" nella vault Obsidian.
Operazioni da eseguire:

1. Leggi l'indice di formazione per capire la struttura esistente e il percorso della cartella.
2. Crea la nota nella stessa cartella delle altre note di formazione.
3. Aggiorna l'indice di formazione aggiungendo il wikilink alla nuova nota tra i topics in approfondimento, rimuovendo eventualmente la voce da altri elenchi come i topics da approfondire, se presente.

Struttura della nota:

- Data di stesura: {{today}}
- Presentazione concisa del tema: cos'è, a cosa serve, casi d'uso principali, non più di 25 righe (compresi elenchi puntati e definizioni).
- Fonti autorevoli da consultare (documentazione ufficiale, articoli tecnici, libri di riferimento, video youtube). (segnala in modo conciso la data dell'articolo o della documentazione.)

Vincoli:

- Nessun frontmatter o tag, nessun tag specifico.
- Nessun wikilink interno a note inesistenti
- La voce nell'indice di formazione deve seguire lo stesso formato delle voci già presenti`;

export function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, v),
    template,
  );
}
