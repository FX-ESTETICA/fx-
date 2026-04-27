const fs = require('fs');
const path = require('path');

const glbPath = path.join(__dirname, 'GX_Goddess_Rigged.glb');
const buffer = fs.readFileSync(glbPath);

let chunkOffset = 12;
const jsonChunkLength = buffer.readUInt32LE(chunkOffset);
const jsonBuffer = buffer.slice(chunkOffset + 8, chunkOffset + 8 + jsonChunkLength);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

console.log("Attributes:", gltf.meshes[0].primitives[0].attributes);
console.log("Materials:", JSON.stringify(gltf.materials, null, 2));
console.log("Images:", gltf.images ? gltf.images.length : 0);
console.log("Textures:", gltf.textures ? gltf.textures.length : 0);
