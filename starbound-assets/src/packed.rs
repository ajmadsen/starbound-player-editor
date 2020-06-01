use crate::bson::{
    parse_bson, parse_maybe_u32, parse_object, serializer as bson_serializer, Map, Value,
};
use crate::json::utf8;
use crate::vlq::read_vlqu64;
use memmap::Mmap;
use nom::{
    bytes::complete::tag,
    combinator::map,
    error::{context, ParseError, VerboseError},
    multi::{length_value, many_m_n},
    number::complete::{be_i64, be_u64},
    sequence::{pair, tuple},
    IResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::error::Error;
use std::fs::File;

type Directory = BTreeMap<String, (i64, i64)>;
pub type Metadata = Map;

#[derive(Clone, Debug)]
pub struct Index {
    meta: Metadata,
    dir: Directory,
}

fn parse_metadata<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Metadata, E> {
    context(
        "metadata",
        map(parse_object, |o| match o {
            Value::Object(o) => o,
            _ => unreachable!(),
        }),
    )(i)
}

fn string<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], String, E> {
    context(
        "string",
        map(length_value(map(read_vlqu64, |v| v as usize), utf8), |s| {
            s.to_owned()
        }),
    )(i)
}

fn parse_directory<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Directory, E> {
    let entry = context("entry", pair(string, pair(be_i64, be_i64)));
    let (i, n) = read_vlqu64(i)?;
    context(
        "directory",
        map(many_m_n(n as usize, n as usize, entry), |tuples| {
            tuples.into_iter().collect()
        }),
    )(i)
}

fn parse_index<'a, E: ParseError<&'a [u8]>>(i: &'a [u8]) -> IResult<&'a [u8], Index, E> {
    let (i, _) = tag("INDEX")(i)?;
    let (i, meta) = parse_metadata(i)?;
    let (i, dir) = parse_directory(i)?;
    Ok((i, Index { meta, dir }))
}

struct NomError {
    rendered: String,
}

impl std::fmt::Display for NomError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.rendered)
    }
}

impl std::fmt::Debug for NomError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        std::fmt::Display::fmt(self, f)
    }
}

impl Error for NomError {}

fn render_nom_error<'a, O>(
    i: &'a [u8],
    r: IResult<&'a [u8], O, VerboseError<&'a [u8]>>,
) -> Result<(&'a [u8], O), Box<dyn Error>> {
    r.map_err(|e| {
        {
            Box::new(NomError {
                rendered: match e {
                    nom::Err::Incomplete(_) => {
                        "Incomplete data while trying to parse file".to_string()
                    }
                    nom::Err::Error(err) | nom::Err::Failure(err) => err
                        .errors
                        .into_iter()
                        .map(|(start, err)| {
                            use nom::{HexDisplay, Offset};
                            match err {
                                nom::error::VerboseErrorKind::Context(ctx) => format!(
                                    "While parsing {context} at offset {offset}:\n{hex}\n",
                                    context = ctx,
                                    offset = i.offset(start),
                                    hex = &start[..20].to_hex(10)
                                ),
                                nom::error::VerboseErrorKind::Char(c) => format!(
                                    "Expected char {c} at {offset}:\n{hex}\n",
                                    c = c,
                                    offset = i.offset(start),
                                    hex = &start[..20].to_hex(10)
                                ),
                                nom::error::VerboseErrorKind::Nom(kind) => format!(
                                    "Parser error ({kind}) at offset {offset}:\n{hex}\n",
                                    kind = kind.description(),
                                    offset = i.offset(start),
                                    hex = &start[..20].to_hex(10)
                                ),
                            }
                        })
                        .collect(),
                },
            })
        }
        .into()
    })
}

pub struct PackedAssets {
    map: Mmap,
    index: Index,
}

impl PackedAssets {
    pub fn new(f: &File) -> Result<Self, Box<dyn Error>> {
        let map = unsafe { Mmap::map(f)? };
        let hdr = tag("SBAsset6");

        let (_, (_, _idx_off)) = render_nom_error(&map, tuple((hdr, be_u64))(&map))?;
        let metadata_start = &map[(_idx_off as usize)..];
        let (_, index) = render_nom_error(&map, parse_index(metadata_start))?;
        Ok(Self { map, index })
    }

    pub fn assets(&self) -> Vec<&str> {
        self.index.dir.keys().map(|s| s.as_str()).collect()
    }

    pub fn metadata(&self) -> Metadata {
        self.index.meta.clone()
    }

    pub fn file<'a>(&'a self, path: &str) -> Option<&'a [u8]> {
        let (start, len) = self.index.dir.get(path).copied()?;
        let (start, len) = (start as usize, len as usize);
        Some(&self.map[start..][..len])
    }
}

#[derive(Clone, Debug, PartialOrd, PartialEq, Serialize, Deserialize)]
pub struct VersionedJson {
    pub identifier: String,
    pub version: u32,
    pub content: Value,
}

fn parse_versioned_json<'a, E: ParseError<&'a [u8]>>(
    i: &'a [u8],
) -> IResult<&'a [u8], VersionedJson, E> {
    let (i, identifier) = string(i)?;
    let (i, v) = parse_maybe_u32(i)?;
    let (i, content) = parse_bson(i)?;
    Ok((
        i,
        VersionedJson {
            identifier,
            version: v.unwrap_or_default(),
            content,
        },
    ))
}

#[derive(Debug, Clone, PartialOrd, PartialEq, Serialize, Deserialize)]
pub struct Player {
    pub contents: VersionedJson,
}

impl Player {
    pub fn new(f: &File) -> Result<Player, Box<dyn Error>> {
        let map = unsafe { Mmap::map(f)? };

        let (i, _) = render_nom_error(&map, tag("SBVJ01")(&map))?;
        let (_, player) = render_nom_error(&map, parse_versioned_json(i))?;

        Ok(Player { contents: player })
    }
}

pub fn save_versioned_json(json: &mut VersionedJson) -> Vec<u8> {
    json.version += 1;
    let mut out = Vec::new();
    out.copy_from_slice("SBVJ01".as_bytes());
    bson_serializer::to_writer(&mut out, json).unwrap();
    out
}
