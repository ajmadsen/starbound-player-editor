use std::error::Error;
use std::fs::File;

mod bson;
#[allow(dead_code)]
mod json;
mod packed;
mod vlq;

pub use bson::Value;
pub use packed::{PackedAssets, Player};

pub fn parse_packed(path: &str) -> Result<PackedAssets, Box<dyn Error>> {
    let f = File::open(path)?;
    packed::PackedAssets::new(&f)
}

pub fn parse_player(path: &str) -> Result<Player, Box<dyn Error>> {
    let f = File::open(path)?;
    packed::Player::new(&f)
}
