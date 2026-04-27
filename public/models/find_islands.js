const fs = require('fs');
const path = require('path');

const glbPath = path.join(__dirname, 'GX_Goddess_Rigged.glb');
const buffer = fs.readFileSync(glbPath);

let chunkOffset = 12;
const jsonChunkLength = buffer.readUInt32LE(chunkOffset);
const jsonBuffer = buffer.slice(chunkOffset + 8, chunkOffset + 8 + jsonChunkLength);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

const binChunkOffset = chunkOffset + 8 + jsonChunkLength;
const binChunkLength = buffer.readUInt32LE(binChunkOffset);
const binBuffer = buffer.slice(binChunkOffset + 8, binChunkOffset + 8 + binChunkLength);

const mesh = gltf.meshes[0];
const primitive = mesh.primitives[0];

const getAccessorData = (accessorIndex) => {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    const length = accessor.count;
    
    let ArrayType;
    let componentSize;
    if (accessor.componentType === 5123) { ArrayType = Uint16Array; componentSize = 2; }
    else if (accessor.componentType === 5125) { ArrayType = Uint32Array; componentSize = 4; }
    else if (accessor.componentType === 5126) { ArrayType = Float32Array; componentSize = 4; }
    else throw new Error("Unsupported component type: " + accessor.componentType);

    const data = new ArrayType(binBuffer.buffer, binBuffer.byteOffset + byteOffset, length * (accessor.type === 'VEC3' ? 3 : (accessor.type === 'VEC2' ? 2 : (accessor.type === 'VEC4' ? 4 : 1))));
    return { data, count: accessor.count, type: accessor.type };
};

const indicesAccessor = getAccessorData(primitive.indices);
const indices = indicesAccessor.data;
const positionsAccessor = getAccessorData(primitive.attributes.POSITION);
const vertexCount = positionsAccessor.count;

console.log(`Total vertices: ${vertexCount}`);
console.log(`Total indices (triangles * 3): ${indices.length}`);

// Find identical vertices (Mixamo might duplicate vertices for UV seams, but since UVs might be stripped, let's just group by exact position to weld them logically for the island search)
console.log("Welding vertices based on exact spatial coordinates...");
const posData = positionsAccessor.data;
const vertexToUnique = new Int32Array(vertexCount);
const uniqueToOriginal = [];
const posMap = new Map();

let uniqueCount = 0;
for (let i = 0; i < vertexCount; i++) {
    const x = posData[i*3].toFixed(5);
    const y = posData[i*3+1].toFixed(5);
    const z = posData[i*3+2].toFixed(5);
    const key = `${x},${y},${z}`;
    if (!posMap.has(key)) {
        posMap.set(key, uniqueCount);
        uniqueToOriginal.push(i);
        uniqueCount++;
    }
    vertexToUnique[i] = posMap.get(key);
}

console.log(`Unique vertex positions: ${uniqueCount}`);

// Build adjacency graph for unique vertices
console.log("Building adjacency graph...");
const graph = new Array(uniqueCount).fill(0).map(() => []);
for (let i = 0; i < indices.length; i += 3) {
    const v1 = vertexToUnique[indices[i]];
    const v2 = vertexToUnique[indices[i+1]];
    const v3 = vertexToUnique[indices[i+2]];
    
    if (v1 !== v2) { graph[v1].push(v2); graph[v2].push(v1); }
    if (v2 !== v3) { graph[v2].push(v3); graph[v3].push(v2); }
    if (v3 !== v1) { graph[v3].push(v1); graph[v1].push(v3); }
}

// Find connected components (Islands)
console.log("Finding connected components (Islands)...");
const visited = new Uint8Array(uniqueCount);
const islands = [];

for (let i = 0; i < uniqueCount; i++) {
    if (!visited[i]) {
        let size = 0;
        let minY = Infinity;
        let maxY = -Infinity;
        const q = [i];
        visited[i] = 1;
        
        // Use a simple array queue. For large meshes it might be slow but should be ok for ~100k
        let head = 0;
        while(head < q.length) {
            const curr = q[head++];
            size++;
            
            const origIdx = uniqueToOriginal[curr];
            const y = posData[origIdx*3 + 1];
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;

            const neighbors = graph[curr];
            for(let j=0; j<neighbors.length; j++) {
                const n = neighbors[j];
                if (!visited[n]) {
                    visited[n] = 1;
                    q.push(n);
                }
            }
        }
        islands.push({ id: islands.length, size, minY, maxY });
    }
}

islands.sort((a, b) => b.size - a.size);
console.log(`\nFound ${islands.length} topological islands!`);
islands.slice(0, 10).forEach(island => {
    console.log(`Island ${island.id}: ${island.size} unique vertices, Y-range: [${island.minY.toFixed(3)}, ${island.maxY.toFixed(3)}]`);
});
