const fs = require('fs');
const path = require('path');
const glbPath = path.join(__dirname, 'GX_Goddess_Rigged.glb');
const buffer = fs.readFileSync(glbPath);

let chunkOffset = 12;
const jsonChunkLength = buffer.readUInt32LE(chunkOffset);
const jsonBuffer = buffer.slice(chunkOffset + 8, chunkOffset + 8 + jsonChunkLength);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

console.log("Meshes:", gltf.meshes.length);
console.log("Primitives in Mesh 0:", gltf.meshes[0].primitives.length);
