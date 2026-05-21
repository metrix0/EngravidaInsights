import fs from "fs";
import path from "path";

const root = process.cwd();

const uiDir = path.join(root, "src", "components", "ui");
const outputFile = path.join(
    root,
    "src",
    "app",
    "dev",
    "ui",
    "uiRegistry.generated.tsx"
);

const ignoredFiles = new Set(["index.ts"]);

const files = fs
    .readdirSync(uiDir)
    .filter((file) => file.endsWith(".tsx"))
    .filter((file) => !ignoredFiles.has(file))
    .sort();

const imports = [];
const registryItems = [];

for (const file of files) {
    const componentName = file.replace(".tsx", "");
    const importName = `${componentName}Demo`;

    imports.push(
        `import { __uiDemo as ${importName} } from "@/components/ui/${componentName}";`
    );

    registryItems.push(`  {
    name: "${componentName}",
    ...${importName},
  },`);
}

const content = `// AUTO-GENERATED FILE.
// Do not edit manually.
// Run: npm run ui:generate

${imports.join("\n")}

export const uiRegistry = [
${registryItems.join("\n")}
].filter(Boolean);
`;

fs.writeFileSync(outputFile, content);

console.log(`Generated UI registry with \${files.length} components.`);