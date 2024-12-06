import * as lib from './lib.js'
import { vec3, mat4 } from 'gl-matrix'
import * as Dat from 'dat.gui'


import cubeCode from './wgsl/cube.wgsl?raw'

export const main = async () => {

    //////////////////// initialize /////////////////////////////
    const device = await lib.requesDevice()
    const context = lib.initGPUContext('playground', device)


    const camera = {
        position: [0, 0, 30],
        target: [0, 0, 0],
        up: [0, 1, 0],
        fov: 45 * Math.PI / 180,
        aspect: 0.0,
        near: 0.1,
        far: 100
    }
    const lighting = {
        // lightPos: [1, 1, 15], 
        lightDir: [1, 1, 15],
    }




    const canvasInfo = {
        context: context,
        canvas: context.canvas,
        presentationFormat: context.presentationFormat,
        depthTexture: null,
        depthTextureView: null,
    }

    const module = device.createShaderModule({
        "label": 'module',
        "code": cubeCode,
    })




    /////////////////// vertex buffers ////////////////////////////////
    const positions = new Float32Array([1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1]);
    const normals = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
    const texcoords = new Float32Array([1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);

    const positionBuffer = lib.createBuffer(device, positions, GPUBufferUsage.VERTEX)
    const normalBuffer = lib.createBuffer(device, normals, GPUBufferUsage.VERTEX)
    const texcoordBuffer = lib.createBuffer(device, texcoords, GPUBufferUsage.VERTEX)
    const indexBuffer = lib.createBuffer(device, indices, GPUBufferUsage.INDEX)


    /////////////////// texture and sampler ////////////////////////////////
    // const imgBitmap = await lib.loadImageBitmap('/images/Earth/dark.jpg')
    // const texture = device.createTexture({
    //     "label": 'texture',
    //     "format": 'rgba8unorm',
    //     "size": [imgBitmap.width, imgBitmap.height],
    //     "usage": GPUTextureUsage.TEXTURE_BINDING |
    //         GPUTextureUsage.COPY_DST
    //     //为了在着色器中使用纹理
    //     // 为了可以存数据到纹理
    // })
    // device.queue.copyExternalImageToTexture(
    //     {
    //         "source": imgBitmap,
    //         "flipY": true,
    //         // "origin": [0, 0],
    //     },
    //     {
    //         "texture": texture,
    //         // "mipLevel": 0,
    //         // "aspect": "all",
    //         // "colorSpace": "srgb",
    //         // "mipLevel": 0,
    //         // "premultipliedAlpha": false,
    //     },
    //     {
    //         // "depthOrArrayLayers": 1,
    //         "height": imgBitmap.height,
    //         "width": imgBitmap.width,
    //     }
    // )

    const texture = device.createTexture({
        size: [2, 2],
        format: 'rgba8unorm',
        usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
        { texture: texture },
        new Uint8Array([
            255, 255, 128, 255,
            128, 255, 255, 255,
            255, 128, 255, 255,
            255, 128, 128, 255,
        ]),
        { bytesPerRow: 8, rowsPerImage: 2 },
        { width: 2, height: 2 },
    );

    const sampler = device.createSampler({
        "label": 'sampler',
        "addressModeU": 'clamp-to-edge',
        "addressModeV": 'clamp-to-edge',
        "addressModeW": 'clamp-to-edge',
        "mipmapFilter": 'nearest',
        "magFilter": 'nearest',
        "minFilter": 'nearest',
        // "compare"  // 常用于深度纹理，比较采样器
        // "minFilter": 0,
        // "lodMaxClamp": 32, // 限制mipmap级别，性能优化
        // "maxAnisotropy": 16 // 各向异性滤波在多轴上采样，性能优化相关
    })





    /////////////////// uniform buffers ////////////////////////////////
    // sharing fsuniforms
    const fsUniformBuffer = device.createBuffer({
        "label": 'fsUniformBuffer',
        "size": 4 * 16 * 3, // 4 vec3
        "usage": GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    })
    const fsUniformValues = new Float32Array(1 * 3); // 1 vec3
    const lightDirection = fsUniformValues.subarray(0, 3);
    // sharing bindGroup layout
    const bindGroupLayout = device.createBindGroupLayout({
        "label": 'bindGroupLayout',
        "entries": [
            {
                "binding": 0,
                "visibility": GPUShaderStage.VERTEX,
                "buffer": {
                    "minBindingSize": 4 * 16 * 4, // 4 * mat4x4
                    "hasDynamicOffset": false,
                    "type": "uniform"
                }
            },
            {
                "binding": 1,
                "visibility": GPUShaderStage.FRAGMENT,
                "buffer": {
                    "minBindingSize": 1 * 16 * 3, // 1 * vec3
                    "hasDynamicOffset": false,
                    "type": "uniform"
                }
            },
            {
                "binding": 2,
                "visibility": GPUShaderStage.FRAGMENT,
                "sampler": {
                    "type": "filtering"
                }
            },
            {
                "binding": 3,
                "visibility": GPUShaderStage.FRAGMENT,
                "texture": {
                    "viewDimension": "2d",
                    "sampleType": "float",
                },
            }
        ]
    })


    const cubeCount = 100
    const cubeInfos = []
    for (let i = 0; i < cubeCount; i++) {
        // 这里有点像uniformLocation
        const vsUniformValues = new Float32Array(4 * 16);// 4 mat4x4f
        const modelMatrix = vsUniformValues.subarray(0, 1 * 16);
        const viewMatrix = vsUniformValues.subarray(1 * 16, 2 * 16);
        const projectionMatrix = vsUniformValues.subarray(2 * 16, 3 * 16);
        const normalMatrix = vsUniformValues.subarray(3 * 16, 4 * 16);
        const vsUniformBuffer = device.createBuffer({
            "label": 'vsUniformBuffer' + i,
            "size": 4 * 16 * 4, // 4  mat4x4f
            "usage": GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        })
        const bindGroup = device.createBindGroup({
            "label": 'bindGroup' + i,
            "layout": bindGroupLayout,
            "entries": [
                {
                    "binding": 0,
                    "resource": { "buffer": vsUniformBuffer }
                },
                {
                    "binding": 1,
                    "resource": { "buffer": fsUniformBuffer }
                },
                {
                    "binding": 2,
                    "resource": sampler
                },
                {
                    "binding": 3,
                    "resource": texture.createView()
                },
            ]
        })

        // translate of each cube
        const across = Math.sqrt(cubeCount) | 0;
        const x = (i % across - (across - 1) / 2) * 3;
        const y = ((i / across | 0) - (across - 1) / 2) * 3;
        // const z = 

        cubeInfos.push({
            vsUniformBuffer,
            vsUniformValues,
            modelMatrix,
            viewMatrix,
            projectionMatrix,
            normalMatrix,
            bindGroup,
            translation: [x, y, 0],
        })


    }






    ////////////////// pipeline //////////////////////////////////////////
    const pipelineLayout = device.createPipelineLayout({
        "label": 'pipelineLayout',
        "bindGroupLayouts": [
            bindGroupLayout
        ]
    })
    const pipeline = device.createRenderPipeline({
        "label": 'pipeline',
        "layout": pipelineLayout,
        "vertex": {
            "entryPoint": 'v_main',
            "module": module,
            "constants": {},
            "buffers": [
                {
                    "arrayStride": 3 * 4, // position 
                    "attributes": [
                        {
                            "shaderLocation": 0, // @location(0) position: vec4f,
                            "format": "float32x3",
                            "offset": 0
                        }
                    ]
                },
                {
                    "arrayStride": 3 * 4, // normal 
                    "attributes": [
                        {
                            "shaderLocation": 1, // @location(1) normal: vec3f,
                            "format": "float32x3",
                            "offset": 0
                        }
                    ]
                },
                {
                    "arrayStride": 2 * 4, // texcoord 
                    "attributes": [
                        {
                            "shaderLocation": 2, // @location(2) texcoord: vec2f
                            "format": "float32x2",
                            "offset": 0
                        }
                    ]
                }
            ]
        },
        "fragment": {
            "entryPoint": 'f_main',
            "module": module,
            "constants": {},
            "targets": [
                {
                    "format": context.presentationFormat,
                    "blend": {
                        "color": {
                            "srcFactor": "src-alpha",
                            "dstFactor": "one-minus-src-alpha",
                            "operation": "add"
                        },
                        "alpha": {
                            "srcFactor": "zero",
                            "dstFactor": "one",
                            "operation": "add"
                        }
                    }
                }
            ]
        },
        "primitive": {
            // "cullMode": "back",
            // // "frontFace": "cw",
            // "topology": "triangle-list",
            // "stripIndexFormat": "uint16"
            topology: 'triangle-list',
            cullMode: 'back',
        },
        "depthStencil": {
            "depthWriteEnabled": true,
            "depthCompare": "less",
            "format": "depth24plus"
        },

    })

    ///// render pass prepare
    /** @type {GPURenderPassDescriptor} */
    const renderPassDescriptor = {
        "colorAttachments": [{
            "view": null,
            "clearValue": [0.0, 0.0, 0.0, 0.0],
            "loadOp": "clear",
            "storeOp": "store",
        }],
        "depthStencilAttachment": {
            "depthClearValue": 1.0,
            "depthLoadOp": "clear",
            "depthStoreOp": "store",
            "view": null
        }
    }

    const resize = () => {
        const {
            canvas, presentationFormat,
            depthTexture, depthTextureView
        } = canvasInfo

        const width = lib.clamp(canvas.clientWidth, 1, device.limits.maxTextureDimension2D)
        const height = lib.clamp(canvas.clientHeight, 1, device.limits.maxTextureDimension2D)
        const needResize = (width !== canvas.width) || (height !== canvas.height)

        if (!needResize) return

        ////// resize operation //////

        canvas.width = width
        canvas.height = height
        camera.aspect = width / height


        const newDepthTexture = device.createTexture({
            "label": 'new depth texture',
            "format": "depth24plus",
            "size": [width, height],
            "usage": GPUTextureUsage.RENDER_ATTACHMENT //注意，深度纹理usage:Render_ATTACHMENT

        })
        canvasInfo.depthTexture = newDepthTexture
        canvasInfo.depthTextureView = newDepthTexture.createView()

        console.log('resize')
    }


    const renderIt = (time) => {
        time = time * 0.001
        resize()

        renderPassDescriptor.colorAttachments[0]["view"] = context.getCurrentTexture().createView()

        renderPassDescriptor.depthStencilAttachment.view = canvasInfo.depthTextureView;


        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        // passEncoder.setBindGroup()
        passEncoder.setPipeline(pipeline);
        passEncoder.setVertexBuffer(0, positionBuffer);
        passEncoder.setVertexBuffer(1, normalBuffer);
        passEncoder.setVertexBuffer(2, texcoordBuffer);
        passEncoder.setIndexBuffer(indexBuffer, "uint16");

        const { position, target, up, fov, aspect, near, far } = camera
        const viewMatrixValue = mat4.lookAt(mat4.create(), position, target, up)
        const projMatrixValue = mat4.perspective(mat4.create(), fov, aspect, near, far)

        vec3.normalize(lightDirection, lighting.lightDir)
        device.queue.writeBuffer(fsUniformBuffer, 0, fsUniformValues)

        cubeInfos.forEach((cubeInfo, ndx) => {
            const {
                vsUniformBuffer,
                vsUniformValues,
                modelMatrix,
                viewMatrix,
                projectionMatrix,
                normalMatrix,
                bindGroup,
                translation
            } = cubeInfo

            passEncoder.setBindGroup(0, bindGroup)

            mat4.translate(modelMatrix, mat4.create(), translation)
            mat4.rotateX(modelMatrix, modelMatrix, time * 0.9 + ndx)
            mat4.rotateY(modelMatrix, modelMatrix, time * 0.7 + ndx)

            mat4.copy(viewMatrix, viewMatrixValue)

            mat4.copy(projectionMatrix, projMatrixValue)

            mat4.transpose(normalMatrix, modelMatrix)
            mat4.invert(normalMatrix, normalMatrix)

            device.queue.writeBuffer(vsUniformBuffer, 0, vsUniformValues)
            passEncoder.drawIndexed(indices.length)

        })

        passEncoder.end()
        const commondBuffer = commandEncoder.finish()
        device.queue.submit([commondBuffer])

        requestAnimationFrame(renderIt)
    }
    renderIt()


    const gui = new Dat.GUI()
    const cameraFolder = gui.addFolder('camera')
    cameraFolder.add(camera.position, 0, -10, 10).name('camera X').step(0.1)
    cameraFolder.add(camera.position, 1, -10, 10).name('camera Y').step(0.1)
    cameraFolder.add(camera.position, 2, -10, 10).name('camera Z').step(0.1)
    const lightingFolder = gui.addFolder('lighting')
    lightingFolder.add(lighting.lightDir, 0, -10, 10).name('light X').step(0.1)
    lightingFolder.add(lighting.lightDir, 1, -10, 10).name('light X').step(0.1)
    lightingFolder.add(lighting.lightDir, 2, -10, 10).name('light X').step(0.1)

}