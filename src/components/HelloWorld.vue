<script setup lang="ts">
import { onMounted } from 'vue'
// import { play } from '../WebGPU/enter.js'
import { initMap } from '../exps/mapjitter/main.js'


onMounted(() => {

  initMap()

})

</script>

<template>
  <div class="main">

    <!-- <canvas id='playground'></canvas> -->
    <div id="map"></div>
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

}
</style>
