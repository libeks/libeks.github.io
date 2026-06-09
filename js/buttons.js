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

export {
  playControls,
  radioButtons,
  toggleButton,
  collapsibleButton,
  integerButtons,
  incrementalButtons,
}
