const fs = require('fs');
const path = require('path');
const glbPath = path.join(__dirname, 'GX_Goddess_Rigged.glb');
const buffer = fs.readFileSync(glbPath);

let chunkOffset = 12;
const jsonChunkLength = buffer.readUInt32LE(chunkOffset);
const jsonBuffer = buffer.slice(chunkOffset + 8, chunkOffset + 8 + jsonChunkLength);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

const positionAccessor = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
console.log("Min:", positionAccessor.min);
console.log("Max:", positionAccessor.max);