

export function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
    var shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    var program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.warn(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
    // 获取浏览器显示的画布的CSS像素值
    const displayWidth = canvas.clientWidth
    const displayHeight = canvas.clientHeight

    // 检查画布大小是否相同。
    const needResize =
        canvas.width !== displayWidth || canvas.height !== displayHeight

    if (needResize) {
        // 使画布大小相同
        canvas.width = displayWidth
        canvas.height = displayHeight
    }

    return needResize
}

export async function loadImageBitmap(url: string) {
    return new Promise((resolve, reject) => {
        // 创建一个Image对象
        const image = new Image();
        image.src = url;
        // 当图片加载完成时，使用createImageBitmap函数来创建ImageBitmap
        image.onload = () => {
            createImageBitmap(image).then(resolve).catch(reject);
        };
        // 当图片加载失败时，拒绝Promise
        image.onerror = () => {
            reject(new Error('Image failed to load'));
        };
        // 设置图片的src属性为提供的URL
    });
}

export function createEmptyTexture(gl: WebGL2RenderingContext) {

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    return texture
}

export function initGL(canvasId: string) {
    const canvas = document.querySelector(`#${canvasId}`) as HTMLCanvasElement
    const gl = canvas.getContext('webgl2', {
        premultipliedAlpha: true
    }) as WebGL2RenderingContext
    if (!gl) {
        console.warn('webgl2 not supported!')
        return
    }
    resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)
    return gl
}

export function createVBO(gl: WebGL2RenderingContext, data: Array<number>) {
    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
    return buffer
}



////// matrix
// a simple 3x3 matrix class
export class M3 {
    value: Array<number>
    constructor(data: Array<number> = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
        this.value = data
    }

    transition(x: number, y: number): M3 {
        let transMat = new M3([
            1, 0, 0,
            0, 1, 0,
            x, y, 1
        ])
        return this.mutiply(transMat.value, this.value)
    }

    scale(x: number, y: number): M3 {
        let scaleMat = new M3([
            x, 0, 0,
            0, y, 0,
            0, 0, 1
        ])
        return this.mutiply(scaleMat.value, this.value)
    }

    rotate(angle: number): M3 {
        let rad = angle * Math.PI / 180
        let s = Math.sin(rad)
        let c = Math.cos(rad)
        let rotateMat = new M3([
            c, -s, 0,
            s, c, 0,
            0, 0, 1
        ])
        return this.mutiply(rotateMat.value, this.value)
    }

    mutiply(a: any, b: any): M3 {

        var a00 = a[0 * 3 + 0]
        var a01 = a[0 * 3 + 1]
        var a02 = a[0 * 3 + 2]
        var a10 = a[1 * 3 + 0]
        var a11 = a[1 * 3 + 1]
        var a12 = a[1 * 3 + 2]
        var a20 = a[2 * 3 + 0]
        var a21 = a[2 * 3 + 1]
        var a22 = a[2 * 3 + 2]
        var b00 = b[0 * 3 + 0]
        var b01 = b[0 * 3 + 1]
        var b02 = b[0 * 3 + 2]
        var b10 = b[1 * 3 + 0]
        var b11 = b[1 * 3 + 1]
        var b12 = b[1 * 3 + 2]
        var b20 = b[2 * 3 + 0]
        var b21 = b[2 * 3 + 1]
        var b22 = b[2 * 3 + 2]

        return new M3([
            b00 * a00 + b01 * a10 + b02 * a20,
            b00 * a01 + b01 * a11 + b02 * a21,
            b00 * a02 + b01 * a12 + b02 * a22,
            b10 * a00 + b11 * a10 + b12 * a20,
            b10 * a01 + b11 * a11 + b12 * a21,
            b10 * a02 + b11 * a12 + b12 * a22,
            b20 * a00 + b21 * a10 + b22 * a20,
            b20 * a01 + b21 * a11 + b22 * a21,
            b20 * a02 + b21 * a12 + b22 * a22
        ])
    }
}