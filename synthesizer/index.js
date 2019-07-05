/*  _  _   __  ____  ____  __    ____ 
*  ( \/ ) /  \(    \(  __)(  )  / ___)
*  / \/ \(  O )) D ( ) _) / (_/\\___ \
*  \_)(_/ \__/(____/(____)\____/(____/
*/
//  - models must have defined interfaces for the controllers to interact with

//  - Global Parameters keep new oscillators in step with existing ones
let synthesizer = null;

//  - Synthesizer
class Synthesizer {
  constructor() {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.globals = {
      noteOn: false,
      note: null,
      notesList: [],
      notesObj: {},
      porta: 0.05,
      attack: 0.01,
      release: 0.01,
      gain: 0,
      type: 'sine'
    };
    this.poly = true;
    this.oscillators = [];
    this.filters = [];
    SynthController.createListeners();
    this.playNote = this.playNote.bind(this);
    this.endNote = this.endNote.bind(this);
    this.findNextNote = this.findNextNote.bind(this);
    this.findFrequencyFromNote = this.findFrequencyFromNote.bind(this);
  }

  playNote(midiMessage) {
    if (this.poly) {
      this.oscillators.forEach(osc => {
        osc.addVoice(midiMessage);
      });
    } else {
      this.updateOscFrequencies(midiMessage.data[1]);
      if (!this.globals.note) {
        this.oscillators.forEach(osc => osc.on());
      }
      this.globals.note = midiMessage.data[1];
      this.globals.notesList.push(midiMessage.data[1]);
      this.globals.notesObj[midiMessage.data[1]] = midiMessage.data[1];
    }
  }

  endNote(midiMessage) {
    if (this.poly) {
      this.oscillators.forEach(osc => {
        osc.removeVoice(midiMessage);
      });
    } else {
      delete this.globals.notesObj[midiMessage.data[1]];
      this.findNextNote()
    }
  }

  findNextNote() {
    if (!this.globals.notesList.length) {
      this.oscillators.forEach(osc => osc.off());
      this.globals.note = null;
      return;
    }
    if (this.globals.notesObj[this.globals.notesList[this.globals.notesList.length - 1]]) {
      this.globals.note = this.globals.notesList[this.globals.notesList.length - 1];
      this.updateOscFrequencies(this.globals.note);
    } else {
      this.globals.notesList.pop();
      this.findNextNote();
    }
  }

  findFrequencyFromNote(note) {
    return Math.pow(2, (note - 49)/12) * 440;
  }

  //  an oscillator does not have a frequency, only its voices do
  //  in mono mode, one voice is given to each oscillator and its volume and frequency are manipulated?
  updateOscFrequencies(note) {
    synthesizer.oscillators.forEach(osc => {
      // osc.setFrequency(note);
    });
  }

  //  deal with global controls changes...
}

//  - Oscillator abstraction controlling multiple specific voiced oscillator nodes
class Oscillator {
  constructor() {
    this.voices = {};
    this.addVoice = this.addVoice.bind(this);
    this.removeVoice = this.removeVoice.bind(this);

    this.id = synthesizer.oscillators.length;
    OscController.createControls(this.id);
    OscController.createListeners(this.id);
    this.semitoneOffset = 0;
    this.volume = 0.75;
    this.type = 'sine';
    this.porta = synthesizer.globals.porta;
    this.attack = synthesizer.globals.attack;
    this.release = synthesizer.globals.release;

    this.output = synthesizer.context.createGain();
    this.output.gain.setTargetAtTime(this.volume, synthesizer.context.currentTime, 0);
    this.output.connect(synthesizer.context.destination);
    
    //  Alter all these to alter children, not self
    // this.setFrequency = this.setFrequency.bind(this);
    this.connectToFilter = this.connectToFilter.bind(this);
    this.connectToMaster = this.connectToMaster.bind(this);
    this.setVolume = this.setVolume.bind(this);
    this.setPorta = this.setPorta.bind(this);
    this.setType = this.setType.bind(this);
    this.setSemitoneOffset = this.setSemitoneOffset.bind(this);
    this.setFineDetune = this.setFineDetune.bind(this);
  }

