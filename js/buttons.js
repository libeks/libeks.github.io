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
      <div :class="{button:true, 'button-checkbox': true, active:active}" @click="$emit('toggleChoice')">{{text}}</div>
    </div>
  `,
  props: {
    text: String,
    active: Boolean,
  },
  emits: ['toggleChoice'],
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
    <select :value="value" @input="value=>{pick(value, 'input')}" @value="value=>{pick(value, 'value')}" @change="value=>{pick(value, 'change')}">
      <option v-for="elt of options" :value="elt.name">{{elt.display}}</option>
    </select>
  `,
  methods: {
    pick: function (event, v) {
      let selected = event.target.value
      for (let elt of this.options) {
        console.log('element', elt)
        if (elt.display == selected) {
          console.log('selector is emitting event @value', elt)
          this.$emit('value', elt)
        }
      }
    },
  },
  props: {
    options: Object,
    value: String,
  },
  emits: ['value'],
}

export {
  playControls,
  radioButtons,
  toggleButton,
  collapsibleButton,
  integerButtons,
  incrementalButtons,
  selector,
}
