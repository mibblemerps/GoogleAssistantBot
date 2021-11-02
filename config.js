const fs = require('fs');
const process = require('process');

// Check if config exists
if (!fs.existsSync('config.json')) {
    console.log('Configuration file missing, copying example config...')

    fs.copyFileSync('config.example.json', 'config.json');

    console.log("Please edit config.json!");

    process.exit(1);
}

module.exports = require('./config.json');