  addVoice(midiMessage) {
    let voice = synthesizer.context.createOscillator({
      frequency: synthesizer.findFrequencyFromNote(midiMessage.data[1]),
      type: this.type
    });
    console.log(synthesizer.findFrequencyFromNote(midiMessage.data[1]));
    // voice.frequency.setTargetAtTime(synthesizer.findFrequencyFromNote(midiMessage.data[1]), synthesizer.context.currentTime, 0);
    console.log(voice.frequency);
    voice.gainNode = synthesizer.context.createGain();
    voice.gainNode.gain.setTargetAtTime(0, synthesizer.context.currentTime, 0);
    voice.start();
    voice.gainNode.connect(synthesizer.context.destination);
    voice.gainNode.gain.setTargetAtTime(this.volume, synthesizer.context.currentTime, this.attack);
    this.voices[midiMessage.data[1]] = voice;
    console.log(voice);
    console.log(this.output);
  }

  removeVoice(midiMessage) {
    this.voices[midiMessage.data[1]].gainNode.gain.setTargetAtTime(0, synthesizer.context.currentTime, 0);
    this.voices[midiMessage.data[1]].gainNode.disconnect();
    delete (this.voices[midiMessage.data[1]]);
  }

  connectToFilter(id) {
    this.gainNode.disconnect();
    this.gainNode.connect(synthesizer.filters[id]);
  }

  connectToMaster() {
    this.gainNode.disconnect();
    this.gainNode.connect(synthesizer.masterGain);
  }

  setVolume(volume) {
    this.volume = volume;
    this.gainNode.gain.setTargetAtTime(volume, this.context.currentTime, 0);
  }

  setType(type) {
    for (let voice in this.voices) {
      this.voices[voice].type = type;
      console.log(this.voices[voice]);
    }
  }

  setPorta(porta) {
    this.porta = porta;
  }

  setAttack(attack) {
    this.attack = attack;
  }
  
  setRelease(release) {
    this.release = release;
  }

  setSemitoneOffset(semitoneOffset) {
    this.semitoneOffset = semitoneOffset;
  }

  setFineDetune(detune) {
    for (let voice in this.voices) {
      this.voices[voice].detune.setTargetAtTime(detune, this.context.currentTime, 0);
    }
  }
}

//  - Filters
class Filter extends BiquadFilterNode {
  constructor(props) {
    super(props.context);

    this.id = synthesizer.filters.length;
    FilterController.createControls(this.id);
    OscViews.updateOscillatorFilters(this.id);
    this.type = 'lowpass';
    this.frequency.setTargetAtTime(20000, this.context.currentTime, 0);
    this.gain.setTargetAtTime(0, this.context.currentTime, 0);
    FilterController.createListeners(this.id);
    this.connect(synthesizer.masterGain);
    this.setType = this.setType.bind(this);
    this.setFrequency = this.setFrequency.bind(this);
    this.setGain = this.setGain.bind(this);
  }

  setType(type) {
    this.type = type;
  }

  setFrequency(freq) {
    this.frequency.setTargetAtTime(freq, this.context.currentTime, 0);
  }

  setGain(gain) {
    this.gain.setTargetAtTime(gain, this.context.currentTime, 0);
  }

  setQ(q) {
    this.Q.setTargetAtTime(q, this.context.currentTime, 0);
  }
}

/*  ___  __   __ _  ____  ____   __   __    __    ____  ____  ____ 
*  / __)/  \ (  ( \(_  _)(  _ \ /  \ (  )  (  )  (  __)(  _ \/ ___)
* ( (__(  O )/    /  )(   )   /(  O )/ (_/\/ (_/\ ) _)  )   /\___ \
*  \___)\__/ \_)__) (__) (__\_) \__/ \____/\____/(____)(__\_)(____/
*/

