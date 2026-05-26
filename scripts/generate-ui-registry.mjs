import fs from "fs";
import path from "path";

const root = process.cwd();

const componentsDir = path.join(root, "src", "components");

const outputFile = path.join(
    root,
    "src",
    "app",
    "dev",
    "ui",
    "uiRegistry.generated.tsx"
);

const ignoredFiles = new Set(["index.ts", "index.tsx"]);
const ignoredDirs = new Set(["node_modules"]);

function sortDirs(dirs) {
    return dirs.sort((a, b) => {
        if (a === "ui") return -1;
        if (b === "ui") return 1;
        return a.localeCompare(b);
    });
}

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    const dirs = sortDirs(
        entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .filter((name) => !ignoredDirs.has(name))
    );

    const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((file) => file.endsWith(".tsx"))
        .filter((file) => !ignoredFiles.has(file))
        .sort();

    const result = [];

    for (const file of files) {
        const filePath = path.join(dir, file);

        const source = fs.readFileSync(filePath, "utf8");

        if (!source.includes("export const __uiDemo")) {
            continue;
        }

        const relativePath = path.relative(componentsDir, filePath);
        const withoutExtension = relativePath.replace(/\.tsx$/, "");

        const importPath = `@/components/${withoutExtension.replaceAll(path.sep, "/")}`;

        const componentName = withoutExtension.replaceAll(path.sep, "/");

        result.push({
            filePath,
            importPath,
            componentName,
        });
    }

    for (const folder of dirs) {
        result.push(...walk(path.join(dir, folder)));
    }

    return result;
}

const files = walk(componentsDir);

const imports = [];
const registryItems = [];

for (const file of files) {
    const importName =
        file.componentName
            .replace(/[^a-zA-Z0-9]/g, "_")
            .replace(/^(\d)/, "_$1") + "Demo";

    imports.push(
        `import { __uiDemo as ${importName} } from "${file.importPath}";`
    );

    registryItems.push(`  {
    name: "${file.componentName}",
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

console.log(`Generated UI registry with ${files.length} components.`);