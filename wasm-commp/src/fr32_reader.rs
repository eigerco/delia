use std::cmp::min;
use std::io::{self, Read};
use std::mem::size_of;

#[cfg(not(target_arch = "aarch64"))]
use byte_slice_cast::AsSliceOf;

use byte_slice_cast::AsByteSlice;

/// The number of Frs per Block.
const NUM_FRS_PER_BLOCK: usize = 4;
/// The amount of bits in an Fr when not padded.
const IN_BITS_FR: usize = 254;
/// The amount of bits in an Fr when padded.
const OUT_BITS_FR: usize = 256;

const NUM_BYTES_IN_BLOCK: usize = NUM_FRS_PER_BLOCK * IN_BITS_FR / 8;
const NUM_BYTES_OUT_BLOCK: usize = NUM_FRS_PER_BLOCK * OUT_BITS_FR / 8;

const NUM_U128S_PER_BLOCK: usize = NUM_BYTES_OUT_BLOCK / size_of::<u128>();

const MASK_SKIP_HIGH_2: u128 = 0b0011_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111;

#[repr(align(16))]
struct AlignedBuffer([u8; NUM_BYTES_IN_BLOCK + 1]);

/// An `io::Reader` that converts unpadded input into valid `Fr32` padded output.
pub struct Fr32Reader<R> {
    /// The source being padded.
    source: R,
    /// Currently read block.
    /// This is padded to 128 bytes to allow reading all values as `u128`s, but only the first
    /// 127 bytes are ever valid.
    in_buffer: AlignedBuffer,
    /// Currently writing out block.
    out_buffer: [u128; NUM_U128S_PER_BLOCK],
    /// The current offset into the `out_buffer` in bytes.
    out_offset: usize,
    /// How many `Fr32`s are available in the `out_buffer`.
    available_frs: usize,
    /// Are we done reading?
    done: bool,
}

macro_rules! process_fr {
    (
        $in_buffer:expr,
        $out0:expr,
        $out1:expr,
        $bit_offset:expr
    ) => {{
        $out0 = $in_buffer[0] >> 128 - $bit_offset;
        $out0 |= $in_buffer[1] << $bit_offset;
        $out1 = $in_buffer[1] >> 128 - $bit_offset;
        $out1 |= $in_buffer[2] << $bit_offset;
        $out1 &= MASK_SKIP_HIGH_2; // zero high 2 bits
    }};
}

impl<R: Read> Fr32Reader<R> {
    pub fn new(source: R) -> Self {
        Fr32Reader {
            source,
            in_buffer: AlignedBuffer([0; NUM_BYTES_IN_BLOCK + 1]),
            out_buffer: [0; NUM_U128S_PER_BLOCK],
            out_offset: 0,
            available_frs: 0,
            done: false,
        }
    }

    /// Processes a single block in in_buffer, writing the result to out_buffer.
    fn process_block(&mut self) {
        let in_buffer: &[u128] = {
            #[cfg(target_arch = "aarch64")]
            // Safety: This is safe because the struct/data is aligned on
            // a 16 byte boundary and can therefore be casted from u128
            // to u8 without alignment safety issues.
            #[allow(clippy::cast_slice_different_sizes)]
            unsafe {
                &mut (*(&mut self.in_buffer.0 as *const [u8] as *mut [u128]))
            }
            #[cfg(not(target_arch = "aarch64"))]
            self.in_buffer.0.as_slice_of::<u128>().unwrap()
        };
        let out = &mut self.out_buffer;

        // 0..254
        {
            out[0] = in_buffer[0];
            out[1] = in_buffer[1] & MASK_SKIP_HIGH_2;
        }
        // 254..508
        process_fr!(&in_buffer[1..], out[2], out[3], 2);
        // 508..762
        process_fr!(&in_buffer[3..], out[4], out[5], 4);
        // 762..1016
        process_fr!(&in_buffer[5..], out[6], out[7], 6);

        // Reset buffer offset.
        self.out_offset = 0;
    }

    fn fill_in_buffer(&mut self) -> io::Result<usize> {
        let mut bytes_read = 0;
        let mut buf = &mut self.in_buffer.0[..NUM_BYTES_IN_BLOCK];

        while !buf.is_empty() {
            match self.source.read(buf) {
                Ok(0) => {
                    break;
                }
                Ok(n) => {
                    buf = &mut buf[n..];
                    bytes_read += n;
                }
                Err(ref e) if e.kind() == io::ErrorKind::Interrupted => {}
                Err(e) => return Err(e),
            }
        }

        // Clear unfilled memory.
        for val in &mut self.in_buffer.0[bytes_read..NUM_BYTES_IN_BLOCK] {
            *val = 0;
        }

        Ok(bytes_read)
    }
}

/// Division of x by y, rounding up.
/// x must be > 0
#[inline]
const fn div_ceil(x: usize, y: usize) -> usize {
    1 + ((x - 1) / y)
}

impl<R: Read> Read for Fr32Reader<R> {
    fn read(&mut self, target: &mut [u8]) -> io::Result<usize> {
        if self.done || target.is_empty() {
            return Ok(0);
        }

        // The number of bytes already read and written into `target`.
        let mut bytes_read = 0;
        // The number of bytes to read.
        let bytes_to_read = target.len();

        while bytes_read < bytes_to_read {
            // Load and process the next block, if no Frs are available anymore.
            if self.available_frs == 0 {
                let bytes_read = self.fill_in_buffer()?;

                // All data was read from the source, no new data in the buffer.
                if bytes_read == 0 {
                    self.done = true;
                    break;
                }

                self.process_block();

                // Update state of how many new Frs are now available.
                self.available_frs = div_ceil(bytes_read * 8, IN_BITS_FR);
            }

            // Write out as many Frs as available and requested
            {
                let available_bytes = self.available_frs * (OUT_BITS_FR / 8);

                let target_start = bytes_read;
                let target_end = min(target_start + available_bytes, bytes_to_read);
                let len = target_end - target_start;

                let out_start = self.out_offset;
                let out_end = out_start + len;

                target[target_start..target_end]
                    .copy_from_slice(&self.out_buffer.as_byte_slice()[out_start..out_end]);
                bytes_read += len;
                self.out_offset += len;
                self.available_frs -= div_ceil(len * 8, OUT_BITS_FR);
            }
        }

        Ok(bytes_read)
    }
}
