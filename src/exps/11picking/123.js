import * as twgl from 'twgl.js'
import { mat4 } from 'gl-matrix';

(function () {
    "use strict";

    // this function takes a set of indexed vertices
    // It deindexed them. It then adds random vertex
    // colors to each triangle. Finally it passes
    // the result to createBufferInfoFromArrays and
    // returns a twgl.BufferInfo
    function createFlattenedVertices(gl, vertices, vertsPerColor) {
        let last;
        return twgl.createBufferInfoFromArrays(
            gl,
            twgl.primitives.makeRandomVertexColors(
                twgl.primitives.deindexVertices(vertices),
                {
                    vertsPerColor: vertsPerColor || 1,
                    rand: function (ndx, channel) {
                        if (channel === 0) {
                            last = 128 + Math.random() * 128 | 0;
                        }
                        return channel < 3 ? last : 255;
                    },
                })
        );
    }

    function createFlattenedFunc(createVerticesFunc, vertsPerColor) {
        return function (gl) {
            const arrays = createVerticesFunc.apply(null, Array.prototype.slice.call(arguments, 1));
            return createFlattenedVertices(gl, arrays, vertsPerColor);
        };
    }

    // These functions make primitives with semi-random vertex colors.
    // This means the primitives can be displayed without needing lighting
    // which is important to keep the samples simple.

    window.flattenedPrimitives = {
        "create3DFBufferInfo": createFlattenedFunc(twgl.primitives.create3DFVertices, 6),
        "createCubeBufferInfo": createFlattenedFunc(twgl.primitives.createCubeVertices, 6),
        "createPlaneBufferInfo": createFlattenedFunc(twgl.primitives.createPlaneVertices, 6),
        "createSphereBufferInfo": createFlattenedFunc(twgl.primitives.createSphereVertices, 6),
        "createTruncatedConeBufferInfo": createFlattenedFunc(twgl.primitives.createTruncatedConeVertices, 6),
        "createXYQuadBufferInfo": createFlattenedFunc(twgl.primitives.createXYQuadVertices, 6),
        "createCresentBufferInfo": createFlattenedFunc(twgl.primitives.createCresentVertices, 6),
        "createCylinderBufferInfo": createFlattenedFunc(twgl.primitives.createCylinderVertices, 6),
        "createTorusBufferInfo": createFlattenedFunc(twgl.primitives.createTorusVertices, 6),
        "createDiscBufferInfo": createFlattenedFunc(twgl.primitives.createDiscVertices, 4),
    };

}());


const vs = `#version 300 es

in vec4 a_position;
in vec4 a_color;

uniform mat4 u_matrix;

out vec4 v_color;

void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;

  // Pass the color to the fragment shader.
  v_color = a_color;
}
`;

const fs = `#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec4 v_color;

uniform vec4 u_colorMult;

out vec4 outColor;

void main() {
   outColor = v_color * u_colorMult;
}
`;

const pickingVS = `#version 300 es
  in vec4 a_position;
  
  uniform mat4 u_matrix;
  
  void main() {
    // Multiply the position by the matrix.
    gl_Position = u_matrix * a_position;
  }
`;

const pickingFS = `#version 300 es
  precision highp float;
  
  uniform vec4 u_id;

  out vec4 outColor;
  
  void main() {
     outColor = u_id;
  }
`;

