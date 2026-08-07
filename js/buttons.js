const playControls = {
  template: `
    <div class="controls button-block">
      <div class="button" @click="$emit('previousFrame')">⏮</div>
      <div class="button" @click="$emit('togglePlay')">{{active ? '⏸' : '▶'}}</div>
      <div class="button" @click="$emit('nextFrame')">⏭</div>
    </div>
  `,
  props: {
    active: Boolean,
  },
  emits: ['previousFrame', 'togglePlay', 'nextFrame'],
}

const radioButtons = {
  template: `
    <div class="radio button-block">
      <div v-for="choice in choices" :class="{button:true, 'button-radio': true, active:choice.value==value}" @click="$emit('setChoice', choice.value)">{{choice.display}}</div>
    </div
  `,
  props: {
    value: [String, Number],
    choices: Object,
  },
  emits: ['setChoice'],
}

const toggleButton = {
  template: `
    <div>
      <div :class="{button:true, 'button-checkbox': true, active:modelValue}" @click="update(!modelValue)">{{text}}</div>
    </div>
  `,
  methods: {
    update(newValue) {
      this.$emit('update:modelValue', newValue)
      if (this.updateUrl != undefined) {
        let urlParams = new URLSearchParams(window.location.search)
        urlParams.set(this.updateUrl, newValue ? '1' : '0')
        window.history.replaceState({ path: 'home' }, '', `?${urlParams.toString()}`)
      }
    },
  },
  props: {
    text: String,
    modelValue: Boolean,
    updateUrl: String,
  },
  emits: ['update:modelValue'],
}

const collapsibleButton = {
  template: `
    <div class="collapsible">
      <div :class="{'collapsible-button':true, collapsed:isCollapsed}" @click="click()"><slot name="label"></slot></div>
      <div ref="collapsible" :class="{'collapsible-content': true, visible:!isCollapsed}"><slot></slot></div>
    </div
    `,
  props: {
    label: String,
    collapsed: {
      type: Boolean,
      default: true,
    },
  },
  methods: {
    click() {
      this.isCollapsed = !this.isCollapsed
      if (this.isCollapsed) {
        this.$refs.collapsible.style['max-height'] = null
      } else {
        this.$refs.collapsible.style['max-height'] = this.$refs.collapsible.scrollHeight + 'px'
      }
    },
  },
  data() {
    return {
      isCollapsed: this.collapsed,
    }
  },
}

const integerButtons = {
  template: `
    <div class="controls button-block">
      <div class="button" @click="$emit('decrease')">-</div>
      <div class="button">{{n}}</div>
      <div class="button" @click="$emit('increase')">+</div>
    </div>
  `,
  props: {
    n: Number,
  },
  emits: ['increase', 'decrease'],
}

const incrementalButtons = {
  template: `
    <div class="controls button-block">
      <div class="button" @click="n>=min+step ? $emit('value', n-step) : null">-</div>
      <div class="button disabled">{{n}}</div>
      <div class="button" @click="n<=max-step ? $emit('value', n+step) : null">+</div>
    </div>
  `,
  props: {
    n: Number,
    min: Number,
    max: Number,
    step: Number,
  },
  emits: ['value'],
}

const selector = {
  template: `
    <select :value="selectedValue.display" @input="value=>{pick(value, 'input')}" @change="value=>{pick(value, 'change')}">
      <option v-for="elt of options">{{elt.display}}</option>
    </select>
  `,
  methods: {
    pick: function (event, v) {
      let selected = event.target.value
      for (let elt of this.options) {
        if (elt.display == selected) {
          this.$emit('update:modelValue', elt)
          if (this.updateUrl != undefined) {
            let urlParams = new URLSearchParams(window.location.search)
            urlParams.set(this.updateUrl, elt.display)
            window.history.replaceState({ path: 'home' }, '', `?${urlParams.toString()}`)
          }
        }
      }
    },
  },
  computed: {
    selectedValue() {
      let key
      if (typeof this.modelValue === 'string') {
        key = this.modelValue
      } else {
        key = this.modelValue.display
      }
      for (let opt of this.options) {
        if (opt.display == key) {
          return opt
        }
      }
    },
  },
  props: {
    options: {
      validator(value, props) {
        if (!Array.isArray(value)) {
          console.error(`<selector> options is not an array`, value)
          return false
        }
        for (let elt of value) {
          if (!(typeof elt === 'object' && !Array.isArray(elt) && elt !== null)) {
            console.error(`<selector> option isn't an object`, elt)
            return false
          }
          for (let need of ['display', 'value']) {
            if (!(need in elt)) {
              console.error(`<selector> option doesn't have key ${need}`, elt)
              return false
            }
          }
        }
        return true
      },
    },
    modelValue: [String, Object], // either the 'display' string value of the selection, or an object with the 'display' key (in case of {display, value} the 'value' key will be ignored)
    updateUrl: String, // will update this URL parameter with the 'display' value when selected
  },
  emits: ['value', 'update:modelValue'], // emits the full option {display, value} object
}

// given a list of {display, value} objects, and an URL parameter key, return the object that matches, or the fallback
function getSelectorURLOption(options, key, fallback) {
  let params = new URLSearchParams(window.location.search)
  if (!params.has(key)) {
    return fallback
  }
  let display = params.get(key)
  for (let elt of options) {
    if (elt.display == display) {
      return elt
    }
  }
  return fallback
}

function getBoolURL(key, fallback) {
  let params = new URLSearchParams(window.location.search)
  if (!params.has('showFill')) return fallback
  return params.get('showFill') == '1'
}

export {
  playControls,
  radioButtons,
  toggleButton,
  collapsibleButton,
  integerButtons,
  incrementalButtons,
  selector,
  getSelectorURLOption,
  getBoolURL,
}
