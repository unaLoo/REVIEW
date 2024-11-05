import * as lib from '../../webglFuncs/glLib';

export async function main() {
    const canvas = document.querySelector('#playground');
    canvas.width = canvas.clientHeight * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    const gl = canvas.getContext('webgl2');


    const vs = `#version 300 es
    precision highp float;
    vec4[] vertices = vec4[4](vec4(-1.0, -1.0, 0.0, 0.0), vec4(1.0, -1.0, 1.0, 0.0), vec4(-1.0, 1.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0));
    void main() {
    
        vec4 attributes = vertices[gl_VertexID];
    
        gl_Position = vec4(attributes.xy, 0.0, 1.0);
    }
    `;
    const fsColor = `#version 300 es

    precision highp float;

    uniform vec2 canvasSize;
    uniform vec4 pixelRange;//LeftBottom
    uniform sampler2D imgTex;
    
    out vec4 fragColor;

    float coordsValid(vec2 coords){
        if(coords.x < pixelRange[0] || coords.x > pixelRange[2] || coords.y < pixelRange[1] || coords.y > pixelRange[3])
            return 0.0;
        return 1.0;
    }
    
    vec2 coordsAdjust(vec2 coords){
        coords.x = ((coords.x - pixelRange[0]) / (pixelRange[2] - pixelRange[0]));
        coords.y = ((coords.y - pixelRange[1]) / (pixelRange[3] - pixelRange[1]));
        return coords;
    }

    void main() {
        vec2 fragCoord = gl_FragCoord.xy;

        if(coordsValid(fragCoord) == 0.0)
            return;

        vec2 mappedUV = coordsAdjust(fragCoord);
        vec4 color = texture(imgTex, mappedUV);
        fragColor = color;
    }   
    `;

    const colorProgram = lib.createProgramFromSource(gl, vs, fsColor);

    const pixelRange = [500, 500, 500 + 100, 500 + 100]

    const img = await lib.loadImage("/images/f-texture.png")
    const imgTex = lib.createTexture2D(gl, img.width, img.height, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img, gl.LINEAR)

    console.log(gl.canvas.width, gl.canvas.height)

    gl.useProgram(colorProgram);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.uniform1i(gl.getUniformLocation(colorProgram, 'imgTex'), 0);
    gl.uniform2f(gl.getUniformLocation(colorProgram, 'canvasSize'), gl.canvas.width, gl.canvas.height);
    gl.uniform4fv(gl.getUniformLocation(colorProgram, 'pixelRange'), pixelRange)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
