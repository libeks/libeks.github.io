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
			<div v-for="choice in choices" :class="{button:true, active:choice.value==value}" @click="$emit('setChoice', choice.value)">{{choice.display}}</div>
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
			<div :class="{button:true, active:active}" @click="$emit('toggleChoice')">{{text}}</div>
		</div>
	`,
  props: {
    text: String,
    active: Boolean,
  },
}

export { playControls, radioButtons, toggleButton }
