<template>
  <div class="editor">
    <div v-if="sourceVisible" class="source">
      <div>
        <button @click="toggleSource">隐藏</button>
      </div>
      <textarea class="yaml"></textarea>
    </div>
    <input type="file" accept=".yaml">
    <div class="files">
      <div>
        <button @click="open">打开</button>
        <button @click="saveas">保存</button>
        <button @click="toggleSource">数据</button>
        <label>{{filename}}</label>
      </div>
      <ul v-if="yaml.length">
        <li @click="select(queryList)" >
          <span class="red">{{queryList | todos}}</span>
          <span class="green">{{queryList | updates}}</span>
          <span>{{queryList | counter}}</span>
          <input type="text" v-model="query" placeholder="筛选">
        </li>
        <li v-for="item in yaml" :key="item" @click="select(item)" :class="{ selected: item === selected }">
          <span class="red">{{item | todos}}</span>
          <span class="green">{{item | updates}}</span>
          <span>{{item | counter}}</span>
          {{item.file}}
        </li>
      </ul>
      <div v-else>
        无数据
      </div>
    </div>
    <ul class="dictionary">
      <li v-if="selected">{{selected.file}}</li>
      <li v-if="!selected">无数据</li>
      <li v-else v-for="item in selected.i18n" :key="item">
        <div v-for="key in Object.keys(item.lang).sort()" :key="key">
          <label v-if="key === 'todo'" :class="{ todo: !item.update }">
          {{ !item.update ? '待处理' : '已处理' }}
          </label>
          <label v-else>
          {{key}} : {{item.lang[key]}}
          </label>
        </div>
        <button v-if="!item.update" @click="update(item)">更新</button>
        <div v-else>
          <h4>更新</h4>
          <div v-for="locale in languages" :key="locale">
          {{locale}} : <textarea v-model="item.update[locale]" @input="input(item)"
            @focus="recommend(locale, item.lang)"></textarea>
          </div>
          <button @click="cancel(item)">取消</button>
          <div v-if="item.lang === recommendLang">
            <button class="word" v-for="word in recommends" @click="dorecommend(word, item)" :key="word">⌨{{word}}</button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import Vue from 'vue'
import FileSaver from 'file-saver'
import yaml from 'js-yaml'

let filename
let reader = (file, callback) => {
  if (!file) {
    return
  }
  if (!(/\.yaml$/i.test(file.name))) {
    console.log('not yaml file')
    return
  }
  filename = file.name
  var reader = new FileReader()
  reader.onload = (e) => {
    var buffer = new Uint8Array(e.target.result)
    callback(yaml.load(new TextDecoder('utf-8').decode(buffer)))
  }
  reader.onerror = (e) => {
    console.log(e)
  }
  reader.readAsArrayBuffer(file)
}

