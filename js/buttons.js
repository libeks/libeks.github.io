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
      <div 
        v-for="choice in choices" 
        :class="{button:true, 'button-radio': true, active:choice.display==modelValue.display}" 
        @click="change(choice)"
      >{{choice.display}}</div>
    </div
  `,
  methods: {
    change(elt) {
      this.$emit('update:modelValue', elt)
      this.$emit('value', elt)
      if (this.updateUrl != undefined) {
        updateURLParameter(this.updateUrl, elt.display)
      }
    },
  },
  props: {
    modelValue: Object,
    choices: Object,
    updateUrl: String,
  },
  emits: ['value', 'update:modelValue'],
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
      this.$emit('value', newValue)
      if (this.updateUrl != undefined) {
        updateURLParameter(this.updateUrl, newValue ? '1' : '0')
      }
    },
  },
  props: {
    text: String,
    modelValue: Boolean,
    updateUrl: String,
  },
  emits: ['value', 'update:modelValue'],
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

const incrementalButtons = {
  template: `
    <div class="controls button-block">
      <div class="button" @click="change(modelValue-step)">-</div>
      <div class="button disabled">{{modelValue}}</div>
      <div class="button" @click="change(modelValue+step)">+</div>
    </div>
  `,
  methods: {
    change(val) {
      if (val < this.min || val > this.max) {
        return // don't emit events
      }
      this.$emit('update:modelValue', val)
      this.$emit('value', val)
      if (this.updateUrl != undefined) {
        updateURLParameter(this.updateUrl, val)
      }
    },
  },
  props: {
    modelValue: Number,
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
      default: 1000000,
    },
    step: {
      type: Number,
      default: 1,
    },
    updateUrl: String, // will update this URL parameter with the value
  },
  emits: ['value', 'update:modelValue'],
}

const slider = {
  template: `
  <input
    type="range"
    :min="min"
    :max="max"
    :step="step"
    :value="modelValue"
    @input="val => change(val)"
  />
  `,
  methods: {
    change(event) {
      let val = Number(event.target.value)
      this.$emit('update:modelValue', val)
      this.$emit('value', val)
      if (this.updateUrl != undefined) {
        updateURLParameter(this.updateUrl, val)
      }
    },
  },
  props: {
    modelValue: Number,
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
      default: 10000000,
    },
    step: {
      type: Number,
      default: 1,
    },
    updateUrl: String, // will update this URL parameter with the value
  },
  emits: ['value', 'update:modelValue'],
}

const selector = {
  template: `
    <select :value="selectedValue.display" @input="value=>{pick(value, 'input')}">
      <option v-for="elt of options">{{elt.display}}</option>
    </select>
  `,
  methods: {
    pick: function (event, v) {
      let selected = event.target.value
      for (let elt of this.options) {
        if (elt.display == selected) {
          this.$emit('update:modelValue', elt)
          this.$emit('value', elt)
          if (this.updateUrl != undefined) {
            updateURLParameter(this.updateUrl, elt.display)
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
  emits: ['value', 'update:modelValue'], // emits the full option {display, value} object. @value can be used for side-effects in addition to v-model
}

// given a list of {display, value} objects, and an URL parameter key, return the object that matches, or the fallback
function getSelectorURLOption(options, key, fallback) {
  let params = new URLSearchParams(window.location.search)
  let display
  if (params.has(key)) {
    display = params.get(key)
  } else {
    display = fallback
  }
  for (let elt of options) {
    if (elt.display == display) {
      return elt
    }
  }
  console.warn(
    `GetSelectorURLOption ${display} not among option display values ${options.map((opt) => opt.display)}, returning the first option`,
  )
  return options[0]
}

// function getRadioURLOption(choices, key, fallback) {}

function getBoolURL(key, fallback) {
  let params = new URLSearchParams(window.location.search)
  if (!params.has(key)) return fallback
  return params.get(key) == '1'
}

function getNumberURL(key, fallback) {
  let params = new URLSearchParams(window.location.search)
  if (!params.has(key)) return fallback
  return Number(params.get(key))
}

function getStringURL(key, fallback) {
  let params = new URLSearchParams(window.location.search)
  if (!params.has(key)) return fallback
  return params.get(key)
}

function updateURLParameter(key, value) {
  let urlParams = new URLSearchParams(window.location.search)
  urlParams.set(key, value)
  window.history.replaceState({ path: 'home' }, '', `?${urlParams.toString()}`)
}

export {
  playControls,
  radioButtons,
  toggleButton,
  collapsibleButton,
  incrementalButtons,
  selector,
  slider,
  getSelectorURLOption,
  getBoolURL,
  getNumberURL,
  getStringURL,
}
