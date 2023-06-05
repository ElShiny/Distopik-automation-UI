
export interface Comm {
    spi: any,
    reset: any,
    interrupt: any,
    num_of_devs: number,
    devs:any[],
}

export type LedRingT = {
    led_val: number,

    parser:Function,
};
export class LedRing implements LedRingT {
    led_val = 0;
    parser = LedRingparse;
}

export type MottPottT = {
    adc_val: number,
    user_val: number,
    parser: Function,
};
export class MottPott implements MottPottT {
    adc_val = 0;
    user_val = 0;
    parser = LedRingparse;
}

function LedRingparse(this: LedRingT){
};

function MottPottparse(a: number, b: number){
    return a+b;
}


export enum SpiState {
    WAIT_RECIEVE_KEY = 1,
    WAIT_INSTRUCTION,
    WAIT_DATA,
    WAIT_DATA_BUFFER,
    END_RECIEVE,
} 
