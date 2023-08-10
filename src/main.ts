import express, { Express, Request, Response } from 'express';
const cors = require('cors');
var circularBuffer = require("circular-buffer");
var SPI = require('pi-spi');
var GPIO = require('onoff').Gpio;
//var bodyParser = require('body-parser');
//var app: Express = express();
import { Server } from "socket.io";
import {Comm, SpiState, LedRing, MottPott, MottPottInstr, LedRingInstr, UnirelPotMini, UnirelSwMini} from './types';

//app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.json());
//app.use(cors({
//    origin: '*'
//}));

//fucking javascript

//app.get('/', (req: Request, res: Response) => res.status(200).json({result: 'Success from Pi!'}));
//app.get('/get-state', (req: Request, res: Response) => {
//    //console.log("requested state");
//    res.status(200).json({data: Ui.devs});
//});
//app.post('/set-state', async (req: Request, res: Response) => {
//
//    //console.log(typeof req.body.adc_val);
//    //await send_byte(Ui, LedRingInstr.SEND_VAL, req.body.);
//    //await send_byte(Akt, LedRingInstr.SEND_VAL, req.body.adc_val, 0);
//    //await send_byte(Ui, LedRingInstr.SEND_VAL, req.body.adc_val, 1);
//    recieved = req.body;
//    isDirty = 1;
//
//    res.status(200).json({result: 'Success'});
//
//
//    //req.
//});

//app.listen(3000, () => {
//
//    console.log("server running on 3000");
//
//})


const io = new Server({ /* options */ });

io.listen(5500);

io.on("connection", (socket) => {
    // ...
    console.log("connected ws")
});


var isDirty = 0;
var recieved: any;
var recieved_old;

const interval = setInterval(async function() {
    if(isDirty){
        isDirty = 0;
        await send_byte(Ui, LedRingInstr.SEND_VAL, recieved.adc_val, 1);
        console.log(recieved);}
  }, 100);




var buf = circularBuffer(300);
var buf2 = circularBuffer(300);

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


Ui.spi.clockSpeed(1000000);
Akt.spi.clockSpeed(1000000);



// reads and writes simultaneously
// e.g. jumper MOSI [BCM 10, physical pin 19] to MISO [BCM 9, physical pin 21]


