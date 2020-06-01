use neon::prelude::*;
use starbound_assets::{
    parse_packed, parse_player, save_versioned_json, PackedAssets as OrigPackedAssets, Player,
};
use std::cell::RefCell;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct PackedAssets {
    inner: Arc<Mutex<Option<OrigPackedAssets>>>,
}

struct AssetsLoader(String);
const ASSETS_ERR: &'static str =
    "Assets loader not initialized. Do not directly construct this class.";

impl Task for AssetsLoader {
    type Output = OrigPackedAssets;
    type Error = String;
    type JsEvent = JsPackedAssets;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        parse_packed(&self.0).map_err(|e| e.to_string())
    }

    fn complete<'a>(
        self,
        cx: TaskContext<'a>,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        let mut cx = cx;
        let assets = result.or_else(|e| cx.throw_error(e))?;
        let mut wrapper = JsPackedAssets::new::<_, JsUndefined, _>(&mut cx, vec![])?;
        cx.borrow_mut(&mut wrapper, |ref mut wrapper| {
            let mut inner = Arc::get_mut(&mut wrapper.inner).unwrap().lock().unwrap();
            inner.replace(assets);
        });
        Ok(wrapper)
    }
}

struct FileLoader(PackedAssets, String);

impl Task for FileLoader {
    type Output = Vec<u8>;
    type Error = String;
    type JsEvent = JsArrayBuffer;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let lock = self.0.inner.lock().unwrap();

        lock.as_ref()
            .unwrap()
            .file(&self.1)
            .ok_or_else(|| "could not find the file specified".to_string())
            .map(|bytes| bytes.to_vec())
    }

    fn complete<'b>(
        self,
        cx: TaskContext<'b>,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        let mut cx = cx;

        let result = result.or_else(|e| cx.throw_error(e))?;
        let mut buf = cx.array_buffer(result.len() as u32)?;
        cx.borrow_mut(&mut buf, |buf| {
            buf.as_mut_slice().clone_from_slice(&result[..])
        });

        Ok(buf)
    }
}

struct PlayerLoader(String);

impl Task for PlayerLoader {
    type Output = Player;
    type Error = String;
    type JsEvent = JsValue;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        parse_player(&self.0).map_err(|e| e.to_string())
    }

    fn complete<'a>(
        self,
        cx: TaskContext<'a>,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        let mut cx = cx;
        let result = result.or_else(|e| cx.throw_error(e))?;
        Ok(neon_serde::to_value(&mut cx, &result)?)
    }
}

struct PlayerSaver(RefCell<Player>);

impl Task for PlayerSaver {
    type Output = Vec<u8>;
    type Error = ();
    type JsEvent = JsArrayBuffer;

    fn perform(&self) -> Result<Self::Output, Self::Error> {
        let player_bytes = save_versioned_json(&mut self.0.borrow_mut().contents);
        Ok(player_bytes)
    }

    fn complete<'a>(
        self,
        mut cx: TaskContext<'a>,
        result: Result<Self::Output, Self::Error>,
    ) -> JsResult<Self::JsEvent> {
        let bytes = result.unwrap();
        let mut buf = cx.array_buffer(bytes.len() as u32)?;
        cx.borrow_mut(&mut buf, |buf| {
            buf.as_mut_slice().copy_from_slice(&bytes[..])
        });
        Ok(buf)
    }
}

declare_types! {
    pub class JsPackedAssets for PackedAssets {
        init(_) {
            Ok(PackedAssets{
                inner: Arc::new(Mutex::new(None))
            })
        }

        method assets(mut cx) {
            let this = cx.this();
            let assets = {
                let guard = cx.lock();
                let this = this.borrow(&guard);
                let this = this.inner.lock().unwrap();
                let this = this.as_ref().expect(ASSETS_ERR);
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
                let this = this.inner.lock().unwrap();
                let this = this.as_ref().expect(ASSETS_ERR);
                let metadata = this.metadata();
                metadata
            };

            Ok(neon_serde::to_value(&mut cx, &metadata)?)
        }

        method getFile(mut cx) {
            let this = cx.this();
            let path = cx.argument::<JsString>(0)?.value();
            let cb = cx.argument::<JsFunction>(1)?;

            let inner = {
                let guard = cx.lock();
                let this = this.borrow(&guard);
                this.clone()
            };

            FileLoader(inner, path).schedule(cb);

            Ok(cx.undefined().upcast())
        }
    }
}

fn js_parse_player(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value();
    let cb = cx.argument::<JsFunction>(1)?;
    PlayerLoader(path).schedule(cb);
    Ok(cx.undefined())
}

fn js_parse_assets(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value();
    let cb = cx.argument::<JsFunction>(1)?;
    AssetsLoader(path).schedule(cb);
    Ok(cx.undefined())
}

fn js_save_player(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let parg = cx.argument(0)?;
    let player: Player = neon_serde::from_value(&mut cx, parg)?;
    let cb = cx.argument(1)?;
    PlayerSaver(player.into()).schedule(cb);
    Ok(cx.undefined())
}

register_module!(mut m, {
    m.export_function("parsePlayer", js_parse_player)?;
    m.export_function("savePlayer", js_save_player)?;
    m.export_function("parseAssets", js_parse_assets)?;
    m.export_class::<JsPackedAssets>("PackedAssets")?;
    Ok(())
});
