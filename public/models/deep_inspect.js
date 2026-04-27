const fs = require('fs');
const path = require('path');
const glbPath = path.join(__dirname, 'GX_Goddess_Rigged.glb');
const buffer = fs.readFileSync(glbPath);

let chunkOffset = 12;
const jsonChunkLength = buffer.readUInt32LE(chunkOffset);
const jsonBuffer = buffer.slice(chunkOffset + 8, chunkOffset + 8 + jsonChunkLength);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

console.log("Meshes count:", gltf.meshes ? gltf.meshes.length : 0);
if (gltf.meshes) {
  gltf.meshes.forEach((m, i) => {
    console.log(`Mesh ${i}: ${m.name}`);
    m.primitives.forEach((p, j) => {
      console.log(`  Primitive ${j}: material index ${p.material}, attributes:`, Object.keys(p.attributes));
    });
  });
}
console.log("Materials count:", gltf.materials ? gltf.materials.length : 0);
if (gltf.materials) {
  gltf.materials.forEach((m, i) => console.log(`  Material ${i}: ${m.name}`, JSON.stringify(m.pbrMetallicRoughness)));
}