async function get_num_of_devs(ui: Comm){
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

    while(ui.interrupt.readSync() == 0){
        console.log("Modules in Send Mode devs1");
        await new Promise(r => setTimeout(r, 1)); 
        return -1;
    }
    await new Promise((resolve) => {//send spi blocker
        ui.spi.write(Buffer.alloc(ui.num_of_devs, 0x80), function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode devs"); return -1;}
    await new Promise((resolve) => {//send instrucion
        ui.spi.write(Buffer.alloc(ui.num_of_devs, 127), function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode devs"); return -1;}
    await new Promise((resolve) => {//send end of data
        ui.spi.write(Buffer.alloc(ui.num_of_devs, 0xA1), function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    await new Promise((resolve) => {//send spi unblocker
        ui.spi.write(Buffer.alloc(ui.num_of_devs, 0x81), function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });


    while(ui.interrupt.readSync() == 1){}
    await new Promise(r => setTimeout(r, 500));

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
            else if(data[ui.num_of_devs-i-1] == 1 && devs_state[i] == SpiState.WAIT_DATA){ui.devs[i] = new LedRing; ui.devs[ui.devs.length -1].id =  ui.devs.length -1; devs_state[i] = SpiState.WAIT_RECIEVE_KEY}
            else if(data[ui.num_of_devs-i-1] == 2 && devs_state[i] == SpiState.WAIT_DATA){ui.devs[i] = new MottPott;  ui.devs[ui.devs.length -1].id =  ui.devs.length -1; devs_state[i] = SpiState.WAIT_RECIEVE_KEY}
            else if(data[ui.num_of_devs-i-1] == 100 && devs_state[i] == SpiState.WAIT_DATA){ui.devs[i] = new UnirelPotMini;  ui.devs[ui.devs.length -1].id =  ui.devs.length -1; devs_state[i] = SpiState.WAIT_RECIEVE_KEY}
            else if(data[ui.num_of_devs-i-1] == 101 && devs_state[i] == SpiState.WAIT_DATA){ui.devs[i] = new UnirelSwMini;  ui.devs[ui.devs.length -1].id =  ui.devs.length -1; devs_state[i] = SpiState.WAIT_RECIEVE_KEY}
            //else if(devs_state[i] == SpiState.END_RECIEVE){devs_state[i] = SpiState.WAIT_RECIEVE_KEY}
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
//    console.log(buf.size());

    console.log("-------------");
    var size = buf.size();
    console.log("buf size: "+size);
    while(size){
        try {
            var data = buf.deq();
        } catch (error) {
            //console.log("buf empty");
            var data: any = Buffer.alloc(ui.num_of_devs);
        }

        console.log(data);
        for(let i = 0; i < data.length; i++){

            switch(ui.devs[i].parse_state){

                case SpiState.WAIT_RECIEVE_KEY:{if(data[ui.num_of_devs-i-1] == 0xdf){ui.devs[i].parse_state = SpiState.WAIT_INSTRUCTION}; break;}
                case SpiState.WAIT_INSTRUCTION:{ui.devs[i].instr = data[ui.num_of_devs-i-1]; ui.devs[i].parse_state = SpiState.WAIT_DATA; break;}
                case SpiState.WAIT_DATA:{ui.devs[i].parser(data[ui.num_of_devs-i-1]);break;}
                case SpiState.WAIT_DATA_BUFFER:{ui.devs[i].parser(data[ui.num_of_devs-i-1]);break;}
                //case SpiState.END_RECIEVE:{ui.devs[i].parse_state = SpiState.WAIT_RECIEVE_KEY; break;}
            }
        }
        //console.log(ui.devs[1].parse_state);
        size--;
    }
    console.log("+++++++++++++");
    console.log(ui.devs);
    //await send_byte(Akt, 2, ui.devs[0].led_val, 0);


    console.log("-------------");
}

async function send_byte(ui:Comm, instr: number, data: number, dev: number) {

    var a = Buffer.alloc(ui.num_of_devs);
    dev = ui.num_of_devs - dev - 1;

    a[dev] = 0x80;
    console.log("1: "+a[dev]);
    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 1"); return;}
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 2"); return;}
    a[dev] = instr;
    console.log("2: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 3"); return;}
    a[dev] = data&0x0f;
    console.log("3: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 4"); return;}
    a[dev] = (data>>4)&0x0f;
    console.log("4: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 5"); return;}
    a[dev] = (data>>8)&0x0f;
    console.log("5: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 6"); return;}
    a[dev] = (data>>12)&0x0f;
    console.log("6: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 7"); return;}
    a[dev] = 0xA1;
    console.log("7: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 8"); return;}
    a[dev] = 0x81;
    console.log("8: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });




    //console.log("sent instr and data: "+instr+", "+data+", to: "+dev);
}

async function send_buffer(ui:Comm, instr: number, data: Array<number>, dev: number) {

    dev = ui.num_of_devs - dev - 1;
    console.log(dev);

    var a = Buffer.alloc(ui.num_of_devs, 0x80);
    console.log("1: "+a[dev]);
    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 1"); return;}
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 2"); return;}
    var a = Buffer.alloc(ui.num_of_devs);
    a[dev] = instr;
    console.log("2: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 3"); return;}
    a[dev] = data.length;
    console.log("3: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    for(var i = 0; i<data.length; i++){
        for(var j = 0; j<4; j++){
            a[dev] = (data[i]>>j*4)&0x0f;

            await new Promise((resolve) => {
                ui.spi.write(a, function(e: any){
                    if (e) console.error(e); resolve(e);
                } );
                });
            //console.log("sent instr and data: "+ instr+", "+data+", to: "+dev);
        }
    }

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 7"); return;}
    a[dev] = 0xA1;
    console.log("7: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    while(ui.interrupt.readSync() == 0){console.log("Modules in Send Mode 8"); return;}
    var a = Buffer.alloc(ui.num_of_devs, 0x81);
    console.log("8: "+a[dev]);
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });
}

async function main(){
    await reset_devs(Ui);
    Ui.num_of_devs = await get_num_of_devs(Ui);
    if (Ui.num_of_devs == -1){console.error("ui connection error");}
    else{
        while(await get_devs_type(Ui, buf) == -1);
        await send_buffer(Ui, LedRingInstr.SET_BACK_COLOR, new Array(0,0,255), 0);
        await console.log("starting interrupt service");
        await Ui.interrupt.watch(async function(err: any, val: any){
            await read_spi_int(Ui, val, buf);
            await msg_parser(buf, Ui);
        });
    }

    await reset_devs(Akt);
    Akt.num_of_devs = await get_num_of_devs(Akt);
    if (Akt.num_of_devs == -1){console.error("Aktuator connection error");}
    else{
        await get_devs_type(Akt, buf2);
        await Akt.interrupt.watch(async function(err: any, val: any){
            await read_spi_int(Akt, val, buf2);
            await msg_parser(buf2, Akt);
        });
    }
   //get_devs_type(ui_length);
}



main();