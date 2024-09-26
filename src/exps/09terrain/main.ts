import mapboxgl from "mapbox-gl"










export const initMap = () => {
    const map = new mapboxgl.Map({
        style: "mapbox://styles/nujabesloo/clxk678ma00ch01pdd2lfgps2",
        center: [120.980697, 31.684162], // [ 120.556596, 32.042607 ], //[ 120.53525158459905, 31.94879239156117 ], // 120.980697, 31.684162
        projection: "mercator" as any,
        accessToken: 'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA',
        container: 'map',
        antialias: true,
        maxZoom: 18,
        zoom: 9 //10.496958973488436, // 16
    }).on('load', () => {

        console.log('map load!')

    })
    return map;
}