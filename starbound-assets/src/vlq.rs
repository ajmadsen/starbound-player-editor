use nom::{
    combinator::map,
    error::{context, ParseError},
    IResult, InputTakeAtPosition,
};
use std::cell::Cell;

const CONTINUE: u8 = 1u8 << 7;
const MASK: u8 = CONTINUE - 1;

fn take_more<F, I, E: ParseError<I>>(cond: F) -> impl Fn(I) -> IResult<I, I, E>
where
    I: InputTakeAtPosition,
    F: Fn(I::Item) -> bool + 'static,
{
    let make_latched = move |f: F| {
        let latch = Cell::new(true);
        move |item: I::Item| {
            let prev = latch.replace(f(item));
            !prev
        }
    };

    let f = make_latched(cond);
    move |i: I| i.split_at_position_complete(|c| f(c))
}

pub fn read_vlqu64<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], u64, E> {
    let bytes = take_more(|b: u8| b & CONTINUE > 0);
    let fold = map(bytes, |b: &[u8]| {
        b.into_iter()
            .fold(0u64, |res, b| res << 7 | (b & MASK) as u64)
    });
    context("vlqu", fold)(i)
}

pub fn read_vlqi64<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], i64, E> {
    let (i, int) = read_vlqu64(i)?;
    Ok((
        i,
        match int & 1 {
            0 => (int >> 1) as i64,
            1 => -1i64 - ((int >> 1) as i64),
            _ => unreachable!(),
        },
    ))
}

pub fn write_vlqi64<W: std::io::Write>(w: &mut W, n: i64) -> std::io::Result<()> {
    write_vlqu64(w, ((n as u64) << 1) ^ ((n as u64) >> 63))
}

pub fn write_vlqu64<W: std::io::Write>(w: &mut W, mut n: u64) -> std::io::Result<()> {
    let mut buf: [u8; 10] = [0 as u8; 10];
    let mut i = buf.len();
    while n > 0 {
        i -= 1;
        buf[i] = (n & 0x7f) as u8;
        n = n >> 7;
        if i + 1 < buf.len() {
            buf[i] ^= 1 << 7;
        }
    }
    w.write_all(&buf[std::cmp::min(i, buf.len() - 1)..])
}
