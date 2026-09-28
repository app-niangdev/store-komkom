/** Icône (Bootstrap Icons) évoquant un produit sans photo, d'après sa catégorie ou son nom. */
const RULES: [RegExp, string][] = [
  [/t[ée]l[ée]phone|smartphone|iphone|samsung|mobile|portable\b/i, 'bi-phone'],
  [/ordinateur|laptop|pc\b|informatique|clavier|souris|[ée]cran/i, 'bi-laptop'],
  [/\bcasques?\b|[ée]couteur|audio|enceinte|\bson\b/i, 'bi-headphones'],
  [/montre|watch/i, 'bi-smartwatch'],
  [/batterie|chargeur|c[aâ]ble|[ée]lectri|[ée]lectronique/i, 'bi-lightning-charge'],
  [/cuisine|caf[ée]|mixeur|bouteille|vaisselle|assiette/i, 'bi-cup-hot'],
  [/maison|d[ée]co|lampe|luminaire/i, 'bi-lamp'],
  [/meuble|mobilier|chaise|table|canap/i, 'bi-house-door'],
  [/chaussure|basket|sandale/i, 'bi-bag-heart'],
  [/mode|v[êe]tement|habit|sac|accessoire|casquette|robe|chemise/i, 'bi-handbag'],
  [/beaut[ée]|cosm[ée]ti|parfum|soin/i, 'bi-droplet'],
  [/sport|yoga|fitness|ballon/i, 'bi-bicycle'],
  [/alimentation|[ée]picerie|riz|huile|sucre|boisson|jus/i, 'bi-basket'],
  [/voiture|auto|moto/i, 'bi-car-front'],
  [/livre|papeterie|cahier|stylo/i, 'bi-book'],
  [/jouet|enfant|b[ée]b[ée]/i, 'bi-balloon'],
  [/parapluie/i, 'bi-umbrella']
];

export function productIcon(name: string, category: string | null): string {
  // Le nom d'abord (« Casque » en catégorie Informatique reste un casque), puis la catégorie
  const match = (text: string) => RULES.find(([pattern]) => pattern.test(text))?.[1];
  return match(name) ?? (category ? match(category) : undefined) ?? 'bi-box-seam';
}
