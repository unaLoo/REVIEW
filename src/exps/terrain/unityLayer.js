import * as THREE from 'three'
import MaskLayer from './maskLayer'
import { GUI } from 'dat.gui'

let tickCount = 0
const WORLD_SIZE = 1024000 //TILE_SIZE * 2000

const unityCanvas = document.createElement('canvas')
unityCanvas.id = 'UnityCanvas'
unityCanvas.style.zIndex = '1'
unityCanvas.style.width = '100%'
unityCanvas.style.height = '100%'
unityCanvas.style.border = 'none'
unityCanvas.style.position = 'absolute'
unityCanvas.style.pointerEvents = 'none'
unityCanvas.style.background = 'transparent !important'
document.body.appendChild(unityCanvas)

export default class UnityLayer{

    constructor(originPosition, visibleZoom) {

        this.type = 'custom'
        this.id = 'UnityLayer'
        this.renderingMode = '3d'
        this.unityProjName = 'output'
        this.visibleZoom = visibleZoom
        this.originPosition = originPosition

        this.map = undefined
        this.zoom = undefined
        this.unity = undefined
        this.originPoint = undefined
        this.dispatchMessage = undefined

        // Get Unity canvas
        this.unityCanvas = unityCanvas
        unityCanvas.style.width = unityCanvas.clientWidth
        unityCanvas.style.height = unityCanvas.clientHeight

        this.movable = true
        this.pX = -4.0517
        this.pY = 0.00
        this.pZ = -4.956
        this.rX = 0.0
        this.rY = 0.0
        this.rZ = 0.0
        this.sX = 0.9089
        this.sY = 1.0
        this.sZ = 0.8863
    }

    onAdd(map, gl) {

        // Set Unity instance configuration
        const buildUrl = "/unity/collapseBank/build"
        const config = {
            frameworkUrl: buildUrl + `/${this.unityProjName}.framework.js`,
            dataUrl: buildUrl + `/${this.unityProjName}.data`,
            codeUrl: buildUrl + `/${this.unityProjName}.wasm`,
            streamingAssetsUrl: "StreamingAssets",
            companyName: "DefaultCompany",
            productVersion: "0.1",
            productName: "0325",
            webglContextAttributes: {
                "alpha": true
            }
        }

        // Init map
        this.map = map
        this.zoom = this.map.getZoom()
        this.map.on('click', e => {

            if (this.zoom >= this.visibleZoom) this.pick(e.point.x, e.point.y)
        })
        
        // Set origin point
        this.op_world = this.wgs84ToWorld(this.originPosition[0], this.originPosition[1])
        //     120.51988006, 32.04023661,
        //     120.54608256, 32.02842654,
        //     120.56382537, 32.02344990,
        //     120.51749289, 32.04059243,
        //     120.51977143, 32.04001152,
        //     120.52561059, 32.03824715,
        //     120.52660704, 32.03676583,
        //     120.53334877, 32.03227055,
        //     120.54599538, 32.02837993,
        //     120.55330842, 32.02691551,
        //     120.55649757, 32.02592404,
        //     120.56334257, 32.02298144,
        //     120.56944728, 32.02070961,
        //     120.51738456, 32.04042984,
        //     120.51958506, 32.03998636,
        //     120.52551656, 32.03811304,
        //     120.53327833, 32.03217940,
        //     120.54588866, 32.02838767,
        //     120.55315814, 32.02692744,
        //     120.55672182, 32.02580795,
        //     120.51726088, 32.04054582,
        //     120.51738292, 32.04054923,
        //     120.51749021, 32.04053105,
        //     120.51957026, 32.04008655,
        //     120.51967889, 32.04004108,
        //     120.51986665, 32.03998992,
        //     120.52557975, 32.03825056,
        //     120.52565217, 32.03813574,
        //     120.52566826, 32.03799363,
        //     120.51992163, 32.04023206,
        //     120.52666202, 32.03683063,
        //     120.54611474, 32.02839471,
        // ]
        // const positions_MS = []
        // for (let i = 0; i < coords.length / 2; i++) {
        //     const lon = coords[2 * i + 0]
        //     const lat = coords[2 * i + 1]
        //     const pos_WS = this.wgs84ToWorld(lon, lat)
        //     const pos_MS = this.worldToModel(pos_WS[0], pos_WS[1])
        //     positions_MS.push(pos_MS[0])
        //     positions_MS.push(pos_MS[1])
        //     positions_MS.push(pos_MS[2])
        // }

        // Init Unity insatnce
        createUnityInstance(this.unityCanvas, config, (progress) => {
        
        }).then((unityInstance) => {

            this.map.addLayer(new MaskLayer())

            this.unity = unityInstance

            this.dispatchMessage = (message) => {

                this.unity.SendMessage("MapCamera", "DispatchMessage", JSON.stringify(message))
            }

            this.init()
            this.keep(this.zoom >= this.visibleZoom)

            // stopWebCam()

            const offset = 0.0
            const devices = [
                0, 120.5289404,32.03504751,
                0, 120.5222438, 32.03900986, 
                0, 120.5212035, 32.04098681, 
                3, 120.515163, 32.04214443 + offset,     //  3
                3, 120.5209528, 32.04067285, 
                3, 120.5108725, 32.04263819 + offset,    //  5
                3, 120.5113986, 32.04257987 + offset,    //  6
                3, 120.5210704, 32.0403478, 
                3, 120.5156746, 32.04204412 + offset,    //  8
                0, 120.515204, 32.04180251 + offset,     //  9
                3, 120.5103731, 32.04268722 + offset,    // 10
                3, 120.5146732, 32.04226309 + offset,    // 11
                0, 120.547948, 32.02945642, 
                0, 120.5643912, 32.02367567, 
                0, 120.5587575, 32.02524072 + offset * 0.2,    // 14 
                0, 120.51129, 32.0429479 + offset,       // 15
                3, 120.5208149, 32.04101417, 
                0, 120.5511673, 32.02840145, 
                0, 120.5414619, 32.03076972, 
                4, 120.5422418, 32.03077085, 
                4, 120.5155315, 32.04267723 + offset,    // 20
                4, 120.522407, 32.03941692, 
                1, 120.5149435, 32.04269763 + offset,    // 22
                1, 120.5418489, 32.0309461, 
                1, 120.5592327, 32.025761, 
                2, 120.5410243, 32.03071962, 
                2, 120.551624, 32.02829712, 
                2, 120.5286929, 32.03476855, 
                2, 120.5108859, 32.04228621 + offset,// + 0.0002,    // 28
                2, 120.5205948, 32.04056061, 
                2, 120.5474064, 32.02961633, 
                2, 120.5147123, 32.0417763 + offset,     // 31
                // 3, 120.5210704, 32.0403478, 
                // 3, 120.5113986, 32.04257987, 
                // 3, 120.5108725, 32.04263819, 
                // 3, 120.5146732, 32.04226309, 
                // 3, 120.5208149, 32.04101417, 
                // 3, 120.515163, 32.04214443, 
                // 3, 120.5156746, 32.04204412, 
                // 3, 120.5209528, 32.04067285, 
                // 3, 120.5103731, 32.04268722, 
            ]

            for (let i = 0; i < devices.length / 3; i++) {
                this.addDevice(`${i}`, devices[i * 3 + 0], devices[i * 3 + 1], devices[i * 3 + 2], 10.0)
            }

            // dat.GUI
            if (this.movable) {
                const gui = new GUI()
                const positionFolder = gui.addFolder('Position')
                positionFolder.add(this, 'pX', -100.0, 100.0, 0.0001)
                positionFolder.add(this, 'pY', -100.0, 100.0, 0.0001)
                positionFolder.add(this, 'pZ', -100.0, 100.0, 0.0001)
                positionFolder.open()
                const rotationFolder = gui.addFolder('Rotation')
                rotationFolder.add(this, 'rX', -180.0, 180.0, 0.0001)
                rotationFolder.add(this, 'rY', -180.0, 180.0, 0.0001)
                rotationFolder.add(this, 'rZ', -180.0, 180.0, 0.0001)
                rotationFolder.open()
                const scaleFolder = gui.addFolder('Scale')
                scaleFolder.add(this, 'sX', 0.0, 10.0, 0.0001)
                scaleFolder.add(this, 'sY', 0.0, 10.0, 0.0001)
                scaleFolder.add(this, 'sZ', 0.0, 10.0, 0.0001)
                scaleFolder.open()
            }


        }).catch((message) => {

            alert(message)
        })
    }

