<script setup lang="ts">
import { onMounted } from 'vue'
// import { prepare } from '../exps/01triangle/main';
// import { main, main2 } from '../exps/02texture/main'
// import { main, main3d } from '../exps/03transform/main'
// import { initMap } from '../exps/04polygon/main'
import { main } from '../exps/05XFBO/main'
// import { initMap } from '../exps/06flow/main'

onMounted(() => {
  // initMap()
  main()
})

</script>

<template>
  <div class="main">
    <canvas id='playground'></canvas>
    <!-- <div id="map"></div> -->
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

  #playground {
    position: relative;
    width: 90%;
    height: 90%;
    background-color: gray;
    z-index: 1;
  }

  #map {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 2;
    background-color: transparent;
  }

}

#ui {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 999;
  background-color: rgba($color: #eb8e8e, $alpha: 0.6);
}
</style>
