var events = require('events');
var eventEmitter = new events.EventEmitter();

//eventEmitter.on('contentreelloaded', () => console.log('content reel loaded'));

module.exports = eventEmitter;