export function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    // Tell the twgl to match position with a_position, n
    // normal with a_normal etc..
    twgl.setAttributePrefix("a_");

    // setup GLSL program
    // note: we need the attribute positions to match across programs
    // so that we only need one vertex array per shape
    const options = {
        attribLocations: {
            a_position: 0,
            a_color: 1,
        },
    };
    const programInfo = twgl.createProgramInfo(gl, [vs, fs], options);
    const pickingProgramInfo = twgl.createProgramInfo(gl, [pickingVS, pickingFS], options);

    // creates buffers with position, normal, texcoord, and vertex color
    // data for primitives by calling gl.createBuffer, gl.bindBuffer,
    // and gl.bufferData
    const sphereBufferInfo = flattenedPrimitives.createSphereBufferInfo(gl, 10, 12, 6);
    const cubeBufferInfo = flattenedPrimitives.createCubeBufferInfo(gl, 20);
    const coneBufferInfo = flattenedPrimitives.createTruncatedConeBufferInfo(gl, 10, 0, 20, 12, 1, true, false);

    const sphereVAO = twgl.createVAOFromBufferInfo(gl, programInfo, sphereBufferInfo);
    const cubeVAO = twgl.createVAOFromBufferInfo(gl, programInfo, cubeBufferInfo);
    const coneVAO = twgl.createVAOFromBufferInfo(gl, programInfo, coneBufferInfo);

    function degToRad(d) {
        return d * Math.PI / 180;
    }

    function rand(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return Math.random() * (max - min) + min;
    }

    function eMod(x, n) {
        return x >= 0 ? (x % n) : ((n - (-x % n)) % n);
    }

    const fieldOfViewRadians = degToRad(60);

    // put the shapes in an array so it's easy to pick them at random
    const shapes = [
        { bufferInfo: sphereBufferInfo, vertexArray: sphereVAO, },
        { bufferInfo: cubeBufferInfo, vertexArray: cubeVAO, },
        { bufferInfo: coneBufferInfo, vertexArray: coneVAO, },
    ];

    const objectsToDraw = [];
    const objects = [];

    // Make infos for each object for each object.
    const baseHue = rand(0, 360);
    const numObjects = 200;
    for (let ii = 0; ii < numObjects; ++ii) {
        const id = ii + 1;

        // pick a shape
        const shape = shapes[rand(shapes.length) | 0];

        // make an object.
        const object = {
            uniforms: {
                u_colorMult: [rand(1.0), rand(1.0), rand(1.0), rand(1.0)],
                u_matrix: mat4.identity([]),
                u_id: [
                    ((id >> 0) & 0xFF) / 0xFF,
                    ((id >> 8) & 0xFF) / 0xFF,
                    ((id >> 16) & 0xFF) / 0xFF,
                    ((id >> 24) & 0xFF) / 0xFF,
                ],
            },
            translation: [rand(-100, 100), rand(-100, 100), rand(-150, -50)],
            xRotationSpeed: rand(0.8, 1.2),
            yRotationSpeed: rand(0.8, 1.2),
        };
        objects.push(object);

        // Add it to the list of things to draw.
        objectsToDraw.push({
            programInfo: programInfo,
            bufferInfo: shape.bufferInfo,
            vertexArray: shape.vertexArray,
            uniforms: object.uniforms,
        });
    }

    // Create a texture to render to
    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create a depth renderbuffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

    function setFramebufferAttachmentSizes(width, height) {
        gl.bindTexture(gl.TEXTURE_2D, targetTexture);
        // define size and format of level 0
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        const data = null;
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            width, height, border,
            format, type, data);

        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    }

    // Create and bind the framebuffer
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    const level = 0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

    // make a depth buffer and the same size as the targetTexture
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
        let matrix = mat4.translate([], viewProjectionMatrix,
            translation[0],
            translation[1],
            translation[2]);
        matrix = mat4.rotateX(matrix, matrix, xRotation);
        return mat4.rotateY(matrix, matrix, yRotation);
    }

    requestAnimationFrame(drawScene);

    function drawObjects(objectsToDraw, overrideProgramInfo) {
        objectsToDraw.forEach(function (object) {
            const programInfo = overrideProgramInfo || object.programInfo;
            const bufferInfo = object.bufferInfo;
            const vertexArray = object.vertexArray;

            gl.useProgram(programInfo.program);

            // Setup all the needed attributes.
            gl.bindVertexArray(vertexArray);

            // Set the uniforms.
            twgl.setUniforms(programInfo, object.uniforms);

            // Draw (calls gl.drawArrays or gl.drawElements)
            twgl.drawBufferInfo(gl, object.bufferInfo);
        });
    }

    // mouseX and mouseY are in CSS display space relative to canvas
    let mouseX = -1;
    let mouseY = -1;
    let oldPickNdx = -1;
    let oldPickColor;
    let frameCount = 0;

    // Draw the scene.
    function drawScene(time) {
        time *= 0.0005;
        ++frameCount;

        if (twgl.resizeCanvasToDisplaySize(gl.canvas)) {
            // the canvas was resized, make the framebuffer attachments match
            setFramebufferAttachmentSizes(gl.canvas.width, gl.canvas.height);
        }

        // Compute the projection matrix
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix =
            mat4.perspective([], fieldOfViewRadians, aspect, 1, 2000);

        // Compute the camera's matrix using look at.
        const cameraPosition = [0, 0, 100];
        const target = [0, 0, 0];
        const up = [0, 1, 0];
        const cameraMatrix = mat4.lookAt([], cameraPosition, target, up);

        // Make a view matrix from the camera matrix.
        const viewMatrix = mat4.invert([], cameraMatrix);

        const viewProjectionMatrix = mat4.mul([], projectionMatrix, viewMatrix);

        // Compute the matrices for each object.
        objects.forEach(function (object) {
            object.uniforms.u_matrix = computeMatrix(
                viewProjectionMatrix,
                object.translation,
                object.xRotationSpeed * time,
                object.yRotationSpeed * time);
        });

        // ------ Draw the objects to the texture --------

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        // Clear the canvas AND the depth buffer.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawObjects(objectsToDraw, pickingProgramInfo);

        // ------ Figure out what pixel is under the mouse and read it

        const pixelX = mouseX * gl.canvas.width / gl.canvas.clientWidth;
        const pixelY = gl.canvas.height - mouseY * gl.canvas.height / gl.canvas.clientHeight - 1;
        const data = new Uint8Array(4);
        gl.readPixels(
            pixelX,            // x
            pixelY,            // y
            1,                 // width
            1,                 // height
            gl.RGBA,           // format
            gl.UNSIGNED_BYTE,  // type
            data);             // typed array to hold result
        const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24);

        // restore the object's color
        if (oldPickNdx >= 0) {
            const object = objects[oldPickNdx];
            object.uniforms.u_colorMult = oldPickColor;
            oldPickNdx = -1;
        }

        // highlight object under mouse
        if (id > 0) {
            const pickNdx = id - 1;
            oldPickNdx = pickNdx;
            const object = objects[pickNdx];
            oldPickColor = object.uniforms.u_colorMult;
            object.uniforms.u_colorMult = (frameCount & 0x8) ? [1, 0, 0, 1] : [1, 1, 0, 1];
        }

        // ------ Draw the objects to the canvas

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        drawObjects(objectsToDraw);

        requestAnimationFrame(drawScene);
    }

    gl.canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
}

