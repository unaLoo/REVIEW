/**
 * Author: Huanyu Loo
 * Date: 2024-12-05
 * Description: Review of WebGPU
*/

import * as lib from './lib.js'
import triangleWGSL from './wgsl/triangle.wgsl?raw'

export async function main() {
  //////////////////////////////////////////
  ///////////// initialize /////////////////
  //////////////////////////////////////////

  //// Query the GPU adapter
  const device = await lib.requesDevice();
  const context = lib.initGPUContext("playground", device);
  lib.resize(context.canvas)


  //// Create the shader module
  // const module = lib.createModule(device, "module", triangleWGSL) 
  const module = device.createShaderModule({
    'label': 'triangleShader',
    'code': triangleWGSL
  })

  //// Create the render pipeline
  const renderPipeline = device.createRenderPipeline({
    "label": "renderPipline",
    "layout": "auto",
    "vertex": {
      "module": module,
      "entryPoint": "vs_main"
    },
    "fragment": {
      "module": module,
      "entryPoint": "fs_main",
      "targets": [
        {
          "format": context.presentationFormat
        }
      ]
    }
  })

  //// prepare the render pass descriptor
  /** @type {GPURenderPassDescriptor} */
  const renderPassDescriptor = {
    "label": 'renderPassDescriptor',
    "colorAttachments": [
      {
        "view": null,
        "clearValue": [0, 0, 0, 0],
        "loadOp": "clear",// load operation when the color attachment is used
        "storeOp": "store",// store operation when the color attachment is used
      }
    ]
  }

  const render = () => {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(renderPipeline);
    pass.draw(3);
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
    // window.requestAnimationFrame(render)
  }
  render()




  window.onresize = () => {
    lib.resize(context.canvas)
    render()
  }


}