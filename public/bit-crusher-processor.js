class BitCrusherProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'bitDepth', defaultValue: 8, minValue: 1, maxValue: 16 },
            { name: 'frequencyReduction', defaultValue: 1, minValue: 0.1, maxValue: 1 }
        ];
    }

    constructor() {
        super();
        this.phase = 0;
        this.lastValue = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        const bitDepth = parameters.bitDepth[0];
        const freqReduction = parameters.frequencyReduction[0];
        const step = Math.pow(2, bitDepth);
        
        for (let channel = 0; channel < input.length; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];
            
            for (let i = 0; i < inputChannel.length; i++) {
                // Frequency reduction (sample-and-hold)
                if (this.phase % Math.round(1 / freqReduction) === 0) {
                    this.lastValue = Math.round(inputChannel[i] * step) / step;
                }
                outputChannel[i] = this.lastValue;
                this.phase++;
            }
        }
        return true;
    }
}

registerProcessor('bit-crusher-processor', BitCrusherProcessor);