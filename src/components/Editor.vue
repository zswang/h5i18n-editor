<template>
  <div class="editor">
    <input type="file" accept=".yaml">
    <div class="files">
      <div>
        <button @click="open">打开</button>
        <button @click="saveas">保存</button>
        <label>{{filename}}</label>
      </div>
      <ul>
        <li v-if="yaml.length <= 0">无数据</li>
        <li v-else v-for="item in yaml" @click="select(item)" :class="{ selected: item === selected }">
          <span class="red">{{item | todos}}</span>
          <span class="green">{{item | updates}}</span>
          <span>{{item | counter}}</span>
          {{item.file}}
        </li>
      </ul>
    </div>
    <ul class="dictionary">
      <li v-if="selected">{{selected.file}}</li>
      <li v-if="!selected">无数据</li>
      <li v-else v-for="item in selected.i18n">
        <div v-for="key in Object.keys(item.lang).sort()">
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
          <div v-for="locale in languages">
          {{locale}} : <textarea v-model="item.update[locale]" @input="input(item)"
            @focus="recommend(locale, item.lang)"></textarea>
          </div>
          <button @click="cancel(item)">取消</button>
          <div>
            <button class="word" v-if="item.lang === recommendLang" v-for="word in recommends" @click="dorecommend(word, item)">⌨{{word}}</button>
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

/**
 * 获取配置文件中涉及的语言
 *
 * @param yaml 配置信息
 */
function getLanguages (yaml) {
  let result = []
  yaml.forEach((file) => {
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

export default {
  name: 'editor',
  data () {
    return {
      yaml: data.yaml,
      selected: data.yaml[data.selected],
      filename: data.filename,
      languages: getLanguages(data.yaml),
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
    save () {
      editorStorage.save({
        yaml: this.yaml,
        selected: this.yaml.indexOf(this.selected),
        filename: this.filename
      })
    },
    open () {
      let input = document.querySelector('.editor input[type="file"]')
      input.onchange = (e) => {
        reader(input.files[0], (yaml) => {
          this.yaml = yaml
          this.selected = yaml[0]
          this.filename = filename
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
      console.log(word, item, this.recommendLocale)
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
        this.save()
      })
    }
    let dragoverHandler = (e) => {
      e.preventDefault()
    }
    document.addEventListener('drop', dropHandler)
    document.addEventListener('dragover', dragoverHandler)
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
}

.editor {
  input[type="file"] {
    display: none;
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
