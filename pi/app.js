/*
CONNECTION TO PI

USB - GAMEPAD
GPIO17 - LED
GPIO18 - SERVO ORANGE CABLE


*/

'use strict';

const Gpio = require("pigpio").Gpio;
var gamepad = require("gamepad");

var connectionString = 'HostName=servoPi.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=jYNl6ox/105RJWBRWD9b4M2feDAYsoxm7gWkhZrROWg=';
var {
    EventHubClient,
    EventPosition
} = require('@azure/event-hubs');

var uuid = require('uuid');

var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

gamepad.init()

var connectionStringDevice = "HostName=servoPi.azure-devices.net;DeviceId=pi;SharedAccessKey=4xV2gIFHmZaoEfjyDYwfJm77+b7jXcOJyuIeuupu37g=";

if (!connectionStringDevice) {
    console.log('Please set the DEVICE_CONNECTION_STRING environment variable.');
    process.exit(-1);
}

var client = Client.fromConnectionString(connectionStringDevice, Protocol);
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

function SendServo(pulse) {
    led.pwmWrite(255);

    motor.servoWrite(pulse);

    setTimeout(() => {
        led.pwmWrite(0);
    }, 250);
}


const led = new Gpio(17, {
    mode: Gpio.OUTPUT
});
const motor = new Gpio(18, {
    mode: Gpio.OUTPUT
});

let pulseWidth = 1000;
let increment = 100;
let degree = -90;

setInterval(gamepad.processEvents, 16);
setInterval(gamepad.detectDevices, 500);


gamepad.on("down", function (id, num) {

    if (num == 6 || num == 7) {

        if (num == 6) {

            pulseWidth -= 25;
            degree -= 3;
            SendServo(pulseWidth);

        } else if (num == 7) {

            pulseWidth += 25;
            degree += 3;
            SendServo(pulseWidth);

        }

        var message = new Message(JSON.stringify( {pulse:pulseWidth, degree: degree} ));

        message.messageId = uuid.v4();

        console.log('Sending message: ' + message.getData());
        client.sendEvent(message, function (err) {
            if (err) {
                console.error('Could not send: ' + err.toString());
            } else {
                console.log('Message sent: ' + message.messageId);
            }
        });
    }
});


var printMessage = function (message) {
    pulseWidth = message.body.pulse;
    degree = message.body.degree;
    SendServo(pulseWidth);
};
var printError = function (err) {
    console.log(err.message);
};
var ehClient;
EventHubClient.createFromIotHubConnectionString(connectionString).then(function (clientE) {
    console.log("Successully created the EventHub Client from iothub connection string.");
    ehClient = clientE;
    return ehClient.getPartitionIds();
}).then(function (ids) {
    console.log("The partition ids are: ", ids);

    console.log("ready...");
    led.pwmWrite(255);
    setTimeout(() => {
        led.pwmWrite(0);
    }, 1000);
    console.log("go...");

    return ids.map(function (id) {
        return ehClient.receive(id, printMessage, printError, {
            eventPosition: EventPosition.fromEnqueuedTime(Date.now())
        });
    });
}).catch(printError);