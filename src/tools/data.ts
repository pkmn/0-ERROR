export const LE = (() => {
  const u8 = new Uint8Array(4);
  const u16 = new Uint16Array(u8.buffer);
  return !!((u16[0] = 1) & u16[0]);
})();

export class Read {
  private constructor() {}

  static u8(buf: Buffer, offset: number) {
    return buf.readUInt8(offset);
  }

  static u16(buf: Buffer, offset: number) {
    return LE ? buf.readUInt16LE(offset) : buf.readUInt16BE(offset);
  }

  static u32(buf: Buffer, offset: number) {
    return LE ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
  }

  static u64(buf: Buffer, offset: number) {
    return LE ? buf.readBigInt64LE(offset) : buf.readBigInt64BE(offset);
  }
}

export class Write {
  private constructor() {}

  static u8(buf: Buffer, value: number, offset: number) {
    return buf.writeUInt8(offset);
  }

  static u16(buf: Buffer, value: number, offset: number) {
    return LE ? buf.writeUInt16LE(value, offset) : buf.writeUInt16BE(value, offset);
  }

  static u32(buf: Buffer, value: number, offset: number) {
    return LE ? buf.writeUInt32LE(value, offset) : buf.writeUInt32BE(value, offset);
  }

  static u64(buf: Buffer, value: number, offset: number) {
    return LE ? buf.writeBigInt64LE(BigInt(value), offset)
      : buf.writeBigInt64BE(BigInt(value), offset);
  }
}
