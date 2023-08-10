
export interface Comm {
    spi: any,
    reset: any,
    interrupt: any,
    num_of_devs: number,
    devs:any[],
}

export type LedRingT = {
    id: number,
    value: number,

    instr: number,
    parse_state: SpiState,
    data_pos: number,
    parser:Function,
};
export class LedRing implements LedRingT {
    id = 0;
    value = 0;

    instr = 0;
    parse_state = SpiState.WAIT_RECIEVE_KEY;
    data_pos = 0;
    parser = LedRingparse;
}

export type MottPottT = {
    id: number,
    value: number,
    user_value: number,

    instr: number,
    data_pos: number,
    parse_state: SpiState,
    parser: Function,
};
export class MottPott implements MottPottT {
    id = 0;
    value = 0;
    user_value = 0;

    instr = 0;
    data_pos = 0;
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
        case 1:{if(this.parse_state == SpiState.WAIT_DATA){
            if(this.data_pos == 0){this.value = 0; this.value = data; this.data_pos = 1; break;}
            if(this.data_pos == 1){this.data_pos = 0;this.value |= data<<8; this.parse_state = SpiState.WAIT_RECIEVE_KEY; break;}
        } break;};

//        case 254:{
//            //console.log("254 triggered");
//            if(this.parse_state == SpiState.WAIT_DATA){this.parse_state = SpiState.WAIT_DATA_BUFFER; len = data; console.log(len);break;}
//            if(this.parse_state == SpiState.WAIT_DATA_BUFFER){/*console.log("len: "+len+"data: "+data);*/len--;break;}
//            if(len <= 0){this.parse_state = SpiState.WAIT_RECIEVE_KEY; break;}            
//        };
        default:{this.parse_state = SpiState.WAIT_RECIEVE_KEY};
    }
};


function MottPottparse(this: MottPottT, data: number){
    switch(this.instr){
        //case 1:{if(this.parse_state == SpiState.WAIT_DATA){this.adc_val = data; this.parse_state = SpiState.END_RECIEVE}};
        case 1:{if(this.parse_state == SpiState.WAIT_DATA){
            if(this.data_pos == 0){this.value = 0; this.value = data; this.data_pos = 1; break;}
            if(this.data_pos == 1){this.data_pos = 0;this.value |= data<<8; this.parse_state = SpiState.WAIT_RECIEVE_KEY; break;}
        } break;};
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
    RESET_DEV = 100,
    READ_BUF_LENGTH,
    READ_BUF,
    READ_DEV_TYPE = 127,

} 

export enum MottPottInstr {
    RECIEVE_VAL = 1,
    SEND_VAL,
    RESET_DEV = 100,
    READ_BUF_LENGTH,
    READ_BUF,
    READ_DEV_TYPE = 127,
} 

export enum UnirelPotMiniInstr {
    RECIEVE_VAL = 1,
    SEND_VAL,
    RESET_DEV = 100,
    READ_BUF_LENGTH,
    READ_BUF,
    READ_DEV_TYPE = 127,
} 
