// src/utils/citationFormatter.ts

export interface CitationData {
  author?: string | null; // Kann eine kommaseparierte Liste von Autoren sein
  year?: number | null;
  page?: number | null; // Ist die 0-basierte Seitenzahl
  title?: string | null;
  citationNumber?: number; // Für IEEE etc.
}

export type CitationStyle = 'apa' | 'ieee' | 'mla' | 'default'; // 'default' als Fallback

export function formatAuthors(authorsString: string | null | undefined, style: CitationStyle): string {
  console.log(`[formatAuthors] INPUT: authorsString = "${authorsString}", style = "${style}"`);

  if (!authorsString || authorsString.trim() === "") {
    console.log("[formatAuthors] -> authorsString ist leer oder null/undefined. Gebe 'Unbekannt' zurück.");
    return 'Unbekannt';
  }

  // WICHTIG: Überprüfe das Trennzeichen GENAU! Ist es wirklich nur ein Semikolon?
  // Oder vielleicht "Semikolon + Leerzeichen"?
  // Teste mit .split(/;\s*|\s*;\s*|\s*and\s*|,/) für mehr Flexibilität, falls nötig, aber starte einfach.
  const authorsArray = authorsString.split(';').map(a => a.trim()).filter(a => a !== ""); // Entferne leere Strings nach dem Split
  console.log(`[formatAuthors] authorsArray nach split(';') und trim und filter:`, authorsArray, `Länge: ${authorsArray.length}`);

  if (authorsArray.length === 0) {
    console.log("[formatAuthors] -> authorsArray ist nach Split/Filter leer. Gebe 'Unbekannt' zurück.");
    return 'Unbekannt';
  }

  if (authorsArray.length === 1) {
    console.log(`[formatAuthors] -> Nur ein Autor: "${authorsArray[0]}"`);
    return authorsArray[0];
  }

  // Jetzt wissen wir: authorsArray.length > 1
  console.log(`[formatAuthors] Mehr als ein Autor (${authorsArray.length}). Prüfe Stil für "et al.".`);

  if (style === 'apa' || style === 'mla' || style === 'default') {
    const result = `${authorsArray[0]} et al.`;
    console.log(`[formatAuthors] -> Stil ("${style}") passt für "et al.". Erster Autor: "${authorsArray[0]}". Ergebnis: "${result}"`);
    return result;
  }

  // Fallback, wenn der Stil nicht für "et al." passt (z.B. spezielle IEEE-Anforderungen)
  // Für den Moment geben wir hier auch nur den ersten + et al. zurück, um das Problem zu isolieren,
  // oder du entscheidest, was hier passieren soll.
  // Wenn du hier `authorsString` zurückgibst, werden wieder alle angezeigt.
  const fallbackResult = `${authorsArray[0]} et al. (Fallback)`; // Geändert für Debugging
  console.log(`[formatAuthors] -> Stil ("${style}") passt NICHT für "et al." oder Logikfehler. Fallback-Ergebnis: "${fallbackResult}"`);
  return fallbackResult; // ÄNDERE DAS ZURÜCK, WENN ES NICHT DAS PROBLEM IST.
                         // Ursprünglich war hier vielleicht ein anderer Fallback oder die komplette Liste.
                         // Wenn du hier authorsString zurückgibst, werden alle angezeigt.
}

export function formatCitation(data: CitationData, style: CitationStyle): string {
  const formattedAuthor = formatAuthors(data.author, style);

  switch (style) {
    case 'apa':
    case 'default':
      let apaText = `${formattedAuthor}, ${data.year || 'N.D.'}`;
      if (data.page !== null && data.page !== undefined) {
        apaText += `, S. ${data.page + 1}`;
      }
      console.log("[formatCitation] APA/Default Text:", `(${apaText})`);
      return `(${apaText})`;

    case 'ieee':
      return `[${data.citationNumber || '?'}]`;

    // case 'mla':
    //   // Komplexere MLA-Logik hier (Autor Seite)
    //   let mlaText = `${formattedAuthor}`;
    //   if (data.page !== null && data.page !== undefined) {
    //     mlaText += ` ${data.page + 1}`;
    //   }
    //   return `(${mlaText})`;

    default:
      let defaultText = `${formattedAuthor}`;
      if (data.year) defaultText += `, ${data.year}`;
      if (data.page !== null && data.page !== undefined) defaultText += `, S. ${data.page + 1}`;
      console.log("[formatCitation] Fallback Text:", `(${defaultText})`);
      return `(${defaultText})`;
  }
}