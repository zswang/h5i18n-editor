import Vue from 'vue'
import Editor from '@/components/Editor'

describe('Editor.vue', () => {
  it('should render correct contents', () => {
    const Constructor = Vue.extend(Editor)
    const vm = new Constructor().$mount()
    expect(vm.$el.querySelector('.files button').textContent)
      .to.equal('打开')
  })
})
