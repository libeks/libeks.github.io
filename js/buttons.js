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
    <div class="radio">
      <div v-for="choice in choices" :class="{button:true, 'button-radio': true, active:choice.value==value}" @click="$emit('setChoice', choice.value)">{{choice.display}}</div>
    </div
  `,
  props: {
    value: String,
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
      <div class="collapsible-button" @click="click()"><slot name="label"></slot></div>
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
      // console.log('height', this.$refs.collapsible.scrollHeight)
      // console.log('collapsible', this.$refs.collapsible)
      if (this.isCollapsed) {
        this.$refs.collapsible.style['max-height'] = null
      } else {
        this.$refs.collapsible.style['max-height'] = this.$refs.collapsible.scrollHeight + 'px'
      }
      // console.log('collapsible height', this.$refs.collapsible.maxHeight)
    },
  },
  data() {
    return {
      isCollapsed: this.collapsed,
    }
  },
}

export { playControls, radioButtons, toggleButton, collapsibleButton }