    render(gl, matrix) {

        if (!this.unity) return

        this.tick()

        this.map.triggerRepaint()
    }

    // Unity interfaces
    init() {

        this.dispatchMessage({
            Method: 'Init'
        })
    }

    pick(x, y) {

        this.dispatchMessage({
            Method: 'Pick',
            F32Array: [
                2.0 * x / this.unityCanvas.clientWidth - 1.0,
                2.0 * (this.unityCanvas.clientHeight - y) / this.unityCanvas.clientHeight - 1.0
            ]
        })
    }

    move() {

        this.dispatchMessage({
            Method: 'Translate',
            F32Array: [
                /* 0 - 2: position  */      this.pX, this.pY, this.pZ,
                /* 3 - 5: rotation  */      this.rX, this.rY, this.rZ,
                /* 6 - 8: scale     */      this.sX, this.sY, this.sZ,
            ]
        })
    }

    tick() {

        const xCamera = updateWorldCamera(this.map.transform.clone(), WORLD_SIZE, -30.0)

        const flip = new THREE.Matrix4().set(
            1.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        )

        const xModel = new THREE.Matrix4().multiply(new THREE.Matrix4().makeTranslation(this.op_world[0], this.op_world[1], 0.0))
        const xView = xCamera.view
        const xProjection = makePerspectiveMatrix(xCamera.fov, xCamera.aspect, xCamera.nearZ, xCamera.farZ)
        const xMVP = xProjection.multiply(xView).multiply(xModel).multiply(flip)

        const up = xCamera.up
        const center = this.worldToModel(xCamera.center.x, xCamera.center.y, xCamera.center.z, 0.0, 0.0, 0.0)
        const position = this.worldToModel(xCamera.position.x, xCamera.position.y, xCamera.position.z, 0.0, 0.0, 0.0)

        this.dispatchMessage({
            Method: 'Tick',
            F32Array: [ 
                /* 0 - 15  */   ...xMVP.elements, 
                /* 16 - 18 */   position[0], position[2], position[1], 
                /* 19 - 21 */   up.x, up.z, up.y,
                /* 22      */   xCamera.fov * 180.0 / Math.PI,
                /* 23 - 25 */   center[0], center[2], center[1],
                /* 26      */   xCamera.nearZ,
                /* 27      */   xCamera.farZ,
                this.pX, this.pY, this.pZ,
                this.rX, this.rY, this.rZ,
                this.sX, this.sY, this.sZ,
            ]
        })
    }

