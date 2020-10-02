exports = {
    ...require('./renderer'),
    ...require('./app'),
};
delete exports.__esModule;
module.exports = exports;