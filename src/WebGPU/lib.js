
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
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
}
//#endregion