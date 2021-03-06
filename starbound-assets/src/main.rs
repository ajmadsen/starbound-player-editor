use clap::{
    app_from_crate, crate_authors, crate_description, crate_name, crate_version, Arg, ArgGroup,
};
use progress_bar::{
    color::{Color, Style},
    progress_bar::ProgressBar,
};
use starbound_assets::{parse_packed, parse_player};
use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

fn extract_assets(assets_path: &str) {
    let assets = parse_packed(assets_path).expect("could not open assets file");
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

    println!();
}

fn extract_player(player_path: &str) {
    let player = parse_player(player_path).expect("could not parse player");
    let f = std::fs::File::create("player.json").expect("could not open output");
    serde_json::to_writer_pretty(f, &player.contents.content).expect("could not serialize player");
}

fn main() {
    let matches = app_from_crate!()
        .arg(
            Arg::with_name("assets")
                .short("a")
                .takes_value(true)
                .help("extract assets mode"),
        )
        .arg(
            Arg::with_name("player")
                .short("p")
                .takes_value(true)
                .help("extract player mode"),
        )
        .group(
            ArgGroup::with_name("mode")
                .args(&["assets", "player"])
                .required(true),
        )
        .get_matches();

    if matches.is_present("assets") {
        extract_assets(matches.value_of("assets").unwrap());
    } else {
        extract_player(matches.value_of("player").unwrap())
    }
}