let STORAGE_KEY = 'h5i18n-editor-0.0'
let editorStorage = {
  fetch: function () {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{ yaml: [], selected: -1 }')
    } catch (ex) {
      return {
        yaml: [],
        selected: -1
      }
    }
  },
  save: function (data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

let data = editorStorage.fetch()

function compare (a, b) {
  if (('todo' in a.lang) && !('todo' in b.lang)) {
    return -1
  }

  if (!('todo' in a.lang) && ('todo' in b.lang)) {
    return 1
  }

  if (a.update && !b.update) {
    return 1
  }

  if (!a.update && b.update) {
    return -1
  }

  return 0
}

/**
 * 获取配置文件中涉及的语言
 *
 * @param yaml 配置信息
 */
function getLanguages (yaml) {
  let result = []
  yaml.forEach((file) => {
    file.i18n.sort(compare)

    file.i18n.forEach((item) => {
      Object.keys(item.lang).forEach((key) => {
        if (key !== 'todo' && key !== '*' && result.indexOf(key) < 0) {
          result.push(key)
        }
      })
    })
  })
  result.sort()
  return result
}

function getQueryList (yaml, query) {
  let result = []
  yaml.forEach((file) => {
    file.i18n.forEach((item) => {
      Object.keys(item.lang).some((key) => {
        if (item.lang[key] && String(item.lang[key]).indexOf(query || '') >= 0) {
          result.push(item)
          return true
        }
      })
    })
  })
  return result.sort(compare)
}

/**
 * 获取词条推荐的翻译
 *
 * @param yaml 配置信息
 * @param lang 词条
 * @param locale 当前语言
 */
function getRecommend (yaml, locale, lang) {
  let result = []
  let keys = Object.keys(lang).filter((key) => {
    return key !== 'todo' && key !== '*' && key !== locale
  })

  yaml.forEach((file) => {
    file.i18n.forEach((item) => {
      keys.forEach((key) => {
        if (item.lang[locale] && lang[key] === item.lang[key] && result.indexOf(item.lang[locale]) < 0) {
          result.push(item.lang[locale])
        }
        if (item.update && item.update[locale] && lang[key] === item.update[key] && result.indexOf(item.update[locale]) < 0) {
          result.push(item.update[locale])
        }
      })
    })
  })
  return result
}

let queryList = {
  file: '[query]' + data.query,
  i18n: getQueryList(data.yaml, data.query)
}

export default {
  name: 'editor',
  data () {
    return {
      sourceVisible: false,
      yaml: data.yaml,
      selected: data.selected === -2 ? queryList : data.yaml[data.selected],
      filename: data.filename,
      languages: getLanguages(data.yaml),
      queryList: queryList,
      query: '',
      recommends: [],
      recommendLang: null,
      recommendLocale: null
    }
  },
  filters: {
    sort (arr) {
      return arr.sort()
    },
    todos (value) {
      if (!value.i18n) {
        return 0
      }
      return value.i18n.filter((item) => {
        return 'todo' in item.lang && !item.update
      }).length
    },
    updates (value) {
      if (!value.i18n) {
        return 0
      }
      return value.i18n.filter((item) => {
        return item.update
      }).length
    },
    counter (value) {
      if (!value.i18n) {
        return 0
      }
      return value.i18n.length
    }
  },
  methods: {
    select (item) {
      this.selected = item
      this.save()
    },
    input (item) {
      Vue.set(this.selected.i18n, this.selected.i18n.indexOf(item), item)
      this.save()
    },
    update (item) {
      let data = {}
      this.languages.forEach((lang) => {
        data[lang] = item.lang[lang]
      })
      item.update = data
      Vue.set(this.selected.i18n, this.selected.i18n.indexOf(item), item)
      this.save()
    },
    cancel (item) {
      delete item.update
      Vue.set(this.selected.i18n, this.selected.i18n.indexOf(item), item)
      this.save()
    },
    saveas () {
      var blob = new Blob([yaml.safeDump(this.yaml)], {type: 'text/plain; charset=utf-8'})
      FileSaver.saveAs(blob, this.filename || 'i18n.yaml')
    },
    toggleSource () {
      this.sourceVisible = !this.sourceVisible
      setTimeout(() => {
        if (this.sourceVisible) {
          document.querySelector('textarea.yaml').value = yaml.safeDump(this.yaml)
        }
      }, 100)
    },
    save () {
      let index
      if (queryList === this.selected) {
        index = -2
      } else {
        index = this.yaml.indexOf(this.selected)
      }
      editorStorage.save({
        yaml: this.yaml,
        selected: index,
        filename: this.filename,
        query: this.query
      })
    },
    open () {
      let input = document.querySelector('.editor input[type="file"]')
      input.onchange = (e) => {
        reader(input.files[0], (yaml) => {
          this.yaml = yaml
          this.selected = yaml[0]
          this.filename = filename
          this.languages = getLanguages(this.yaml)
          this.save()
        })
      }
      input.click()
    },
    recommend (locale, lang) {
      if (locale && lang) {
        this.recommends = getRecommend(this.yaml, locale, lang)
      }
      this.recommendLang = lang
      this.recommendLocale = locale
    },
    dorecommend (word, item) {
      item.update[this.recommendLocale] = word
      Vue.set(this.selected.i18n, this.selected.i18n.indexOf(item), item)
    }
  },
  created () {
    let dropHandler = (e) => {
      e.preventDefault()
      reader(e.dataTransfer.files[0], (yaml) => {
        this.yaml = yaml
        this.selected = yaml[0]
        this.filename = filename
        this.languages = getLanguages(this.yaml)
        this.save()
      })
    }
    let dragoverHandler = (e) => {
      e.preventDefault()
    }
    document.addEventListener('drop', dropHandler)
    document.addEventListener('dragover', dragoverHandler)
  },
  watch: {
    query () {
      queryList.file = '[query]' + this.query
      queryList.i18n = getQueryList(this.yaml, this.query)
      this.save()
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
textarea {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  font-size: 14px;
}

button {
	box-shadow: inset 0px 1px 0px 0px #ffffff;
	background: linear-gradient(to bottom, #f9f9f9 5%, #e9e9e9 100%);
	background-color: #f9f9f9;
	border-radius: 6px;
	border :1px solid #dcdcdc;
	display: inline-block;
	cursor: pointer;
	color: #666666;
	font-family: Arial;
	font-size: 15px;
	font-weight: bold;
	padding: 6px 24px;
	text-decoration: none;
	text-shadow: 0px 1px 0px #ffffff;

  &.word {
    margin: 5px 5px 5px 0;
    padding: 2px;
    ️&::before {
      content: '⌨️';
    }
  }
}

button:hover {
	background: linear-gradient(to bottom, #e9e9e9 5%, #f9f9f9 100%);
	background-color: #e9e9e9;
}

button:active {
	position: relative;
	top: 1px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  margin: 0 10px;
  text-align: left;

  &.selected {
    background: steelblue;
    color: white;
  }
}

.files {
  float: left;

  width: 39.4%;
  li {
    cursor: pointer
  }

  .red {
    color: red;
  }
  .green {
    color: green;
  }
  input[type="text"] {
    width: 55%;
  }
}

.editor {
  input[type="file"] {
    display: none;
  }

  .source {
    left: 50%;
    transform: translate(-50%, 0);
    position: fixed;
    height: 500px;
    width: 80%;
    background: white;
    border-radius: 5px;
    textarea.yaml {
      width: 100%;
      height: 100%;
    }
  }
}

.dictionary {
  float: left;
  width: 59.4%;

  textarea {
    width: 90%;
  }

  h4 {
    color: green;
    padding: 0;
    margin: 8px 0;
  }

  .todo {
    color: red;
  }

  li {
    margin: 10px 0;
    padding: 8px;
    border-radius: 3px;
    background-color: #ffffff;
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.31);
  }
}
</style>
