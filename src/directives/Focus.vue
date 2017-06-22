<script>
// 注册一个全局自定义指令 v-focus
export default {
  // 当绑定元素插入到 DOM 中。
  inserted: function (el) {
    // 聚焦元素
    el.focus()
  }
}
</script>
