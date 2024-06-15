

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
