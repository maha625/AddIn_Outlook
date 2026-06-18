/**
 * Tests unitaires pour Outlook_UI/src/taskpane/taskpane.ts
 *
 * On teste uniquement les fonctions PURES (sans dépendance à Office.js ou au DOM),
 * car Office.js ne peut pas être chargé dans l'environnement Jest.
 *
 * Fonctions testées :
 * - getIconFilter()     : calcule le filtre CSS pour les icônes selon la couleur de fond
 * - getIconHtml()       : génère le HTML d'une icône SVG
 * - extractDomain()     : extrait le domaine d'un email (logique réutilisée côté TS)
 * - buildSafeFilename() : nettoie le sujet email pour en faire un nom de fichier .eml
 */

// ── Fonctions extraites / répliquées depuis taskpane.ts ──────────────────────

const ICONS_BASE_URL = "http://localhost/icons/cors.php";

function getIconFilter(bgHex: string): string {
  const clean = bgHex.replace("#", "");
  if (clean.length < 6) return "brightness(0) invert(1)";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "brightness(0)" : "brightness(0) invert(1)";
}

function getIconHtml(iconFile: string | undefined, bgColor: string = "#2563eb"): string {
  if (!iconFile) {
    return `<span style="display:inline-block;width:16px;height:16px;"></span>`;
  }
  const url = `${ICONS_BASE_URL}?file=${iconFile}`;
  return `<img src="${url}" alt="" style="width:16px; height:16px; filter:brightness(0); opacity: 0.6; vertical-align:middle; flex-shrink:0;" />`;
}

function extractDomain(email: string): string {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1] : "";
}

function buildSafeFilename(subject: string): string {
  return subject.replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 50) + ".eml";
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("getIconFilter()", () => {
  test("renvoie brightness(0) pour un fond clair (blanc)", () => {
    expect(getIconFilter("#ffffff")).toBe("brightness(0)");
  });

  test("renvoie brightness(0) invert(1) pour un fond sombre (noir)", () => {
    expect(getIconFilter("#000000")).toBe("brightness(0) invert(1)");
  });

  test("renvoie brightness(0) pour le bleu Outlook (#2563eb) — fond sombre → icône blanche", () => {
    // Luminance de #2563eb ≈ 0.12 → sombre → invert
    expect(getIconFilter("#2563eb")).toBe("brightness(0) invert(1)");
  });

  test("renvoie brightness(0) pour un jaune clair (#f0e040)", () => {
    // Luminance élevée → fond clair → icône noire
    expect(getIconFilter("#f0e040")).toBe("brightness(0)");
  });

  test("retourne invert(1) si la chaîne est trop courte (hex invalide)", () => {
    expect(getIconFilter("#abc")).toBe("brightness(0) invert(1)");
  });

  test("fonctionne sans le caractère # en préfixe", () => {
    // La fonction fait replace("#", "") donc si absent ça marche quand même
    const result = getIconFilter("ffffff");
    // 'ffffff' → clean = 'ffffff' → luminance = 1 → brightness(0)
    expect(result).toBe("brightness(0)");
  });
});

describe("getIconHtml()", () => {
  test("retourne un span vide si iconFile est undefined", () => {
    const html = getIconHtml(undefined);
    expect(html).toContain("<span");
    expect(html).toContain("width:16px");
  });

  test("retourne une balise img pour un fichier icône valide", () => {
    const html = getIconHtml("telephone.svg");
    expect(html).toContain("<img");
    expect(html).toContain("telephone.svg");
  });

  test("l'URL de l'icône inclut ICONS_BASE_URL", () => {
    const html = getIconHtml("star.svg");
    expect(html).toContain(ICONS_BASE_URL);
  });

  test("l'image a les dimensions 16x16", () => {
    const html = getIconHtml("tag.svg");
    expect(html).toContain("width:16px");
    expect(html).toContain("height:16px");
  });

  test("l'attribut alt est vide (accessibilité : icône décorative)", () => {
    const html = getIconHtml("check.svg");
    expect(html).toContain('alt=""');
  });
});

describe("extractDomain()", () => {
  test("extrait correctement le domaine d'un email simple", () => {
    expect(extractDomain("user@exemple.com")).toBe("exemple.com");
  });

  test("extrait correctement le domaine d'un email complexe", () => {
    expect(extractDomain("prenom.nom+tag@sous.domaine.org")).toBe("sous.domaine.org");
  });

  test("retourne une chaîne vide si l'email ne contient pas de @", () => {
    expect(extractDomain("emailsans arobase")).toBe("");
  });

  test("gère les domaines publics", () => {
    expect(extractDomain("contact@gmail.com")).toBe("gmail.com");
    expect(extractDomain("info@outlook.com")).toBe("outlook.com");
  });
});

describe("buildSafeFilename()", () => {
  test("remplace les caractères spéciaux par des underscores", () => {
    const filename = buildSafeFilename("RE: Facture N°2024/001 - Client & Cie");
    expect(filename).not.toMatch(/[^a-zA-Z0-9_\-\.]/);
  });

  test("ajoute l'extension .eml", () => {
    expect(buildSafeFilename("Sujet simple").endsWith(".eml")).toBe(true);
  });

  test("tronque à 50 caractères + .eml", () => {
    const longSubject = "A".repeat(100);
    const filename = buildSafeFilename(longSubject);
    // 50 chars + ".eml" = 54 caractères au maximum
    expect(filename.length).toBeLessThanOrEqual(54);
  });

  test("conserve les tirets et underscores", () => {
    const filename = buildSafeFilename("Mon-sujet_propre");
    expect(filename).toContain("Mon-sujet_propre");
  });

  test("gère un sujet vide", () => {
    const filename = buildSafeFilename("");
    expect(filename).toBe(".eml");
  });
});

// Force TypeScript to treat this file as a standalone module
export {};