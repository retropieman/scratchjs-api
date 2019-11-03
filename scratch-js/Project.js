import Trigger from './Trigger'
import Renderer from './Renderer'
import Input from './Input'
import Vars from './Vars'

export default class Project {
  constructor(stage, sprites = [], globalVars = new Vars()) {
    this.stage = stage
    this.sprites = sprites

    for (let i = 0; i < this.sprites.length; i++) {
      this.sprites[i]._project = this
    }
    this.stage._project = this

    this._vars = globalVars

    this.renderer = new Renderer('#project')
    this.input = new Input(this.renderer.stage, key => {
      this.fireTrigger(Trigger.KEY_PRESSED, { key })
    })
    this.greenFlag = document.querySelector('#greenFlag')

    this.restartTimer()

    this.playingSounds = []
  }

  run() {
    this.runningTriggers = []
    this._newTriggers = []

    this.step()

    this.stopAllSounds();

    this.greenFlag.addEventListener('click', () => {
      this.fireTrigger(Trigger.GREEN_FLAG)
    })
  }

  step() {
    // Step all triggers
    const alreadyRunningTriggers = this.runningTriggers
    for (let i = 0; i < alreadyRunningTriggers.length; i++) {
      alreadyRunningTriggers[i].step()
    }

    // Remove finished triggers
    this.runningTriggers = this.runningTriggers.filter(trigger => !trigger.done)

    this.renderer.update(this.stage, this.sprites)

    window.requestAnimationFrame(this.step.bind(this))
  }

  fireTrigger(trigger, options) {
    // Find triggers which match conditions
    let matchingTriggers = []
    for (let i = 0; i < this.spritesAndStage.length; i++) {
      const sprite = this.spritesAndStage[i]
      const spriteTriggers = sprite.triggers
        .filter(tr => tr.matches(trigger, options))
      
      matchingTriggers = [...matchingTriggers, ...spriteTriggers]
    }

    // Cancel triggers if they are already running
    for (let i = 0; i < matchingTriggers.length; i++) {
      const trigger = matchingTriggers[i]

      // Run stop callback
      trigger.stop()
    }

    this.runningTriggers = [...this.runningTriggers, ...matchingTriggers]

    // Special trigger behaviors
    if (trigger === Trigger.GREEN_FLAG) {
      this.restartTimer()
      this.stopAllSounds()
    }

    return Promise.all(matchingTriggers.map(trigger => trigger.start(this._removeTrigger.bind(this))))
  }

  _removeTrigger(trigger) {
    console.log('Stopping:', trigger)

    const triggerIndex = this.runningTriggers.findIndex(t => t === trigger)
    this.runningTriggers.splice(triggerIndex, 1)
  }

  get spritesAndStage() {
    return [...this.sprites, this.stage]
  }
  
  playSound(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)

      const sound = { audio, hasStarted: false }

      const soundEnd = () => {
        this._stopSound(sound)
        resolve()
      }
      audio.addEventListener('ended', soundEnd)
      audio.addEventListener('pause', soundEnd)

      this.playingSounds.push(sound)

      audio.play().then(() => {
        sound.hasStarted = true
      })
    })
  }
  
  _stopSound(sound) {
    if (sound.hasStarted) {
      sound.audio.pause()
    } else {
      // Audio can't be paused because it hasn't started yet
      // (audio.play() is async; can't pause until play starts)
      sound.audio.addEventListener('playing', () => {
        // Stop for real ASAP
        sound.audio.pause()
      })
    }

    // Remove from playingSounds
    const index = this.playingSounds.findIndex(s => s === sound)
    if (index > -1) {
      this.playingSounds.splice(index, 1)
    }
  }
  
  stopAllSounds() {
    const playingSoundsCopy = this.playingSounds.slice()
    for(let i = 0; i < playingSoundsCopy.length; i++) {
      this._stopSound(playingSoundsCopy[i])
    }
  }

  restartTimer() {
    this.timerStart = new Date()
  }
}