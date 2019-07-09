const express = require('express');
const path = require('path');

const port = 3000;
const app = express();

app.use(express.static(path.resolve(__dirname, '../dist')));
app.use('/synthesizer', express.static(path.resolve(__dirname, '../synthesizer')));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
