
export interface Comm {
    spi: any,
    reset: any,
    interrupt: any,
    num_of_devs: number,
    devs:any[],
}

export type LedRingT = {
    id: number,
    led_val: number,

    instr: number,
    parse_state: SpiState,
    parser:Function,
};
export class LedRing implements LedRingT {
    id = 0;
    led_val = 0;

    instr = 0;
    parse_state = SpiState.WAIT_RECIEVE_KEY;
    parser = LedRingparse;
}

export type MottPottT = {
    id: number,
    adc_val: number,
    user_val: number,

    instr: number,
    parse_state: SpiState,
    parser: Function,
};
export class MottPott implements MottPottT {
    id = 0;
    adc_val = 0;
    user_val = 0;

    instr = 0;
    parse_state = SpiState.WAIT_RECIEVE_KEY;
    parser = MottPottparse;
}

export type UnirelPotMiniT = {
    id: number,
    pot1: number,
    pot2: number,

    instr: number,
    parse_state: SpiState,
   // parser: Function,
};
export class UnirelPotMini implements UnirelPotMiniT {
    id = 0;
    pot1 = 0;
    pot2 = 0;

    instr = 0;
    parse_state = SpiState.WAIT_RECIEVE_KEY;
    //parser = MottPottparse;
}

export type UnirelSwMiniT = {
    id: number,
    rail1: number,
    rail2: number,

    instr: number,
    parse_state: SpiState,
   // parser: Function,
};
export class UnirelSwMini implements UnirelSwMiniT {
    id = 0;
    rail1 = 0;
    rail2 = 0;

    instr = 0;
    parse_state = SpiState.WAIT_RECIEVE_KEY;
    //parser = MottPottparse;
}

function LedRingparse(this: LedRingT, data: any){
    var len = 0;
    switch(this.instr){
        case 1:{if(this.parse_state == SpiState.WAIT_DATA){this.led_val = data; this.parse_state = SpiState.END_RECIEVE} break;};

        case 254:{
            //console.log("254 triggered");
            if(this.parse_state == SpiState.WAIT_DATA){this.parse_state = SpiState.WAIT_DATA_BUFFER; len = data; console.log(len);break;}
            if(this.parse_state == SpiState.WAIT_DATA_BUFFER){console.log("len: "+len+"data: "+data);len--;break;}
            if(len <= 0){this.parse_state = SpiState.END_RECIEVE; break;}            
        };
        default:{this.parse_state = SpiState.WAIT_RECIEVE_KEY};
    }
};

var mott_buf_len: number = 0;
var val_upper: number, val_lower: number = 0;
function MottPottparse(this: MottPottT, data: number){
    switch(this.instr){
        //case 1:{if(this.parse_state == SpiState.WAIT_DATA){this.adc_val = data; this.parse_state = SpiState.END_RECIEVE}};
        case 1:{
            //console.log("254 triggered");
            if(this.parse_state == SpiState.WAIT_DATA){this.parse_state = SpiState.WAIT_DATA_BUFFER; mott_buf_len = data; console.log("Mott Buf Len: "+mott_buf_len);break;}
            if(mott_buf_len <= 0){this.adc_val = val_upper<<8 | val_lower; this.parse_state = SpiState.END_RECIEVE; break;}    
            if(this.parse_state == SpiState.WAIT_DATA_BUFFER)
            {
                console.log("len: "+mott_buf_len+"data: "+data);
                if(mott_buf_len == 2){val_lower = data}
                if(mott_buf_len == 1){val_upper = data}
                mott_buf_len--;
                break;
            }
        
        };
        default:{this.parse_state = SpiState.WAIT_RECIEVE_KEY};
    }
}


export enum SpiState {
    WAIT_RECIEVE_KEY = 1,
    WAIT_INSTRUCTION,
    WAIT_DATA,
    WAIT_DATA_BUFFER,
    END_RECIEVE,
} 

export enum LedRingInstr {
    RECIEVE_VAL = 1,
    SEND_VAL,
    LED_EN,
    LED_MODE = 20,
    SET_LED_ARR,
    READ_LED_BUF,
    SET_START_LED,
    SET_STOP_LED,
    SET_FRONT_COLOR,
    SET_BACK_COLOR,
    RESET_DEV = 252,
    READ_BUF_LENGTH,
    READ_BUF,
    READ_DEV_TYPE,

} 
export enum MottPottInstr {
    RECIEVE_VAL = 1,
    SEND_VAL,
} 

export enum UnirelPotMiniInstr {
    RECIEVE_VAL = 1,
    SEND_VAL,
} 
