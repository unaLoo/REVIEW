import * as lib from '../../webglFuncs/glLib';

import originCode from './shader/waveOrigin.glsl'
import wavingCode from './shader/waving.glsl'
export async function main() {

    ///// functions /////

    // let iTime = 0
    // let iResolution = [canvas.width, canvas.height]
    // let iMouse = [0, 0]
    let iTime, iResolution, iMouse;
    let canvas, gl, program;


    const mouseMoveHandler = (e) => {
        // iMouse = [e.clientX, e.clientY]
        // tickRender()
    }
    const resizeHandler = (e) => {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        iResolution = [canvas.width, canvas.height];
        gl.viewport(0, 0, canvas.width, canvas.height);
        // tickRender()

    }
    const tickRender = () => {
        iTime += 0.02;
        gl.uniform1f(gl.getUniformLocation(program, 'iTime'), iTime);
        gl.uniform2fv(gl.getUniformLocation(program, 'iMouse'), iMouse);
        gl.uniform2fv(gl.getUniformLocation(program, 'iResolution'), iResolution);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(tickRender);

    }





    canvas = document.querySelector('#playground');
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    gl = canvas.getContext('webgl2');
    lib.enableAllExtensions(gl)

    program = lib.createShaderFromCode(gl, wavingCode);
    // program = lib.createShaderFromCode(gl, originCode);
    gl.useProgram(program);

    // INITALIZE VALUES
    iResolution = [canvas.width, canvas.height];
    iTime = 0;
    iMouse = [0, 0];

    canvas.addEventListener('mousemove', mouseMoveHandler)
    window.addEventListener('resize', resizeHandler)

    tickRender()
}
