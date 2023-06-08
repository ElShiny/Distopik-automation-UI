import express, { Express, Request, Response } from 'express';
const cors = require('cors');
var circularBuffer = require("circular-buffer");
var SPI = require('pi-spi');
var GPIO = require('onoff').Gpio;
var bodyParser = require('body-parser');
var app: Express = express();
var WebSocket = require('ws');
import {Comm, SpiState, LedRing, MottPott, MottPottInstr, LedRingInstr} from './types';

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws: any) => {
    ws.on("message", (message: any) =>{
        try {
            const data = JSON.parse(message);
            console.log(data);
        } catch (error: any) {
            console.log(error.message);
        }

    });
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
    origin: '*'
}));

app.get('/', (req: Request, res: Response) => res.status(200).json({result: 'Success from Pi!'}));
app.get('/get-state', (req: Request, res: Response) => {
    //console.log("requested state");
    res.status(200).json({data: Ui.devs});
});
app.post('/set-state', async (req: Request, res: Response) => {
    //preveri input
    //nastavi naprave

    //console.log(typeof req.body.adc_val);
    await send_byte(Ui, LedRingInstr.SEND_VAL, req.body.ace_val, 1);
    await new Promise(r => setTimeout(r, 1000));
    await res.status(200).json({result: 'Success'});


    //req.
});

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
            else if(devs_state[i] == SpiState.END_RECIEVE){devs_state[i] = SpiState.WAIT_RECIEVE_KEY}
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
    while(buf.size()){
        var data = buf.deq();
        //console.log(data);
        for(let i = 0; i < data.length; i++){

            switch(ui.devs[i].parse_state){

                case SpiState.WAIT_RECIEVE_KEY:{if(data[ui.num_of_devs-i-1] == 0xdf){ui.devs[i].parse_state = SpiState.WAIT_INSTRUCTION}; break;}
                case SpiState.WAIT_INSTRUCTION:{ui.devs[i].instr = data[ui.num_of_devs-i-1]; ui.devs[i].parse_state = SpiState.WAIT_DATA; break;}
                case SpiState.WAIT_DATA:{ui.devs[i].parser(data[ui.num_of_devs-i-1]);break;}
                case SpiState.WAIT_DATA_BUFFER:{ui.devs[i].parser(data[ui.num_of_devs-i-1]);break;}
                case SpiState.END_RECIEVE:{ui.devs[i].parse_state = SpiState.WAIT_RECIEVE_KEY; break;}
            }
        }
        //console.log(ui.devs[1].parse_state);
    }
//    console.log("+++++++++++++");
    console.log(ui.devs);
    console.log("-------------");
}

async function send_byte(ui:Comm, instr: number, data: number, dev: number) {

    var a = Buffer.alloc(ui.num_of_devs);
    a[dev] = 0xcf;
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    a[dev] = instr;
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    a[dev] = data;
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });
    console.log("sent instr and data: "+instr+", "+data+", to: "+dev);
}

async function send_buffer(ui:Comm, instr: number, data: Array<number>, dev: number) {

    var a = Buffer.alloc(ui.num_of_devs);
    a[dev] = 0xcf;
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    a[dev] = instr;
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    a[dev] = data.length;
    await new Promise((resolve) => {
        ui.spi.write(a, function(e: any){
            if (e) console.error(e); resolve(e);
        } );
    });

    for(var i = 0; i<data.length; i++){
        a[dev] = data[i];
        await new Promise((resolve) => {
            ui.spi.write(a, function(e: any){
                if (e) console.error(e); resolve(e);
            } );
        });
        console.log("sent instr and data: "+ instr+", "+data+", to: "+dev);
    }
}

async function main(){
    await reset_devs(Ui);
    Ui.num_of_devs = await get_num_of_devs(Ui);
    if (Ui.num_of_devs == -1){console.error("ui connection error"); return;}
    await get_devs_type(Ui, buf);
    await send_buffer(Ui, LedRingInstr.SET_BACK_COLOR, new Array(0,0,255), 0);

    await console.log("starting interrupt service");
    await Ui.interrupt.watch(async function(err: any, val: any){
        await read_spi_int(Ui, val, buf);
        await msg_parser(buf, Ui);
    });
   // get_devs_type(ui_length);
}



main();