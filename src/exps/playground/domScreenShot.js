
import domtoimage from 'dom-to-image';

////// just copy the code
const divNeedToCapture = document.querySelector('#div1')
const mountedFatherDom = document.querySelector('div.main')

window.addEventListener('keydown', async (e) => {
    if (e.key == '1') {
        // base64 url
        const imageUrl = await domtoimage.toPng(divNeedToCapture)
        const div = document.createElement('div')
        const app = createApp(addon, { backImgSrc: imageUrl })
        app.mount(div)
        mountedFatherDom.appendChild(div)
    }
})