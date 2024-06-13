<script setup lang="ts">
import { ref } from 'vue'

</script>

<template>
  <div class="main">
    <canvas id='playground'>

    </canvas>
  </div>
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
</style>
