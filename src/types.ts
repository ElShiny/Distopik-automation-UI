
export interface Comm {
    spi: any,
    reset: any,
    interrupt: any,
    num_of_devs: number,
    devs:any[],
}

export type LedRingT = {
    led_val: number,

    instr: number,
    parse_state: SpiState,
    parser:Function,
};
export class LedRing implements LedRingT {
    led_val = 0;

    instr = 0;
    parse_state = SpiState.WAIT_RECIEVE_KEY;
    parser = LedRingparse;
}

export type MottPottT = {
    adc_val: number,
    user_val: number,

    instr: number,
    parse_state: SpiState,
    parser: Function,
};
export class MottPott implements MottPottT {
    adc_val = 0;
    user_val = 0;

    instr = 0;
    parse_state = SpiState.WAIT_RECIEVE_KEY;
    parser = MottPottparse;
}

export type UnirelPotMiniT = {
    pot1: number,
    pot2: number,

    instr: number,
    parse_state: SpiState,
   // parser: Function,
};
export class UnirelPotMini implements UnirelPotMiniT {
    pot1 = 0;
    pot2 = 0;

    instr = 0;
    parse_state = SpiState.WAIT_RECIEVE_KEY;
    //parser = MottPottparse;
}

export type UnirelSwMiniT = {
    rail1: number,
    rail2: number,

    instr: number,
    parse_state: SpiState,
   // parser: Function,
};
export class UnirelSwMini implements UnirelSwMiniT {
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

function MottPottparse(this: MottPottT, data: any){
    switch(this.instr){
        case 1:{if(this.parse_state == SpiState.WAIT_DATA){this.adc_val = data; this.parse_state = SpiState.END_RECIEVE}};
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
