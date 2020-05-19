use nom::{
    branch::alt,
    bytes::complete::{escaped, is_a, is_not, tag, take_until},
    character::complete::{multispace1, not_line_ending, one_of},
    combinator::{cut, map, map_parser, map_res, opt, value},
    error::{context, ErrorKind, ParseError},
    multi::{many0, separated_list},
    number::complete::double,
    sequence::{delimited, separated_pair},
    Err, IResult,
};
use serde_json::{Number, Value};
use std::fmt::Debug;

fn ws<'a, O: Debug, F, E: ParseError<&'a [u8]>>(
    comb: F,
) -> impl Fn(&'a [u8]) -> IResult<&'a [u8], O, E>
where
    F: Fn(&'a [u8]) -> IResult<&'a [u8], O, E>,
{
    move |i| {
        let line_comment = context(
            "line comment",
            delimited(tag("//"), not_line_ending, cut(is_a("\r\n"))),
        );
        let block_comment = context(
            "block comment",
            delimited(tag("/*"), take_until("*/"), cut(tag("*/"))),
        );
        let space_or_comment = context(
            "space or comment",
            many0(alt((multispace1, line_comment, block_comment))),
        );
        let res = delimited(&space_or_comment, &comb, &space_or_comment)(i);
        res
    }
}

fn boolean_value<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    let true_value = value(true, tag("true"));
    let false_value = value(false, tag("false"));
    context(
        "boolean",
        map(alt((true_value, false_value)), |b| Value::Bool(b)),
    )(i)
}

fn null_value<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    context("null", map(tag("null"), |_| Value::Null))(i)
}

pub(crate) fn utf8<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], &'a str, E> {
    std::str::from_utf8(i)
        .map_err(|e| {
            Err::Failure(ParseError::from_error_kind(
                &i[e.valid_up_to()..],
                ErrorKind::Char,
            ))
        })
        .map(|s| (&i[s.len()..], s))
}

fn string<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], &'a str, E> {
    let bytes = escaped(is_not("\\\""), '\\', one_of("nt\\\""));

    context(
        "string",
        map_parser(
            delimited(
                tag("\""),
                map(opt(bytes), |bytes| bytes.unwrap_or(&[][..])),
                cut(tag("\"")),
            ),
            utf8,
        ),
    )(i)
}

fn string_value<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    map(string, |s| Value::String(s.to_owned()))(i)
}

fn number_value<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    let parse = map_res(double, |f| {
        if f == f64::INFINITY {
            Ok(Value::Number(Number::from_f64(f64::MAX).unwrap()))
        } else if f == f64::NEG_INFINITY {
            Ok(Value::Number(Number::from_f64(f64::MIN).unwrap()))
        } else if f == std::f64::NAN {
            Err(Err::<E>::Error(ParseError::from_error_kind(
                i,
                ErrorKind::Float,
            )))
        } else {
            Ok(Value::Number(Number::from_f64(f).unwrap()))
        }
    });
    context("number", parse)(i)
}

fn array_value<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    let els = separated_list(ws(tag(",")), json_value);
    let array = delimited(ws(tag("[")), els, context("end tag", cut(ws(tag("]")))));
    context("array", map(array, |els| Value::Array(els)))(i)
}

fn object_value<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    let kv = separated_pair(ws(string), cut(ws(tag(":"))), cut(ws(json_value)));
    context(
        "object",
        delimited(
            context("open tag", ws(tag("{"))),
            map(separated_list(ws(tag(",")), kv), |tuples| {
                Value::Object(tuples.into_iter().map(|(k, v)| (k.to_owned(), v)).collect())
            }),
            context("close tag", cut(ws(tag("}")))),
        ),
    )(i)
}

pub fn json_value<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Value, E> {
    alt((
        null_value,
        boolean_value,
        number_value,
        string_value,
        array_value,
        object_value,
    ))(i)
}

#[cfg(test)]
mod test {
    use super::*;
    use nom::error::VerboseError;

    #[test]
    fn test_obj() {
        assert!(json_value::<VerboseError<&[u8]>>(b"{}")
            .unwrap()
            .1
            .is_object());
    }

    #[test]
    fn test_nl_string() {
        assert!(json_value::<VerboseError<&[u8]>>(b"\"asdf\ngl\"")
            .unwrap()
            .1
            .is_string())
    }

    #[test]
    fn test_obj_w_keys() {
        assert!(json_value::<VerboseError<&[u8]>>(b"{\"key\": \"value\"}")
            .unwrap()
            .1
            .is_object())
    }

    #[test]
    fn test_obj_nested() {
        assert!(
            json_value::<VerboseError<&[u8]>>(b"{\"key\": {\"value\": \"another\nthing\"}}")
                .unwrap()
                .1
                .is_object()
        )
    }

    #[test]
    fn test_obj_nested_comment() {
        assert!(json_value::<VerboseError<&[u8]>>(
            b"{\"key\": {\"value\": \"another\nthing\"} // this is a comment\n}"
        )
        .unwrap()
        .1
        .is_object())
    }

    #[test]
    fn test_obj_array_comment() {
        assert!(json_value::<VerboseError<&[u8]>>(
            b"{\"key\": [[1,2], [3,4], [5,6] //comment\n], \"nextKey\": \"nextVal\" // this is a comment\n}"
        )
        .unwrap()
        .1
        .is_object())
    }

    #[test]
    fn test_troublesome() {
        const OBJ: &str = r#"{
  "commitInterval" : 30,
  "requestTimeout" : 30,

  "chunkSize" : 50,
  "maxSystemChunkSearches" : 100,
  "maxWorldSearches" : 500,
  "xyCoordRange" : [-1000000000, 1000000000],
  "zCoordRange" : [-100000000, 100000000],

  "systemProbability" : 0.003,

  "planetOrbitalLevels" : 11,
  "satelliteOrbitalLevels" : 3,

  "planetRadialSlots" : 12,
  "satelliteRadialSlots" : 12,

  "constellationProbability" : 1.5,
  "constellationLineCountRange" : [3, 8],
  "constellationMaxTries" : 500,
  "minimumConstellationLineLength" : 1.0,
  "maximumConstellationLineLength" : 20.0,
  "minimumConstellationMagnitude" : 5,
  "minimumConstellationLineCloseness" : 1,

  "twinkleFrames" : 4,
  "twinkleScale" : 0.5,

  "maxRecentlyVisitedSystems" : 30,

  "systemTypePerlin" : {
    "type" : "perlin",
    "octaves" : 1,
    "frequency" : 0.01,
    "amplitude" : 1.0,
    "bias" : 0.0
  },
  "systemTypeBins" : [
    [-1.00, "White"],
    [-0.30, "Orange"],
    [-0.12, "Yellow"],
    [0.00, "Blue"],
    [0.12, "Red"],
    [0.30, ""] // dark mysteries
  ]
}
"#;
        let res = json_value::<VerboseError<&[u8]>>(OBJ.as_bytes());
        match res {
            Ok((_i, v)) => {
                println!("{:?}", v);
            }
            Err(Err::Error(err)) | Err(Err::Failure(err)) => {
                use nom::HexDisplay;
                for (ctx, e) in err.errors {
                    println!("{:?}", e);
                    println!("{}", &ctx[..std::cmp::min(100, ctx.len())].to_hex(10));
                }
                panic!();
            }
            Err(_) => panic!(),
        }
    }

    #[test]
    fn test_obj_w_empty_str() {
        assert!(json_value::<VerboseError<&[u8]>>(b"{\"key\": \"\"}")
            .unwrap()
            .1
            .is_object())
    }
}
