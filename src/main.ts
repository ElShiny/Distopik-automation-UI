var express = require("express");
var circularBuffer = require("circular-buffer");
var SPI = require('pi-spi');
var GPIO = require('onoff').Gpio;
var bodyParser = require('body-parser');
var app = express();

import {Comm, SpiState, LedRing, MottPott} from './types';
//poterebujemo body parser middleware, 

app.get('/', (req: any, res: any) => res.status(200).json({result: 'Success from Pi!'}));
app.get('/get-state', ());
app.post('/set-state', ());

app.listen(3000, () => {

    console.log("server running on 3000");

})

var buf = circularBuffer(300);

const Ui: Comm = {
    spi: SPI.initialize("/dev/spidev0.0"),
    reset: new GPIO(25, 'out'),
    interrupt: new GPIO(24, 'in', 'falling'),
    num_of_devs: 0,
    devs:[],
};

const Akt: Comm = {
    spi: SPI.initialize("/dev/spidev1.2"),
    reset: new GPIO(26, 'out'),
    interrupt: new GPIO(13, 'in', 'falling'),
    num_of_devs: 0,
    devs:[],
};


Ui.spi.clockSpeed(500000);



// reads and writes simultaneously
// e.g. jumper MOSI [BCM 10, physical pin 19] to MISO [BCM 9, physical pin 21]


async function get_num_of_devs(ui: typeof Ui){
    var dout = Buffer.alloc(50);
    var din = Buffer.alloc(50);
    dout[0] = 0xab;

    await new Promise((resolve) => {
        ui.spi.transfer(dout, function(e: any, d: any){
            din = d;
            if (e) console.error(e);
            else console.log("num of devs: "+din.indexOf(0xab));
            resolve(e);
        } );
    });
    return din.indexOf(0xab);  
}

async function get_devs_type(ui: Comm, buf: any){

    await new Promise((resolve) => {
        ui.spi.write(Buffer.alloc(ui.num_of_devs, 0xcf), function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    await new Promise((resolve) => {
        ui.spi.write(Buffer.alloc(ui.num_of_devs, 255), function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 1){}
    await new Promise(r => setTimeout(r, 50));

    while(ui.interrupt.readSync() == 0){
        await new Promise((resolve) => {
            ui.spi.read(ui.num_of_devs, function(e: any, d: any){if(e)console.error(e); console.log(d); buf.enq(d); resolve(e);});
        });
    }
    /////////devs parser

    console.log(buf.size());
    var devs_state = Buffer.alloc(ui.num_of_devs, SpiState.WAIT_RECIEVE_KEY);

    while(buf.size()){
        var data = buf.deq();
        for(let i = 0; i < data.length; i++){
            if(data[ui.num_of_devs-i-1] == 0xdf && devs_state[i] == SpiState.WAIT_RECIEVE_KEY){devs_state[i] = SpiState.WAIT_INSTRUCTION}
            else if(data[ui.num_of_devs-i-1] == 0xff && devs_state[i] == SpiState.WAIT_INSTRUCTION){devs_state[i] = SpiState.WAIT_DATA}
            else if(data[ui.num_of_devs-i-1] == 0x1 && devs_state[i] == SpiState.WAIT_DATA){ui.devs[i] = new LedRing; devs_state[i] = SpiState.END_RECIEVE}
            else if(data[ui.num_of_devs-i-1] == 0x2 && devs_state[i] == SpiState.WAIT_DATA){ui.devs[i] = new MottPott; devs_state[i] = SpiState.END_RECIEVE}
            else if(devs_state[i] == SpiState.WAIT_DATA){devs_state[i] = SpiState.WAIT_RECIEVE_KEY}
        }
        console.log(devs_state);
    }
    console.log(ui.devs);
}

async function reset_devs(ui: Comm){
    ui.reset.writeSync(0);
    await new Promise(r => setTimeout(r, 1));
    ui.reset.writeSync(1);
    await new Promise(r => setTimeout(r, 1000));
    console.log("devs reset");
}

async function read_spi_int(ui: Comm, val: number, buf: any){
    if(val == 0){
        while(ui.interrupt.readSync() == 0){
            await new Promise((resolve) => {
                ui.spi.read(ui.num_of_devs, function(e: any, d: any){if(e)console.error(e); buf.enq(d); resolve(e);});
            });
        }
    }
}

async function msg_parser(buf: any, ui: Comm){
    while(buf.size()){
        console.log(buf.deq());
    }
}


async function main(){
    await reset_devs(Ui);
    Ui.num_of_devs = await get_num_of_devs(Ui);
    if (Ui.num_of_devs == -1){console.error("ui connection error"); return;}
    await get_devs_type(Ui, buf);

    console.log("starting interrupt service");
    Ui.interrupt.watch(async function(err: any, val: any){
        await read_spi_int(Ui, val, buf);
        await msg_parser(buf, Ui);
    });
   // get_devs_type(ui_length);
}



main();