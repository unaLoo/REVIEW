
//#region  Init GPU Device and Context
/**
 * Query for GPU device
 * @returns {Promise<GPUDevice>}
 */
export const requesDevice = async () => {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        return device;
    } catch (error) {
        throw Error("Error: " + 'WebGPU Not Supported');
    }
}
/**
 * Get GPU context
 * @param {string} canvasID
 * @param {GPUDevice} gpuDevice
 * @returns {GPUCanvasContext}
 */
export const initGPUContext = (canvasID, gpuDevice, premultiplied = true) => {
    const canvas = document.querySelector(`#${canvasID}`);
    /** @type {GPUCanvasContext} */
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: gpuDevice,
        format: presentationFormat,
        alphaMode: premultiplied ? 'premultiplied' : 'opaque',
    });
    context.presentationFormat = presentationFormat;
    return context;
}



/**
 * 
 * @param {HTMLCanvasElement} canvas 
 */
export const resize = (canvas) => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * devicePixelRatio;
    const height = canvas.clientHeight * devicePixelRatio;
    canvas.width = width;
    canvas.height = height;
}
//#endregion







//#region buffers

/**
 * 
 * @param {GPUDevice} device 
 * @param {ArrayBufferView} data 
 * @param {GPUBufferUsageFlags} usage 
 * @returns {GPUBuffer}
 */
export const createBuffer = (device, data, usage) => {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage,
        mappedAtCreation: true,// 创建缓冲区时，映射到内存中
    });
    // new data.contructor 就是 new Float32array \ unit16 array 类似的
    // 获取buffer映射的内存范围
    // 创建一个指向映射内存范围的ArrayBufferView
    // setData 后 解除映射
    const dst = new data.constructor(buffer.getMappedRange());
    dst.set(data);
    buffer.unmap();
    return buffer;
}


//#endregion












//#region utils

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => (1 - t) * a + t * b;

export const loadImageBitmap = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob, { "premultiplyAlpha": "none", "colorSpaceConversion": "none" });
}
//#endregion




//#region memorylayout 

import {
    makeShaderDataDefinitions,
    makeStructuredView,
} from 'webgpu-utils'

export const getUniformValues = (code) => {
    const defs = makeShaderDataDefinitions(code);
    const uniformBufferInfos = {}
    for (let u in defs.uniforms) {
        const uniformValues = makeStructuredView(defs.uniforms[u]);
        uniformBufferInfos[u] = uniformValues
    }
    return uniformBufferInfos;
}



//#endregion




//#region  generate common geometry

export const oneCube = () => {
    const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
    const normals = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
    const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);
    return {
        positions, normals, texcoords, indices
    }
}

export const oneBall = (numLatitudeBands, numLongitudeBands, radius) => {
    // 顶点数组
    const positions = [];
    // 法向量数组
    const normals = [];
    // 纹理坐标数组
    const texcoords = [];
    // 索引数组
    const indices = [];

    // 生成顶点、法向量和纹理坐标
    for (let latNumber = 0; latNumber <= numLatitudeBands; latNumber++) {
        const theta = latNumber * Math.PI / numLatitudeBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let longNumber = 0; longNumber <= numLongitudeBands; longNumber++) {
            const phi = longNumber * 2 * Math.PI / numLongitudeBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            const u = 1 - (longNumber / numLongitudeBands);
            const v = 1 - (latNumber / numLatitudeBands);

            positions.push(radius * x);
            positions.push(radius * y);
            positions.push(radius * z);

            normals.push(x);
            normals.push(y);
            normals.push(z);

            texcoords.push(u);
            texcoords.push(v);
        }
    }

    // 生成索引
    for (let latNumber = 0; latNumber < numLatitudeBands; latNumber++) {
        for (let longNumber = 0; longNumber < numLongitudeBands; longNumber++) {
            const first = (latNumber * (numLongitudeBands + 1)) + longNumber;
            const second = first + numLongitudeBands + 1;

            indices.push(first);
            indices.push(second);
            indices.push(first + 1);

            indices.push(second);
            indices.push(second + 1);
            indices.push(first + 1);
        }
    }
    const positionsArray = new Float32Array(positions);
    const normalsArray = new Float32Array(normals);
    const texcoordsArray = new Float32Array(texcoords);
    const indicesArray = new Uint16Array(indices);
    return {
        positions: positionsArray,
        normals: normalsArray,
        texcoords: texcoordsArray,
        indices: indicesArray
    }
}
//#endregion