    keep(tof) {

        this.unityCanvas.style.visibility = tof ? 'visible' : 'hidden'

        this.dispatchMessage({
            Method: 'Keep',
            BoolArray: [ tof ]
        })
    }

    addDevice(name, type, lon, lat, scale) {

        const WMC = this.wgs84ToWorld(lon, lat)
        const coord = this.worldToModel(WMC[0], WMC[1], 0.0)

        this.dispatchMessage({
            Method: 'AddDevice',
            StrArray: [ name ],
            F32Array: [
                /* 0 */   type, 
                /* 1 */   coord[0], 
                /* 2 */   coord[2], 
                /* 3 */   coord[1], 
                /* 4 */   scale, 
            ]
        })
    }

    clear() {

        const gl = this.unity.Module.ctx
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
        gl.clearColor(0.0, 0.0, 0.0, 0.0)
    }

    wgs84ToWorld(lon, lat) {

        const worldSize = WORLD_SIZE
        const WMC = fromLonLat([ lon, lat ])
        return [
            (WMC[0] - 0.5) * worldSize,
            (0.5 - WMC[1]) * worldSize
        ]
    }

    worldToModel(x, y, z, offsetX = 0.0, offsetY = 0.0, offsetZ = 0.0) {

        return [
            x + offsetX - this.op_world[0],
            y + offsetY - this.op_world[1],
            z + offsetZ,
        ]
    }
}

// Helpers //////////////////////////////////////////////////////////////////////////////////////////////////////
function mercatorXfromLon(lon) {
        
    return (180. + lon) / 360.
}

function mercatorYfromLat(lat) {

    return (180. - (180. / Math.PI * Math.log(Math.tan(Math.PI / 4. + lat * Math.PI / 360.)))) / 360.
}

function fromLonLat(lonLat) {

    const x = mercatorXfromLon(lonLat[0])
    const y = mercatorYfromLat(lonLat[1])

    return [ x, y ]
}


function updateWorldCamera (transform, mercatorWorldSize, minElevation = 0.0) {

    const fov = transform._fov
    const halfFov = transform._fov / 2

    const angle = transform.angle
    const pitch = transform._pitch

    const aspect = transform.width / transform.height

    const cameraToCenterDistance = 0.5 / Math.tan(halfFov) * mercatorWorldSize / transform.scale * transform.height / 512.0
    const cameraToSeaLevelDistance = ((transform._camera.position[2] * mercatorWorldSize) - minElevation) / Math.cos(pitch)
    const topHalfSurfaceDistance = Math.sin(halfFov) * cameraToSeaLevelDistance / Math.sin(Math.max(Math.PI / 2.0 - pitch - halfFov, 0.01))
    const furthestDistance = Math.sin(pitch) * topHalfSurfaceDistance + cameraToSeaLevelDistance
    const horizonDistance = cameraToSeaLevelDistance / transform._horizonShift
    const farZ = Math.min(furthestDistance * 1.01, horizonDistance)

    const pitchMatrix = new THREE.Matrix4().makeRotationX(pitch)
    const angleMatrix = new THREE.Matrix4().makeRotationZ(angle)
    const worldToCamera = pitchMatrix.premultiply(angleMatrix)
    
    const x = transform.pointMerc.x
    const y = transform.pointMerc.y
    const centerX = (x - 0.5) * mercatorWorldSize
    const centerY = (0.5 - y) * mercatorWorldSize
    const center = new THREE.Vector3(centerX, centerY, 0)

    const up = new THREE.Vector3(0, 1, 0)
    .applyMatrix4(angleMatrix)

    const position = new THREE.Vector3(0, 0, 1)
    .applyMatrix4(worldToCamera)
    .multiplyScalar(cameraToCenterDistance)
    .add(center)

    const view = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z).multiply(worldToCamera).invert()

    return {
        position,
        center,
        up,
        fov,
        aspect,
        farZ,
        view,
        nearZ: cameraToCenterDistance / 200,
    }
}

function makePerspectiveMatrix(fovy, aspect, near, far) {

    var out = new THREE.Matrix4()
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far)

    var newMatrix = [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 0
    ]

    out.elements = newMatrix
    return out
}

// function stopWebCam() {
//     if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//         navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
//             stream.getTracks().forEach(track => track.stop())
//         }).catch(function(error) {
//             console.log("Error stopping the webcam: ", error)
//         })
//     }
// }