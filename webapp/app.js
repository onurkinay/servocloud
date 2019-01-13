'use strict';

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('uuid');

var connectionStringEvent = 'HostName=servoPi.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=jYNl6ox/105RJWBRWD9b4M2feDAYsoxm7gWkhZrROWg=';
var {
    EventHubClient,
    EventPosition
} = require('@azure/event-hubs');

var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

app.use(require('express').static('public'));

var printError = function (err) {
    console.log(err.message);
};



var connectionString = "HostName=servoPi.azure-devices.net;DeviceId=pi;SharedAccessKey=4xV2gIFHmZaoEfjyDYwfJm77+b7jXcOJyuIeuupu37g=";

if (!connectionString) {
    console.log('Please set the DEVICE_CONNECTION_STRING environment variable.');
    process.exit(-1);
}

var client = Client.fromConnectionString(connectionString, Protocol);
client.open(function (err) {
    if (err) {
        console.error('Could not connect: ' + err.message);
    } else {
        console.log('Client connected');

        client.on('error', function (err) {
            console.error(err.message);
            process.exit(-1);
        });
    }
});

io.on('connection', function (socket) {

    socket.on('disconnect', function () {
        //A client is disconnect
    });

    socket.on('clientEvent', function (data) {
        var message = new Message( JSON.stringify(data));

        message.messageId = uuid.v4();

        console.log('Sending message: ' + message.getData());
        client.sendEvent(message, function (err) {
            if (err) {
                console.error('Could not send: ' + err.toString()); 
            } else {
                console.log('Message sent: ' + message.messageId); 
            }
        });
    });

});

var printMessage = function (message) {
    io.sockets.emit('broadcast', message.body);
};
var ehClient;
EventHubClient.createFromIotHubConnectionString(connectionStringEvent).then(function (clientE) {
    console.log("Successully created the EventHub Client from iothub connection string.");
    ehClient = clientE;
    return ehClient.getPartitionIds();
}).then(function (ids) {
    console.log("The partition ids are: ", ids); 
    return ids.map(function (id) {
        return ehClient.receive(id, printMessage, printError, {
            eventPosition: EventPosition.fromEnqueuedTime(Date.now())
        });
    });
}).catch(printError);

var port = normalizePort(process.env.PORT || '3000');
http.listen(port, function listening() {
  console.log('Listening on %d', http.address().port);
});

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
