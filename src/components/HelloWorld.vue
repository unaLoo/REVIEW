<script setup lang="ts">
import { onMounted } from 'vue'
// import { prepare } from '../exps/01triangle/main';
// import { main, main2 } from '../exps/02texture/main'
import { main, main3d } from '../exps/03transform/main'

onMounted(() => {
  // main3d()
  main()
})

</script>

<template>
  <div class="main">
    <canvas id='playground'>

    </canvas>
  </div>
  <div id="ui"></div>
</template>

<style scoped lang="scss">
.main {
  position: absolute;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgb(63, 63, 63);

  #playground {
    width: 90%;
    height: 90%;
    background-color: gray;
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
