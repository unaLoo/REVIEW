<script setup lang="ts">
import { onMounted } from 'vue'
// import { prepare,instansDraw } from '../exps/01triangle/main';
// import { main, main2 } from '../exps/02texture/main'
// import { main, main3d } from '../exps/03transform/main'
// import { initMap } from '../exps/04polygon/main'
// import { main } from '../exps/05XFBO/main'
// import { initMap } from '../exps/06flow/main'
import { initMap } from '../exps/07arrow/main'
// import { main } from '../exps/培训案例/pulsing';


onMounted(() => {
  initMap()
  // instansDraw()
  // main()
  // prepare()
})

</script>

<template>
  <div class="main">
    <canvas id='playground'></canvas>
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
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgb(63, 63, 63);

  // #playground {
  //   position: relative;
  //   width: 90%;
  //   height: 90%;
  //   background-color: gray;
  //   z-index: 1;
  // }

  #map {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 0;
    background-color: transparent;
  }

}
</style>
