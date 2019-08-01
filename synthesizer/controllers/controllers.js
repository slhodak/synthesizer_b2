import { Manager } from '../main.js';
import Preset from '../lib/preset.js';
import Active from '../lib/active.js';
import Helpers from '../lib/helpers.js';
import Template from '../views/templates.js';
import { SynthViews, FormViews } from '../views/views.js';

/*  ___  __   __ _  ____  ____   __   __    __    ____  ____  ____ 
*  / __)/  \ (  ( \(_  _)(  _ \ /  \ (  )  (  )  (  __)(  _ \/ ___)
* ( (__(  O )/    /  )(   )   /(  O )/ (_/\/ (_/\ ) _)  )   /\___ \
*  \___)\__/ \_)__) (__) (__\_) \__/ \____/\____/(____)(__\_)(____/
*/

//  General controls

const Controls = {
  79: () => {
    Manager.synthesizer.addOscillator();
  },
  70: () => {
    Manager.synthesizer.addFilter();
  },
  32: () => {
    if (Manager.synthesizer.globals.demoTone === false) {
      Manager.synthesizer.playNote({ data: [127, 44, 65] });
    } else {
      Manager.synthesizer.endNote({ data: [127, 44, 65] })
    }
    Manager.synthesizer.globals.demoTone = !Manager.synthesizer.globals.demoTone;
  }
};

//  On Window Load
window.onload = (event) => {

  FormController.initializeLoadPresetModule();
  FormController.initializeSavePresetModule();
  FormController.initializeDarkModeButton();

  SynthController.createControls();
  document.getElementsByClassName('globalControls')[0].addEventListener('mousedown', Manager.createSynthesizerIfNoneExists);

  window.addEventListener('keydown', (e) => {
    if (e.target.type !== 'text') {
      if (!Manager.synthesizer) {
        Manager.createSynthesizerIfNoneExists();
        if (Controls[e.keyCode] && e.keyCode !== 32) {
          Controls[e.keyCode]();
        }
      } else if (Controls[e.keyCode]) {
        Controls[e.keyCode]();
      }
    }
  });

  let url = new URL(window.location);
  if (url.search) {
    if(window.confirm(`Load synth ${url.searchParams.get('name')}?`)) {
      Active.retrieve(url);
    }
  }
};

//  Visibility Changes
window.addEventListener('visibilitychange', (event) => {
  if (document.hidden && Manager.synthesizer && window.location.search) {
    Active.update(Manager.synthesizer);
  }
});

//  Window Close
window.onunload = (event) => {
  Active.update(Manager.synthesizer);
};

//  Save, Load, and DarkMode Buttons
const FormController = {
  initializeSavePresetModule() {
    FormController.initializeSaveButton();
    FormController.initializeOverwriteButton();
  },
  initializeSaveButton() {
    document.getElementsByClassName('savePreset')[0].addEventListener('submit', (e) => {
      e.preventDefault();
      Preset.writeOrUpdate(Manager.synthesizer, Manager.overwrite);
    });
  },
  initializeOverwriteButton() {
    let button = document.getElementsByClassName('overwrite')[0];
    button.addEventListener('mousedown', (e) => {
      FormView.updateOverwriteButton(Manager.overwrite, button);
      Manager.overwrite = !Manager.overwrite;
    });
  },
  initializeLoadPresetModule() {
    FormViews.populatePresetSelector();
    FormController.initializeLoadPresetButton();
  },
  initializeLoadPresetButton() {
    document.getElementsByClassName('loadButton')[0].addEventListener('mousedown', (e) => {
      Preset.retrieve(document.getElementsByClassName('presetSelector')[0].value);
    });
  },
  initializeDarkModeButton() {
    document.getElementsByClassName('darkMode')[0].addEventListener('mousedown', (e) => {
      SynthViews.toggleDarkMode(Manager.darkMode);
      Manager.darkMode = !Manager.darkMode;
    });
  }
}

