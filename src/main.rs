use progress_bar::{
    color::{Color, Style},
    progress_bar::ProgressBar,
};
use starbound_player_editor::{parse_packed, parse_player};
use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

fn extract_assets() {
    let assets = parse_packed("./resources/packed.pak").expect("could not open assets file");
    println!("meta: {:?}", assets.metadata());

    let base = PathBuf::from("./out");
    fs::create_dir_all(&base).expect("could not create output directory");

    let mut progress = ProgressBar::new(assets.assets().len());
    progress.set_action("Extracting", Color::White, Style::Bold);

    let mut dirs = BTreeSet::new();
    dirs.insert(base.clone());

    for asset in assets.assets() {
        let path = base.join(asset.trim_start_matches('/'));
        let pdir = path.parent().unwrap();
        if !dirs.contains(pdir) {
            fs::create_dir_all(pdir).expect("could not create directory");
            dirs.insert(pdir.to_path_buf());
        }

        fs::write(path, assets.file(asset).unwrap()).expect("could not write asset");
        progress.inc();
    }
}

fn main() {
    let player = parse_player("./resources/c75356ebfb10a0111500b4985132688b.player")
        .expect("could not parse player");
    println!("{:?}", player);
}
