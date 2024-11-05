<template>
    <div class="addon" :style="bkStyle"></div>
</template>

<script setup>
import { onMounted, computed, watch } from 'vue';
const props = defineProps({
    backImgSrc: String
})
const bkStyle = computed(() => {
    return {
        backgroundImage: `url(${props.backImgSrc})`
    }
})
</script>

<style lang="scss" scoped>
.addon {
    position: relative;
    width: 300px;
    height: 300px;
    background-size: cover;
    z-index: 2;
}
</style>