//  Keyboard controls
window.addEventListener('keydown', (e) => {
  if (!synthesizer) {
    synthesizer = new Synthesizer();
  }
  if (e.key === 'o') { 
    synthesizer.oscillators.push(new Oscillator());
    console.log('Creating oscillator');
    OscViews.updateOscList();
  }
  if (e.key === ' ') {
    if (!synthesizer.globals.noteOn) {
      synthesizer.playNote({data: [127, 44, 65]});
      synthesizer.globals.noteOn = true;
    } else {
      synthesizer.endNote({data: [127, 44, 65]})
      synthesizer.globals.noteOn = false;
    }
  }
  if (e.key === 'f') {
    synthesizer.filters.push(new Filter(synthesizer));
    console.log('Creating filter')
  }
});

//  Global Oscillator Parameters
const SynthController = {
  createListeners() {
    let polyButton = document.getElementsByClassName('polyButton')[0];
    polyButton.addEventListener('mousedown', (e) => {
      synthesizer.poly = !synthesizer.poly;
      FormViews.updatePolyButton(synthesizer.poly);
    });
    let masterGainSlider = document.getElementsByClassName('masterGainSlider')[0];
    masterGainSlider.addEventListener('input', (e) => {
      synthesizer.masterGain.gain.setTargetAtTime(Number(e.target.value), synthesizer.context.currentTime, 0);
      OscViews.updateOscList();
    });
    let noteSlider = document.getElementsByClassName('noteSlider')[0];
    noteSlider.addEventListener('input', (e) => {
      synthesizer.globals.note = Number(e.target.value);
      synthesizer.updateOscFrequencies();
      OscViews.updateOscList();
    });
    let attackSlider = document.getElementsByClassName('attackSlider')[0];
    attackSlider.addEventListener('input', (e) => {
      synthesizer.oscillators.forEach(osc => {
        osc.setAttack(e.target.value);
      });
      OscViews.updateOscList();
    });
    let releaseSlider = document.getElementsByClassName('releaseSlider')[0];
    releaseSlider.addEventListener('input', (e) => {
      synthesizer.oscillators.forEach(osc => {
        osc.setRelease(e.target.value);
      });
      OscViews.updateOscList();
    });
    let portaSlider = document.getElementsByClassName('portaSlider')[0];
    portaSlider.addEventListener('input', (e) => {
      synthesizer.oscillators.forEach(osc => {
        osc.setPorta(e.target.value);
      });
      synthesizer.globals.porta = porta;
      OscViews.updateOscList();
    });
  }
}

//  Individual Oscillator Parameters
const OscController = {
  controls(id) {
    let header = `<h3>Oscillator ${id}</h3>`;
    let volSlider = Template.slider(id, 'volumeSlider', 'Volume', 0, 1, 0.75, 0.001);
    let semitoneSlider = Template.slider(id, 'semitoneSlider', 'Semitone', 0, 24, 0, 1);
    let fineDetuneSlider = Template.slider(id, 'fineDetuneSlider', 'Detune', 0, 50, 0, 0.001);
    let waveSelector = Template.selector(id, 'waveSelector', 'Wave', ['sine', 'sawtooth', 'square', 'triangle'], ['Sine', 'Sawtooth', 'Square', 'Triangle']);
    let filterSelector = Template.selector(id, 'filterSelector', 'Filter', ['none', ...synthesizer.filters.map(filter => filter.id)]);
    return header + volSlider + semitoneSlider + fineDetuneSlider + waveSelector + filterSelector;
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
      synthesizer.oscillators[id].setType(e.target.value);
      OscViews.updateOscList();
    });
    let volumeSlider = document.getElementsByClassName('volumeSlider')[id];
    volumeSlider.addEventListener('input', (e) => {
      synthesizer.oscillators[id].setVolume(e.target.value);
      OscViews.updateOscList();
    });
    let semitoneSlider = document.getElementsByClassName('semitoneSlider')[id];
    semitoneSlider.addEventListener('input', (e) => {
      synthesizer.oscillators[id].setSemitoneOffset(Number(e.target.value));
      OscViews.updateOscList();
    });
    let fineDetuneSlider = document.getElementsByClassName('fineDetuneSlider')[id];
    fineDetuneSlider.addEventListener('input', (e) => {
      synthesizer.oscillators[id].setFineDetune(e.target.value);
      OscViews.updateOscList();
    });
    let filterSelector = document.getElementsByClassName('filterSelector')[id];
    filterSelector.addEventListener('change', (e) => {
      if (e.target.value === 'none') {
        synthesizer.oscillators[id].connectToMaster();
      } else {
        synthesizer.oscillators[id].connectToFilter(e.target.value);
      }
      OscViews.updateOscList();
    });
  }
}

