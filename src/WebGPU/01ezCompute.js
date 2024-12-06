/**
 * Author: Huanyu Loo
 * Date: 2024-12-05
 * Description: easy compute shader demo
*/

import * as lib from './lib.js'
import ezCode from './wgsl/ezComp.wgsl?raw'

export const main = async () => {

    // init
    const device = await lib.requesDevice();
    // const context = lib.initGPUContext("playground", device);

    // module
    const module = device.createShaderModule({
        "label": 'ezCompute',
        "code": ezCode
    })

    // pipeline 
    const computePipeline = device.createComputePipeline({
        "label": 'computePipeline',
        "layout": 'auto',
        "compute": {
            "module": module,
            "entryPoint": 'c_main'
        }
    })

    const inputData = new Float32Array([1, 2, 3]);
    const inputBuffer = device.createBuffer({
        'label': "inputBuffer",
        'size': inputData.byteLength,
        'usage': GPUBufferUsage.STORAGE |
            GPUBufferUsage.COPY_DST | // copy data to buffer
            GPUBufferUsage.COPY_SRC   // copy data from buffer
    })
    device.queue.writeBuffer(inputBuffer, 0, inputData)

    const resultBuffer = lib.createMapReadBuffer(device, inputData.byteLength)

    const bindGroup = device.createBindGroup({
        label: 'bindGroup',
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            {
                "binding": 0,
                "resource": {
                    "buffer": inputBuffer,
                }
            }
        ]
    })

    const computeIt = async () => {
        const encoder = device.createCommandEncoder()
        // compute
        const computePass = encoder.beginComputePass({
            "label": 'computePass'
        })
        computePass.setPipeline(computePipeline)
        computePass.setBindGroup(0, bindGroup)
        computePass.dispatchWorkgroups(inputData.length)
        computePass.end()

        // map and read
        encoder.copyBufferToBuffer(inputBuffer, 0, resultBuffer, 0, resultBuffer.size)

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
            const resultData = new Float32Array(resultBuffer.getMappedRange())
            console.log('inputData', inputData)
            console.log('resultData', resultData)
            resultBuffer.unmap()

        })
    }

    computeIt()

}