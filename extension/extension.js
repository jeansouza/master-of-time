'use strict'

// Imports
const ST = imports.gi.St
const MAIN = imports.ui.main
const MAIN_LOOP = imports.mainloop
const CLUTTER = imports.gi.Clutter
const PANEL_MENU = imports.ui.panelMenu
const GIO = imports.gi.Gio
const EXTENSION_UTILS = imports.misc.extensionUtils
const UTIL = imports.misc.util
const G_LIB = imports.gi.GLib
const G_OBJECT = imports.gi.GObject

// Constants
const ME = EXTENSION_UTILS.getCurrentExtension()
const CONVENIENCE = ME.imports.convenience
const SETTINGS = CONVENIENCE.getSettings()
const NO_CONNECTION = 'Waiting for connection'
const MENU_POSITION = 'right'
const CONNECTION_REFUSED = 'Connection refused'
const STATUS_AREA_ID = 'master-of-time-status-area'

// Globals
let _hbox = null
const _clocksToShow = [
  {
    country: 'US',
    timezone: 'America/New_York'
  },
  {
    country: 'CA',
    timezone: 'America/Vancouver'
  }
]
const _clocks = {}
const _displayModeProcessors = {
  'Time': () => {
    for (const key in _clocks) {
      _hbox.remove_child(_clocks[key].icon)
      _hbox.remove_child(_clocks[key].label)
    }

    for (let i = 0; i < _clocksToShow.length; i++) {
      const time = UTIL.formatTime(G_LIB.DateTime.new_now(G_LIB.TimeZone.new(_clocksToShow[i].timezone)), { timeOnly: true })

      const icon = new ST.Icon({
        gicon: GIO.icon_new_for_string(`${ME.path}/icons/flags/${_clocksToShow[i].country}.png`),
        style_class: i === 0 ? 'custom-icon-style left-icon' : 'custom-icon-style'
      })
  
      const label = new ST.Label({
        text: i < (_clocksToShow.length - 1) ? `${time}  |  ` : time,
        y_align: CLUTTER.ActorAlign.CENTER
      })

      _hbox.add_child(icon)
      _hbox.add_child(label)

      _clocks[_clocksToShow[i].timezone] = { icon, label }
    }
  }
}

const _makeRequest = () => {
  _displayModeProcessors['Time']()
}

class MasterOfTimeClass extends PANEL_MENU.Button {
  _init(menuAlignment, nameText, dontCreateMenu) {
    const file = `file://${G_LIB.build_filenamev([G_LIB.get_home_dir(), 'clocks.json'])}` // check this

    super._init(0.0, 'Master of Time', false)
    _hbox = new ST.BoxLayout({ style_class: 'master-of-time-panel' })

    const icon = new ST.Icon({
      gicon: null,
      style_class: 'custom-icon-style'
    })

    const label = new ST.Label({
      text: '',
      y_align: CLUTTER.ActorAlign.CENTER
    })

    _hbox.add_child(icon)
    _hbox.add_child(label)

    _clocks['default'] = { icon, label }

    this.actor.add_actor(_hbox)

    MAIN.panel.addToStatusArea(STATUS_AREA_ID, this, 1, MENU_POSITION)

    this.destroy = () => {
      this.removeTimer()
      super.destroy()
    }

    this.update = () => {
      _makeRequest()
      return true
    }

    this.removeTimer = () => {
      if (this.timer) {
        MAIN_LOOP.source_remove(this.timer)
        this.timer = null
      }
    }

    this.updateRefreshRate = () => {
      this.refreshRate = SETTINGS.get_int('refresh-rate')
      this.removeTimer()
      this.timer = MAIN_LOOP.timeout_add_seconds(this.refreshRate, this.update.bind(this))
    }

    this.updateDisplayMode = () => {
      MAIN.panel.statusArea[STATUS_AREA_ID] = null
      MAIN.panel.addToStatusArea(STATUS_AREA_ID, this, 1, MENU_POSITION)
      this.update()
    }

    this.onClick = () => {
      this.update()
    }

    this.updateService = () => {
      this.update()
    }

    SETTINGS.connect('changed::refresh-rate', this.updateRefreshRate.bind(this))
    SETTINGS.connect('changed::display-mode', this.updateDisplayMode.bind(this))
    SETTINGS.connect('changed::api-service', this.updateService.bind(this))

    this.actor.connect('button-press-event', this.onClick.bind(this))

    this.update()
    this.updateRefreshRate()
  }
}

const MasterOfTime = G_OBJECT.registerClass(MasterOfTimeClass)

let _indicator

const init = () => {}

const enable = () => _indicator = new MasterOfTime

const disable = () => _indicator.destroy()
