<template>
  <div class="p-mock-page">

  </div>
</template>

<script setup lang="ts">
const serverUrl= `ws://${location.hostname}:${location.port}/mock`
const socket = new WebSocket(serverUrl)
socket.onopen = function (e) {
  console.log('连接成功')
  socket.send('hello')
}
socket.onerror = function (e) {
  console.log('连接失败')
}
socket.onmessage = function (e) {
  console.log('收到消息', e.data)
}
socket.onclose = function (e) {
  console.log('连接关闭')
}
</script>

<style scoped lang="scss">

</style>
