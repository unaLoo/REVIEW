
class GLTFHelper {

    gltf = null;
    gl = null;
    constructor(gl, url) {
        this.gl = gl;
        this.url = url;

        this.load();
    }

    async load() {
        const baseURL = new URL(this.url, location.href);
        const gl = this.gl;

        // 0. load gltf file
        this.gltf = (await loadFile(this.url, 'json'));
        // 1. load arrayBuffer
        this.gltf.buffers.map(async (buffer) => {
            const url = new URL(buffer.uri, baseURL.href); // .bin url
            buffer.arrayBuffer = await loadFile(url, 'arrayBuffer');
        })
        // 2. mesh
        this.gltf.meshes.forEach(mesh => {
            // one mesh have multiple primitives
            mesh.primitives.forEach(primitive => {
                // one primitive has attributes / indices / material / mode 

                // 01 attributes
                const attributes = {};
                let numElements = 0;
                for (const [attribName, attribIndex] of Object.entries(primitive.attributes)) {
                    const { accessor, buffer, stride } = getAccessorAndWebGLBuffer(gl, this.gltf, attribIndex);
                    numElements = accessor.count;
                    attributes[attribName] = {
                        buffer,
                        type: accessor.type,
                        numComponents: accessorTypeToNumComponents(accessor.type),
                        stride,
                        offset: accessor.byteOffset | 0,
                    }
                }
                const bufferInfo = {
                    attributes,
                    numElements,
                }
                // 02 indices
                if (primitive.indices) {
                    const { accessor, buffer } = getAccessorAndWebGLBuffer(gl, this.gltf, primitive.indices);
                    bufferInfo.numElements = accessor.count;
                    bufferInfo.indices = buffer;
                    bufferInfo.elementType = accessor.componentType;
                }
                // 03 material   ........
                primitive.material = this.gltf.materials && this.gltf.materials[primitive.material] || {
                    uniforms: { u_diffuse: [.5, .8, 1, 1], },
                };

                // 04 mode  [0,1,2,3,4] ==>[TRIANGLES, POINTS, LINES, LINE_LOOP, LINE_STRIP]
                primitive.mode = primitive.mode
            })



        });

        this.loadedCallback()


    }

    loadedCallback(fn) {
        console.log('loaded!', this.gltf)
        fn && fn()
    }
}




/////////////helpers///////////////
/**
 * @param {string} url 
 * @param {json | arrayBuffer} typeFunc 
 * @returns {Promise<json | arrayBuffer>}
 */
async function loadFile(url, typeFunc) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`could not load: ${url}`);
    }
    return await response[typeFunc]();
}
/**
 * 给定一个访问器下标返回一个访问器, WebGLBuffer和一个stride,  buffer是一整个，需要stride的！
 * @param {WebGL2RenderingContext} gl 
 * @param {*} gltf 
 * @param {number} accessorIndex 
 * @returns 
 */
function getAccessorAndWebGLBuffer(gl, gltf, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    if (!bufferView.webglBuffer) {
        const buffer = gl.createBuffer();
        const target = bufferView.target || gl.ARRAY_BUFFER;
        const arrayBuffer = gltf.buffers[bufferView.buffer];
        const data = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength);
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, data, gl.STATIC_DRAW);
        bufferView.webglBuffer = buffer;
    }
    return {
        accessor,
        buffer: bufferView.webglBuffer,
        stride: bufferView.stride || 0,
    };
}

function throwNoKey(key) {
    throw new Error(`no key: ${key}`);
}
const accessorTypeToNumComponentsMap = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16,
};
/**
 * 根据accesor的type返回numComponents
 * @param {string} type 
 * @returns 
 */
function accessorTypeToNumComponents(type) {
    return accessorTypeToNumComponentsMap[type] || throwNoKey(type);
}

/**
 * @param {WebGL2RenderingContext} gl 
 * @returns 
 */
function createVaoWithBufferInfo(gl, bufferInfo) {
    console.log(bufferInfo)
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);

}