//  Global Synth Parameters
const SynthController = {
  controls() {
    return '<button class="polyButton on" type="button">Poly</button>' +
      Template.slider('masterGainSlider', 'Volume', 0, 1, 1, 0.001) +
      Template.slider('attackSlider', 'Attack', 0.001, 1, 0.1, 0.001) +
      Template.slider('releaseSlider', 'Release', 0.1, 1, 0.1, 0.001) +
      Template.slider('portaSlider', 'Porta', 0.001, 1, 0.05, 0.001);
  },
  createControls() {
    let ControlsDiv = document.getElementsByClassName('globalControls')[0];
    let controls = document.createElement('div');
    controls.innerHTML = SynthController.controls();
    ControlsDiv.append(controls);
  },
  addControllers() {
    SynthController.addPolyController();
    SynthController.addMasterGainController();
    SynthController.addAttackController();
    SynthController.addReleaseController();
    SynthController.addPortaController();
  },
  addPolyController() {
    let polyButton = document.getElementsByClassName('polyButton')[0];
    polyButton.addEventListener('mousedown', (e) => {
      Manager.synthesizer.togglePoly();
      FormViews.updatePolyButton(this.poly);
    });
  },
  addMasterGainController() {
    let masterGainSlider = document.getElementsByClassName('masterGainSlider')[0];
    let masterGainSliderDisplay = document.getElementsByClassName('masterGainSliderDisplay')[0];
    masterGainSlider.addEventListener('input', (e) => {
      Manager.synthesizer.setGain(Number(e.target.value));
      masterGainSliderDisplay.innerText = e.target.value;
    });
  },
  addAttackController() {
    let attackSlider = document.getElementsByClassName('attackSlider')[0];
    let attackSliderDisplay = document.getElementsByClassName('attackSliderDisplay')[0];
    attackSlider.addEventListener('input', (e) => {
      Manager.synthesizer.setAttack(Number(e.target.value));
      attackSliderDisplay.innerText = e.target.value;
    });
  },
  addReleaseController() {
    let releaseSlider = document.getElementsByClassName('releaseSlider')[0];
    let releaseSliderDisplay = document.getElementsByClassName('releaseSliderDisplay')[0];
    releaseSlider.addEventListener('input', (e) => {
      Manager.synthesizer.setRelease(Number(e.target.value));
      releaseSliderDisplay.innerText = e.target.value;
    });
  },
  addPortaController() {
    let portaSlider = document.getElementsByClassName('portaSlider')[0];
    let portaSliderDisplay = document.getElementsByClassName('portaSliderDisplay')[0];
    portaSlider.addEventListener('input', (e) => {
      Manager.synthesizer.setPorta(Number(e.target.value));
      portaSliderDisplay.innerText = e.target.value;
    });
  }
}

//  Router Controller
const RouterController = {
  updateRouterClickHandlers() {
    const destinations = document.getElementsByClassName('destination');
    Array.from(destinations).forEach(destination => {
      destination.addEventListener('mousedown', (e) => {
        if (destination.dataset.id === 'mainout') {
          Manager.synthesizer.router.setRoute(Manager.synthesizer.router.table[destination.parentNode.dataset.id].node, Manager.synthesizer.masterGain);
        } else if (Helpers.indexOf(Manager.synthesizer.router.table[destination.parentNode.dataset.id].eligibleDestinations, Manager.synthesizer.router.table[destination.dataset.id].node) >= 0) {
          Manager.synthesizer.router.setRoute(Manager.synthesizer.router.table[destination.parentNode.dataset.id].node, Manager.synthesizer.router.table[destination.dataset.id].node);
        } else {
          console.warn('Ineligible route!');
        }
      });
    });
  }
};

