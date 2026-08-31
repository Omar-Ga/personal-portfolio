/**
 * Captures microphone audio and forwards it as 16-bit little-endian PCM.
 *
 * The host creates this worklet inside an AudioContext locked to 16 kHz, which
 * is the Gemini Live API's native input rate, so no resampling happens here —
 * this processor only batches frames and converts Float32 to Int16.
 *
 * 1024 frames at 16 kHz is a 64 ms packet: small enough to keep turn detection
 * responsive, large enough to avoid flooding the socket.
 */
const FRAMES_PER_CHUNK = 1024;

class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(FRAMES_PER_CHUNK);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.offset++] = channel[i];

      if (this.offset === FRAMES_PER_CHUNK) {
        const pcm16 = new Int16Array(FRAMES_PER_CHUNK);
        for (let j = 0; j < FRAMES_PER_CHUNK; j++) {
          const clamped = Math.max(-1, Math.min(1, this.buffer[j]));
          pcm16[j] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        }
        // Transferred, not copied. The scratch buffer is reused as-is because
        // every slot is overwritten before the next chunk is emitted.
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-capture-worklet', PCMCaptureProcessor);
