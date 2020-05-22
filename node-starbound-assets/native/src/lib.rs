use neon::prelude::*;
use starbound_player_editor::{parse_packed, parse_player, PackedAssets};

declare_types! {
    pub class JsPackedAssets for PackedAssets {
        init(mut cx) {
            let path = cx.argument::<JsString>(0)?.value();

            Ok(parse_packed(&path).unwrap())
        }

        method assets(mut cx) {
            let this = cx.this();
            let assets = {
                let guard = cx.lock();
                let this = this.borrow(&guard);
                let assets = this.assets();
                assets.into_iter().map(|s| s.to_string()).collect::<Vec<_>>()
            };

            Ok(neon_serde::to_value(&mut cx, &assets)?)
        }

        method metadata(mut cx) {
            let this = cx.this();
            let metadata = {
                let guard = cx.lock();
                let this = this.borrow(&guard);
                let metadata = this.metadata();
                metadata
            };

            Ok(neon_serde::to_value(&mut cx, &metadata)?)
        }

        method get_file(mut cx) {
            let this = cx.this();
            let path = cx.argument::<JsString>(0)?.value();

            let len = {
                let guard = cx.lock();
                let this = this.borrow(&guard);
                let file = this.file(&path).expect("file does not exist in assets");
                file.len()
            };

            let mut buf = JsArrayBuffer::new(&mut cx, len as u32)?;
            {
                let guard = cx.lock();
                let this = this.borrow(&guard);
                let file = this.file(&path).unwrap();
                let buf = buf.borrow_mut(&guard);
                buf.as_mut_slice().copy_from_slice(file);
            }

            Ok(buf.upcast())
        }
    }
}

fn js_parse_player(mut cx: FunctionContext) -> JsResult<JsValue> {
    let path = cx.argument::<JsString>(0)?.value();
    let player = parse_player(&path).unwrap();
    Ok(neon_serde::to_value(&mut cx, &player)?)
}

register_module!(mut m, {
    m.export_class::<JsPackedAssets>("PackedAssets")?;
    m.export_function("parse_player", js_parse_player)?;
    Ok(())
});
