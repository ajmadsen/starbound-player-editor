pub mod serializer;

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

use serde::{
    de::Visitor,
    ser::{SerializeMap, SerializeSeq},
    Deserialize, Serialize,
};

use std::collections::BTreeMap;

use num::cast::NumCast;

use crate::json::utf8;
use crate::vlq::{read_vlqi64, read_vlqu64};

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
    context("vlq integer", map(read_vlqi64, |i| Value::Integer(i)))(i)
}

fn string<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], String, E> {
    map_parser(
        length_data(map(read_vlqu64, |v| v as usize)),
        map(utf8, |s| s.to_owned()),
    )(i)
}

fn parse_string<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    context("string", map(string, |s| Value::String(s)))(i)
}

fn parse_array<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    let (i, n) = read_vlqu64(i)?;
    context(
        "array",
        map(many_m_n(n as usize, n as usize, parse_bson), |vec| {
            Value::Array(vec)
        }),
    )(i)
}

pub fn parse_object<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    let (i, n) = read_vlqu64(i)?;
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

impl Serialize for Value {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            Value::Empty => serializer.serialize_none(),
            Value::Float(f) => serializer.serialize_f64(*f),
            Value::Boolean(b) => serializer.serialize_bool(*b),
            Value::Integer(i) => serializer.serialize_i64(*i),
            Value::String(s) => serializer.serialize_str(s),
            Value::Array(a) => {
                let mut seq = serializer.serialize_seq(Some(a.len()))?;
                for el in a {
                    seq.serialize_element(el)?;
                }
                seq.end()
            }
            Value::Object(obj) => {
                let mut map = serializer.serialize_map(Some(obj.len()))?;
                for (k, v) in obj {
                    map.serialize_entry(k, v)?;
                }
                map.end()
            }
        }
    }
}

impl<'de> Deserialize<'de> for Value {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        deserializer.deserialize_any(ValueVisitor)
    }
}

struct ValueVisitor;

impl<'de> Visitor<'de> for ValueVisitor {
    type Value = Value;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        formatter.write_str("a bson value")
    }

    fn visit_bool<E>(self, v: bool) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(Value::Boolean(v))
    }

    fn visit_i64<E>(self, v: i64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(Value::Integer(v))
    }

    fn visit_u64<E>(self, v: u64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        let v: i64 = <i64 as NumCast>::from(v).ok_or_else(|| {
            serde::de::Error::custom(format!("value does not fit in an i64: {}", v))
        })?;
        Ok(Value::Integer(v))
    }

    fn visit_f64<E>(self, v: f64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(Value::Float(v))
    }

    fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(Value::String(v.to_string()))
    }

    fn visit_none<E>(self) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(Value::Empty)
    }

    fn visit_unit<E>(self) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(Value::Empty)
    }

    fn visit_seq<A>(self, seq: A) -> Result<Self::Value, A::Error>
    where
        A: serde::de::SeqAccess<'de>,
    {
        let mut vals = vec![];
        let mut seq = seq;
        while let Some(val) = seq.next_element()? {
            vals.push(val);
        }
        Ok(Value::Array(vals))
    }

    fn visit_map<A>(self, map: A) -> Result<Self::Value, A::Error>
    where
        A: serde::de::MapAccess<'de>,
    {
        let mut obj = Map::new();
        let mut map = map;
        while let Some((k, v)) = map.next_entry()? {
            obj.insert(k, v);
        }
        Ok(Value::Object(obj))
    }
}
