import fs from "fs";
import path from "path";

const ACTIONS_DIR = path.join(process.cwd(), "src/core/actions");
const OUTPUT_FILE = path.join(ACTIONS_DIR, "actions.ts");

// Exclude the output file itself and non-directory entities
const subfolders = fs.readdirSync(ACTIONS_DIR).filter((file) => {
  const fullPath = path.join(ACTIONS_DIR, file);
  return fs.statSync(fullPath).isDirectory();
});

let imports = "";
let actionsEntries = "";
let argsEntries = "";
let descriptionsEntries = "";

subfolders.forEach((folder) => {
  const camelCaseName = folder.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const importPath = `./${folder}/${folder}.js`; // Using .js for ESM compatibility

  imports += `import * as ${camelCaseName} from "${importPath}";\n`;
  actionsEntries += `  ...${camelCaseName}.ACTIONS,\n`;
  argsEntries += `  ...${camelCaseName}.ACTION_ARGS,\n`;
  descriptionsEntries += `  ...${camelCaseName}.ACTION_DESCRIPTIONS,\n`;
});

const fileContent = `// This file is auto-generated. Do not edit manually.
${imports}
export const ACTIONS = {
${actionsEntries}};

export const ACTION_ARGS = {
${argsEntries}};

export const ACTION_DESCRIPTIONS = {
${descriptionsEntries}};
`;

fs.writeFileSync(OUTPUT_FILE, fileContent);
console.log(`✅ actions.ts generated successfully at ${OUTPUT_FILE}`);
