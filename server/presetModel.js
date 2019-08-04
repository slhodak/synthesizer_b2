const fs = require('fs');
const path = require('path');
module.exports = {
  checkForUpdates(dawLastVisible, callback) {
    fs.readdir(path.resolve(__dirname, './presets/active/'), (err, files) => {
      if (err) {
        callback(err);
      } else {
        let results = [];
        let filesChecked = 0;
        files.forEach(filename => {
          fs.stat(path.resolve(__dirname, `./presets/active/${filename}`), (err, stats) => {
            if (err) {
              callback(err);
            } else {
              if (stats.mtimeMs > Number(dawLastVisible)) {
                fs.readFile(path.resolve(__dirname, `./presets/active/${filename}`), (err, synthData) => {
                  if (err) {
                    callback(err);
                  } else {
                    results.push(JSON.parse(synthData));
                    filesChecked += 1;
                  }
                  if (filesChecked === files.length) {
                    callback(null, results);
                  }
                });
              } else {
                filesChecked += 1;
                if (filesChecked === files.length) {
                  callback(null, results);
                }
              }
            }
          });
        });
      }
    });
  },
  createActive(synthData, callback) {
    fs.writeFile(path.resolve(__dirname, `./presets/active/${synthData.name}.websynth.json`), JSON.stringify(synthData), (err) => {
      if (err) {
        callback(err);
      } else {
        callback(null, 'Active synth data saved');
      }
    });
  },
  getOneActive(name, callback) {
    fs.open(path.resolve(__dirname, `./presets/active/${name}.websynth.json`), 'r', (err, fd) => {
      if (!err) {
        fs.readFile(fd, (err, data) => {
          if (!err) {
            callback(null, data);
          } else {
            callback(err);
          }
        });
      } else {
        callback(err);
      }
    });
  },
  create(synthData, overwrite, callback) {
    if (overwrite === 'false' && fs.existsSync(path.resolve(__dirname, `./presets/${synthData.name}.websynth.json`))) {
      callback('exists');
    } else {
      fs.writeFile(path.resolve(__dirname, `./presets/${synthData.name}.websynth.json`), JSON.stringify(synthData), (err) => {
        if (err) {
          callback(err);
        } else {
          callback(null, 'Preset saved');
        }
      });
    }
  },
  getAllNames(callback) {
    fs.readdir(path.resolve(__dirname, './presets'), (err, files) => {
      if (!err) {
        callback(null, files.filter(name => /\.websynth\.json$/.test(name))
          .map(fullname => fullname.match(/^(.*?)\.websynth\.json/)[1]));
      } else {
        callback(err);
      }
    });
  },
  getOnePreset(filename, callback) {
    fs.open(path.resolve(__dirname, `./presets/${filename}.websynth.json`), 'r', (err, fd) => {
      if (!err) {
        fs.readFile(fd, (err, data) => {
          if (!err) {
            callback(null, data);
          } else {
            callback(err);
          }
        });
      } else {
        callback(err);
      }
    });
  }
};