//  Individual Oscillator Parameters
const OscController = {
  controls(id) {
    let header = `<h3>Oscillator ${id}</h3>`;
    let volSlider = Template.slider('volumeSlider', 'Volume', 0, 1, 0.75, 0.001);
    let semitoneSlider = Template.slider('semitoneSlider', 'Semitone', -24, 24, 0, 1);
    let fineDetuneSlider = Template.slider('fineDetuneSlider', 'Detune', -50, 50, 0, 1);
    let waveSelector = Template.selector('waveSelector', 'Wave', ['sine', 'sawtooth', 'square', 'triangle'], ['Sine', 'Sawtooth', 'Square', 'Triangle']);
    return `<div id=${1000 + id}>` + /*header + */ volSlider + semitoneSlider + fineDetuneSlider + waveSelector + '</div>';
  },
  createControls(id) {
    let oscControlsDiv = document.getElementsByClassName('oscillatorControls')[0];
    let newControls = document.createElement('div');
    newControls.innerHTML = OscController.controls(id);
    oscControlsDiv.append(newControls);
  },
  createListeners(id) {
    let waveSelector = document.getElementsByClassName('waveSelector')[id];
    waveSelector.addEventListener('change', (e) => {
      Manager.synthesizer.oscillators[id].setType(e.target.value);
      if (Manager.synthesizer.mono) {
        for (let voice in Manager.synthesizer.mono.voices) {
          Manager.synthesizer.mono.voices[voice].type = e.target.value;
        }
      }
    });
    let volumeSlider = document.getElementsByClassName('volumeSlider')[id];
    let volumeSliderDisplay = document.getElementsByClassName('volumeSliderDisplay')[id];
    volumeSlider.addEventListener('input', (e) => {
      Manager.synthesizer.oscillators[id].setVolume(e.target.value);
      volumeSliderDisplay.innerText = e.target.value;
    });
    let semitoneSlider = document.getElementsByClassName('semitoneSlider')[id];
    let semitoneSliderDisplay = document.getElementsByClassName('semitoneSliderDisplay')[id];
    semitoneSlider.addEventListener('input', (e) => {
      Manager.synthesizer.oscillators[id].setSemitoneOffset(Number(e.target.value));
      semitoneSliderDisplay.innerText = e.target.value;
    });
    let fineDetuneSlider = document.getElementsByClassName('fineDetuneSlider')[id];
    let fineDetuneSliderDisplay = document.getElementsByClassName('fineDetuneSliderDisplay')[id];
    fineDetuneSlider.addEventListener('input', (e) => {
      Manager.synthesizer.oscillators[id].setFineDetune(e.target.value);
      fineDetuneSliderDisplay.innerText = e.target.value;
    });
  }
};

//  Individual Filter Parameters
const FilterController = {
  controls(id) {
    let header = `<h3>Filter ${id}</h3>`;
    let selector = Template.selector('filterTypeSelector', 'Filter Type', ['lowpass', 'highpass', 'bandpass', 'allpass', 'lowshelf', 'highshelf', 'peaking', 'notch'], ['Lowpass', 'Highpass', 'Bandpass', 'Allpass', 'Lowshelf', 'Highshelf', 'Peaking', 'Notch']);
    let freqSlider = Template.slider('frequencySlider', 'Frequency', 20, 10000, 10000, 0.001);
    let gainSlider = Template.slider('gainSlider', 'Gain', 0, 1, 0, 0.001);
    let qSlider = Template.slider('qSlider', 'Q', 0, 6, 0.001, 0.001);
    return `<div id=${2000 + id}>` + header  + selector + freqSlider + gainSlider + qSlider + '</div>';
  },
  createControls(id) {
    let filterControlsDiv = document.getElementsByClassName('filterControls')[0];
    let newControls = document.createElement('div');
    newControls.innerHTML = FilterController.controls(id);
    filterControlsDiv.append(newControls);
  },
  createListeners(id) {
    let filterTypeSelector = document.getElementsByClassName('filterTypeSelector')[id];
    filterTypeSelector.addEventListener('change', (e) => {
      Manager.synthesizer.filters[id].setType(e.target.value);
    });
    let frequencySlider = document.getElementsByClassName('frequencySlider')[id];
    let frequencySliderDisplay = document.getElementsByClassName('frequencySliderDisplay')[id];
    frequencySlider.addEventListener('input', (e) => {
      Manager.synthesizer.filters[id].setFrequency(e.target.value);
      frequencySliderDisplay.innerText = e.target.value;
    });
    let gainSlider = document.getElementsByClassName('gainSlider')[id];
    let gainSliderDisplay = document.getElementsByClassName('gainSliderDisplay')[id];
    gainSlider.addEventListener('input', (e) => {
      Manager.synthesizer.filters[id].setGain(e.target.value);
      gainSliderDisplay.innerText = e.target.value;
    });
    let qSlider = document.getElementsByClassName('qSlider')[id];
    let qSliderDisplay = document.getElementsByClassName('qSliderDisplay')[id];
    qSlider.addEventListener('input', (e) => {
      Manager.synthesizer.filters[id].setQ(e.target.value);
      qSliderDisplay.innerText = e.target.value;
    });
  }
}

export {
  FormController,
  SynthController,
  RouterController,
  OscController,
  FilterController
}
