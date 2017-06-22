<script>
let dropHandler
let dragenterHandler
let dragoverHandler
let dragleaveHandler
let dragendHandler

export default {
  // 当绑定元素插入到 DOM 中。
  bind: function (el, binding) {
    // 注册一个全局自定义指令 v-focus
    dropHandler = (e) => {
      e.preventDefault()
      if (binding.value.ondrop) {
        binding.value.ondrop(e)
      }
    }

    dragenterHandler = (e) => {
      el.classList.add('droping')
    }

    dragoverHandler = (e) => {
      e.preventDefault()
    }

    dragleaveHandler = (e) => {
      el.classList.remove('droping')
    }

    dragendHandler = (e) => {
      e.preventDefault()
      el.classList.remove('dragend')
    }

    // 聚焦元素
    el.addEventListener('drop', dropHandler)
    el.addEventListener('dragenter', dragenterHandler)
    el.addEventListener('dragover', dragoverHandler)
    el.addEventListener('dragleave', dragleaveHandler)
    el.addEventListener('dragend', dragendHandler)
  },

  unbind: function (el) {
    el.removeEventListener('drop', dropHandler)
    el.removeEventListener('dragenter', dragenterHandler)
    el.removeEventListener('dragover', dragoverHandler)
    el.removeEventListener('dragleave', dragleaveHandler)
    el.removeEventListener('dragend', dragendHandler)
  }
}
</script>

<style>
body {
  background: red;
}
</style>
