<script setup lang="ts">
import { onMounted } from 'vue'
// import { prepare,instansDraw } from '../exps/01triangle/main';
// import { main, main2 } from '../exps/02texture/main'
// import { main, main3d } from '../exps/03transform/main'
// import { initMap } from '../exps/04polygon/main'
// import { main } from '../exps/05XFBO/main'
// import { initMap } from '../exps/06flow/mainWithMask'
// import { initMap, EulerFlowLayer } from '../exps/07arrow/main'
// import { initMap } from '../exps/07arrow/withMask'
// import { main } from '../exps/培训案例/pulsing';
// import { initMap } from '../exps/08invasion/invasion';
// import { initMap } from '../exps/08invasion/terrainV0.js';
// import {initMap} from '../exps/08invasion/model.js'
// import { initMap } from '../exps/terrain/main.js'
import { main } from '../exps/10shadow/exmaple.js'


// const nowZoom = ref(0)
// const percentage = ref(0)
// let map: any

onMounted(() => {
  // map = new mapbox.Map({
  //   style: "mapbox://styles/nujabesloo/clxk678ma00ch01pdd2lfgps2",
  //   center: [120.980697, 31.684162], // [ 120.556596, 32.042607 ], //[ 120.53525158459905, 31.94879239156117 ], // 120.980697, 31.684162
  //   // projection: 'mercator',
  //   accessToken: 'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA',
  //   container: 'map',
  //   antialias: true,
  //   maxZoom: 18,
  //   zoom: 9 //10.496958973488436, // 16
  // }).on('load', () => {
  //   console.log('map load!')
  //   const eulerFlowLayer = reactive(new EulerFlowLayer('flow'))
  //   map.addLayer(eulerFlowLayer as mapbox.AnyLayer)
  //   watch(() => eulerFlowLayer.uvResourcePointer, (newVal) => {
  //     console.log('new uvResourcePointer', newVal)
  //     percentage.value = Math.ceil(newVal / 26 * 100)
  //   })
  // })
  // map.on('zoom', () => {
  //   nowZoom.value = map.getZoom()
  // })
  // map.fitBounds([[120.0483046046972, 31.739366192168674], [120.98183604889795, 32.14476417588851]])
  // window.addEventListener('keydown', (e) => {
  //   if (e.key == '1') {
  //     console.log(map.getBounds())
  //   }
  // })

  // initMap()
  // simpleArrow()
  // instansDraw()
  // main()
  // prepare()
  main()

})

</script>

<template>
  <div class="main">
    <canvas id='playground'></canvas>
    <!-- <div id="map"></div> -->
    <!-- <div id="progress">
      <el-progress :percentage="percentage" :stroke-width="15" striped />
    </div>
    <div id="zoom">
      Zoom:<br>
      {{ nowZoom }}
    </div> -->
  </div>
</template>

<style scoped lang="scss">
.main {
  position: absolute;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgb(63, 63, 63);

  #playground {
    position: relative;
    width: 100vw;
    height: 100vh;
    background-color: gray;
    z-index: 0;
  }

  #map {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 0;
    background-color: #ffffff;
  }

  #zoom {
    position: absolute;
    z-index: 4;
    right: 15vw;
    top: 2vh;
    width: 10vw;
    height: 8vh;
    background-color: #333;
    border-radius: 7.5%;
    color: white;
    font-size: 20px;
    font-weight: 800;
    font-family: 'Times new roman', 'sans-serif';
    font-style: italic;
    text-align: center;
    align-self: center;
    line-height: 4vh;
  }

  #progress {
    position: absolute;
    z-index: 4;
    bottom: 3.5vh;
    left: 0;
    width: 100vw;
    height: fit-content;
  }

}
</style>
