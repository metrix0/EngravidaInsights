// scripts/test-analyze.mjs

const response = await fetch("http://localhost:3000/api/analyze", {
    method: "GET",
});

const json = await response.json();

console.log(JSON.stringify(json, null, 2));

if (!response.ok) {
    process.exit(1);
}