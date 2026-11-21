// Builds public/park_names.json: a small "park code → park name" lookup, so
// outdoor facilities can say which park they are in ("Parc Jarry").
//
// Source: City of Montréal, "Grands parcs, parcs d'arrondissements et espaces
// publics" (CC-BY 4.0), GeoJSON file espace_vert.json (~8 MB, mostly park
// outlines we don't need). Download it from donnees.montreal.ca, then run:
//
//   node scripts/build-park-names.cjs <path to espace_vert.json>
//
// The park code (NUM_INDEX) is the same as INDEX_PARC in outdoor_facilities.json.

const fs = require('fs')
const path = require('path')

const sourcePath = process.argv[2]
if (!sourcePath) {
  console.error('Usage: node scripts/build-park-names.cjs <path to espace_vert.json>')
  process.exit(1)
}

const parks = JSON.parse(fs.readFileSync(sourcePath, 'utf8')).features

const parkNames = {}
for (const { properties } of parks) {
  const code = properties.NUM_INDEX
  if (!code || !properties.Nom) continue // some school yards etc. have no code
  // A park can be split into several shapes with the same code: keep the first name.
  if (parkNames[code]) continue

  // The name is in 3 parts: "Parc" + "" + "Maurice-Cullen", or "Av." + "du" + "Boisé".
  parkNames[code] = [properties.Type, properties.Lien, properties.Nom].filter(Boolean).join(' ')
}

const outputPath = path.join(__dirname, '..', 'public', 'park_names.json')
fs.writeFileSync(outputPath, JSON.stringify(parkNames, null, 0))
console.log(`Wrote ${Object.keys(parkNames).length} park names to ${outputPath}`)