//  Individual Filter Parameters
const FilterController = {
  controls(id) {
    let header = `<h3>Filter ${id}</h3>`;
    let selector = Template.selector(id, 'filterTypeSelector', 'Filter Type', ['lowpass', 'highpass', 'bandpass', 'allpass', 'lowshelf', 'highshelf', 'peaking', 'notch'], ['Lowpass', 'Highpass', 'Bandpass', 'Allpass', 'Lowshelf', 'Highshelf', 'Peaking', 'Notch']);
    let freqSlider = Template.slider(id, 'frequencySlider', 'Frequency', 20, 10000, 10000, 0.001);
    let gainSlider = Template.slider(id, 'gainSlider', 'Gain', 0, 1, 0, 0.001);
    let qSlider = Template.slider(id, 'qSlider', 'Q', 0, 50, 0, 0.001);
    return header  + selector + freqSlider + gainSlider + qSlider;
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
      synthesizer.filters[id].setType(e.target.value);
      OscViews.updateOscList();
    });
    let frequencySlider = document.getElementsByClassName('frequencySlider')[id];
    frequencySlider.addEventListener('input', (e) => {
      synthesizer.filters[id].setFrequency(e.target.value);
      OscViews.updateOscList();
    });
    let gainSlider = document.getElementsByClassName('gainSlider')[id];
    gainSlider.addEventListener('input', (e) => {
      synthesizer.filters[id].setGain(e.target.value);
      OscViews.updateOscList();
    });
    let qSlider = document.getElementsByClassName('qSlider')[id];
    qSlider.addEventListener('input', (e) => {
      synthesizer.filters[id].setQ(e.target.value);
      OscViews.updateOscList();
    });
  }
}

/*  _  _  __  ____  _  _  ____ 
*  / )( \(  )(  __)/ )( \/ ___)
*  \ \/ / )(  ) _) \ /\ /\___ \
*   \__/ (__)(____)(_/\_)(____/
*/

//  Visual feedback of what is going on with the models
//  Number of oscillators, display of parameters

const OscViews = {
  updateOscList() {
    let oscList = document.getElementsByClassName('oscillators')[0];
    Array.from(oscList.children).forEach(node => {
      node.remove();
    });
    synthesizer.oscillators.forEach(osc => {
      let oscListNode = document.createElement('li');
      oscListNode.innerText = JSON.stringify(osc);
      oscList.appendChild(oscListNode);
    });
  },
  updateOscillatorFilters(id) {
    Array.from(document.getElementsByClassName('filterSelector')).forEach(selector => {
      let option = document.createRange().createContextualFragment(`<option name="${id}" value="${id}">${id}</option>`);
      selector.appendChild(option);
    });
  }
};

const FilterViews = {
  updateFiltersList() {
    let filtList = document.getElementsByClassName('filters')[0];
    Array.from(filtList.children).forEach(node => {
      node.remove();
    });
    synthesizer.filters.forEach(filter => {
      let filtListNode = document.createElement('li');
      filtListNode.innerText = JSON.stringify(filter);
      filtList.appendChild(filtListNode);
    });
  }
};

const FormViews = {
  updatePolyButton(poly) {
    let polyButton = document.getElementsByClassName('polyButton')[0];
    polyButton.setAttribute('class', `polyButton ${poly ? 'on' : 'off'}`);
  }
};

