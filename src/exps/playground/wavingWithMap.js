import mapboxgl from "mapbox-gl"
import OceanLayer from './oceanLayer'

export const initMap = () => {

    const EmptyStyle = {
        "version": 8,
        "name": "Empty",
        "sources": {
        },
        "layers": [
        ]
    }

    const MZSVIEWCONFIG = {
        center: [120.83794466757358, 32.03061107103058],
        zoom: 8.096017911120207,
        pitch: 0,
    }
    
    // const map = new ScratchMap({
    const map = new mapboxgl.Map({
        style: 'mapbox://styles/mapbox/dark-v11',
        container: 'map',
        projection: 'mercator',
        antialias: true,
        maxZoom: 18,
        center: MZSVIEWCONFIG.center,
        zoom: MZSVIEWCONFIG.zoom,
        pitch: MZSVIEWCONFIG.pitch,

    }).on('load', () => {
        map.addLayer(new OceanLayer(
            '/mask/CJ.geojson'
        ))
    }).on('render',()=>{
        map.triggerRepaint()
    })

}