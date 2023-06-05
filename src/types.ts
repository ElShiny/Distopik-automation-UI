
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

function LedRingparse(this: LedRingT, data: any){
    switch(this.instr){
        case 1:{if(this.parse_state == SpiState.WAIT_DATA){this.led_val = data; this.parse_state = SpiState.END_RECIEVE}};
    }
};

function MottPottparse(this: MottPottT, data: any){
    switch(this.instr){
        case 1:{if(this.parse_state == SpiState.WAIT_DATA){this.adc_val = data; this.parse_state = SpiState.END_RECIEVE}};
    }
}


export enum SpiState {
    WAIT_RECIEVE_KEY = 1,
    WAIT_INSTRUCTION,
    WAIT_DATA,
    WAIT_DATA_BUFFER,
    END_RECIEVE,
} 
