use {
    crate::vlq::{write_vlqi64, write_vlqu64},
    byteorder::{BigEndian, WriteBytesExt},
    num::cast::{NumCast, ToPrimitive},
    serde::ser::{self, Error as SerError, Impossible, Serialize},
    std::fmt::Debug,
    std::io::Write,
};

pub struct Error(Box<dyn std::fmt::Display>);

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        std::fmt::Display::fmt(&self.0, f)
    }
}

impl std::fmt::Debug for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        std::fmt::Display::fmt(&self.0, f)
    }
}

impl std::error::Error for Error {}

impl ser::Error for Error {
    fn custom<T>(msg: T) -> Self
    where
        T: std::fmt::Display,
    {
        Self(Box::new(format!("{}", msg)))
    }
}

pub struct Serializer<W: Write> {
    writer: W,
}

fn write_int<T: ToPrimitive + Debug + Copy, W: Write>(w: &mut W, val: T) -> Result<(), Error> {
    let val: i64 = <i64 as NumCast>::from(val)
        .ok_or(format!("cannot represent {:?}", val))
        .map_err(|e| Error(Box::new(e)))?;
    w.write_all(&[b'\x04']).map_err(|e| Error(Box::new(e)))?;
    write_vlqi64(w, val).map_err(|e| Error(Box::new(e)))
}

impl<'a, W: Write> ser::Serializer for &'a mut Serializer<W> {
    type Ok = ();
    type Error = Error;

    type SerializeSeq = Self;
    type SerializeTuple = Self;
    type SerializeTupleStruct = Self;
    type SerializeTupleVariant = Impossible<(), Self::Error>;
    type SerializeMap = Self;
    type SerializeStruct = Self;
    type SerializeStructVariant = Impossible<(), Self::Error>;

    fn serialize_bool(self, v: bool) -> Result<Self::Ok, Self::Error> {
        let bytes: [u8; 2] = [b'\x03', if v { b'\x01' } else { b'\x00' }];
        self.writer
            .write_all(&bytes[..])
            .map_err(|e| Error(Box::new(e)))?;
        Ok(())
    }

    fn serialize_i8(self, v: i8) -> Result<Self::Ok, Self::Error> {
        write_int(&mut self.writer, v)
    }

    fn serialize_i16(self, v: i16) -> Result<Self::Ok, Self::Error> {
        write_int(&mut self.writer, v)
    }

    fn serialize_i32(self, v: i32) -> Result<Self::Ok, Self::Error> {
        write_int(&mut self.writer, v)
    }

    fn serialize_i64(self, v: i64) -> Result<Self::Ok, Self::Error> {
        write_int(&mut self.writer, v)
    }

    fn serialize_u8(self, v: u8) -> Result<Self::Ok, Self::Error> {
        write_int(&mut self.writer, v)
    }

    fn serialize_u16(self, v: u16) -> Result<Self::Ok, Self::Error> {
        write_int(&mut self.writer, v)
    }

    fn serialize_u32(self, v: u32) -> Result<Self::Ok, Self::Error> {
        write_int(&mut self.writer, v)
    }

    fn serialize_u64(self, v: u64) -> Result<Self::Ok, Self::Error> {
        write_int(&mut self.writer, v)
    }

    fn serialize_f32(self, v: f32) -> Result<Self::Ok, Self::Error> {
        self.serialize_f64(v as f64)
    }

    fn serialize_f64(self, v: f64) -> Result<Self::Ok, Self::Error> {
        self.writer
            .write_all(&[b'\x02'])
            .map_err(|e| Error(Box::new(e)))?;
        self.writer
            .write_f64::<BigEndian>(v)
            .map_err(|e| Error(Box::new(e)))
    }

    fn serialize_char(self, v: char) -> Result<Self::Ok, Self::Error> {
        self.serialize_str(&v.to_string())
            .map_err(|e| Error(Box::new(e)))
    }

    fn serialize_str(self, v: &str) -> Result<Self::Ok, Self::Error> {
        self.writer
            .write_all(&[b'\x05'])
            .map_err(|e| Error(Box::new(e)))?;
        write_vlqu64(&mut self.writer, v.len() as u64).map_err(|e| Error(Box::new(e)))?;
        self.writer
            .write_all(v.as_bytes())
            .map_err(|e| Error(Box::new(e)))
    }

    fn serialize_bytes(self, v: &[u8]) -> Result<Self::Ok, Self::Error> {
        use serde::ser::SerializeSeq;
        let mut seq = self.serialize_seq(Some(v.len()))?;
        for byte in v {
            seq.serialize_element(byte)?;
        }
        seq.end()
    }

    fn serialize_none(self) -> Result<Self::Ok, Self::Error> {
        self.serialize_unit()
    }

    fn serialize_some<T: ?Sized>(self, value: &T) -> Result<Self::Ok, Self::Error>
    where
        T: serde::Serialize,
    {
        value.serialize(self)
    }

    fn serialize_unit(self) -> Result<Self::Ok, Self::Error> {
        self.writer
            .write_all(&[b'\x01'])
            .map_err(|e| Error(Box::new(e)))
    }

    fn serialize_unit_struct(self, _name: &'static str) -> Result<Self::Ok, Self::Error> {
        self.serialize_unit()
    }

