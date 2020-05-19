use nom::{
    branch::alt,
    bytes::complete::{tag, take},
    combinator::{cond, cut, map, map_parser, value},
    error::{context, ParseError},
    multi::{length_data, many_m_n},
    number::complete::{be_f64, be_u32},
    sequence::{pair, preceded},
    IResult,
};

use std::collections::BTreeMap;

use crate::json::utf8;
use crate::vlq::{vlqi64, vlqu64};

pub type Map = BTreeMap<String, Value>;

#[derive(Clone, Debug, PartialOrd, PartialEq)]
pub enum Value {
    Empty,
    Float(f64),
    Boolean(bool),
    Integer(i64),
    String(String),
    Array(Vec<Value>),
    Object(Map),
}

impl Default for Value {
    fn default() -> Self {
        Value::Empty
    }
}

pub fn parse_bson<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    context(
        "bson",
        alt((
            value(Value::Empty, tag("\x00")),
            value(Value::Empty, tag("\x01")),
            preceded(tag("\x02"), cut(parse_float)),
            preceded(tag("\x03"), cut(parse_boolean)),
            preceded(tag("\x04"), cut(parse_integer)),
            preceded(tag("\x05"), cut(parse_string)),
            preceded(tag("\x06"), cut(parse_array)),
            preceded(tag("\x07"), cut(parse_object)),
        )),
    )(i)
}

fn parse_float<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    context("float", map(be_f64, |f| Value::Float(f)))(i)
}

fn parse_boolean<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    let b = take(1usize);
    context("boolean", map(b, |b| Value::Boolean(b != b"\0")))(i)
}

fn parse_integer<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    context("vlq integer", map(vlqi64, |i| Value::Integer(i)))(i)
}

fn string<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], String, E> {
    map_parser(length_data(vlqu64), map(utf8, |s| s.to_owned()))(i)
}

fn parse_string<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    context("string", map(string, |s| Value::String(s)))(i)
}

fn parse_array<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    let (i, n) = vlqu64(i)?;
    context(
        "array",
        map(many_m_n(n as usize, n as usize, parse_bson), |vec| {
            Value::Array(vec)
        }),
    )(i)
}

pub fn parse_object<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    let (i, n) = vlqu64(i)?;
    let string_val = map(parse_string, |s| match s {
        Value::String(s) => s,
        _ => unreachable!(),
    });
    let kv = pair(string_val, parse_bson);
    context(
        "object",
        map(many_m_n(n as usize, n as usize, kv), |tuples| {
            Value::Object(tuples.into_iter().collect())
        }),
    )(i)
}

pub fn parse_maybe_u32<'a, E: ParseError<&'a [u8]>>(
    i: &'a [u8],
) -> IResult<&'a [u8], Option<u32>, E> {
    let (i, has) = map(take(1usize), |b| b != b"\x00")(i)?;

    context("Maybe<u32>", cond(has, be_u32))(i)
}
