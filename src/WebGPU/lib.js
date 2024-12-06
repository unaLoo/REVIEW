
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
 * @returns {Promise<GPUCanvasContext>}
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
    return context;
}
//#endregion


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





//#region utils

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => (1 - t) * a + t * b;
//#endregion