    fn serialize_unit_variant(
        self,
        _name: &'static str,
        _variant_index: u32,
        _variant: &'static str,
    ) -> Result<Self::Ok, Self::Error> {
        Err(SerError::custom("cannot serialize enums"))
    }

    fn serialize_newtype_struct<T: ?Sized>(
        self,
        _name: &'static str,
        value: &T,
    ) -> Result<Self::Ok, Self::Error>
    where
        T: serde::Serialize,
    {
        value.serialize(self)
    }

    fn serialize_newtype_variant<T: ?Sized>(
        self,
        _name: &'static str,
        _variant_index: u32,
        _variant: &'static str,
        _value: &T,
    ) -> Result<Self::Ok, Self::Error>
    where
        T: serde::Serialize,
    {
        Err(SerError::custom("cannot serialize enums"))
    }

    fn serialize_seq(self, len: Option<usize>) -> Result<Self::SerializeSeq, Self::Error> {
        if let None = len {
            return Err(SerError::custom("sequences must have a definite length"));
        }
        self.writer
            .write_all(&[b'\x06'])
            .map_err(|e| Error(Box::new(e)))?;
        write_vlqu64(&mut self.writer, len.unwrap() as u64).map_err(|e| Error(Box::new(e)))?;
        Ok(self)
    }

    fn serialize_tuple(self, len: usize) -> Result<Self::SerializeTuple, Self::Error> {
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_struct(
        self,
        _name: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleStruct, Self::Error> {
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_variant(
        self,
        _name: &'static str,
        _variant_index: u32,
        _variant: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeTupleVariant, Self::Error> {
        Err(SerError::custom("cannot serialize enums"))
    }

    fn serialize_map(self, len: Option<usize>) -> Result<Self::SerializeMap, Self::Error> {
        if let None = len {
            return Err(SerError::custom("maps must have a definite length"));
        }
        self.writer
            .write_all(&[b'\x07'])
            .map_err(|e| Error(Box::new(e)))?;
        Ok(self)
    }

    fn serialize_struct(
        self,
        _name: &'static str,
        len: usize,
    ) -> Result<Self::SerializeStruct, Self::Error> {
        self.serialize_map(Some(len))
    }

    fn serialize_struct_variant(
        self,
        _name: &'static str,
        _variant_index: u32,
        _variant: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeStructVariant, Self::Error> {
        Err(SerError::custom("cannot serialize enums"))
    }
}

impl<'a, W: Write> ser::SerializeSeq for &'a mut Serializer<W> {
    type Ok = ();
    type Error = <Self as ser::Serializer>::Error;

    fn serialize_element<T: ?Sized>(&mut self, value: &T) -> Result<(), Self::Error>
    where
        T: serde::Serialize,
    {
        value.serialize(&mut **self)
    }

    fn end(self) -> Result<Self::Ok, Self::Error> {
        Ok(())
    }
}

impl<'a, W: Write> ser::SerializeTuple for &'a mut Serializer<W> {
    type Ok = ();
    type Error = <Self as ser::Serializer>::Error;

    fn serialize_element<T: ?Sized>(&mut self, value: &T) -> Result<(), Self::Error>
    where
        T: serde::Serialize,
    {
        value.serialize(&mut **self)
    }
    fn end(self) -> Result<Self::Ok, Self::Error> {
        Ok(())
    }
}

impl<'a, W: Write> ser::SerializeTupleStruct for &'a mut Serializer<W> {
    type Ok = ();
    type Error = <Self as ser::Serializer>::Error;

    fn serialize_field<T: ?Sized>(&mut self, value: &T) -> Result<(), Self::Error>
    where
        T: serde::Serialize,
    {
        value.serialize(&mut **self)
    }

    fn end(self) -> Result<Self::Ok, Self::Error> {
        Ok(())
    }
}

impl<'a, W: Write> ser::SerializeMap for &'a mut Serializer<W> {
    type Ok = ();
    type Error = <Self as ser::Serializer>::Error;

    fn serialize_key<T: ?Sized>(&mut self, key: &T) -> Result<(), Self::Error>
    where
        T: serde::Serialize,
    {
        key.serialize(&mut **self)
    }

    fn serialize_value<T: ?Sized>(&mut self, value: &T) -> Result<(), Self::Error>
    where
        T: serde::Serialize,
    {
        value.serialize(&mut **self)
    }

    fn end(self) -> Result<Self::Ok, Self::Error> {
        Ok(())
    }
}

impl<'a, W: Write> ser::SerializeStruct for &'a mut Serializer<W> {
    type Ok = ();
    type Error = <Self as ser::Serializer>::Error;

    fn serialize_field<T: ?Sized>(
        &mut self,
        _key: &'static str,
        value: &T,
    ) -> Result<(), Self::Error>
    where
        T: serde::Serialize,
    {
        value.serialize(&mut **self)
    }

    fn end(self) -> Result<Self::Ok, Self::Error> {
        Ok(())
    }
}

pub fn to_writer<T: Write, V: Serialize>(w: T, val: &V) -> Result<(), Error> {
    val.serialize(&mut Serializer { writer: w })
}
