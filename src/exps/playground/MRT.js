import * as lib from '../../webglFuncs/glLib';

export async function main() {
    const canvas = document.querySelector('#playground');
    canvas.width = canvas.clientHeight * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    const gl = canvas.getContext('webgl2');

    // 注意，不用拓展的话，很多浮点型纹理相关的东西都不能用
    lib.enableAllExtensions(gl)

    const vs = `#version 300 es

    layout(location = 0) in vec2 a_Pin;
    out vec2 v_Pin;
    void main(){
      gl_Position = vec4(a_Pin*2.0-1.0,0.0,1.0);
      v_Pin=a_Pin;
    }

    `;
    const fs = `#version 300 es
    precision mediump float;

    layout(location = 0) out vec4 a;   
    layout(location = 1) out vec4 b;

    void main() {
      a = vec4(0.6,0.0,0.0,0.0);
      b = vec4(0,0.7,0.9,1);
    }  
    `;
    const fsShow = `#version 300 es
    precision mediump float;
    uniform sampler2D u_texture;

    in vec2 v_Pin;
    out vec4 color;
    void main() {
      color = texture(u_texture, v_Pin);
    }
    `

    const program1 = lib.createProgramFromSource(gl, vs, fs);
    const program2 = lib.createProgramFromSource(gl, vs, fsShow);

    const [width, height] = [canvas.width, canvas.height]

    const sourceBuffer = lib.createVBO(gl, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]))

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, sourceBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const texture0 = lib.createTexture2D(gl, width, height, gl.R32F, gl.RED, gl.FLOAT)
    const texture1 = lib.createTexture2D(gl, width, height, gl.RGBA32F, gl.RGBA, gl.FLOAT)
    const framebuffer = lib.createFrameBuffer(gl, [texture0, texture1], null, null)



    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

    gl.useProgram(program1);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(program2)
    gl.bindVertexArray(vao);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.viewport(0, 0, width / 2, height);//left half
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.viewport(width / 2, 0, width / 2, height);//right half
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

}
